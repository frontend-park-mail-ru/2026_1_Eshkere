import { getAdGroups } from 'features/ads/api/ad-groups';
import { getAdsInGroup } from 'features/ads/api/ads';
import { getAds } from 'features/ads/api/get-ads';
import { renderTemplate } from 'shared/lib/render';
import { navigateTo } from 'shared/lib/navigation';
import groupStatsTemplate from './group-stats.hbs';
import '../../../pages/stats-shared/stats.scss';
import '../../../pages/ad-stats/ui/ad-stats.scss';
import '../../../pages/campaign-stats/ui/campaign-stats.scss';
import './group-stats.scss';

function getParams() {
  const p = new URLSearchParams(window.location.search);
  const cId = parseInt(p.get('campaignId') ?? '', 10);
  const gId = parseInt(p.get('groupId') ?? '', 10);
  return {
    campaignId: Number.isFinite(cId) ? cId : null,
    groupId: Number.isFinite(gId) ? gId : null,
  };
}

function fmtNum(n: number): string {
  return new Intl.NumberFormat('ru-RU').format(Math.round(n));
}
function fmtMoney(n: number): string {
  return `${fmtNum(n)} ₽`;
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
  const impressions = Math.round((b + 1) * 900 * days);
  const clicks      = Math.round(impressions * (0.015 + b * 0.0002));
  const spend       = Math.round(clicks * (10 + b * 0.3));
  const ctr         = (clicks / impressions) * 100;
  const cpc         = spend / clicks;
  return { impressions, clicks, spend, ctr, cpc };
}

// ── Line chart (green) ────────────────────────────────────────────────────────

type GsMetric = 'impressions' | 'clicks' | 'ctr' | 'spend';

function buildLineChart(
  svgEl: SVGSVGElement,
  labelsEl: HTMLElement,
  seed: number,
  days: number,
  metric: GsMetric,
) {
  const count = Math.min(days === 0 ? 30 : days, 30);
  const W = 700; const H = 200;
  const PAD = { top: 24, right: 16, bottom: 4, left: 12 };
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;

  const base = mockMetrics(seed, 1);
  const rawVals = Array.from({ length: count }, (_, i) => {
    const noise = seeded(seed * 13 + i * 9, 0.94, 1.06);
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

  const defs = svgEl.querySelector('defs');
  svgEl.innerHTML = '';
  if (defs) svgEl.appendChild(defs);

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
  const label = metric === 'ctr' ? fmtPct(last.v)
    : metric === 'spend' ? fmtMoney(last.v)
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
  // green override
  tipBg.setAttribute('fill', '#22c55e');
  svgEl.appendChild(tipBg);

  const tipText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  tipText.setAttribute('x', String(tipX + tipW / 2));
  tipText.setAttribute('y', String(tipY + tipH / 2 + 4));
  tipText.setAttribute('text-anchor', 'middle');
  tipText.setAttribute('class', 'cs-line__tip-text');
  tipText.textContent = label;
  svgEl.appendChild(tipText);

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

// ── Audience rows ─────────────────────────────────────────────────────────────

const AUD_COLORS = {
  age:    ['#5855ff', '#7c79ff', '#a8a6ff', '#cccbff'],
  gender: ['#f43f8e', '#3b82f6'],
  region: ['#22c55e', '#06b6d4', '#f59e0b'],
};

function buildAudienceSection(
  container: HTMLElement,
  rows: Array<{ label: string; pct: number }>,
  colors: string[],
) {
  container.innerHTML = '';
  rows.forEach((r, i) => {
    const div = document.createElement('div');
    div.className = 'gs-aud-row';
    div.innerHTML = `
      <span class="gs-aud-label">${r.label}</span>
      <div class="gs-aud-bar-wrap">
        <div class="gs-aud-bar" style="width:${r.pct}%;background:${colors[i % colors.length]}"></div>
      </div>
      <span class="gs-aud-pct">${r.pct}%</span>
    `;
    container.appendChild(div);
  });
}

// ── Donut arc ─────────────────────────────────────────────────────────────────

const DONUT_CIRC = 2 * Math.PI * 28; // ≈ 175.9

function setDonutArc(arc: Element | null, pct: number) {
  if (!arc) return;
  const offset = DONUT_CIRC * (1 - Math.min(1, Math.max(0, pct)));
  (arc as SVGCircleElement).style.strokeDashoffset = String(offset);
}

// ── Heatmap ───────────────────────────────────────────────────────────────────

const DAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

function buildHeatmap(container: HTMLElement, groupId: number) {
  container.innerHTML = '';

  // header row: empty cell + 24 hour labels
  const emptyHeader = document.createElement('div');
  emptyHeader.className = 'gs-heatmap__header-cell';
  container.appendChild(emptyHeader);

  HOURS.forEach((h) => {
    const hCell = document.createElement('div');
    hCell.className = 'gs-heatmap__header-cell';
    hCell.textContent = String(h);
    container.appendChild(hCell);
  });

  // data rows
  DAYS.forEach((day, di) => {
    const dayLabel = document.createElement('div');
    dayLabel.className = 'gs-heatmap__day-label';
    dayLabel.textContent = day;
    container.appendChild(dayLabel);

    HOURS.forEach((_, hi) => {
      const raw = seeded(groupId * 7 + di * 31 + hi * 13, 0, 1);
      // peak hours 9-21 and weekdays
      const hourBoost = hi >= 9 && hi <= 21 ? 0.5 : 0;
      const dayBoost  = di < 5 ? 0.2 : -0.1;
      const val = Math.max(0, Math.min(1, raw * 0.6 + hourBoost + dayBoost));

      const cell = document.createElement('div');
      cell.className = 'gs-heatmap__cell';
      cell.style.background = `rgba(88,85,255,${(val * 0.88).toFixed(2)})`;
      container.appendChild(cell);
    });
  });
}

// ── Status labels ─────────────────────────────────────────────────────────────

const AD_STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  moderation:       { label: 'На модерации', cls: 'stats-badge--warning' },
  working:          { label: 'Активно',      cls: 'stats-badge--success' },
  rejected:         { label: 'Отклонено',    cls: 'stats-badge--danger'  },
  turned_off:       { label: 'Остановлено',  cls: 'stats-badge--muted'   },
  not_enough_money: { label: 'Нет баланса',  cls: 'stats-badge--warning' },
};

const AD_THUMB_COLORS = ['#5855ff', '#f59e0b', '#22c55e', '#ef4444', '#06b6d4', '#a855f7'];

const REGION_LABELS: Record<number, string> = {
  1: 'Москва', 2: 'Санкт-Петербург', 3: 'Казань', 4: 'Екатеринбург',
  5: 'Новосибирск', 6: 'Краснодар', 7: 'Нижний Новгород', 10: 'Весь РФ',
};

const GENDER_LABELS: Record<string, string> = { male: 'Мужчины', female: 'Женщины', any: 'Все' };

// ── Page entry points ─────────────────────────────────────────────────────────

export async function renderGroupStatsPage(): Promise<string> {
  return renderTemplate(groupStatsTemplate, {});
}

export function GroupStats(): VoidFunction {
  const { campaignId, groupId } = getParams();
  const rootEl = document.querySelector<HTMLElement>('[data-group-stats]');
  if (!rootEl || !campaignId || !groupId) return () => {};
  const root: HTMLElement = rootEl;

  const controller = new AbortController();
  const { signal } = controller;
  let currentDays = 30;
  let currentMetric: GsMetric = 'ctr';

  // navigation
  root.querySelector('[data-gs-back]')?.addEventListener('click', () => {
    navigateTo(`/ads/stats/campaign?id=${campaignId}`);
  }, { signal });

  root.querySelector('[data-gs-bc-campaigns]')?.addEventListener('click', () => {
    navigateTo('/ads');
  }, { signal });

  root.querySelector('[data-gs-bc-campaign]')?.addEventListener('click', () => {
    navigateTo(`/ads/stats/campaign?id=${campaignId}`);
  }, { signal });

  root.querySelector('[data-gs-settings]')?.addEventListener('click', () => {
    navigateTo(`/ads/group/edit?campaignId=${campaignId}&groupId=${groupId}`);
  }, { signal });

  // period tabs
  root.querySelectorAll<HTMLButtonElement>('[data-gs-periods] [data-period]').forEach((btn) => {
    btn.addEventListener('click', () => {
      root.querySelectorAll('[data-gs-periods] [data-period]').forEach((b) =>
        b.classList.remove('stats-period--active'),
      );
      btn.classList.add('stats-period--active');
      currentDays = parseInt(btn.dataset.period ?? '30', 10);
      void refresh();
    }, { signal });
  });

  // metric tabs
  root.querySelectorAll<HTMLButtonElement>('[data-gs-metric-tabs] [data-metric]').forEach((btn) => {
    btn.addEventListener('click', () => {
      root.querySelectorAll('[data-gs-metric-tabs] [data-metric]').forEach((b) =>
        b.classList.remove('as-metric-tab--active'),
      );
      btn.classList.add('as-metric-tab--active');
      currentMetric = (btn.dataset.metric as GsMetric) ?? 'ctr';
      const svgEl = root.querySelector<SVGSVGElement>('[data-gs-line-chart]');
      const labelsEl = root.querySelector<HTMLElement>('[data-gs-line-labels]');
      const titleEl = root.querySelector<HTMLElement>('[data-gs-chart-title]');
      const metricLabel: Record<GsMetric, string> = {
        impressions: 'Динамика показов', clicks: 'Динамика кликов',
        ctr: 'Динамика CTR', spend: 'Динамика расхода',
      };
      if (titleEl) titleEl.textContent = metricLabel[currentMetric];
      if (svgEl && labelsEl)
        buildLineChart(svgEl, labelsEl, groupId!, currentDays, currentMetric);
    }, { signal });
  });

  async function refresh() {
    const days = currentDays === 0 ? 30 : currentDays;

    const [groupsResult, adsResult, adsListResult] = await Promise.all([
      getAdGroups(campaignId!).catch(() => ({ ad_campaign_id: campaignId!, groups: [] })),
      getAdsInGroup(campaignId!, groupId!).catch(() => ({ group_id: groupId!, ads: [] })),
      getAds(),
    ]);

    const group = groupsResult.groups.find((g) => g.id === groupId);
    if (!group) return;

    const campaign = adsListResult.ads.find((a) => a.id === campaignId);
    const campaignName = campaign?.title ?? `Кампания ${campaignId}`;

    // breadcrumb
    (root.querySelector('[data-gs-bc-campaign]') as HTMLElement).textContent = campaignName;

    // hero
    (root.querySelector('[data-gs-title]') as HTMLElement).textContent = group.name;

    const metaEl = root.querySelector<HTMLElement>('[data-gs-meta]');
    if (metaEl) {
      const genderShort = group.gender === 'female' ? 'Ж' : group.gender === 'male' ? 'М' : 'Все';
      const regionName = REGION_LABELS[group.region_id] ?? `Регион ${group.region_id}`;
      const dailyBudget = campaign?.price ?? 800;
      const metaItems = [
        { text: campaignName },
        { text: `Ставка: 1,20 ₽/клик` },
        { text: `Бюджет: ${fmtMoney(dailyBudget)}/день` },
        { text: `${genderShort} ${group.age_from}–${group.age_to} · ${regionName}` },
        { icon: 'vk',  text: 'ВКонтакте' },
        { icon: 'tg',  text: 'Telegram'  },
      ];
      metaEl.innerHTML = metaItems
        .map((item) => {
          const iconHtml = item.icon
            ? `<span class="gs-hero__meta-icon gs-hero__meta-icon--${item.icon}">${item.icon === 'vk' ? 'ВК' : 'TG'}</span>`
            : '';
          return `<span class="gs-hero__meta-item">${iconHtml}${item.text}</span>`;
        })
        .join('');
    }

    // metrics
    const m = mockMetrics(groupId! * 3, days);
    const kpis: Record<string, string> = {
      impressions: fmtNum(m.impressions),
      clicks:      fmtNum(m.clicks),
      ctr:         fmtPct(m.ctr),
      spend:       fmtMoney(m.spend),
      cpc:         fmtMoney(m.cpc),
    };
    Object.entries(kpis).forEach(([k, v]) => {
      const el = root.querySelector<HTMLElement>(`[data-gs-kpi="${k}"]`);
      if (el) el.textContent = v;
    });

    const deltas: Record<string, { text: string; up: boolean }> = {
      impressions: { text: '+14%',      up: true  },
      clicks:      { text: '+9%',       up: true  },
      spend:       { text: '+6%',       up: true  },
      cpc:         { text: '-0,09 ₽',  up: false },
    };
    Object.entries(deltas).forEach(([k, d]) => {
      const el = root.querySelector<HTMLElement>(`[data-gs-delta="${k}"]`);
      if (!el) return;
      el.textContent = d.text;
      el.classList.remove('as-metric__delta--up', 'as-metric__delta--down');
      el.classList.add(d.up ? 'as-metric__delta--up' : 'as-metric__delta--down');
    });

    // chart title & subtitle
    const titleEl = root.querySelector<HTMLElement>('[data-gs-chart-title]');
    if (titleEl) {
      const metricLabel: Record<GsMetric, string> = {
        impressions: 'Динамика показов', clicks: 'Динамика кликов',
        ctr: 'Динамика CTR', spend: 'Динамика расхода',
      };
      titleEl.textContent = metricLabel[currentMetric];
    }
    const subtitleEl = root.querySelector<HTMLElement>('[data-gs-chart-subtitle]');
    if (subtitleEl) subtitleEl.textContent = `За последние ${days} дней`;

    // line chart
    const svgEl = root.querySelector<SVGSVGElement>('[data-gs-line-chart]');
    const labelsEl = root.querySelector<HTMLElement>('[data-gs-line-labels]');
    if (svgEl && labelsEl)
      buildLineChart(svgEl, labelsEl, groupId!, currentDays, currentMetric);

    // audience
    const ageEl = root.querySelector<HTMLElement>('[data-gs-age]');
    if (ageEl) {
      buildAudienceSection(ageEl, [
        { label: '18–24', pct: 12 }, { label: '25–34', pct: 48 },
        { label: '35–44', pct: 28 }, { label: '45+',   pct: 12 },
      ], AUD_COLORS.age);
    }

    const genderEl = root.querySelector<HTMLElement>('[data-gs-gender]');
    if (genderEl) {
      const isWomen = group.gender === 'female';
      buildAudienceSection(genderEl, isWomen
        ? [{ label: 'Женщины', pct: 72 }, { label: 'Мужчины', pct: 28 }]
        : group.gender === 'male'
          ? [{ label: 'Мужчины', pct: 72 }, { label: 'Женщины', pct: 28 }]
          : [{ label: 'Женщины', pct: 52 }, { label: 'Мужчины', pct: 48 }],
      AUD_COLORS.gender);
    }

    const regionsEl = root.querySelector<HTMLElement>('[data-gs-regions]');
    if (regionsEl) {
      buildAudienceSection(regionsEl, [
        { label: 'Москва',           pct: 54 },
        { label: 'Санкт-Петербург',  pct: 18 },
        { label: 'Остальные',        pct: 28 },
      ], AUD_COLORS.region);
    }

    // stat cards (donut charts)
    const dailyBudget = campaign?.price ?? 800;
    const totalBudget = dailyBudget * days;
    const spent = Math.min(m.spend, totalBudget);
    const budgetPct = totalBudget > 0 ? spent / totalBudget : 0;

    setDonutArc(root.querySelector('[data-gs-donut-arc="budget"]'), budgetPct);
    setDonutArc(root.querySelector('[data-gs-donut-arc="freq"]'), 0.48);
    setDonutArc(root.querySelector('[data-gs-donut-arc="pace"]'), Math.min(1, (m.spend / days) / (dailyBudget * 1.2)));

    const budgetPctEl = root.querySelector<HTMLElement>('[data-gs-stat="budget-pct"]');
    if (budgetPctEl) budgetPctEl.textContent = `${Math.round(budgetPct * 100)}%`;
    const budgetSubEl = root.querySelector<HTMLElement>('[data-gs-stat="budget-sub"]');
    if (budgetSubEl) budgetSubEl.textContent = `${fmtMoney(spent)} из ${fmtMoney(totalBudget)}`;

    const freqEl = root.querySelector<HTMLElement>('[data-gs-stat="freq"]');
    if (freqEl) freqEl.textContent = '2,4×';

    const paceEl = root.querySelector<HTMLElement>('[data-gs-stat="pace"]');
    if (paceEl) paceEl.textContent = fmtMoney(Math.round(m.spend / days));
    const paceSubEl = root.querySelector<HTMLElement>('[data-gs-stat="pace-sub"]');
    if (paceSubEl) paceSubEl.textContent = `В среднем в день · план ${fmtMoney(dailyBudget)}`;

    // heatmap
    const heatmapEl = root.querySelector<HTMLElement>('[data-gs-heatmap]');
    if (heatmapEl) buildHeatmap(heatmapEl, groupId!);

    // ads table
    const countEl = root.querySelector<HTMLElement>('[data-gs-ads-count]');
    if (countEl) {
      const n = adsResult.ads.length;
      countEl.textContent = `${n} объявлени${n === 1 ? 'е' : n < 5 ? 'я' : 'й'}`;
    }

    const tbody = root.querySelector<HTMLElement>('[data-gs-ads-table]');
    if (tbody) {
      if (adsResult.ads.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="as-table-loading">Объявлений нет</td></tr>`;
      } else {
        const sorted = [...adsResult.ads].sort((a, b) => b.id - a.id);
        const bestId = sorted[0]?.id;

        tbody.innerHTML = sorted
          .map((ad, i) => {
            const am = mockMetrics(ad.id * 11, days);
            const sm = AD_STATUS_LABELS[ad.status ?? ''] ?? { label: '—', cls: 'stats-badge--muted' };
            const isActive = ad.status === 'working';
            const color = AD_THUMB_COLORS[i % AD_THUMB_COLORS.length];
            const isBest = ad.id === bestId;

            return `<tr style="cursor:pointer" data-goto-ad="${ad.id}">
              <td>
                <div style="display:flex;align-items:center;gap:10px">
                  <span style="width:34px;height:34px;border-radius:8px;background:${color};flex-shrink:0;display:inline-flex;align-items:center;justify-content:center;font-size:10px;font-weight:800;color:#fff">${i + 1}</span>
                  <div>
                    <div class="stats-table__name">${ad.title}</div>
                    ${isBest ? '<span class="as-best-badge" style="margin-top:3px;display:inline-flex"><span class="as-best-badge__icon">ыб</span>Лучшее</span>' : ''}
                  </div>
                </div>
              </td>
              <td><span class="stats-badge ${sm.cls}">${sm.label}</span></td>
              <td>${fmtNum(am.impressions)}</td>
              <td>${fmtNum(am.clicks)}</td>
              <td style="${isActive ? 'color:var(--primary-active);font-weight:700' : ''}">${fmtPct(am.ctr)}</td>
              <td>${fmtMoney(am.spend)}</td>
              <td>${fmtMoney(am.cpc)}</td>
            </tr>`;
          })
          .join('');

        root.querySelectorAll<HTMLTableRowElement>('[data-goto-ad]').forEach((tr) => {
          tr.addEventListener('click', () => {
            navigateTo(
              `/ads/stats/ad?campaignId=${campaignId}&groupId=${groupId}&adId=${tr.dataset.gotoAd}`,
            );
          }, { signal });
        });
      }
    }
  }

  void refresh();
  return () => controller.abort();
}
