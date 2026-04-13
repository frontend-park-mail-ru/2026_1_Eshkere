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
import { MONTHS_RU_FULL } from 'shared/lib/constants/ru-months';

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

export function initAdsDatePicker(signal: AbortSignal): void {
  const toggle = document.getElementById('date-filter-toggle');
  const picker = document.getElementById('campaigns-date-picker');
  const filterLabel = document.getElementById('date-filter-label');

  if (!toggle || !picker || !filterLabel) {
    return;
  }

  if (
    toggle instanceof HTMLButtonElement &&
    (toggle.disabled || toggle.getAttribute('aria-disabled') === 'true')
  ) {
    picker.hidden = true;
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

  const shiftMonth = (value: number): void => {
    viewMonth = new Date(
      viewMonth.getFullYear(),
      viewMonth.getMonth() + value,
      1,
    );
    render();
  };

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

  cancelButton.addEventListener('click', close, { signal });

  applyButton.addEventListener(
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
