import { authState } from 'features/auth';

const PLATFORMS = [
  { slug: 'vk', name: 'ВК', icon: '/icons/VK_logo_Blue_40x40.svg' },
  { slug: 'yandex', name: 'Яндекс', icon: '/icons/yandex-id.svg' },
  { slug: 'telegram', name: 'Telegram', icon: '/icons/platforms/telegram.svg' },
  { slug: 'ok', name: 'Одноклассники', icon: '/icons/platforms/odnoklassniki.svg' },
  { slug: 'rutube', name: 'Rutube', icon: '/icons/platforms/rutube.svg' },
  { slug: 'dzen', name: 'Дзен', icon: '/icons/platforms/dzen.svg' },
  { slug: 'avito', name: 'Авито', icon: '/icons/platforms/Avito_logo.svg' },
  { slug: 'ozon', name: 'Ozon', icon: '/icons/platforms/icons8-озон.svg' },
  { slug: 'wildberries', name: 'WB', icon: '/icons/platforms/wildberries-sign-logo.svg' },
  { slug: 'gis2', name: '2ГИС', icon: '/icons/platforms/Логотип_2ГИС.svg' },
];

export function getHomeTemplateContext() {
  const authed = authState.isAuthenticated();

  return {
    ctaHref: authed ? '/ads' : '/register',
    ctaText: 'Запустить рекламу',
    platforms: PLATFORMS,
    platformsLoop: [...PLATFORMS, ...PLATFORMS],
  };
}
