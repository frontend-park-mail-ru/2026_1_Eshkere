import { getAds } from 'features/ads/api/get-ads';
import { getAdGroups } from 'features/ads/api/ad-groups';
import { getAdsInGroup } from 'features/ads/api/ads';
import { renderTemplate } from 'shared/lib/render';
import { navigateTo } from 'shared/lib/navigation';
import campaignStatsTemplate from './campaign-stats.hbs';
import '../../../pages/stats-shared/stats.scss';
import '../../../pages/ad-stats/ui/ad-stats.scss';
import './campaign-stats.scss';

function getParams() {
  const p = new URLSearchParams(window.location.search);
  const id = parseInt(p.get('id') ?? p.get('campaignId') ?? '', 10);
  return Number.isFinite(id) ? id : null;
}

function fmtNum(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2).replace('.', ',') + ' М';
  if (n >= 1_000)     return new Intl.NumberFormat('ru-RU').format(Math.round(n));
  return String(Math.round(n));
}

function fmtMoney(n: number): string {
  return `${new Intl.NumberFormat('ru-RU').format(Math.round(n))} ₽`;
}

function fmtPct(n: number, d = 2): string {
  return n.toFixed(d) + '%';
}

function seeded(seed: number, min: number, max: number): number {
  const x = Math.sin(seed + 1) * 10000;
  return min + (x - Math.floor(x)) * (max - min);
}

function mockMetrics(seed: number, days: number) {
  const b = seed % 100;
  const impressions = Math.round((b + 1) * 1200 * days);
  const clicks      = Math.round(impressions * (0.018 + b * 0.0002));
  const spend       = Math.round(clicks * (12 + b * 0.3));
  const ctr         = (clicks / impressions) * 100;
  const cpc         = spend / clicks;
  const conversions = Math.round(clicks * 0.031);
  return { impressions, clicks, spend, ctr, cpc, conversions };
}

// ── Line chart ────────────────────────────────────────────────────────────────

type CsMetric = 'impressions' | 'clicks' | 'ctr' | 'spend';

function buildLineChart(
  svgEl: SVGSVGElement,
  labelsEl: HTMLElement,
  seed: number,
  days: number,
  metric: CsMetric,
) {
  const count = Math.min(days === 0 ? 30 : days, 30);
  const W = 700; const H = 200;
  const PAD = { top: 24, right: 16, bottom: 4, left: 12 };
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;

  const base = mockMetrics(seed, 1);
  const rawVals = Array.from({ length: count }, (_, i) => {
    const noise = seeded(seed * 17 + i * 11, 0.94, 1.06);
    const trend = 1 + i * 0.018;
    if (metric === 'impressions') return base.impressions * noise * trend;
    if (metric === 'clicks')      return base.clicks * noise * trend;
    if (metric === 'ctr')         return base.ctr * noise * trend;
    return base.spend * noise * trend;
  });

  const minV = Math.min(...rawVals) * 0.88;
  const maxV = Math.max(...rawVals) * 1.06;
  const toX = (i: number) => PAD.left + (i / (count - 1)) * innerW;
  const toY = (v: number) => PAD.top + innerH - ((v - minV) / (maxV - minV)) * innerH;
  const pts = rawVals.map((v, i) => ({ x: toX(i), y: toY(v), v }));

  // rebuild preserving <defs>
  const defs = svgEl.querySelector('defs');
  svgEl.innerHTML = '';
  if (defs) svgEl.appendChild(defs);

  // grid
  [0.25, 0.5, 0.75, 1].forEach((f) => {
    const y = PAD.top + innerH * (1 - f);
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('class', 'cs-line__grid');
    line.setAttribute('x1', String(PAD.left));
    line.setAttribute('y1', String(y));
    line.setAttribute('x2', String(W - PAD.right));
    line.setAttribute('y2', String(y));
    svgEl.appendChild(line);
  });

  const lineD = pts.map((p, i) => (i === 0 ? `M${p.x},${p.y}` : `L${p.x},${p.y}`)).join(' ');
  const areaD = `${lineD} L${pts[pts.length-1].x},${H} L${pts[0].x},${H} Z`;

  const area = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  area.setAttribute('class', 'cs-line__area');
  area.setAttribute('d', areaD);
  svgEl.appendChild(area);

  const linePath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  linePath.setAttribute('class', 'cs-line__line');
  linePath.setAttribute('d', lineD);
  svgEl.appendChild(linePath);

  pts.forEach((p, i) => {
    const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    dot.setAttribute('class', `cs-line__dot${i === pts.length - 1 ? ' cs-line__dot--last' : ''}`);
    dot.setAttribute('cx', String(p.x));
    dot.setAttribute('cy', String(p.y));
    dot.setAttribute('r', i === pts.length - 1 ? '5' : '4');
    svgEl.appendChild(dot);
  });

  // last-point tooltip
  const last = pts[pts.length - 1];
  const label = metric === 'ctr'
    ? fmtPct(last.v)
    : metric === 'spend'
      ? fmtMoney(last.v)
      : fmtNum(last.v);

  const tipW = label.length * 7 + 14;
  const tipH = 22;
  const tipX = Math.min(last.x - tipW / 2, W - PAD.right - tipW);
  const tipY = last.y - tipH - 8;

  const tipBg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  tipBg.setAttribute('x', String(tipX));
  tipBg.setAttribute('y', String(tipY));
  tipBg.setAttribute('width', String(tipW));
  tipBg.setAttribute('height', String(tipH));
  tipBg.setAttribute('rx', '6');
  tipBg.setAttribute('class', 'cs-line__tip-bg');
  svgEl.appendChild(tipBg);

  const tipText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  tipText.setAttribute('x', String(tipX + tipW / 2));
  tipText.setAttribute('y', String(tipY + tipH / 2 + 4));
  tipText.setAttribute('text-anchor', 'middle');
  tipText.setAttribute('class', 'cs-line__tip-text');
  tipText.textContent = label;
  svgEl.appendChild(tipText);

  // labels
  labelsEl.innerHTML = '';
  const step = Math.max(1, Math.floor(count / 8));
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

// ── Platform bars ─────────────────────────────────────────────────────────────

const PLATFORM_COLORS = ['#0077ff', '#27a7e7', '#f47224'];
const PLATFORM_ICONS  = ['ВК', 'TG', 'ОК'];
const PLATFORM_ICON_CLS = ['as-platform-icon--vk', 'as-platform-icon--tg', 'as-platform-icon--ok'];
const PLATFORM_NAMES  = ['ВКонтакте', 'Telegram', 'OK.ru'];
const PLATFORM_SHARES = [0.68, 0.22, 0.10];

function buildPlatforms(container: HTMLElement, totalImpr: number) {
  container.innerHTML = '';
  PLATFORM_NAMES.forEach((name, i) => {
    const val = Math.round(totalImpr * PLATFORM_SHARES[i]);
    const row = document.createElement('div');
    row.className = 'cs-platform-row';
    row.innerHTML = `
      <div class="cs-platform-name">
        <span class="as-platform-icon ${PLATFORM_ICON_CLS[i]}">${PLATFORM_ICONS[i]}</span>
        ${name}
      </div>
      <div class="cs-platform-bar-wrap">
        <div class="cs-platform-bar" style="width:${PLATFORM_SHARES[i] * 100}%;background:${PLATFORM_COLORS[i]}"></div>
      </div>
      <div class="cs-platform-val">${fmtNum(val)}</div>
    `;
    container.appendChild(row);
  });
}

// ── Insights ──────────────────────────────────────────────────────────────────

const INSIGHT_ICONS = ['📊', '🔔', '💰'];

function buildInsights(container: HTMLElement, ctrVal: number, budgetPct: number) {
  const items = [
    `CTR вырос на 0,4 пп по сравнению с прошлым периодом — группа «Женщины 25–35 МСК» показывает лучшие результаты.`,
    `Группа «Look-alike» на паузе с 28 апреля — возобновите, чтобы не потерять охват похожей аудитории.`,
    `${Math.round(budgetPct)}% бюджета использовано. При текущем темпе кампания завершится через ~8 дней — пополните бюджет или снизьте дневной лимит.`,
  ];
  container.innerHTML = '';
  items.forEach((text, i) => {
    const el = document.createElement('div');
    el.className = 'cs-insight';
    el.innerHTML = `
      <div class="cs-insight__icon">${INSIGHT_ICONS[i]}</div>
      <div class="cs-insight__text">${text}</div>
    `;
    container.appendChild(el);
  });
}

// ── Status labels ──────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  moderation:       { label: 'На модерации', cls: 'stats-badge--warning' },
  working:          { label: 'Активна',      cls: 'stats-badge--success' },
  rejected:         { label: 'Отклонена',    cls: 'stats-badge--danger'  },
  turned_off:       { label: 'Остановлена',  cls: 'stats-badge--muted'   },
  not_enough_money: { label: 'Нет баланса',  cls: 'stats-badge--warning' },
};

const GROUP_STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  active:  { label: 'Активна', cls: 'stats-badge--success' },
  paused:  { label: 'Пауза',   cls: 'stats-badge--warning' },
  draft:   { label: 'Черновик',cls: 'stats-badge--muted'   },
};

// ── Page entry points ─────────────────────────────────────────────────────────

export async function renderCampaignStatsPage(): Promise<string> {
  return renderTemplate(campaignStatsTemplate, {});
}

export function CampaignStats(): VoidFunction {
  const campaignId = getParams();
  const rootEl = document.querySelector<HTMLElement>('[data-campaign-stats]');
  if (!rootEl || !campaignId) return () => {};
  const root: HTMLElement = rootEl;

  const controller = new AbortController();
  const { signal } = controller;
  let currentDays = 30;
  let currentMetric: CsMetric = 'impressions';

  root.querySelector('[data-cs-back]')?.addEventListener('click', () => {
    navigateTo('/ads');
  }, { signal });

  root.querySelector('[data-cs-edit]')?.addEventListener('click', () => {
    navigateTo(`/ads/campaign/edit?id=${campaignId}`);
  }, { signal });

  root.querySelector('[data-cs-all-ads]')?.addEventListener('click', () => {
    navigateTo(`/ads/campaign?id=${campaignId}`);
  }, { signal });

  root.querySelectorAll<HTMLButtonElement>('[data-cs-periods] [data-period]').forEach((btn) => {
    btn.addEventListener('click', () => {
      root.querySelectorAll('[data-cs-periods] [data-period]').forEach((b) =>
        b.classList.remove('stats-period--active'),
      );
      btn.classList.add('stats-period--active');
      currentDays = parseInt(btn.dataset.period ?? '30', 10);
      void refresh();
    }, { signal });
  });

  root.querySelectorAll<HTMLButtonElement>('[data-cs-metric-tabs] [data-metric]').forEach((btn) => {
    btn.addEventListener('click', () => {
      root.querySelectorAll('[data-cs-metric-tabs] [data-metric]').forEach((b) =>
        b.classList.remove('as-metric-tab--active'),
      );
      btn.classList.add('as-metric-tab--active');
      currentMetric = (btn.dataset.metric as CsMetric) ?? 'impressions';
      const svgEl = root.querySelector<SVGSVGElement>('[data-cs-line-chart]');
      const labelsEl = root.querySelector<HTMLElement>('[data-cs-line-labels]');
      if (svgEl && labelsEl)
        buildLineChart(svgEl, labelsEl, campaignId!, currentDays, currentMetric);
    }, { signal });
  });

  async function refresh() {
    const days = currentDays === 0 ? 30 : currentDays;

    const [adsResult, groupsResult] = await Promise.all([
      getAds(),
      getAdGroups(campaignId!).catch(() => ({ ad_campaign_id: campaignId!, groups: [] })),
    ]);

    const campaign = adsResult.ads.find((a) => a.id === campaignId);
    if (!campaign) return;

    const statusMeta = STATUS_LABELS[campaign.status ?? ''] ?? { label: '—', cls: 'stats-badge--muted' };
    const m = mockMetrics(campaignId!, days);

    // hero
    (root.querySelector('[data-cs-title]') as HTMLElement).textContent = campaign.title ?? '—';
    const statusEl = root.querySelector<HTMLElement>('[data-cs-status]');
    if (statusEl) {
      statusEl.textContent = statusMeta.label;
      statusEl.className = `stats-badge ${statusMeta.cls}`;
    }
    (root.querySelector('[data-cs-launched]') as HTMLElement).textContent =
      campaign.created_at
        ? `Запущена ${new Date(campaign.created_at).toLocaleDateString('ru-RU')}`
        : 'Запущена 01.01.2025';
    (root.querySelector('[data-cs-id]') as HTMLElement).textContent = `ID: ${campaignId}`;

    // metrics
    const deltas: Record<string, { sign: string; text: string; up: boolean }> = {
      impressions: { sign: '+', text: '+18%',      up: true  },
      clicks:      { sign: '+', text: '+12%',      up: true  },
      ctr:         { sign: '+', text: '+0,4 сс',   up: true  },
      spend:       { sign: '+', text: '+8%',        up: true  },
      cpc:         { sign: '-', text: '-0,08 ₽',   up: false },
      conversions: { sign: '+', text: '+24%',       up: true  },
    };

    const kpis: Record<string, string> = {
      impressions: fmtNum(m.impressions),
      clicks:      fmtNum(m.clicks),
      ctr:         fmtPct(m.ctr),
      spend:       fmtMoney(m.spend),
      cpc:         fmtMoney(m.cpc),
      conversions: fmtNum(m.conversions),
    };
    Object.entries(kpis).forEach(([k, v]) => {
      const el = root.querySelector<HTMLElement>(`[data-cs-kpi="${k}"]`);
      if (el) el.textContent = v;
    });
    Object.entries(deltas).forEach(([k, d]) => {
      const el = root.querySelector<HTMLElement>(`[data-cs-delta="${k}"]`);
      if (!el) return;
      el.textContent = d.text;
      el.classList.remove('as-metric__delta--up', 'as-metric__delta--down');
      el.classList.add(d.up ? 'as-metric__delta--up' : 'as-metric__delta--down');
    });

    // chart subtitle
    const now = new Date();
    const from = new Date(now);
    from.setDate(now.getDate() - (days - 1));
    const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long' };
    const subtitleEl = root.querySelector<HTMLElement>('[data-cs-chart-subtitle]');
    if (subtitleEl)
      subtitleEl.textContent = `За последние ${days} дней`;

    // line chart
    const svgEl = root.querySelector<SVGSVGElement>('[data-cs-line-chart]');
    const labelsEl = root.querySelector<HTMLElement>('[data-cs-line-labels]');
    if (svgEl && labelsEl)
      buildLineChart(svgEl, labelsEl, campaignId!, currentDays, currentMetric);

    // best creative — try to get from first group
    const firstGroup = groupsResult.groups[0];
    if (firstGroup) {
      const adsInGroup = await getAdsInGroup(campaignId!, firstGroup.id).catch(() => ({
        group_id: firstGroup.id,
        ads: [],
      }));
      const bestAd = adsInGroup.ads[0];
      if (bestAd) {
        const imgEl = root.querySelector<HTMLElement>('[data-cs-creative-img]');
        if (imgEl) {
          imgEl.innerHTML = bestAd.image_url
            ? `<img src="${bestAd.image_url}" alt="" />`
            : '';
        }
        (root.querySelector('[data-cs-creative-title]') as HTMLElement).textContent = bestAd.title;
        (root.querySelector('[data-cs-creative-meta]') as HTMLElement).textContent =
          `Объявление #${bestAd.id}-A · ВКонтакте`;
        const tagsEl = root.querySelector<HTMLElement>('[data-cs-creative-tags]');
        if (tagsEl) {
          const ctr = fmtPct((bestAd.id * 0.042) % 3 + 3);
          const tags = [
            { text: `CTR ${ctr}`, accent: true },
            { text: '240×400', accent: false },
            { text: 'JPG', accent: false },
          ];
          tagsEl.innerHTML = tags
            .map(
              (t) =>
                `<span class="cs-best-creative__tag${t.accent ? ' cs-best-creative__tag--accent' : ''}">${t.text}</span>`,
            )
            .join('');
        }
      }
    }

    // campaign params
    const dailyBudget = campaign.price ?? 2000;
    const totalBudget = dailyBudget * days;
    const spent = Math.min(m.spend, totalBudget);
    const remaining = Math.max(0, totalBudget - spent);
    const pct = totalBudget > 0 ? Math.round((spent / totalBudget) * 100) : 0;

    const paramsEl = root.querySelector<HTMLElement>('[data-cs-params]');
    if (paramsEl) {
      const rows: Array<{ label: string; value: string; positive?: boolean }> = [
        { label: 'Бюджет в день',   value: fmtMoney(dailyBudget) },
        { label: 'Всего потрачено', value: fmtMoney(spent) },
        { label: 'Общий бюджет',    value: fmtMoney(totalBudget) },
        { label: 'Осталось',        value: fmtMoney(remaining), positive: true },
      ];
      paramsEl.innerHTML = rows
        .map(
          (r) =>
            `<div class="cs-param-row${r.positive ? ' cs-param-row--positive' : ''}">
               <span>${r.label}</span><span>${r.value}</span>
             </div>`,
        )
        .join('');
    }

    const bar = root.querySelector<HTMLElement>('[data-cs-budget-bar]');
    if (bar) bar.style.width = `${pct}%`;
    const labelEl = root.querySelector<HTMLElement>('[data-cs-budget-label]');
    if (labelEl) labelEl.textContent = `${pct}% бюджета использовано`;

    // groups table
    const tbody = root.querySelector<HTMLElement>('[data-cs-groups-table]');
    const countEl = root.querySelector<HTMLElement>('[data-cs-groups-count]');
    if (countEl)
      countEl.textContent = `${groupsResult.groups.length} групп${groupsResult.groups.length === 1 ? 'а' : groupsResult.groups.length < 5 ? 'ы' : ''} в кампании`;

    if (tbody) {
      if (groupsResult.groups.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="as-table-loading">Групп нет</td></tr>`;
      } else {
        const groupStatuses = ['active', 'active', 'active', 'paused'];
        tbody.innerHTML = groupsResult.groups
          .map((g, i) => {
            const gm = mockMetrics(g.id * 7 + i, days);
            const st = GROUP_STATUS_LABELS[groupStatuses[i % groupStatuses.length]] ?? {
              label: '—',
              cls: 'stats-badge--muted',
            };
            return `<tr>
              <td class="stats-table__name">${g.name}</td>
              <td><span class="stats-badge ${st.cls}">${st.label}</span></td>
              <td>${fmtNum(gm.impressions)}</td>
              <td>${fmtNum(gm.clicks)}</td>
              <td style="color:var(--primary-active);font-weight:700">${fmtPct(gm.ctr)}</td>
              <td>${fmtMoney(gm.spend)}</td>
              <td>${fmtMoney(gm.cpc)}</td>
            </tr>`;
          })
          .join('');

        root.querySelectorAll<HTMLTableRowElement>('[data-cs-groups-table] tr').forEach((tr, i) => {
          const g = groupsResult.groups[i];
          if (!g) return;
          tr.style.cursor = 'pointer';
          tr.addEventListener('click', () => {
            navigateTo(`/ads/stats/group?campaignId=${campaignId}&groupId=${g.id}`);
          }, { signal });
        });
      }
    }

    // platforms
    const platformsEl = root.querySelector<HTMLElement>('[data-cs-platforms]');
    if (platformsEl) buildPlatforms(platformsEl, m.impressions);

    // insights
    const insightsEl = root.querySelector<HTMLElement>('[data-cs-insights]');
    if (insightsEl) buildInsights(insightsEl, m.ctr, pct);
  }

  void refresh();
  return () => controller.abort();
}
