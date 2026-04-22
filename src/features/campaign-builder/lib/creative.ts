import type { CreativeAssetKey, CreativeKey } from '../model/types';

export function getCreativeSummary(creative: CreativeKey): {
  count: string;
  placements: string;
} {
  switch (creative) {
    case 'stories':
      return { count: '2', placements: 'Stories + mobile placements' };
    case 'video':
      return { count: '1', placements: 'Видео + in-stream' };
    case 'feed':
    default:
      return { count: '3', placements: 'Лента + сторис' };
  }
}

export function getCreativeSlots(
  creative: CreativeKey,
  assets: Partial<Record<CreativeAssetKey, string>>,
): Array<{
  key: CreativeAssetKey;
  title: string;
  text: string;
  accept: string;
  buttonLabel: string;
  status: string;
  meta: string;
  multiple?: boolean;
}> {
  if (creative === 'video') {
    return [
      {
        key: 'mainVideo',
        title: 'Основное видео',
        text: 'Главный ролик для ленты или in-stream размещения.',
        accept: 'video/*',
        buttonLabel: assets.mainVideo ? 'Заменить видео' : 'Загрузить видео',
        status: assets.mainVideo || 'Не загружено',
        meta: 'MP4 или MOV, 6-30 сек',
      },
      {
        key: 'verticalVideo',
        title: 'Вертикальная версия',
        text: 'Отдельный ролик под Stories и Reels.',
        accept: 'video/*',
        buttonLabel: assets.verticalVideo ? 'Заменить видео' : 'Добавить вертикальное видео',
        status: assets.verticalVideo || 'Не загружено',
        meta: 'Формат 9:16, до 500 МБ',
      },
      {
        key: 'videoCover',
        title: 'Обложка видео',
        text: 'Статичный кадр, который увидят до запуска воспроизведения.',
        accept: 'image/*',
        buttonLabel: assets.videoCover ? 'Заменить обложку' : 'Загрузить обложку',
        status: assets.videoCover || 'Не загружено',
        meta: 'PNG или JPG, от 1200 px',
      },
    ];
  }

  if (creative === 'stories') {
    return [
      {
        key: 'storyVisual',
        title: 'Вертикальный креатив',
        text: 'Основной материал для Stories и Reels.',
        accept: 'image/*,video/*',
        buttonLabel: assets.storyVisual ? 'Заменить файл' : 'Загрузить файл',
        status: assets.storyVisual || 'Не загружено',
        meta: '9:16, изображение или видео',
      },
      {
        key: 'feedVisual',
        title: 'Резерв для ленты',
        text: 'Дополнительная версия, если тот же оффер пойдёт и в ленту.',
        accept: 'image/*,video/*',
        buttonLabel: assets.feedVisual ? 'Заменить файл' : 'Добавить резервный файл',
        status: assets.feedVisual || 'Не загружено',
        meta: 'Опционально, 4:5 или 1.91:1',
      },
    ];
  }

  return [
    {
      key: 'feedVisual',
      title: 'Основной визуал',
      text: 'Главное изображение или короткое видео для карточки в ленте.',
      accept: 'image/*,video/*',
      buttonLabel: assets.feedVisual ? 'Заменить файл' : 'Загрузить файл',
      status: assets.feedVisual || 'Не загружено',
      meta: 'PNG, JPG или MP4',
    },
    {
      key: 'storyVisual',
      title: 'Адаптация под Stories',
      text: 'Отдельная вертикальная версия для полноэкранных размещений.',
      accept: 'image/*,video/*',
      buttonLabel: assets.storyVisual ? 'Заменить файл' : 'Добавить адаптацию',
      status: assets.storyVisual || 'Не загружено',
      meta: 'Опционально, 9:16',
    },
  ];
}
