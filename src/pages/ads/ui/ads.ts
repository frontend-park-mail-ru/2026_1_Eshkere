import './ads.scss';
import { renderTemplate } from 'shared/lib/render';
import {
  addMonths,
  endOfMonth,
  endOfWeek,
  endOfYear,
  formatRangeDate,
  formatRangeLabel,
  isBetween,
  isSameDay,
  startOfDay,
  startOfMonth,
  startOfWeek,
  startOfYear,
} from 'shared/lib/date';
import { formatDate, formatPrice } from 'shared/lib/format';
import { MONTHS_RU_FULL } from 'shared/lib/constants/ru-months';
import { getAds } from 'features/ads';
import { navigateTo } from 'app/navigation';
import type { AdItem } from 'features/ads/api/get-ads';
import adsPageTemplate from './ads.hbs';

let adsPageLifecycleController: AbortController | null = null;

/**
 * Преобразует объявления в данные для таблицы кампаний.
 *
 * @param {!Array<Object>} [ads=[]] Список объявлений.
 * @return {!Array<Object>} Список кампаний для шаблона.
 */

interface CampaignTemplateRow {
  id: AdItem['id'];
  title: string;
  budget: string;
  budgetValue: number;
  goal: string;
  lastActionDate: string;
  status: string;
  statusType: string;
  enabled: boolean;
}

function mapAdsToCampaigns(ads: AdItem[] = []): CampaignTemplateRow[] {
  return ads.map((ad) => ({
    id: ad.id,
    title: ad.title || 'Без названия',
    budget: typeof ad.price === 'number' ? formatPrice(ad.price) : '—',
    budgetValue: typeof ad.price === 'number' ? ad.price : 0,
    goal: ad.target_action || 'Без целевого действия',
    lastActionDate: formatDate(ad.created_at || ''),
    status: 'Активно',
    statusType: 'working',
    enabled: true,
  }));
}

/**
 * Рендерит сетку дней для одного месяца.
 *
 * @param {HTMLElement} gridNode Узел сетки дней.
 * @param {HTMLElement} labelNode Узел подписи месяца.
 * @param {Date} monthDate Дата отображаемого месяца.
 * @param {Date} from Начало выбранного диапазона.
 * @param {Date} to Конец выбранного диапазона.
 * @return {void}
 */
function renderMonthGrid(
  gridNode: HTMLElement,
  labelNode: HTMLElement,
  monthDate: Date,
  from: Date,
  to: Date,
): void {
  labelNode.textContent = `${monthDate.getFullYear()} ${MONTHS_RU_FULL[monthDate.getMonth()]}`;
  gridNode.innerHTML = '';

  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const first = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = first.getDay();
  const leading = firstDay === 0 ? 6 : firstDay - 1;

  for (let index = 0; index < leading; index += 1) {
    const emptyCell = document.createElement('span');
    emptyCell.className = 'campaigns-date-picker__empty';
    gridNode.appendChild(emptyCell);
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(year, month, day);
    const dayNode = document.createElement('button');
    dayNode.type = 'button';
    dayNode.className = 'campaigns-date-picker__day';
    dayNode.textContent = String(day);
    dayNode.dataset.date = date.toISOString();

    if (isBetween(date, from, to)) {
      dayNode.classList.add('is-in-range');
    }

    if (isSameDay(date, from)) {
      dayNode.classList.add('is-range-start', 'is-selected');
    }

    if (isSameDay(date, to)) {
      dayNode.classList.add('is-range-end', 'is-selected');
    }

    gridNode.appendChild(dayNode);
  }
}

/**
 * Инициализирует date picker на странице кампаний.
 *
 * @param {AbortSignal} signal Сигнал жизненного цикла страницы.
 * @return {void}
 */
function DatePicker(signal: AbortSignal): void {
  const toggle = document.getElementById('date-filter-toggle');
  const picker = document.getElementById('campaigns-date-picker');
  const filterLabel = document.getElementById('date-filter-label');

  if (!toggle || !picker || !filterLabel) {
    return;
  }

  const monthLeftLabel = document.getElementById('date-month-left-label');
  const monthRightLabel = document.getElementById('date-month-right-label');
  const gridLeft = document.getElementById('date-grid-left');
  const gridRight = document.getElementById('date-grid-right');
  const rangeFromNode = document.getElementById('date-range-from');
  const rangeToNode = document.getElementById('date-range-to');
  const cancelButton = document.getElementById('date-cancel');
  const applyButton = document.getElementById('date-apply');

  if (
    !monthLeftLabel ||
    !monthRightLabel ||
    !gridLeft ||
    !gridRight ||
    !rangeFromNode ||
    !rangeToNode ||
    !cancelButton ||
    !applyButton
  ) {
    return;
  }

  const today = startOfDay(new Date());
  let selectedFrom = today;
  let selectedTo = addMonths(today, 1);
  let draftFrom = selectedFrom;
  let draftTo = selectedTo;
  let viewMonth = startOfMonth(draftFrom);
  let pickingTo = false;

  const setPreset = (preset: string | undefined): void => {
    const base = startOfDay(new Date());

    switch (preset) {
      case 'today':
        draftFrom = base;
        draftTo = base;
        break;
      case 'week':
        draftFrom = startOfWeek(base);
        draftTo = endOfWeek(base);
        break;
      case 'month':
        draftFrom = startOfMonth(base);
        draftTo = endOfMonth(base);
        break;
      case 'year':
        draftFrom = startOfYear(base);
        draftTo = endOfYear(base);
        break;
      case 'manual':
      default:
        break;
    }

    viewMonth = startOfMonth(draftFrom);
    pickingTo = false;
  };

  const render = (): void => {
    const rightMonth = new Date(
      viewMonth.getFullYear(),
      viewMonth.getMonth() + 1,
      1,
    );

    renderMonthGrid(gridLeft, monthLeftLabel, viewMonth, draftFrom, draftTo);
    renderMonthGrid(gridRight, monthRightLabel, rightMonth, draftFrom, draftTo);

    rangeFromNode.textContent = formatRangeDate(draftFrom);
    rangeToNode.textContent = formatRangeDate(draftTo);
  };

  const close = (): void => {
    picker.hidden = true;
    toggle.classList.remove('is-open');
  };

  const open = (): void => {
    draftFrom = selectedFrom;
    draftTo = selectedTo;
    viewMonth = startOfMonth(draftFrom);
    pickingTo = false;
    render();
    picker.hidden = false;
    toggle.classList.add('is-open');
  };

  toggle.addEventListener(
    'click',
    () => {
      if (picker.hidden) {
        open();
        return;
      }

      close();
    },
    { signal },
  );

  picker.addEventListener(
    'click',
    (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }

      const dayButton = target.closest('.campaigns-date-picker__day');
      if (!(dayButton instanceof HTMLButtonElement)) {
        return;
      }

      const iso = dayButton.dataset.date;
      if (!iso) {
        return;
      }

      const date = startOfDay(new Date(iso));

      if (!pickingTo) {
        draftFrom = date;
        if (draftTo.getTime() < draftFrom.getTime()) {
          draftTo = draftFrom;
        }
        pickingTo = true;
      } else {
        draftTo = date;
        if (draftTo.getTime() < draftFrom.getTime()) {
          const tmp = draftFrom;
          draftFrom = draftTo;
          draftTo = tmp;
        }
        pickingTo = false;
      }

      picker
        .querySelectorAll('.campaigns-date-picker__preset')
        .forEach((node) => {
          node.classList.remove('is-active');
        });

      const manual = picker.querySelector('[data-preset="manual"]');
      if (manual) {
        manual.classList.add('is-active');
      }

      render();
    },
    { signal },
  );

  picker
    .querySelectorAll<HTMLElement>('.campaigns-date-picker__preset')
    .forEach((node) => {
      node.addEventListener(
        'click',
        () => {
          picker
            .querySelectorAll('.campaigns-date-picker__preset')
            .forEach((item) => {
              item.classList.remove('is-active');
            });

          node.classList.add('is-active');
          setPreset(node.dataset.preset);
          render();
        },
        { signal },
      );
    });

  /**
   * Сдвигает отображаемый месяц.
   *
   * @param {number} value Сдвиг в месяцах.
   * @return {void}
   */
  const shiftMonth = (value: number): void => {
    viewMonth = new Date(
      viewMonth.getFullYear(),
      viewMonth.getMonth() + value,
      1,
    );
    render();
  };

  /**
   * Привязывает кнопке обработчик сдвига месяца.
   *
   * @param {string} id Идентификатор кнопки.
   * @param {number} value Сдвиг в месяцах.
   * @return {void}
   */
  const bindShift = (id: string, value: number): void => {
    const control = document.getElementById(id);

    if (!control) {
      return;
    }

    control.addEventListener('click', () => shiftMonth(value), { signal });
  };

  bindShift('date-prev', -12);
  bindShift('date-prev-month', -1);
  bindShift('date-next-month', 1);
  bindShift('date-next', 12);
  bindShift('date-prev-right', -12);
  bindShift('date-prev-month-right', -1);
  bindShift('date-next-month-right', 1);
  bindShift('date-next-right', 12);

  cancelButton?.addEventListener(
    'click',
    () => {
      close();
    },
    { signal },
  );

  applyButton?.addEventListener(
    'click',
    () => {
      selectedFrom = draftFrom;
      selectedTo = draftTo;
      filterLabel.textContent = formatRangeLabel(selectedFrom, selectedTo);
      close();
    },
    { signal },
  );

  document.addEventListener(
    'click',
    (event: MouseEvent) => {
      if (picker.hidden) {
        return;
      }

      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }

      if (
        target.closest('#campaigns-date-picker') ||
        target.closest('#date-filter-toggle')
      ) {
        return;
      }

      close();
    },
    { signal },
  );

  document.addEventListener(
    'keydown',
    (event) => {
      if (event.key === 'Escape' && !picker.hidden) {
        close();
      }
    },
    { signal },
  );
}

/**
 * Инициализирует выпадающие меню действий кампаний.
 *
 * @param {AbortSignal} signal Сигнал жизненного цикла страницы.
 * @return {void}
 */
function CampaignActionMenus(signal: AbortSignal): void {
  const triggerButtons = Array.from(
    document.querySelectorAll<HTMLElement>('.js-campaign-actions-trigger'),
  );
  const deleteButtons = Array.from(
    document.querySelectorAll<HTMLElement>('.js-delete-action-trigger'),
  );

  if (!triggerButtons.length && !deleteButtons.length) {
    return;
  }

  const ensureMenu = (trigger: HTMLElement): HTMLElement | null => {
    const actions = trigger.closest<HTMLElement>('.campaign-row__actions');

    if (!actions) {
      return null;
    }

    const existing = actions.querySelector<HTMLElement>('.campaign-row__menu');
    if (existing) {
      return existing;
    }

    const menu = document.createElement('div');
    menu.className = 'campaign-row__menu';
    menu.hidden = true;
    menu.innerHTML = `
      <button type="button" class="campaign-row__menu-item">
        <svg viewBox="0 0 24 24" class="campaign-row__menu-icon campaign-row__menu-icon--blue">
          <path d="M4 4h16v16H4V4Zm3 12h2V9H7v7Zm4 0h2V12h-2v4Zm4 0h2V7h-2v9Z"/>
        </svg>
        <span>Статистика</span>
      </button>
      <button type="button" class="campaign-row__menu-item">
        <svg viewBox="0 0 24 24" class="campaign-row__menu-icon campaign-row__menu-icon--blue">
          <path d="m12 4V1L8 5l4 4V6a6 6 0 1 1-6 6H4a8 8 0 1 0 8-8Zm-1 4v5l4 2 .9-1.8-2.9-1.4V8H11Z"/>
        </svg>
        <span>История действий</span>
      </button>
      <button type="button" class="campaign-row__menu-item js-edit-menu-item">
        <svg viewBox="0 0 24 24" class="campaign-row__menu-icon campaign-row__menu-icon--blue">
          <path d="m3 17.25 9.9-9.9 3.75 3.75-9.9 9.9H3v-3.75Zm14.7-10.2 1.8-1.8a1 1 0 0 0 0-1.4L18.15 2.5a1 1 0 0 0-1.4 0l-1.8 1.8 2.75 2.75Z"/>
        </svg>
        <span>Редактировать</span>
      </button>
      <button type="button" class="campaign-row__menu-item campaign-row__menu-item--danger js-delete-menu-item">
        <svg viewBox="0 0 24 24" class="campaign-row__menu-icon campaign-row__menu-icon--red">
          <path d="M9 3.75A1.75 1.75 0 0 1 10.75 2h2.5A1.75 1.75 0 0 1 15 3.75V4h3.25a.75.75 0 0 1 0 1.5h-.77l-.63 12.03A2 2 0 0 1 14.85 19.5H9.15a2 2 0 0 1-2-1.97L6.52 5.5h-.77a.75.75 0 0 1 0-1.5H9v-.25Zm1.5.25h3v-.25a.25.25 0 0 0-.25-.25h-2.5a.25.25 0 0 0-.25.25V4Zm-1.85 14h6.7a.5.5 0 0 0 .5-.48L16.47 5.5H7.53l.62 12.02a.5.5 0 0 0 .5.48ZM10 8.75a.75.75 0 0 1 1.5 0v5.5a.75.75 0 0 1-1.5 0v-5.5Zm2.5 0a.75.75 0 0 1 1.5 0v5.5a.75.75 0 0 1-1.5 0v-5.5Z"/>
        </svg>
        <span>Удалить</span>
      </button>
    `;
    actions.appendChild(menu);
    return menu;
  };

  const closeAll = (): void => {
    document.querySelectorAll<HTMLElement>('.campaign-row__menu').forEach((menu) => {
      menu.hidden = true;
    });

    triggerButtons.forEach((button) => {
      button.setAttribute('aria-expanded', 'false');
    });
  };

  const navigateToEdit = (target: Element): void => {
    const row = target.closest<HTMLElement>('.campaign-row');

    if (row) {
      localStorage.setItem(
        'campaign_edit_seed',
        JSON.stringify({
          id: row.dataset.campaignId || '',
          title: row.dataset.campaignTitle || '',
          budgetValue: Number(row.dataset.campaignBudgetValue || '0'),
          goal: row.dataset.campaignGoal || '',
        }),
      );
    }

    navigateTo('/ads/edit');
  };

  triggerButtons.forEach((button) => {
    if (!button.querySelector('.campaign-row__actions-trigger-glyph')) {
      const labelNode = button.querySelector('.campaign-row__actions-trigger-label');

      if (labelNode) {
        const glyph = document.createElement('span');
        glyph.className = 'campaign-row__actions-trigger-glyph';
        glyph.setAttribute('aria-hidden', 'true');
        glyph.innerHTML = `
          <svg viewBox="0 0 24 24" class="campaign-row__actions-trigger-glyph-icon">
            <path d="M4 17.25V20h2.75l8.1-8.1-2.75-2.75-8.1 8.1ZM18.71 7.04a1 1 0 0 0 0-1.42l-1.33-1.33a1 1 0 0 0-1.42 0l-1.56 1.56 2.75 2.75 1.56-1.56Z"/>
          </svg>
        `;
        button.insertBefore(glyph, labelNode);
      }
    }

    ensureMenu(button);
    button.addEventListener(
      'click',
      (event) => {
        event.preventDefault();
        event.stopPropagation();

        const menu = ensureMenu(button);
        if (!menu) {
          return;
        }

        const willOpen = menu.hidden;
        closeAll();
        menu.hidden = !willOpen;
        button.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
      },
      { signal },
    );
  });

  deleteButtons.forEach((button) => {
    button.querySelector('.campaign-row__action-button-label')?.remove();

    button.addEventListener(
      'click',
      (event) => {
        event.preventDefault();
        event.stopPropagation();
        closeAll();
        document.dispatchEvent(
          new CustomEvent('campaigns:open-delete-modal'),
        );
      },
      { signal },
    );
  });

  document.addEventListener(
    'click',
    (event) => {
      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }

      const menuItem = target.closest<HTMLElement>('.campaign-row__menu-item');
      if (!menuItem) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      closeAll();

      if (menuItem.classList.contains('js-edit-menu-item')) {
        navigateToEdit(menuItem);
        return;
      }

      if (menuItem.classList.contains('js-delete-menu-item')) {
        document.dispatchEvent(
          new CustomEvent('campaigns:open-delete-modal'),
        );
      }
    },
    { signal },
  );

  document.addEventListener(
    'click',
    (event) => {
      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }

      if (target.closest('.campaign-row__actions')) {
        return;
      }

      closeAll();
    },
    { signal },
  );

  document.addEventListener(
    'keydown',
    (event) => {
      if (event.key === 'Escape') {
        closeAll();
      }
    },
    { signal },
  );
}

/**
 * Инициализирует модальное окно удаления кампании.
 *
 * @param {AbortSignal} signal Сигнал жизненного цикла страницы.
 * @return {void}
 */
function CampaignDeleteModal(signal: AbortSignal): void {
  const modal = document.getElementById('campaigns-delete-modal');
  const confirmButton = document.getElementById('campaigns-delete-confirm');
  const cancelButton = document.getElementById('campaigns-delete-cancel');

  if (!modal || !confirmButton || !cancelButton) {
    return;
  }

  const close = () => {
    modal.hidden = true;
  };

  const open = () => {
    modal.hidden = false;
  };

  cancelButton.addEventListener('click', close, { signal });
  confirmButton.addEventListener('click', close, { signal });

  modal.addEventListener(
    'click',
    (event) => {
      if (event.target === modal) {
        close();
      }
    },
    { signal },
  );

  document.addEventListener(
    'keydown',
    (event) => {
      if (event.key === 'Escape' && !modal.hidden) {
        close();
      }
    },
    { signal },
  );

  document.addEventListener('campaigns:open-delete-modal', open, { signal });
}

function CampaignPagination(signal: AbortSignal): void {
  const table = document.querySelector<HTMLElement>('.campaigns-table');
  const body = table?.querySelector<HTMLElement>('.campaigns-table__body');
  const footer = table?.querySelector<HTMLElement>('[data-campaigns-pagination]');
  const prevButton = footer?.querySelector<HTMLButtonElement>('[data-pagination-prev]');
  const nextButton = footer?.querySelector<HTMLButtonElement>('[data-pagination-next]');
  const pagesNode = footer?.querySelector<HTMLElement>('[data-pagination-pages]');

  if (!table || !body || !footer || !prevButton || !nextButton || !pagesNode) {
    return;
  }

  const rows = Array.from(body.querySelectorAll<HTMLElement>('.campaign-row'));
  if (!rows.length) {
    footer.hidden = true;
    return;
  }

  const pageSize = 7;
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  let currentPage = 1;

  const buildPageItems = (): Array<number | string> => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, index) => index + 1);
    }

    const visiblePages = new Set<number>([1, totalPages, currentPage]);

    if (currentPage <= 3) {
      visiblePages.add(2);
      visiblePages.add(3);
      visiblePages.add(4);
    } else if (currentPage >= totalPages - 2) {
      visiblePages.add(totalPages - 1);
      visiblePages.add(totalPages - 2);
      visiblePages.add(totalPages - 3);
    } else {
      visiblePages.add(currentPage - 1);
      visiblePages.add(currentPage + 1);
    }

    const orderedPages = Array.from(visiblePages)
      .filter((page) => page >= 1 && page <= totalPages)
      .sort((left, right) => left - right);

    const items: Array<number | string> = [];

    orderedPages.forEach((page, index) => {
      const previousPage = orderedPages[index - 1];
      if (typeof previousPage === 'number' && page - previousPage > 1) {
        items.push('ellipsis');
      }
      items.push(page);
    });

    return items;
  };

  const renderRows = (): void => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;

    rows.forEach((row, index) => {
      row.hidden = index < startIndex || index >= endIndex;
    });
  };

  const renderPages = (): void => {
    pagesNode.innerHTML = '';

    buildPageItems().forEach((item) => {
      if (item === 'ellipsis') {
        const ellipsis = document.createElement('span');
        ellipsis.className = 'campaigns-table__page-ellipsis';
        ellipsis.textContent = '...';
        pagesNode.appendChild(ellipsis);
        return;
      }

      const pageButton = document.createElement('button');
      pageButton.type = 'button';
      pageButton.className = 'campaigns-table__page-button';
      pageButton.textContent = String(item);

      if (item === currentPage) {
        pageButton.classList.add('is-active');
        pageButton.setAttribute('aria-current', 'page');
      }

      pageButton.addEventListener(
        'click',
        () => {
          if (item === currentPage) {
            return;
          }

          currentPage = item;
          sync();
        },
        { signal },
      );

      pagesNode.appendChild(pageButton);
    });
  };

  const sync = (): void => {
    renderRows();
    renderPages();
    prevButton.disabled = currentPage === 1;
    nextButton.disabled = currentPage === totalPages;
  };

  prevButton.addEventListener(
    'click',
    () => {
      if (currentPage === 1) {
        return;
      }

      currentPage -= 1;
      sync();
    },
    { signal },
  );

  nextButton.addEventListener(
    'click',
    () => {
      if (currentPage === totalPages) {
        return;
      }

      currentPage += 1;
      sync();
    },
    { signal },
  );

  sync();
}

/**
 * Рендерит страницу списка объявлений.
 *
 * @return {Promise<string>} Сгенерированная строка HTML.
 */
export async function renderAdsPage(): Promise<string> {
  const result = await getAds();
  const campaigns = mapAdsToCampaigns(result.ads);

  return renderTemplate(adsPageTemplate, {
    campaigns,
    hasCampaigns: campaigns.length > 0,
    loadError: result.error ? (result.message ?? '') : '',
  });
}

/**
 * Инициализирует интерактивность страницы объявлений.
 *
 * @return {(function(): void)|undefined} Функция очистки обработчиков.
 */
export function Ads(): void | VoidFunction {
  if (adsPageLifecycleController) {
    adsPageLifecycleController.abort();
  }

  const controller = new AbortController();
  adsPageLifecycleController = controller;
  const { signal } = controller;

  const logoutButton = document.getElementById('logout-button');
  const navbarLogoutButton = document.getElementById('navbar-logout-button');

  if (logoutButton && navbarLogoutButton) {
    logoutButton.addEventListener(
      'click',
      () => {
        navbarLogoutButton.click();
      },
      { signal },
    );
  }

  document.querySelectorAll<HTMLElement>('.campaigns-page__create-button, .campaigns-empty__create-button').forEach((button) => {
    button.addEventListener(
      'click',
      (event) => {
        event.preventDefault();
        navigateTo('/ads/create');
      },
      { signal },
    );
  });

  DatePicker(signal);
  CampaignActionMenus(signal);
  CampaignDeleteModal(signal);
  CampaignPagination(signal);

  return () => {
    if (adsPageLifecycleController === controller) {
      adsPageLifecycleController = null;
    }
    controller.abort();
  };
}
