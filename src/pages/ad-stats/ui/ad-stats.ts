import { getAdsInGroup } from 'features/ads/api/ads';
import { renderTemplate } from 'shared/lib/render';
import { navigateTo } from 'shared/lib/navigation';
import adStatsTemplate from './ad-stats.hbs';
import '../../../pages/stats-shared/stats.scss';
import './ad-stats.scss';

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

function fmtNum(n: number) {
  return new Intl.NumberFormat('ru-RU').format(Math.round(n));
}
function fmtMoney(n: number) {
  return `${fmtNum(n)} ₽`;
}
function fmtPct(n: number, decimals = 2) {
  return n.toFixed(decimals) + '%';
}

function seeded(seed: number, min: number, max: number) {
  const x = Math.sin(seed + 1) * 10000;
  return min + ((x - Math.floor(x)) * (max - min));
}

function mockMetrics(adId: number, days: number) {
  const b = adId % 100;
  const impressions = Math.round((b + 1) * 600 * days);
  const clicks = Math.round(impressions * (0.012 + b * 0.0003));
  const spend = Math.round(clicks * (9 + b * 0.2));
  const ctr = (clicks / impressions) * 100;
  const cpc = spend / clicks;
  const conversions = Math.round(clicks * 0.044);
  return { impressions, clicks, spend, ctr, cpc, conversions };
}

function mockDeltas(adId: number) {
  const signs = ['+', '+', '+', '-', '+', '+'];
  const vals = [0.8, 22, 18, 0.19, 15, 31];
  const units = [' сс', '%', '%', ' ₽', '%', '%'];
  return { signs, vals, units };
}

// ── Line chart (SVG) ──────────────────────────────────────────────────────────

type ChartMetric = 'ctr' | 'impressions' | 'clicks';

function buildLineChart(
  svgEl: SVGSVGElement,
  labelsEl: HTMLElement,
  adId: number,
  days: number,
  metric: ChartMetric,
) {
  const count = Math.min(days === 0 ? 30 : days, 30);
  const W = 360;
  const H = 140;
  const PAD = { top: 10, right: 8, bottom: 4, left: 8 };
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;

  const base = mockMetrics(adId, 1);
  const rawVals = Array.from({ length: count }, (_, i) => {
    const noise = seeded(adId * 31 + i * 7, 0.94, 1.06);
    const trend = 1 + i * 0.018;
    if (metric === 'ctr') return base.ctr * noise * trend;
    if (metric === 'impressions') return base.impressions * noise * trend;
    return base.clicks * noise * trend;
  });

  const minV = Math.min(...rawVals) * 0.9;
  const maxV = Math.max(...rawVals) * 1.05;

  const toX = (i: number) => PAD.left + (i / (count - 1)) * innerW;
  const toY = (v: number) => PAD.top + innerH - ((v - minV) / (maxV - minV)) * innerH;

  const pts = rawVals.map((v, i) => ({ x: toX(i), y: toY(v) }));

  const lineD = pts.map((p, i) => (i === 0 ? `M${p.x},${p.y}` : `L${p.x},${p.y}`)).join(' ');
  const areaD = `${lineD} L${pts[pts.length - 1].x},${H} L${pts[0].x},${H} Z`;

  // preserve defs
  const defs = svgEl.querySelector('defs');
  svgEl.innerHTML = '';
  if (defs) svgEl.appendChild(defs);

  // grid lines
  [0.25, 0.5, 0.75, 1].forEach((f) => {
    const y = PAD.top + innerH * (1 - f);
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('class', 'as-line-chart__grid');
    line.setAttribute('x1', String(PAD.left));
    line.setAttribute('y1', String(y));
    line.setAttribute('x2', String(W - PAD.right));
    line.setAttribute('y2', String(y));
    svgEl.appendChild(line);
  });

  const area = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  area.setAttribute('class', 'as-line-chart__area');
  area.setAttribute('d', areaD);
  svgEl.appendChild(area);

  const line = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  line.setAttribute('class', 'as-line-chart__line');
  line.setAttribute('d', lineD);
  svgEl.appendChild(line);

  pts.forEach((p) => {
    const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    dot.setAttribute('class', 'as-line-chart__dot');
    dot.setAttribute('cx', String(p.x));
    dot.setAttribute('cy', String(p.y));
    dot.setAttribute('r', '3.5');
    svgEl.appendChild(dot);
  });

  // labels — show up to 6 evenly spaced
  labelsEl.innerHTML = '';
  const step = Math.max(1, Math.floor(count / 6));
  const now = new Date();
  for (let i = 0; i < count; i += step) {
    const d = new Date(now);
    d.setDate(d.getDate() - (count - 1 - i));
    const lbl = document.createElement('span');
    lbl.className = 'as-line-label';
    lbl.textContent = d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
    labelsEl.appendChild(lbl);
  }
}

// ── Day activity bar chart ────────────────────────────────────────────────────

function buildDayChart(
  valuesEl: HTMLElement,
  chartEl: HTMLElement,
  labelsEl: HTMLElement,
  adId: number,
) {
  const days = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
  const vals = days.map((_, i) => Math.round(seeded(adId * 13 + i * 5, 1.5, 5.0) * 10) / 10);
  const max = Math.max(...vals);

  valuesEl.innerHTML = '';
  chartEl.innerHTML = '';
  labelsEl.innerHTML = '';

  const today = new Date().getDay();
  const todayIdx = today === 0 ? 6 : today - 1;

  vals.forEach((v, i) => {
    const vEl = document.createElement('div');
    vEl.className = 'as-day-value';
    vEl.textContent = v.toFixed(1) + '%';
    valuesEl.appendChild(vEl);

    const bar = document.createElement('div');
    bar.className =
      'as-bar-chart__bar' + (i === todayIdx ? ' as-bar-chart__bar--accent' : '');
    bar.style.height = `${Math.round((v / max) * 100)}%`;
    chartEl.appendChild(bar);

    const lbl = document.createElement('div');
    lbl.className = 'as-bar-label';
    lbl.textContent = days[i];
    labelsEl.appendChild(lbl);
  });
}

// ── A/B test ──────────────────────────────────────────────────────────────────

const AB_FIELDS: Array<{ label: string; key: string }> = [
  { label: 'CTR',        key: 'ctr' },
  { label: 'Клики',      key: 'clicks' },
  { label: 'CPC',        key: 'cpc' },
  { label: 'Конверсии',  key: 'conv' },
  { label: 'Расход',     key: 'spend' },
];

function fillAbVariant(
  container: HTMLElement,
  data: Record<string, string>,
) {
  container.innerHTML = '';
  AB_FIELDS.forEach(({ label, key }) => {
    const row = document.createElement('div');
    row.className = 'as-ab-row';
    row.innerHTML = `<span>${label}</span><span>${data[key] ?? '—'}</span>`;
    container.appendChild(row);
  });
}

// ── Funnel ────────────────────────────────────────────────────────────────────

const FUNNEL_COLORS = ['#5855ff', '#22c55e', '#f59e0b', '#ef4444'];
const FUNNEL_STAGES = ['Показы', 'Клики', 'Лендинг', 'Заявка'];

function buildFunnel(container: HTMLElement, impressions: number, clicks: number) {
  const landing = Math.round(clicks * 0.76);
  const leads = Math.round(landing * 0.058);
  const values = [impressions, clicks, landing, leads];
  const topVal = impressions;

  container.innerHTML = '';
  values.forEach((v, i) => {
    const pct = ((v / topVal) * 100).toFixed(0) + '%';
    const row = document.createElement('div');
    row.className = 'as-funnel__row';
    row.innerHTML = `
      <div class="as-funnel__num">${i + 1}</div>
      <div class="as-funnel__stage">${FUNNEL_STAGES[i]}</div>
      <div class="as-funnel__bar-wrap">
        <div class="as-funnel__bar" style="width:${pct};background:${FUNNEL_COLORS[i]}"></div>
      </div>
      <div class="as-funnel__value">${fmtNum(v)}</div>
      <div class="as-funnel__pct">${i === 0 ? '100%' : fmtPct((v / topVal) * 100, 2)}</div>
    `;
    container.appendChild(row);
  });
}

// ── Platform table ────────────────────────────────────────────────────────────

interface PlatformRow {
  name: string;
  iconClass: string;
  iconText: string;
  impressions: number;
  clicks: number;
  spend: number;
}

function buildPlatformTable(tbody: HTMLElement, adId: number, totalImpr: number, totalClicks: number, totalSpend: number) {
  const platforms: PlatformRow[] = [
    { name: 'ВКонтакте', iconClass: 'as-platform-icon--vk', iconText: 'ВК',
      impressions: Math.round(totalImpr * 0.677),
      clicks: Math.round(totalClicks * 0.7),
      spend: Math.round(totalSpend * 0.7) },
    { name: 'Telegram', iconClass: 'as-platform-icon--tg', iconText: 'TG',
      impressions: totalImpr - Math.round(totalImpr * 0.677),
      clicks: totalClicks - Math.round(totalClicks * 0.7),
      spend: totalSpend - Math.round(totalSpend * 0.7) },
  ];

  tbody.innerHTML = '';
  platforms.forEach((p) => {
    const ctr = (p.clicks / p.impressions) * 100;
    const cpc = p.spend / p.clicks;
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>
        <span class="as-platform-icon ${p.iconClass}">${p.iconText}</span>
        <span class="stats-table__name">${p.name}</span>
      </td>
      <td>${fmtNum(p.impressions)}</td>
      <td>${fmtNum(p.clicks)}</td>
      <td style="color:var(--primary-active);font-weight:700">${fmtPct(ctr)}</td>
      <td>${fmtMoney(p.spend)}</td>
      <td>${fmtMoney(cpc)}</td>
    `;
    tbody.appendChild(tr);
  });
}

// ── Status labels ──────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  moderation:       { label: 'На модерации', cls: 'stats-badge--warning' },
  working:          { label: 'Активно',      cls: 'stats-badge--success' },
  rejected:         { label: 'Отклонено',    cls: 'stats-badge--danger'  },
  turned_off:       { label: 'Остановлено',  cls: 'stats-badge--muted'   },
  not_enough_money: { label: 'Нет баланса',  cls: 'stats-badge--warning' },
};

// ── Page entry points ─────────────────────────────────────────────────────────

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
  let currentMetric: ChartMetric = 'ctr';

  // back / breadcrumb navigation
  root.querySelector('[data-as-back]')?.addEventListener('click', () => {
    navigateTo(`/ads/stats/group?campaignId=${campaignId}&groupId=${groupId}`);
  }, { signal });

  root.querySelector('[data-as-bc-campaigns]')?.addEventListener('click', () => {
    navigateTo('/ads');
  }, { signal });

  root.querySelector('[data-as-bc-campaign]')?.addEventListener('click', () => {
    navigateTo(`/ads/stats/campaign?campaignId=${campaignId}`);
  }, { signal });

  root.querySelector('[data-as-bc-group]')?.addEventListener('click', () => {
    navigateTo(`/ads/stats/group?campaignId=${campaignId}&groupId=${groupId}`);
  }, { signal });

  root.querySelector('[data-as-edit]')?.addEventListener('click', () => {
    navigateTo(`/ads/ad/edit?campaignId=${campaignId}&groupId=${groupId}&adId=${adId}`);
  }, { signal });

  // period tabs
  root.querySelectorAll<HTMLButtonElement>('.stats-periods [data-period]').forEach((btn) => {
    btn.addEventListener('click', () => {
      root.querySelectorAll('.stats-periods [data-period]').forEach((b) =>
        b.classList.remove('stats-period--active'),
      );
      btn.classList.add('stats-period--active');
      currentDays = parseInt(btn.dataset.period ?? '7', 10);
      void refresh();
    }, { signal });
  });

  // metric tabs
  root.querySelectorAll<HTMLButtonElement>('[data-as-metric-tabs] [data-metric]').forEach((btn) => {
    btn.addEventListener('click', () => {
      root.querySelectorAll('[data-as-metric-tabs] [data-metric]').forEach((b) =>
        b.classList.remove('as-metric-tab--active'),
      );
      btn.classList.add('as-metric-tab--active');
      currentMetric = (btn.dataset.metric as ChartMetric) ?? 'ctr';
      const svgEl = root.querySelector<SVGSVGElement>('[data-as-line-chart]');
      const labelsEl = root.querySelector<HTMLElement>('[data-as-line-labels]');
      if (svgEl && labelsEl) buildLineChart(svgEl, labelsEl, adId!, currentDays, currentMetric);
    }, { signal });
  });

  async function refresh() {
    const adsResult = await getAdsInGroup(campaignId!, groupId!).catch(() => ({
      group_id: groupId!,
      ads: [],
    }));
    const ad = adsResult.ads.find((a) => a.id === adId);
    if (!ad) return;

    const days = currentDays === 0 ? 30 : currentDays;
    const m = mockMetrics(adId!, days);
    const statusMeta = STATUS_LABELS[ad.status ?? ''] ?? { label: '—', cls: 'stats-badge--muted' };

    // hero
    (root.querySelector('[data-as-title]') as HTMLElement).textContent = ad.title;
    (root.querySelector('[data-as-id]') as HTMLElement).textContent = `ID: ${adId}-A`;

    const statusEl = root.querySelector<HTMLElement>('[data-as-status]');
    if (statusEl) {
      statusEl.textContent = statusMeta.label;
      statusEl.className = `stats-badge ${statusMeta.cls}`;
    }

    const bestEl = root.querySelector<HTMLElement>('[data-as-best]');
    if (bestEl && adId! % 3 === 1) bestEl.hidden = false;

    // breadcrumbs / hierarchy (mock names)
    const campaignName = `Кампания ${campaignId}`;
    const groupName = `Группа ${groupId}`;
    (root.querySelector('[data-as-bc-campaign]') as HTMLElement).textContent = campaignName;
    (root.querySelector('[data-as-bc-group]') as HTMLElement).textContent = groupName;
    (root.querySelector('[data-as-hc-campaign]') as HTMLElement).textContent = campaignName;
    (root.querySelector('[data-as-hc-group]') as HTMLElement).textContent = groupName;
    (root.querySelector('[data-as-hc-ad]') as HTMLElement).textContent = ad.title;

    // metrics
    const deltasMeta = mockDeltas(adId!);
    const kpiValues: Record<string, string> = {
      ctr:         fmtPct(m.ctr),
      impressions: fmtNum(m.impressions),
      clicks:      fmtNum(m.clicks),
      cpc:         fmtMoney(m.cpc),
      spend:       fmtMoney(m.spend),
      conversions: fmtNum(m.conversions),
    };
    Object.entries(kpiValues).forEach(([k, v]) => {
      const el = root.querySelector<HTMLElement>(`[data-as-kpi="${k}"]`);
      if (el) el.textContent = v;
    });

    const deltaKeys = ['ctr', 'impressions', 'clicks', 'cpc', 'spend', 'conversions'];
    deltaKeys.forEach((k, i) => {
      const el = root.querySelector<HTMLElement>(`[data-as-delta="${k}"]`);
      if (!el) return;
      const sign = deltasMeta.signs[i];
      const val = deltasMeta.vals[i];
      const unit = deltasMeta.units[i];
      el.textContent = `${sign}${val}${unit}`;
      el.classList.remove('as-metric__delta--up', 'as-metric__delta--down');
      el.classList.add(sign === '+' ? 'as-metric__delta--up' : 'as-metric__delta--down');
    });

    // creative
    (root.querySelector('[data-as-ad-title]') as HTMLElement).textContent = ad.title;
    (root.querySelector('[data-as-ad-desc]') as HTMLElement).textContent = ad.short_desc;
    (root.querySelector('[data-as-cta-btn]') as HTMLElement).textContent = 'Перейти в магазин';

    const imgContainer = root.querySelector<HTMLElement>('[data-as-img]');
    if (imgContainer) {
      if (ad.image_url) {
        imgContainer.innerHTML = `<img src="${ad.image_url}" alt="" />`;
      } else {
        imgContainer.textContent = 'Изображение не загружено';
      }
    }

    const tagsEl = root.querySelector<HTMLElement>('[data-as-tags]');
    if (tagsEl) {
      const tags = ['240×400', 'JPG · 87 КБ', 'ВКонтакте', 'Sidebar'];
      tagsEl.innerHTML = tags
        .map((t) => `<span class="as-creative__tag">${t}</span>`)
        .join('');
    }

    // chart period label
    const now = new Date();
    const from = new Date(now);
    from.setDate(now.getDate() - (days - 1));
    const opts: Intl.DateTimeFormatOptions = { month: 'long', year: 'numeric' };
    (root.querySelector('[data-as-chart-period]') as HTMLElement).textContent =
      from.toLocaleDateString('ru-RU', opts);

    // line chart
    const svgEl = root.querySelector<SVGSVGElement>('[data-as-line-chart]');
    const lineLabelsEl = root.querySelector<HTMLElement>('[data-as-line-labels]');
    if (svgEl && lineLabelsEl)
      buildLineChart(svgEl, lineLabelsEl, adId!, days, currentMetric);

    // day activity chart
    const dayVals = root.querySelector<HTMLElement>('[data-as-day-values]');
    const barChart = root.querySelector<HTMLElement>('[data-as-bar-chart]');
    const barLabels = root.querySelector<HTMLElement>('[data-as-bar-labels]');
    if (dayVals && barChart && barLabels)
      buildDayChart(dayVals, barChart, barLabels, adId!);

    // A/B test
    const abA = root.querySelector<HTMLElement>('[data-as-ab-a]');
    const abB = root.querySelector<HTMLElement>('[data-as-ab-b]');
    const abBTitle = root.querySelector<HTMLElement>('[data-as-ab-b-title]');
    const abATitle = root.querySelector<HTMLElement>('.as-ab-variant--winner [data-as-title]');

    if (abATitle) abATitle.textContent = `«${ad.title}»`;
    if (abBTitle) abBTitle.textContent = '«Новинки сезона — обновите гардероб»';

    if (abA) {
      fillAbVariant(abA, {
        ctr:   fmtPct(m.ctr),
        clicks: fmtNum(m.clicks),
        cpc:   fmtMoney(m.cpc),
        conv:  fmtNum(m.conversions),
        spend: fmtMoney(m.spend),
      });
    }
    if (abB) {
      const bm = mockMetrics(adId! + 500, days);
      fillAbVariant(abB, {
        ctr:   fmtPct(bm.ctr * 0.68),
        clicks: fmtNum(Math.round(m.clicks * 0.624)),
        cpc:   fmtMoney(bm.cpc * 1.44),
        conv:  fmtNum(Math.round(m.conversions * 0.547)),
        spend: fmtMoney(Math.round(m.spend * 0.898)),
      });
    }

    // funnel period label
    const funnelPeriodEl = root.querySelector<HTMLElement>('[data-as-funnel-period]');
    if (funnelPeriodEl) {
      funnelPeriodEl.textContent = `Показатели за ${from.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })}`;
    }

    // funnel
    const funnelEl = root.querySelector<HTMLElement>('[data-as-funnel]');
    if (funnelEl) buildFunnel(funnelEl, m.impressions, m.clicks);

    // platform table
    const platformsTbody = root.querySelector<HTMLElement>('[data-as-platforms]');
    if (platformsTbody)
      buildPlatformTable(platformsTbody, adId!, m.impressions, m.clicks, m.spend);
  }

  void refresh();
  return () => controller.abort();
}
