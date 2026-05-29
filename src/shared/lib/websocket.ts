import { buildWsUrl } from 'shared/config/ws';

export type WsConnectionState =
  | 'idle'
  | 'connecting'
  | 'open'
  | 'closing'
  | 'closed'
  | 'reconnecting';

export interface WsEnvelope<T = unknown> {
  type: string;
  payload?: T;
}

export interface WsClientOptions {
  /** Относительный путь, например `/ws/support`. */
  path: string;
  query?: Record<string, string | number | boolean | undefined | null>;
  protocols?: string | string[];
  /** Автоматическое переподключение при обрыве (по умолчанию true). */
  reconnect?: boolean;
  maxReconnectAttempts?: number;
  reconnectDelayMs?: number;
  maxReconnectDelayMs?: number;
  onOpen?: () => void;
  onClose?: (event: CloseEvent) => void;
  onError?: (event: Event) => void;
  onMessage?: (message: WsEnvelope) => void;
  onRawMessage?: (data: string | ArrayBuffer | Blob) => void;
  onStateChange?: (state: WsConnectionState) => void;
}

export class WsClientError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WsClientError';
  }
}

const DEFAULT_RECONNECT_DELAY_MS = 1_000;
const DEFAULT_MAX_RECONNECT_DELAY_MS = 30_000;
const DEFAULT_MAX_RECONNECT_ATTEMPTS = 10;

/**
 * Обёртка над нативным WebSocket: URL из shared/config, JSON-сообщения,
 * очередь исходящих, переподключение с backoff, явный lifecycle через destroy().
 */
export class WsClient {
  private readonly options: Required<
    Pick<
      WsClientOptions,
      | 'path'
      | 'reconnect'
      | 'maxReconnectAttempts'
      | 'reconnectDelayMs'
      | 'maxReconnectDelayMs'
    >
  > &
    WsClientOptions;

  private socket: WebSocket | null = null;
  private state: WsConnectionState = 'idle';
  private destroyed = false;
  private intentionalClose = false;
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly outboundQueue: string[] = [];

  constructor(options: WsClientOptions) {
    this.options = {
      reconnect: true,
      maxReconnectAttempts: DEFAULT_MAX_RECONNECT_ATTEMPTS,
      reconnectDelayMs: DEFAULT_RECONNECT_DELAY_MS,
      maxReconnectDelayMs: DEFAULT_MAX_RECONNECT_DELAY_MS,
      ...options,
    };
  }

  getState(): WsConnectionState {
    return this.state;
  }

  isOpen(): boolean {
    return this.state === 'open' && this.socket?.readyState === WebSocket.OPEN;
  }

  connect(): void {
    if (this.destroyed) {
      throw new WsClientError('Клиент уничтожен, повторный connect невозможен');
    }

    if (this.socket && (this.state === 'connecting' || this.state === 'open')) {
      return;
    }

    this.clearReconnectTimer();
    this.intentionalClose = false;
    this.openSocket();
  }

  disconnect(code = 1000, reason = 'client disconnect'): void {
    this.intentionalClose = true;
    this.clearReconnectTimer();
    this.closeSocket(code, reason);
  }

  /**
   * Отключает сокет, сбрасывает очередь и отключает переподключение.
   * Вызывайте при размонтировании страницы (аналог abort в fetch).
   */
  destroy(): void {
    this.destroyed = true;
    this.intentionalClose = true;
    this.clearReconnectTimer();
    this.outboundQueue.length = 0;
    this.closeSocket(1000, 'destroyed');
    this.setState('closed');
  }

  send<T>(message: WsEnvelope<T>): void {
    const serialized = JSON.stringify(message);
    this.enqueueOrSend(serialized);
  }

  sendRaw(data: string | ArrayBuffer | Blob): void {
    if (typeof data === 'string') {
      this.enqueueOrSend(data);
      return;
    }

    if (!this.isOpen() || !this.socket) {
      throw new WsClientError('Бинарные сообщения можно отправлять только в открытом соединении');
    }

    this.socket.send(data);
  }

  private openSocket(): void {
    const url = buildWsUrl(this.options.path, this.options.query);
    this.setState(this.reconnectAttempts > 0 ? 'reconnecting' : 'connecting');

    const socket = new WebSocket(url, this.options.protocols);
    this.socket = socket;

    socket.addEventListener('open', () => {
      if (this.destroyed || this.socket !== socket) {
        return;
      }

      this.reconnectAttempts = 0;
      this.setState('open');
      this.flushOutboundQueue();
      this.options.onOpen?.();
    });

    socket.addEventListener('message', (event) => {
      if (this.destroyed || this.socket !== socket) {
        return;
      }

      this.handleIncomingMessage(event.data);
    });

    socket.addEventListener('error', (event) => {
      if (this.destroyed || this.socket !== socket) {
        return;
      }

      this.options.onError?.(event);
    });

    socket.addEventListener('close', (event) => {
      if (this.socket !== socket) {
        return;
      }

      this.socket = null;
      this.setState('closed');
      this.options.onClose?.(event);

      if (!this.destroyed && !this.intentionalClose && this.options.reconnect) {
        this.scheduleReconnect();
      }
    });
  }

  private handleIncomingMessage(data: string | ArrayBuffer | Blob): void {
    if (typeof data !== 'string') {
      this.options.onRawMessage?.(data);
      return;
    }

    this.options.onRawMessage?.(data);

    try {
      const parsed = JSON.parse(data) as unknown;
      if (!parsed || typeof parsed !== 'object' || !('type' in parsed)) {
        return;
      }

      const envelope = parsed as WsEnvelope;
      if (typeof envelope.type !== 'string' || !envelope.type) {
        return;
      }

      this.options.onMessage?.(envelope);
    } catch {
      // Нераспознанный JSON — уже отдан через onRawMessage.
    }
  }

  private enqueueOrSend(serialized: string): void {
    if (this.isOpen() && this.socket) {
      this.socket.send(serialized);
      return;
    }

    if (this.destroyed) {
      throw new WsClientError('Соединение закрыто');
    }

    this.outboundQueue.push(serialized);

    if (this.state === 'idle' || this.state === 'closed') {
      this.connect();
    }
  }

  private flushOutboundQueue(): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      return;
    }

    while (this.outboundQueue.length > 0) {
      const next = this.outboundQueue.shift();
      if (next) {
        this.socket.send(next);
      }
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.options.maxReconnectAttempts) {
      return;
    }

    this.reconnectAttempts += 1;
    const delay = Math.min(
      this.options.reconnectDelayMs * 2 ** (this.reconnectAttempts - 1),
      this.options.maxReconnectDelayMs,
    );

    this.clearReconnectTimer();
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (!this.destroyed && !this.intentionalClose) {
        this.openSocket();
      }
    }, delay);
  }

  private closeSocket(code: number, reason: string): void {
    const socket = this.socket;
    if (!socket) {
      return;
    }

    if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
      this.setState('closing');
      socket.close(code, reason);
      return;
    }

    this.socket = null;
    this.setState('closed');
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private setState(next: WsConnectionState): void {
    if (this.state === next) {
      return;
    }

    this.state = next;
    this.options.onStateChange?.(next);
  }
}

/**
 * Фабрика для типичного сценария «подключился на странице — отключился при уходе».
 */
export function createWsClient(options: WsClientOptions): WsClient {
  return new WsClient(options);
}
