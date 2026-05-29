import './campaign-statistics.scss';
import { navigateTo } from 'shared/lib/navigation';
import { LocalStorageKey, localStorageService } from 'shared/lib/local-storage';
import { renderTemplate } from 'shared/lib/render';
import { getCampaignStats, periodDates, type CampaignStatsResponse } from 'features/ads/api/stats';
import {
  type CampaignStatisticsSeed,
  type StatisticsPeriodData,
  type StatisticsPeriodKey,
} from '../model/mock';
import {
  buildCampaignStatisticsContext,
  type CampaignStatisticsUiState,
  type StatisticsMetricKey,
} from '../model/view-model';
import campaignStatisticsTemplate from './campaign-statistics.hbs';

let campaignStatisticsLifecycleController: AbortController | null = null;

// Module-level live data — reset on each page mount
let currentLiveData: Partial<Record<StatisticsPeriodKey, StatisticsPeriodData>> | undefined;

function getStatisticsSeed(): CampaignStatisticsSeed | null {
  return (
    localStorageService.getJson<CampaignStatisticsSeed>(
      LocalStorageKey.CampaignStatisticsSeed,
    ) ||
    localStorageService.getJson<CampaignStatisticsSeed>(
      LocalStorageKey.CampaignEditSeed,
    )
  );
}

// ─── API → view-model data mapping ──────────────────────────────────────────

const DAY_ABBREV = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
const MONTH_SHORT = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];

function isoToLabel(dateStr: string, total: number): string {
  const d = new Date(`${dateStr}T00:00:00`);
  if (total <= 7)  return DAY_ABBREV[d.getDay()];
  if (total <= 14) return `${d.getDate()} ${MONTH_SHORT[d.getMonth()]}`;
  return String(d.getDate());
}

function isoToDisplay(dateStr: string): string {
  const [y, m, day] = dateStr.split('-');
  return `${day}.${m}.${y}`;
}

function apiToPeriodData(res: CampaignStatsResponse): StatisticsPeriodData {
  return {
    from: isoToDisplay(res.period.from),
    to:   isoToDisplay(res.period.to),
    timeline: res.timeline.map((pt, _, arr) => ({
      label:       isoToLabel(pt.date, arr.length),
      impressions: pt.impressions,
      clicks:      pt.clicks,
      spend:       pt.spend,
    })),
    placements: res.placements.map((p) => ({
      name:        p.name,
      impressions: p.impressions,
      clicks:      p.clicks,
      spend:       p.spend,
    })),
    previousTotals: {
      impressions: res.previous_totals.impressions,
      clicks:      res.previous_totals.clicks,
      spend:       res.previous_totals.spend,
    },
  };
}

// ─── Rendering ───────────────────────────────────────────────────────────────

function renderStatisticsPageContent(
  uiState: CampaignStatisticsUiState,
): Promise<string> {
  const context = buildCampaignStatisticsContext(
    getStatisticsSeed(),
    uiState,
    currentLiveData,
  );
  return renderTemplate(
    campaignStatisticsTemplate,
    context as unknown as Record<string, unknown>,
  );
}

export async function renderCampaignStatisticsPage(): Promise<string> {
  return renderStatisticsPageContent({ period: '7d', metric: 'impressions' });
}

// ─── Page controller ─────────────────────────────────────────────────────────

export function CampaignStatistics(): void | VoidFunction {
  const root = document.querySelector<HTMLElement>('[data-campaign-statistics-page]');
  if (!root) return;

  if (campaignStatisticsLifecycleController) {
    campaignStatisticsLifecycleController.abort();
  }

  const controller = new AbortController();
  campaignStatisticsLifecycleController = controller;
  const { signal } = controller;

  // Reset live data for this mount
  currentLiveData = undefined;

  const uiState: CampaignStatisticsUiState = {
    period: '7d',
    metric: 'impressions',
  };

  const rerender = async (): Promise<void> => {
    const currentRoot = document.querySelector<HTMLElement>('[data-campaign-statistics-page]');
    if (!currentRoot) return;
    currentRoot.outerHTML = await renderStatisticsPageContent(uiState);
  };

  // ── Fetch real stats ──────────────────────────────────────────────────────

  const seed = getStatisticsSeed();
  const campaignId = seed?.id ? parseInt(seed.id, 10) : NaN;

  if (Number.isFinite(campaignId)) {
    const dates7  = periodDates(7);
    const dates30 = periodDates(30);

    Promise.allSettled([
      getCampaignStats(campaignId, dates7.from,  dates7.to),
      getCampaignStats(campaignId, dates30.from, dates30.to),
    ]).then(([res7, res30]) => {
      if (signal.aborted) return;

      const live: Partial<Record<StatisticsPeriodKey, StatisticsPeriodData>> = {};

      if (res7.status  === 'fulfilled' && res7.value.timeline.length  > 0) live['7d']  = apiToPeriodData(res7.value);
      if (res30.status === 'fulfilled' && res30.value.timeline.length > 0) live['30d'] = apiToPeriodData(res30.value);

      if (Object.keys(live).length > 0) {
        currentLiveData = live;
        void rerender();
      }
    }).catch(() => { /* network error — keep showing mock */ });
  }

  // ── UI interactions ───────────────────────────────────────────────────────

  const setPeriodSelectOpen = (open: boolean): void => {
    const select  = document.querySelector<HTMLElement>('[data-statistics-select="period"]');
    const trigger = select?.querySelector<HTMLElement>('[data-statistics-select-trigger]');
    const menu    = select?.querySelector<HTMLElement>('[data-statistics-select-menu]');

    if (!select || !trigger || !menu) return;

    select.classList.toggle('is-open', open);
    trigger.setAttribute('aria-expanded', open ? 'true' : 'false');
    menu.hidden = !open;
  };

  document.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const backButton = target.closest<HTMLElement>('[data-statistics-back]');
    if (backButton) {
      event.preventDefault();
      navigateTo('/ads');
      return;
    }

    const editButton = target.closest<HTMLElement>('[data-statistics-edit]');
    if (editButton) {
      event.preventDefault();
      const seed = getStatisticsSeed();
      if (seed) localStorageService.setJson(LocalStorageKey.CampaignEditSeed, seed);
      navigateTo('/ads/edit');
      return;
    }

    const periodTrigger = target.closest<HTMLElement>('[data-statistics-select-trigger]');
    if (periodTrigger) {
      event.preventDefault();
      setPeriodSelectOpen(periodTrigger.getAttribute('aria-expanded') !== 'true');
      return;
    }

    const periodButton = target.closest<HTMLElement>('[data-statistics-period]');
    if (periodButton) {
      const nextPeriod = periodButton.dataset.statisticsPeriod as CampaignStatisticsUiState['period'] | undefined;
      if (!nextPeriod || nextPeriod === uiState.period) return;
      uiState.period = nextPeriod;
      setPeriodSelectOpen(false);
      void rerender();
      return;
    }

    const metricButton = target.closest<HTMLElement>('[data-statistics-metric]');
    if (metricButton) {
      const nextMetric = metricButton.dataset.statisticsMetric as StatisticsMetricKey | undefined;
      if (!nextMetric || nextMetric === uiState.metric) return;
      uiState.metric = nextMetric;
      void rerender();
      return;
    }

    const chartActionButton = target.closest<HTMLElement>('[data-statistics-chart-action]');
    if (chartActionButton) {
      const dest = chartActionButton.dataset.statisticsChartAction === 'placements'
        ? document.querySelector<HTMLElement>('[data-statistics-placements]')
        : document.querySelector<HTMLElement>('[data-statistics-insights]');
      dest?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }

    if (target.closest<HTMLElement>('[data-statistics-placements-action]')) {
      document.querySelector<HTMLElement>('[data-statistics-insights]')
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }

    if (!target.closest('[data-statistics-select="period"]')) {
      setPeriodSelectOpen(false);
    }
  }, { signal });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') setPeriodSelectOpen(false);
  }, { signal });

  return () => {
    if (campaignStatisticsLifecycleController === controller) {
      campaignStatisticsLifecycleController = null;
    }
    controller.abort();
  };
}
