import {
  createWsClient,
  type WsClient,
  type WsEnvelope,
  WsClientError,
} from 'shared/lib/websocket';

export interface SendOnceViaWsParams {
  path: string;
  query?: Record<string, string | number | boolean | undefined | null>;
  envelope: WsEnvelope;
  /** Ожидание открытия соединения, мс. */
  openTimeoutMs?: number;
  /** Пауза после send перед закрытием, мс. */
  settleMs?: number;
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/**
 * Открывает WebSocket, отправляет одно сообщение и закрывает соединение.
 */
export function sendOnceViaWs(params: SendOnceViaWsParams): Promise<void> {
  const openTimeoutMs = params.openTimeoutMs ?? 10_000;
  const settleMs = params.settleMs ?? 400;

  return new Promise((resolve, reject) => {
    let client: WsClient | null = null;
    let settled = false;
    let openTimer: ReturnType<typeof setTimeout> | null = null;

    const finish = (error?: Error): void => {
      if (settled) return;
      settled = true;

      if (openTimer !== null) {
        clearTimeout(openTimer);
        openTimer = null;
      }

      client?.destroy();
      client = null;

      if (error) {
        reject(error);
        return;
      }

      resolve();
    };

    client = createWsClient({
      path: params.path,
      query: params.query,
      reconnect: false,
      maxReconnectAttempts: 0,
      onOpen: () => {
        if (openTimer !== null) {
          clearTimeout(openTimer);
          openTimer = null;
        }

        try {
          client?.send(params.envelope);
        } catch (err) {
          finish(err instanceof Error ? err : new WsClientError('Не удалось отправить сообщение'));
          return;
        }

        void wait(settleMs).then(() => finish());
      },
      onError: () => {
        finish(new WsClientError('Ошибка WebSocket-соединения'));
      },
      onClose: (event) => {
        if (settled) return;
        if (event.code === 1000) {
          finish();
          return;
        }
        finish(new WsClientError('WebSocket закрыт до отправки сообщения'));
      },
    });

    openTimer = setTimeout(() => {
      finish(new WsClientError('Не удалось подключиться к чату'));
    }, openTimeoutMs);

    try {
      client.connect();
    } catch (err) {
      finish(err instanceof Error ? err : new WsClientError('Не удалось открыть WebSocket'));
    }
  });
}
