import './campaign-statistics.scss';
import { navigateTo } from 'shared/lib/navigation';
import { LocalStorageKey, localStorageService } from 'shared/lib/local-storage';
import { renderTemplate } from 'shared/lib/render';
import {
  type CampaignStatisticsSeed,
} from '../model/mock';
import {
  buildCampaignStatisticsContext,
  type CampaignStatisticsUiState,
  type StatisticsMetricKey,
} from '../model/view-model';
import campaignStatisticsTemplate from './campaign-statistics.hbs';

let campaignStatisticsLifecycleController: AbortController | null = null;

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

function renderStatisticsPageContent(
  uiState: CampaignStatisticsUiState,
): Promise<string> {
  const context = buildCampaignStatisticsContext(getStatisticsSeed(), uiState);
  return renderTemplate(
    campaignStatisticsTemplate,
    context as unknown as Record<string, unknown>,
  );
}

export async function renderCampaignStatisticsPage(): Promise<string> {
  return renderStatisticsPageContent({
    period: '7d',
    metric: 'impressions',
  });
}

export function CampaignStatistics(): void | VoidFunction {
  const root = document.querySelector<HTMLElement>(
    '[data-campaign-statistics-page]',
  );

  if (!root) {
    return;
  }

  if (campaignStatisticsLifecycleController) {
    campaignStatisticsLifecycleController.abort();
  }

  const controller = new AbortController();
  campaignStatisticsLifecycleController = controller;
  const { signal } = controller;

  const uiState: CampaignStatisticsUiState = {
    period: '7d',
    metric: 'impressions',
  };

  const setPeriodSelectOpen = (open: boolean): void => {
    const select = document.querySelector<HTMLElement>(
      '[data-statistics-select="period"]',
    );
    const trigger = select?.querySelector<HTMLElement>(
      '[data-statistics-select-trigger]',
    );
    const menu = select?.querySelector<HTMLElement>('[data-statistics-select-menu]');

    if (!select || !trigger || !menu) {
      return;
    }

    select.classList.toggle('is-open', open);
    trigger.setAttribute('aria-expanded', open ? 'true' : 'false');
    menu.hidden = !open;
  };

  const rerender = async (): Promise<void> => {
    const currentRoot = document.querySelector<HTMLElement>(
      '[data-campaign-statistics-page]',
    );

    if (!currentRoot) {
      return;
    }

    currentRoot.outerHTML = await renderStatisticsPageContent(uiState);
  };

  document.addEventListener(
    'click',
    (event) => {
      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }

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

        if (seed) {
          localStorageService.setJson(LocalStorageKey.CampaignEditSeed, seed);
        }

        navigateTo('/ads/edit');
        return;
      }

      const periodTrigger = target.closest<HTMLElement>(
        '[data-statistics-select-trigger]',
      );
      if (periodTrigger) {
        event.preventDefault();
        const expanded = periodTrigger.getAttribute('aria-expanded') === 'true';
        setPeriodSelectOpen(!expanded);
        return;
      }

      const periodButton = target.closest<HTMLElement>('[data-statistics-period]');
      if (periodButton) {
        const nextPeriod = periodButton.dataset.statisticsPeriod as
          | CampaignStatisticsUiState['period']
          | undefined;

        if (!nextPeriod || nextPeriod === uiState.period) {
          return;
        }

        uiState.period = nextPeriod;
        setPeriodSelectOpen(false);
        void rerender();
        return;
      }

      const metricButton = target.closest<HTMLElement>('[data-statistics-metric]');
      if (metricButton) {
        const nextMetric = metricButton.dataset.statisticsMetric as
          | StatisticsMetricKey
          | undefined;

        if (!nextMetric || nextMetric === uiState.metric) {
          return;
        }

        uiState.metric = nextMetric;
        void rerender();
        return;
      }

      const chartActionButton = target.closest<HTMLElement>(
        '[data-statistics-chart-action]',
      );
      if (chartActionButton) {
        const nextTarget = chartActionButton.dataset.statisticsChartAction;
        const destination =
          nextTarget === 'placements'
            ? document.querySelector<HTMLElement>('[data-statistics-placements]')
            : document.querySelector<HTMLElement>('[data-statistics-insights]');

        destination?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
        return;
      }

      const placementsActionButton = target.closest<HTMLElement>(
        '[data-statistics-placements-action]',
      );
      if (placementsActionButton) {
        document
          .querySelector<HTMLElement>('[data-statistics-insights]')
          ?.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
          });
        return;
      }

      if (!target.closest('[data-statistics-select="period"]')) {
        setPeriodSelectOpen(false);
      }
    },
    { signal },
  );

  document.addEventListener(
    'keydown',
    (event) => {
      if (event.key === 'Escape') {
        setPeriodSelectOpen(false);
      }
    },
    { signal },
  );

  return () => {
    if (campaignStatisticsLifecycleController === controller) {
      campaignStatisticsLifecycleController = null;
    }
    controller.abort();
  };
}
