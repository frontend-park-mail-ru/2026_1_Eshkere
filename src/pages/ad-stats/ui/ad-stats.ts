import { getAdsInGroup } from 'features/ads/api/ads';
import { renderTemplate } from 'shared/lib/render';
import { navigateTo } from 'shared/lib/navigation';
import adStatsTemplate from './ad-stats.hbs';
import '../../../pages/stats-shared/stats.scss';

function getParams() {
  const p = new URLSearchParams(window.location.search);
  const cId = parseInt(p.get('campaignId') ?? '', 10);
  const gId = parseInt(p.get('groupId') ?? '', 10);
  const aId = parseInt(p.get('adId') ?? '', 10);
  return {
    campaignId: Number.isFinite(cId) ? cId : null,
    groupId: Number.isFinite(gId) ? gId : null,
    adId: Number.isFinite(aId) ? aId : null,
  };
}

function fmtNum(n: number) { return new Intl.NumberFormat('ru-RU').format(Math.round(n)); }
function fmtMoney(n: number) { return `${fmtNum(n)} ₽`; }
function mockMetrics(seed: number, days: number) {
  const b = seed % 100;
  const impressions = (b + 1) * 600 * days;
  const clicks = Math.round(impressions * (0.012 + b * 0.0003));
  const spend = Math.round(clicks * (9 + b * 0.2));
  return { impressions, clicks, spend, ctr: ((clicks / impressions) * 100).toFixed(2) + '%', cpc: fmtMoney(Math.round(spend / clicks)) };
}

function buildChart(container: HTMLElement, labelsEl: HTMLElement, days: number) {
  container.innerHTML = '';
  labelsEl.innerHTML = '';
  const count = Math.min(days, 14);
  const now = new Date();
  const vals = Array.from({ length: count }, () => Math.round(50 + Math.random() * 150));
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

function buildHourChart(container: HTMLElement, labelsEl: HTMLElement) {
  container.innerHTML = '';
  labelsEl.innerHTML = '';
  const hours = [0,3,6,9,12,15,18,21];
  const vals = [8,4,6,35,62,71,85,52];
  const max = Math.max(...vals);
  vals.forEach((v, i) => {
    const bar = document.createElement('div');
    bar.className = 'stats-chart__bar' + (hours[i] >= 18 ? ' stats-chart__bar--accent' : '');
    bar.style.height = `${Math.round((v / max) * 100)}%`;
    container.appendChild(bar);
    const lbl = document.createElement('div');
    lbl.className = 'stats-chart__label';
    lbl.textContent = `${hours[i]}:00`;
    labelsEl.appendChild(lbl);
  });
}

const STATUS_LABELS: Record<string,{label:string;cls:string}> = {
  moderation:{label:'На модерации',cls:'stats-badge--warning'},
  working:{label:'Активно',cls:'stats-badge--success'},
  rejected:{label:'Отклонено',cls:'stats-badge--danger'},
  turned_off:{label:'Остановлено',cls:'stats-badge--muted'},
  not_enough_money:{label:'Нет баланса',cls:'stats-badge--warning'},
};

export async function renderAdStatsPage(): Promise<string> {
  return renderTemplate(adStatsTemplate, {});
}

export function AdStats(): VoidFunction {
  const { campaignId, groupId, adId } = getParams();
  const rootEl = document.querySelector<HTMLElement>('[data-ad-stats]');
  if (!rootEl || !campaignId || !groupId || !adId) return () => {};
  const root: HTMLElement = rootEl;

  const controller = new AbortController();
  const { signal } = controller;
  let currentDays = 7;

  root.querySelector('[data-as-back]')?.addEventListener('click', () => {
    navigateTo(`/ads/campaign?id=${campaignId}`);
  }, { signal });

  root.querySelectorAll<HTMLButtonElement>('[data-as-periods] [data-period]').forEach(btn => {
    btn.addEventListener('click', () => {
      root.querySelectorAll('[data-as-periods] [data-period]').forEach(b => b.classList.remove('stats-period--active'));
      btn.classList.add('stats-period--active');
      currentDays = parseInt(btn.dataset.period ?? '7', 10);
      void refresh();
    }, { signal });
  });

  async function refresh() {
    const adsResult = await getAdsInGroup(campaignId!, groupId!).catch(() => ({ group_id: groupId!, ads: [] }));
    const ad = adsResult.ads.find(a => a.id === adId);
    if (!ad) return;

    const metrics = mockMetrics(adId! * 7, currentDays);
    const avgCtr = (parseFloat(metrics.ctr) * 0.7).toFixed(2) + '%';
    const statusMeta = STATUS_LABELS[ad.status ?? ''] ?? { label: '—', cls: 'stats-badge--muted' };

    (root.querySelector('[data-as-title]') as HTMLElement).textContent = ad.title;
    (root.querySelector('[data-as-ad-title]') as HTMLElement).textContent = ad.title;
    (root.querySelector('[data-as-ad-desc]') as HTMLElement).textContent = ad.short_desc;
    const urlEl = root.querySelector<HTMLAnchorElement>('[data-as-ad-url]');
    if (urlEl) { urlEl.textContent = ad.target_url; urlEl.href = ad.target_url; }

    const statusEl = root.querySelector<HTMLElement>('[data-as-status]');
    if (statusEl) { statusEl.textContent = statusMeta.label; statusEl.className = `stats-badge ${statusMeta.cls}`; }
    (root.querySelector('[data-as-url]') as HTMLElement).textContent = ad.target_url;

    const imgContainer = root.querySelector<HTMLElement>('[data-as-img]');
    if (imgContainer && ad.image_url) {
      imgContainer.innerHTML = `<img src="${ad.image_url}" alt="" />`;
    }

    ['impressions','clicks','ctr','spend','cpc'].forEach(k => {
      const el = root.querySelector(`[data-as-kpi="${k}"]`);
      if (el) el.textContent = (metrics as Record<string,string|number>)[k].toString();
    });

    const chart = root.querySelector<HTMLElement>('[data-as-chart]');
    const chartLabels = root.querySelector<HTMLElement>('[data-as-chart-labels]');
    if (chart && chartLabels) buildChart(chart, chartLabels, currentDays);

    const hourChart = root.querySelector<HTMLElement>('[data-as-hour-chart]');
    const hourLabels = root.querySelector<HTMLElement>('[data-as-hour-labels]');
    if (hourChart && hourLabels) buildHourChart(hourChart, hourLabels);

    const ctrNum = parseFloat(metrics.ctr);
    const avgNum = parseFloat(avgCtr);
    const ctrPct = Math.round((ctrNum / Math.max(ctrNum, avgNum)) * 100);

    const ctrBar = root.querySelector<HTMLElement>('[data-as-ctr-bar]');
    if (ctrBar) ctrBar.style.width = `${ctrPct}%`;
    (root.querySelector('[data-as-ctr-val]') as HTMLElement).textContent = metrics.ctr;
    (root.querySelector('[data-as-ctr-avg]') as HTMLElement).textContent = avgCtr;
  }

  void refresh();
  return () => controller.abort();
}
