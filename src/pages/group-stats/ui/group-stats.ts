import { getAdGroups } from 'features/ads/api/ad-groups';
import { getAdsInGroup } from 'features/ads/api/ads';
import { renderTemplate } from 'shared/lib/render';
import { navigateTo } from 'shared/lib/navigation';
import groupStatsTemplate from './group-stats.hbs';
import '../../../pages/stats-shared/stats.scss';

function getParams() {
  const p = new URLSearchParams(window.location.search);
  const cId = parseInt(p.get('campaignId') ?? '', 10);
  const gId = parseInt(p.get('groupId') ?? '', 10);
  return { campaignId: Number.isFinite(cId) ? cId : null, groupId: Number.isFinite(gId) ? gId : null };
}

function fmtNum(n: number) { return new Intl.NumberFormat('ru-RU').format(Math.round(n)); }
function fmtMoney(n: number) { return `${fmtNum(n)} ₽`; }
function mockMetrics(seed: number, days: number) {
  const b = seed % 100;
  const impressions = (b + 1) * 900 * days;
  const clicks = Math.round(impressions * (0.015 + b * 0.0002));
  const spend = Math.round(clicks * (10 + b * 0.3));
  return { impressions, clicks, spend, ctr: ((clicks / impressions) * 100).toFixed(2) + '%', cpc: fmtMoney(Math.round(spend / clicks)) };
}

function buildBreakdown(el: HTMLElement, rows: { label: string; pct: number; val: string }[]) {
  el.innerHTML = rows.map(r => `
    <div class="stats-breakdown__row">
      <span class="stats-breakdown__label">${r.label}</span>
      <div class="stats-breakdown__bar-wrap"><div class="stats-breakdown__bar" style="width:${r.pct}%"></div></div>
      <span class="stats-breakdown__val">${r.val}</span>
    </div>`).join('');
}

const REGION_LABELS: Record<number,string> = {1:'Москва',2:'СПб',3:'Казань',4:'Екб',5:'Нск',6:'Краснодар',7:'Нижний',8:'Самара',9:'Ростов',10:'Весь РФ'};
const GENDER_LABELS: Record<string,string> = { male:'Мужчины', female:'Женщины', any:'Все' };
const STATUS_LABELS: Record<string,{label:string;cls:string}> = {
  moderation:{label:'На модерации',cls:'stats-badge--warning'},
  working:{label:'Активно',cls:'stats-badge--success'},
  rejected:{label:'Отклонено',cls:'stats-badge--danger'},
  turned_off:{label:'Остановлено',cls:'stats-badge--muted'},
  not_enough_money:{label:'Нет баланса',cls:'stats-badge--warning'},
};

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
  let currentDays = 7;

  root.querySelector('[data-gs-back]')?.addEventListener('click', () => {
    navigateTo(`/ads/campaign?id=${campaignId}`);
  }, { signal });

  root.querySelectorAll<HTMLButtonElement>('[data-gs-periods] [data-period]').forEach(btn => {
    btn.addEventListener('click', () => {
      root.querySelectorAll('[data-gs-periods] [data-period]').forEach(b => b.classList.remove('stats-period--active'));
      btn.classList.add('stats-period--active');
      currentDays = parseInt(btn.dataset.period ?? '7', 10);
      void refresh();
    }, { signal });
  });

  async function refresh() {
    const [groupsResult, adsResult] = await Promise.all([
      getAdGroups(campaignId!).catch(() => ({ ad_campaign_id: campaignId!, groups: [] })),
      getAdsInGroup(campaignId!, groupId!).catch(() => ({ group_id: groupId!, ads: [] })),
    ]);

    const group = groupsResult.groups.find(g => g.id === groupId);
    if (!group) return;

    const metrics = mockMetrics(groupId! * 3, currentDays);
    const genderLabel = GENDER_LABELS[group.gender] ?? 'Все';
    const regionLabel = REGION_LABELS[group.region_id] ?? `Регион ${group.region_id}`;

    (root.querySelector('[data-gs-title]') as HTMLElement).textContent = group.name;
    (root.querySelector('[data-gs-audience]') as HTMLElement).textContent = `${genderLabel}, ${group.age_from}–${group.age_to} лет`;
    (root.querySelector('[data-gs-region]') as HTMLElement).textContent = regionLabel;

    ['impressions','clicks','ctr','spend','cpc'].forEach(k => {
      const el = root.querySelector(`[data-gs-kpi="${k}"]`);
      if (el) el.textContent = (metrics as Record<string,string|number>)[k].toString();
    });

    const genderEl = root.querySelector<HTMLElement>('[data-gs-gender]');
    if (genderEl) buildBreakdown(genderEl, group.gender === 'any'
      ? [{ label: 'Мужчины', pct: 52, val: '52%' }, { label: 'Женщины', pct: 48, val: '48%' }]
      : [{ label: genderLabel, pct: 100, val: '100%' }]);

    const ageEl = root.querySelector<HTMLElement>('[data-gs-age]');
    if (ageEl) {
      const ranges = [`${group.age_from}–${Math.min(group.age_from + 9, group.age_to)}`, `${Math.min(group.age_from + 10, group.age_to)}–${group.age_to}`];
      buildBreakdown(ageEl, [{ label: ranges[0], pct: 60, val: '60%' }, { label: ranges[1], pct: 40, val: '40%' }]);
    }

    const platformEl = root.querySelector<HTMLElement>('[data-gs-platforms]');
    if (platformEl) buildBreakdown(platformEl, [
      { label: 'ВКонтакте', pct: 48, val: '48%' },
      { label: 'Telegram', pct: 31, val: '31%' },
      { label: 'OK', pct: 21, val: '21%' },
    ]);

    const deviceEl = root.querySelector<HTMLElement>('[data-gs-devices]');
    if (deviceEl) buildBreakdown(deviceEl, [
      { label: 'Мобильные', pct: 72, val: '72%' },
      { label: 'Десктоп', pct: 22, val: '22%' },
      { label: 'Планшеты', pct: 6, val: '6%' },
    ]);

    const tbody = root.querySelector('[data-gs-ads-table]');
    if (tbody) {
      if (adsResult.ads.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:var(--text-note);padding:24px">Объявлений нет</td></tr>`;
      } else {
        tbody.innerHTML = adsResult.ads.map(ad => {
          const am = mockMetrics(ad.id * 11, currentDays);
          const sm = STATUS_LABELS[ad.status ?? ''] ?? { label: '—', cls: 'stats-badge--muted' };
          return `<tr>
            <td class="stats-table__name">${ad.title}</td>
            <td>${fmtNum(am.impressions)}</td>
            <td>${fmtNum(am.clicks)}</td>
            <td>${am.ctr}</td>
            <td>${fmtMoney(am.spend)}</td>
            <td><span class="stats-badge ${sm.cls}">${sm.label}</span></td>
            <td><button class="stats-table__link" data-goto-ad="${ad.id}">Подробнее →</button></td>
          </tr>`;
        }).join('');

        root.querySelectorAll<HTMLButtonElement>('[data-goto-ad]').forEach(btn => {
          btn.addEventListener('click', () => {
            navigateTo(`/ads/stats/ad?campaignId=${campaignId}&groupId=${groupId}&adId=${btn.dataset.gotoAd}`);
          });
        });
      }
    }
  }

  void refresh();
  return () => controller.abort();
}
