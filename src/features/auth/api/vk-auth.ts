import { request } from 'shared/lib/request';
import { getMe } from 'features/profile/api/update-profile';
import { authState, type AuthUser } from '../model/storage';
import { navigateTo } from 'shared/lib/navigation';

const VK_ID_SDK_URL = 'https://unpkg.com/@vkid/sdk@latest/dist-sdk/umd/index.js';

let sdkLoader: Promise<void> | null = null;

interface VKAuthResponse {
  id: number;
  email?: string;
  phone?: string;
}

function loadVKScript(): Promise<void> {
  if ('VKIDSDK' in window) {
    return Promise.resolve();
  }

  if (sdkLoader) {
    return sdkLoader;
  }

  sdkLoader = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = VK_ID_SDK_URL;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('VK ID SDK failed to load'));
    document.head.append(script);
  });

  return sdkLoader;
}

export function initVKAuth(buttonElement: HTMLElement | null): VoidFunction {
  if (!(buttonElement instanceof HTMLButtonElement)) {
    return () => {};
  }

  let isVkConfigInitialized = false;

  async function vkidOnSuccess(data: unknown): Promise<void> {
    
    let src = (data ?? {}) as Record<string, unknown>;
    
    if (src.type === 'code_v2') {
      
      const code = String(src.code ?? '').trim(); 
      const deviceId = String(src.device_id ?? src.deviceId ?? '').trim();
      
      if (!code || !deviceId) {
        console.error('VK code payload invalid:', data);
        return;
      }

      
      const VKID = (window as Window & { VKIDSDK?: any }).VKIDSDK;
      if (!VKID?.Auth?.exchangeCode) {
        console.error('VK exchangeCode is unavailable');
        return;
      }

      src = (await VKID.Auth.exchangeCode(code, deviceId)) as Record<string, unknown>;
    
    }
    const accessToken = String(src.access_token ?? src.accessToken ?? '').trim();
    const userId = Number(src.user_id ?? src.userId ?? 0);
    
    if (!accessToken || !Number.isFinite(userId) || userId <= 0) {
      console.error('VK payload invalid:', src);
      return;
    }
    

    const body = {
      access_token: accessToken,
      user_id: userId,
    };
    const response = await request<VKAuthResponse>('/advertisers/login/vk', {
      method: 'POST',
      body,
    });

    const base: AuthUser = {
      ...response.data,
      email:
        typeof response.data.email === 'string' && response.data.email.trim()
          ? response.data.email
          : '',
      phone:
        typeof response.data.phone === 'string' && response.data.phone.trim()
          ? response.data.phone
          : '',
    };
    
    authState.setAuthenticatedUser(base);

    const profile = await getMe().catch(() => null);
    if (profile) {
      authState.setAuthenticatedUser({
        ...base,
        name: profile.name ?? base.name,
        email:
          typeof profile.email === 'string' && profile.email.trim()
            ? profile.email
            : base.email,
        phone:
          typeof profile.phone === 'string' && profile.phone.trim()
            ? profile.phone
            : base.phone,
        balance: profile.balance,
        avatar: profile.avatar_url,
      });
    }
    navigateTo('/advertiser/overview', { replace: true });

  }

  function vkidOnError(error: unknown): string {
    const raw = error instanceof Error ? error.message : String(error || '');
    const normalized = raw.trim().toLowerCase();
    let message = 'Не удалось войти через VK. Попробуйте еще раз.';
    if (
      normalized.includes('failed to fetch') ||
      normalized.includes('networkerror') ||
      normalized.includes('load failed')
    ) {
      message = 'Проблема с сетью. Проверьте интернет и повторите вход через VK.';
    } else if (normalized.includes('cors')) {
      message = 'VK не разрешил запрос с текущего домена. Проверьте настройки VK ID.';
    } else if (normalized.includes('access_token') || normalized.includes('user_id')) {
      message = 'VK вернул неполные данные для входа. Повторите попытку.';
    }
    console.error('VK login error:', { raw, message, error });
    return message;
  }

  const onClick = (): void => {
    void loadVKScript()
      .then(() => {
        const VKID = (window as Window & { VKIDSDK?: any }).VKIDSDK;
        if (!VKID) {
          return;
        }

        if (!isVkConfigInitialized) {
          VKID.Config.init({
            app: 54559987,
            redirectUrl: 'https://eshkereklama.ru/ads',
            responseMode: VKID.ConfigResponseMode.Callback,
            source: VKID.ConfigSource.LOWCODE,
            scope: '',
          });
          isVkConfigInitialized = true;
        }

        void VKID.Auth.login()
          .then(vkidOnSuccess)
          .catch(vkidOnError);
      })
      .catch((error) => {
        vkidOnError(error);
      });
  };

  buttonElement.addEventListener('click', onClick);
  return () => {
    buttonElement.removeEventListener('click', onClick);
  };
}