import './partner-overview.scss';
import { getPartnerProfile } from 'features/partner';
import {
  listPartnerBlocks,
  listPartnerSites,
  partnerSiteStatusRu,
  type PartnerSiteDto,
} from 'features/sites';
import { navigateTo } from 'shared/lib/navigation';
import { renderTemplate } from 'shared/lib/render';
import partnerOverviewTemplate from './partner-overview.hbs';

type Tone = 'success' | 'warning' | 'danger' | 'info' | 'muted';

interface SiteWorkState {
  blocksCount: number;
  activeBlocksCount: number;
  site: PartnerSiteDto;
}

interface StatItem {
  label: string;
  note: string;
  tone: Tone;
  value: string;
}

function formatMoney(value: number, currency = 'RUB'): string {
  const resolvedCurrency = currency.trim() || 'RUB';
  return new Intl.NumberFormat('ru-RU', {
    currency: resolvedCurrency,
    maximumFractionDigits: 0,
    style: 'currency',
  }).format(Math.max(0, value));
}

async function loadSitesWithBlocks(): Promise<SiteWorkState[]> {
  const { sites } = await listPartnerSites();

  return await Promise.all(
    sites.map(async (site) => {
      try {
        const { blocks } = await listPartnerBlocks(site.id);
        return {
          activeBlocksCount: blocks.filter((block) => block.status === 'active')
            .length,
          blocksCount: blocks.length,
          site,
        };
      } catch {
        return {
          activeBlocksCount: 0,
          blocksCount: 0,
          site,
        };
      }
    }),
  );
}

function buildStats(
  sites: SiteWorkState[],
  balance: string,
  hasBalance: boolean,
): StatItem[] {
  const activeSites = sites.filter(
    (item) => item.site.status === 'active',
  ).length;
  const pendingSites = sites.filter(
    (item) => item.site.status === 'pending_review',
  ).length;
  const blockCount = sites.reduce((total, item) => total + item.blocksCount, 0);
  const activeBlocks = sites.reduce(
    (total, item) => total + item.activeBlocksCount,
    0,
  );

  return [
    {
      label: 'Баланс партнера',
      note: hasBalance
        ? 'Доступно к будущим выплатам'
        : 'Загрузим из профиля партнера',
      tone: hasBalance ? 'success' : 'warning',
      value: balance,
    },
    {
      label: 'Площадки',
      note: `${activeSites} активных, ${pendingSites} на модерации`,
      tone: activeSites > 0 ? 'info' : pendingSites > 0 ? 'warning' : 'muted',
      value: String(sites.length),
    },
    {
      label: 'Рекламные блоки',
      note: `${activeBlocks} включено сейчас`,
      tone: activeBlocks > 0 ? 'success' : blockCount > 0 ? 'warning' : 'muted',
      value: String(blockCount),
    },
    {
      label: 'Доход',
      note: 'Детализация появится в отчете по показам',
      tone: 'muted',
      value: '—',
    },
  ];
}

function buildSetupSteps(sites: SiteWorkState[]) {
  const hasSite = sites.length > 0;
  const hasReviewedSite = sites.some((item) =>
    ['active', 'pending_review'].includes(String(item.site.status)),
  );
  const hasBlock = sites.some((item) => item.blocksCount > 0);
  const hasActiveBlock = sites.some((item) => item.activeBlocksCount > 0);

  return [
    {
      complete: hasSite,
      href: '/partner/sites/create',
      label: 'Добавьте площадку',
      text: hasSite
        ? 'Площадка уже создана.'
        : 'Укажите домен, чтобы начать подключение.',
    },
    {
      complete: hasReviewedSite,
      href: '/partner/sites',
      label: 'Проверьте статус модерации',
      text: hasReviewedSite
        ? 'Статусы площадок видны в списке.'
        : 'После создания площадка должна пройти проверку.',
    },
    {
      complete: hasBlock,
      href: hasSite
        ? `/partner/sites/site?siteId=${sites[0].site.id}`
        : '/partner/sites',
      label: 'Создайте рекламный блок',
      text: hasBlock
        ? 'Блоки уже есть на площадках.'
        : 'Выберите формат и получите код вставки.',
    },
    {
      complete: hasActiveBlock,
      href: '/partner/income',
      label: 'Следите за доходом',
      text: hasActiveBlock
        ? 'Активные блоки готовы к отчетности.'
        : 'После установки кода здесь появятся показатели.',
    },
  ];
}

function buildAttentionItems(sites: SiteWorkState[]) {
  const attention = sites
    .filter((item) => item.site.status !== 'active' || item.blocksCount === 0)
    .slice(0, 4)
    .map((item) => {
      const status = String(item.site.status || 'draft');
      const needsBlock = item.blocksCount === 0;
      return {
        href: `/partner/sites/site?siteId=${item.site.id}`,
        meta: needsBlock
          ? 'Создайте блок и получите код для сайта.'
          : `Статус площадки: ${partnerSiteStatusRu(status)}.`,
        status: needsBlock ? 'Нет блоков' : partnerSiteStatusRu(status),
        title: item.site.site_name || item.site.domain,
        tone: needsBlock ? 'warning' : status === 'blocked' ? 'danger' : 'info',
      };
    });

  if (attention.length > 0) {
    return attention;
  }

  return [
    {
      href: '/partner/income',
      meta: 'Следующий рабочий шаг — проверить первые показатели монетизации.',
      status: 'Готово',
      title: 'Площадки и блоки собраны',
      tone: 'success',
    },
  ];
}

export async function renderPartnerOverviewPage(): Promise<string> {
  const [sitesResult, profileResult] = await Promise.allSettled([
    loadSitesWithBlocks(),
    getPartnerProfile(),
  ]);
  const sites = sitesResult.status === 'fulfilled' ? sitesResult.value : [];
  const profile =
    profileResult.status === 'fulfilled' ? profileResult.value : null;
  const hasBalance = typeof profile?.balance === 'number';
  const balance = hasBalance
    ? formatMoney(profile.balance, profile.payout_currency)
    : '—';

  return await renderTemplate(partnerOverviewTemplate, {
    attentionItems: buildAttentionItems(sites),
    balance,
    hasSites: sites.length > 0,
    loadError:
      sitesResult.status === 'rejected'
        ? 'Не удалось загрузить площадки. Рабочие действия доступны из меню.'
        : '',
    setupSteps: buildSetupSteps(sites),
    sites: sites.slice(0, 4).map((item) => ({
      activeBlocksCount: item.activeBlocksCount,
      blocksCount: item.blocksCount,
      domain: item.site.domain,
      href: `/partner/sites/site?siteId=${item.site.id}`,
      name: item.site.site_name || item.site.domain,
      status: partnerSiteStatusRu(item.site.status),
    })),
    stats: buildStats(sites, balance, hasBalance),
  });
}

export function PartnerOverview(): VoidFunction {
  const controller = new AbortController();
  const root = document.querySelector<HTMLElement>('[data-partner-links]');

  root?.querySelectorAll<HTMLAnchorElement>('a[href]').forEach((link) => {
    link.addEventListener(
      'click',
      (event) => {
        const href = link.getAttribute('href');
        if (!href) {
          return;
        }
        event.preventDefault();
        navigateTo(href);
      },
      { signal: controller.signal },
    );
  });

  return () => controller.abort();
}
