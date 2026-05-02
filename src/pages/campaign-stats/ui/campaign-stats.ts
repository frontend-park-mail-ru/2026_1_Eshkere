import { getAds } from 'features/ads/api/get-ads';
import { getAdGroups } from 'features/ads/api/ad-groups';
import { localStorageService, LocalStorageKey } from 'shared/lib/local-storage';
import { renderTemplate } from 'shared/lib/render';
import { navigateTo } from 'shared/lib/navigation';
import campaignStatsTemplate from './campaign-stats.hbs';
import '../../../pages/stats-shared/stats.scss';

function getParams() {
  const id = parseInt(new URLSearchParams(window.location.search).get('id') ?? '', 10);
  return Number.isFinite(id) ? id : null;
}

function fmtNum(n: number): string {
  return new Intl.NumberFormat('ru-RU').format(Math.round(n));
}

function fmtMoney(n: number): string {
  return `${fmtNum(n)} ₽`;
}

function mockMetrics(seed: number, days: number) {
  const base = seed % 100;
  const impressions = (base + 1) * 1200 * days;
  const clicks = Math.round(impressions * (0.018 + base * 0.0002));
  const spend = Math.round(clicks * (12 + base * 0.3));
  const ctr = ((clicks / impressions) * 100).toFixed(2) + '%';
  const cpc = fmtMoney(Math.round(spend / clicks));
  return { impressions, clicks, spend, ctr, cpc };
}

function buildChart(container: HTMLElement, labelsEl: HTMLElement, days: number) {
  container.innerHTML = '';
  labelsEl.innerHTML = '';
  const count = Math.min(days, 14);
  const now = new Date();
  const vals: number[] = [];
  for (let i = count - 1; i >= 0; i--) {
    vals.push(Math.round(800 + Math.random() * 1200));
  }
  const max = Math.max(...vals);
  vals.forEach((v, i) => {
    const bar = document.createElement('div');
    bar.className = 'stats-chart__bar' + (i === vals.length - 1 ? ' stats-chart__bar--accent' : '');
    bar.style.height = `${Math.round((v / max) * 100)}%`;
    container.appendChild(bar);
    const lbl = document.createElement('div');
    lbl.className = 'stats-chart__label';
    const d = new Date(now);
    d.setDate(d.getDate() - (count - 1 - i));
    lbl.textContent = d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
    labelsEl.appendChild(lbl);
  });
}

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  moderation: { label: 'На модерации', cls: 'stats-badge--warning' },
  working:    { label: 'Активна',      cls: 'stats-badge--success' },
  rejected:   { label: 'Отклонена',    cls: 'stats-badge--danger'  },
  turned_off: { label: 'Остановлена',  cls: 'stats-badge--muted'   },
  not_enough_money: { label: 'Нет баланса', cls: 'stats-badge--warning' },
};

export async function renderCampaignStatsPage(): Promise<string> {
  return renderTemplate(campaignStatsTemplate, {});
}

export function CampaignStats(): VoidFunction {
  const campaignId = getParams();
  const root = document.querySelector<HTMLElement>('[data-campaign-stats]');
  if (!root || !campaignId) return () => {};

  const controller = new AbortController();
  const { signal } = controller;
  let currentDays = 7;

  root.querySelector('[data-cs-back]')?.addEventListener('click', () => {
    navigateTo(`/ads/campaign?id=${campaignId}`);
  }, { signal });

  root.querySelectorAll<HTMLButtonElement>('[data-cs-periods] [data-period]').forEach(btn => {
    btn.addEventListener('click', () => {
      root.querySelectorAll('[data-cs-periods] [data-period]').forEach(b => b.classList.remove('stats-period--active'));
      btn.classList.add('stats-period--active');
      currentDays = parseInt(btn.dataset.period ?? '7', 10);
      refresh();
    }, { signal });
  });

  async function refresh() {
    const [adsResult, groupsResult] = await Promise.all([
      getAds(),
      getAdGroups(campaignId!).catch(() => ({ ad_campaign_id: campaignId!, groups: [] })),
    ]);

    const campaign = adsResult.ads.find(a => a.id === campaignId);
    if (!campaign) return;

    const statusMeta = STATUS_LABELS[campaign.status ?? ''] ?? { label: '—', cls: 'stats-badge--muted' };
    const metrics = mockMetrics(campaignId!, currentDays);
    const dailyBudget = campaign.price ?? 0;
    const totalBudget = dailyBudget * currentDays;
    const spent = Math.min(metrics.spend, totalBudget);
    const pct = totalBudget > 0 ? Math.round((spent / totalBudget) * 100) : 0;

    (root.querySelector('[data-cs-title]') as HTMLElement).textContent = campaign.title ?? '—';

    const statusEl = root.querySelector<HTMLElement>('[data-cs-status]');
    if (statusEl) { statusEl.textContent = statusMeta.label; statusEl.className = `stats-badge ${statusMeta.cls}`; }
    (root.querySelector('[data-cs-goal]') as HTMLElement).textContent = campaign.main_action === 'look' ? 'Узнаваемость' : 'Переходы';
    (root.querySelector('[data-cs-budget]') as HTMLElement).textContent = dailyBudget ? `${fmtMoney(dailyBudget)}/день` : 'Бюджет не задан';

    const kpis: Record<string, string> = {
      impressions: fmtNum(metrics.impressions),
      clicks: fmtNum(metrics.clicks),
      ctr: metrics.ctr,
      spend: fmtMoney(metrics.spend),
      cpc: metrics.cpc,
    };
    Object.entries(kpis).forEach(([k, v]) => {
      const el = root.querySelector(`[data-cs-kpi="${k}"]`);
      if (el) el.textContent = v;
    });

    const chart = root.querySelector<HTMLElement>('[data-cs-chart]');
    const chartLabels = root.querySelector<HTMLElement>('[data-cs-chart-labels]');
    if (chart && chartLabels) buildChart(chart, chartLabels, currentDays);

    (root.querySelector('[data-cs-budget-note]') as HTMLElement).textContent = `${pct}% использовано`;
    (root.querySelector('[data-cs-budget-spent]') as HTMLElement).textContent = fmtMoney(spent);
    const bar = root.querySelector<HTMLElement>('[data-cs-budget-bar]');
    if (bar) bar.style.width = `${pct}%`;

    const tbody = root.querySelector('[data-cs-groups-table]');
    if (tbody) {
      if (groupsResult.groups.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:var(--text-note);padding:24px">Групп нет</td></tr>`;
      } else {
        tbody.innerHTML = groupsResult.groups.map((g, i) => {
          const gm = mockMetrics(g.id * 7 + i, currentDays);
          const sm = STATUS_LABELS[campaign.status ?? ''] ?? { label: '—', cls: 'stats-badge--muted' };
          return `<tr>
            <td class="stats-table__name">${g.name}</td>
            <td>${fmtNum(gm.impressions)}</td>
            <td>${fmtNum(gm.clicks)}</td>
            <td>${gm.ctr}</td>
            <td>${fmtMoney(gm.spend)}</td>
            <td><span class="stats-badge ${sm.cls}">${sm.label}</span></td>
            <td><button class="stats-table__link" data-goto-group="${g.id}">Подробнее →</button></td>
          </tr>`;
        }).join('');

        root.querySelectorAll<HTMLButtonElement>('[data-goto-group]').forEach(btn => {
          btn.addEventListener('click', () => {
            navigateTo(`/ads/stats/group?campaignId=${campaignId}&groupId=${btn.dataset.gotoGroup}`);
          });
        });
      }
    }
  }

  void refresh();
  return () => controller.abort();
}
