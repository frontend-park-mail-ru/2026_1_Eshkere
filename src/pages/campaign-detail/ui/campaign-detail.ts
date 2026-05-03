import './campaign-detail.scss';
import { getAds } from 'features/ads/api/get-ads';
import { getAdGroups, deleteAdGroup, type AdGroupResponse } from 'features/ads/api/ad-groups';
import { getAdsInGroup, deleteAdInGroup, type AdResponse } from 'features/ads/api/ads';
import { generateFeedLink } from 'features/feed-link/api/generate';
import { openFeedLinkModal } from 'widgets/feed-link-modal';
import { showToast } from 'shared/lib/toast';
import { renderTemplate } from 'shared/lib/render';
import { navigateTo } from 'shared/lib/navigation';
import campaignDetailTemplate from './campaign-detail.hbs';

const GROUPS_PER_PAGE = 4;

const REGION_LABELS: Record<number, string> = {
  1: 'Москва',
  2: 'Санкт-Петербург',
  3: 'Казань',
  4: 'Екатеринбург',
  5: 'Новосибирск',
  6: 'Краснодар',
  7: 'Нижний Новгород',
  8: 'Самара',
  9: 'Ростов-на-Дону',
  10: 'Весь РФ',
};

const TOPIC_LABELS: Record<number, string> = {
  1: 'Технологии',
  2: 'Бизнес',
  3: 'Красота и здоровье',
  4: 'Авто',
  5: 'Недвижимость',
  6: 'Еда и рестораны',
  7: 'Путешествия',
  8: 'Спорт',
  9: 'Мода',
  10: 'Образование',
};

const STATUS_META: Record<string, { label: string; tone: string }> = {
  moderation: { label: 'На модерации', tone: 'warning' },
  working: { label: 'Активно', tone: 'success' },
  rejected: { label: 'Отклонено', tone: 'danger' },
  not_enough_money: { label: 'Нет баланса', tone: 'warning' },
  turned_off: { label: 'Остановлено', tone: 'muted' },
};

const GENDER_LABELS: Record<string, string> = {
  man: 'Мужчины',
  male: 'Мужчины',
  woman: 'Женщины',
  female: 'Женщины',
  any: 'Все',
};

interface GroupWithAds extends AdGroupResponse {
  ads: Array<AdResponse & { statusLabel: string; statusTone: string }>;
  adCount: number;
  hasAds: boolean;
  regionLabel: string;
  topicLabel: string;
  genderLabel: string;
  indexLabel: string;
}

function getCampaignId(): number | null {
  const id = new URLSearchParams(window.location.search).get('id');
  const parsed = id ? parseInt(id, 10) : NaN;
  return Number.isFinite(parsed) ? parsed : null;
}

function formatBudget(value?: number): string {
  if (typeof value !== 'number' || value <= 0) {
    return 'Бюджет не задан';
  }

  return `${new Intl.NumberFormat('ru-RU').format(value)} ₽ / день`;
}

function formatGoal(action?: string): string {
  if (action === 'click') {
    return 'Переходы';
  }

  if (action === 'look') {
    return 'Показы';
  }

  return 'Цель не указана';
}

function pluralizeRu(value: number, one: string, few: string, many: string): string {
  const mod10 = value % 10;
  const mod100 = value % 100;

  if (mod10 === 1 && mod100 !== 11) {
    return one;
  }

  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
    return few;
  }

  return many;
}

function getSummary(groups: GroupWithAds[]) {
  const groupCount = groups.length;
  const adCount = groups.reduce((total, group) => total + group.adCount, 0);
  const moderationCount = groups.reduce(
    (total, group) =>
      total + group.ads.filter((ad) => ad.status === 'moderation').length,
    0,
  );
  const emptyGroupCount = groups.filter((group) => group.adCount === 0).length;

  const groupLabel = pluralizeRu(groupCount, 'группа', 'группы', 'групп');
  const adLabel = pluralizeRu(adCount, 'объявление', 'объявления', 'объявлений');

  return {
    groupCount,
    adCount,
    moderationCount,
    emptyGroupCount,
    groupText: `${groupCount} ${groupLabel}`,
    adText: `${adCount} ${adLabel}`,
    moderationText:
      moderationCount > 0 ? `${moderationCount} на модерации` : 'Нет на модерации',
    emptyGroupText:
      emptyGroupCount > 0
        ? `${emptyGroupCount} без объявлений`
        : 'Все группы заполнены',
  };
}

export async function renderCampaignDetailPage(): Promise<string> {
  const campaignId = getCampaignId();
  if (!campaignId) {
    return '<div style="padding:40px;text-align:center;color:var(--text-soft)">Кампания не найдена</div>';
  }

  const [adsResult, groupsResult] = await Promise.all([
    getAds(),
    getAdGroups(campaignId).catch(() => ({ ad_campaign_id: campaignId, groups: [] })),
  ]);

  const campaign = adsResult.ads.find((a) => a.id === campaignId);
  if (!campaign) {
    return '<div style="padding:40px;text-align:center;color:var(--text-soft)">Кампания не найдена</div>';
  }

  const groupsWithAds: GroupWithAds[] = await Promise.all(
    groupsResult.groups.map(async (group, index) => {
      const res = await getAdsInGroup(campaignId, group.id).catch(() => ({
        group_id: group.id,
        ads: [],
      }));
      const ads = res.ads.map((ad) => {
        const meta = STATUS_META[ad.status ?? ''] ?? {
          label: ad.status ?? '—',
          tone: 'muted',
        };
        return { ...ad, statusLabel: meta.label, statusTone: meta.tone };
      });

      return {
        ...group,
        indexLabel: `Группа ${index + 1}`,
        regionLabel: REGION_LABELS[group.region_id] ?? `Регион ${group.region_id}`,
        topicLabel: TOPIC_LABELS[group.topic_id] ?? `Тематика ${group.topic_id}`,
        genderLabel: GENDER_LABELS[group.gender] ?? group.gender,
        adCount: ads.length,
        hasAds: ads.length > 0,
        ads,
      };
    }),
  );

  const campaignMeta = STATUS_META[campaign.status ?? ''] ?? {
    label: '—',
    tone: 'muted',
  };
  const summary = getSummary(groupsWithAds);

  return renderTemplate(campaignDetailTemplate, {
    campaign: {
      id: campaignId,
      title: campaign.title ?? 'Без названия',
      budget: formatBudget(campaign.price),
      goal: formatGoal(campaign.main_action),
      statusLabel: campaignMeta.label,
      statusTone: campaignMeta.tone,
    },
    summary,
    groups: groupsWithAds,
    hasGroups: groupsWithAds.length > 0,
    hasPagination: groupsWithAds.length > GROUPS_PER_PAGE,
    pageSize: GROUPS_PER_PAGE,
    campaignId,
  });
}

function initGroupPagination(root: HTMLElement, signal: AbortSignal): void {
  const groups = Array.from(root.querySelectorAll<HTMLElement>('[data-group-card]'));
  const pagination = root.querySelector<HTMLElement>('[data-group-pagination]');
  const prevButton = root.querySelector<HTMLButtonElement>('[data-group-page-prev]');
  const nextButton = root.querySelector<HTMLButtonElement>('[data-group-page-next]');
  const label = root.querySelector<HTMLElement>('[data-group-page-label]');
  const pageSize = Number(root.dataset.groupPageSize || GROUPS_PER_PAGE);

  if (!pagination || !prevButton || !nextButton || !label || groups.length <= pageSize) {
    pagination?.setAttribute('hidden', 'true');
    return;
  }

  const pageCount = Math.ceil(groups.length / pageSize);
  let currentPage = 1;

  const render = (): void => {
    groups.forEach((group, index) => {
      const page = Math.floor(index / pageSize) + 1;
      group.hidden = page !== currentPage;
    });

    label.textContent = `${currentPage} / ${pageCount}`;
    prevButton.disabled = currentPage === 1;
    nextButton.disabled = currentPage === pageCount;
  };

  prevButton.addEventListener(
    'click',
    () => {
      currentPage = Math.max(1, currentPage - 1);
      render();
    },
    { signal },
  );

  nextButton.addEventListener(
    'click',
    () => {
      currentPage = Math.min(pageCount, currentPage + 1);
      render();
    },
    { signal },
  );

  render();
}

export function CampaignDetail(): VoidFunction {
  const campaignId = getCampaignId();
  const root = document.querySelector<HTMLElement>('[data-campaign-detail]');
  if (!root || !campaignId) return () => {};

  const controller = new AbortController();
  const { signal } = controller;

  initGroupPagination(root, signal);

  root.querySelector<HTMLElement>('[data-edit-campaign]')?.addEventListener('click', () => {
    navigateTo(`/ads/campaign/edit?id=${campaignId}`);
  }, { signal });

  root.querySelectorAll<HTMLElement>('[data-edit-group]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const groupId = btn.dataset.editGroup;
      if (groupId) navigateTo(`/ads/group/edit?campaignId=${campaignId}&groupId=${groupId}`);
    }, { signal });
  });

  root.querySelectorAll<HTMLElement>('[data-edit-ad]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const parts = (btn.dataset.editAd ?? '').split(':');
      const groupId = parts[0];
      const adId = parts[1];
      if (groupId && adId) navigateTo(`/ads/ad/edit?campaignId=${campaignId}&groupId=${groupId}&adId=${adId}`);
    }, { signal });
  });

  // Статистика по группе
  root.querySelectorAll<HTMLElement>('[data-stats-group]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const groupId = btn.dataset.statsGroup;
      if (groupId) navigateTo(`/ads/stats/group?campaignId=${campaignId}&groupId=${groupId}`);
    }, { signal });
  });

  // Статистика по объявлению
  root.querySelectorAll<HTMLElement>('[data-stats-ad]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const parts = (btn.dataset.statsAd ?? '').split(':');
      const groupId = parts[0];
      const adId    = parts[1];
      if (groupId && adId) {
        navigateTo(`/ads/stats/ad?campaignId=${campaignId}&groupId=${groupId}&adId=${adId}`);
      }
    }, { signal });
  });

  // Получить фид для объявления
  root.querySelectorAll<HTMLElement>('[data-feed-ad]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      btn.textContent = 'Загрузка…';
      (btn as HTMLButtonElement).disabled = true;
      try {
        const { url } = await generateFeedLink(campaignId);
        openFeedLinkModal(url);
      } catch {
        showToast('Ошибка', 'Не удалось получить код интеграции', 'error');
      } finally {
        btn.textContent = 'Получить фид';
        (btn as HTMLButtonElement).disabled = false;
      }
    }, { signal });
  });

  root.querySelectorAll<HTMLElement>('[data-add-group]').forEach((btn) => {
    btn.addEventListener(
      'click',
      () => {
        navigateTo(`/ads/group/create?campaignId=${campaignId}`);
      },
      { signal },
    );
  });

  root.querySelectorAll<HTMLElement>('[data-add-ad]').forEach((btn) => {
    btn.addEventListener(
      'click',
      () => {
        const groupId = btn.dataset.addAd;
        if (groupId) navigateTo(`/ads/ad/create?campaignId=${campaignId}&groupId=${groupId}`);
      },
      { signal },
    );
  });

  root.querySelectorAll<HTMLElement>('[data-delete-group]').forEach((btn) => {
    btn.addEventListener(
      'click',
      async () => {
        const groupId = Number(btn.dataset.deleteGroup);
        if (!groupId || !confirm('Удалить группу объявлений и все объявления в ней?')) return;
        try {
          await deleteAdGroup(campaignId, groupId);
          navigateTo(`/ads/campaign?id=${campaignId}`);
        } catch {
          alert('Не удалось удалить группу');
        }
      },
      { signal },
    );
  });

  root.querySelectorAll<HTMLElement>('[data-delete-ad]').forEach((btn) => {
    btn.addEventListener(
      'click',
      async () => {
        const parts = (btn.dataset.deleteAd ?? '').split(':').map(Number);
        const [groupId, adId] = parts;
        if (!groupId || !adId || !confirm('Удалить объявление?')) return;
        try {
          await deleteAdInGroup(campaignId, groupId, adId);
          navigateTo(`/ads/campaign?id=${campaignId}`);
        } catch {
          alert('Не удалось удалить объявление');
        }
      },
      { signal },
    );
  });

  root.querySelector<HTMLElement>('[data-back]')?.addEventListener(
    'click',
    () => {
      navigateTo('/ads');
    },
    { signal },
  );

  return () => controller.abort();
}
