import { formatPrice } from 'shared/lib/format';
import {
  parseAmountInput,
  validateAmountNotLessThan,
  validateMinAmount,
} from 'shared/validators';
import { type ToastController } from 'features/balance/lib/modal';
import type { BalanceDashboardState } from 'features/balance/model/types';
import { closeModal, openModal } from 'shared/ui/modal/modal';
import { updateAutopaySettings } from 'features/balance/api/autopay-settings';

interface InitBalanceAutopayWidgetParams {
  autopayForm: HTMLFormElement | null;
  autopayModal: HTMLElement | null;
  commitState: () => void;
  signal: AbortSignal;
  state: BalanceDashboardState;
  toast: ToastController;
}

export function syncBalanceAutopayWidget(
  state: BalanceDashboardState,
): void {
  const thresholdInput = document.querySelector<HTMLInputElement>(
    '#balance-autopay-form input[name="threshold"]',
  );
  const limitInput = document.querySelector<HTMLInputElement>(
    '#balance-autopay-form input[name="limit"]',
  );
  const enabledInput = document.querySelector<HTMLInputElement>(
    '#balance-autopay-form input[name="enabled"]',
  );

  if (thresholdInput && document.activeElement !== thresholdInput) {
    thresholdInput.value = String(state.autopayThreshold);
  }

  if (limitInput && document.activeElement !== limitInput) {
    limitInput.value = String(state.autopayLimit);
  }

  if (enabledInput) {
    enabledInput.checked = state.autopayEnabled;
  }
}

export function initBalanceAutopayWidget({
  autopayForm,
  autopayModal,
  commitState,
  signal,
  state,
  toast,
}: InitBalanceAutopayWidgetParams): void {
  document
    .querySelectorAll<HTMLElement>('[data-balance-open-autopay]')
    .forEach((node) => {
      node.addEventListener(
        'click',
        () => {
          if (autopayModal instanceof HTMLElement) {
            openModal(autopayModal);
          }
        },
        { signal },
      );
    });

  if (!autopayForm || !(autopayModal instanceof HTMLElement)) {
    return;
  }

  autopayForm.addEventListener(
    'submit',
    (event) => {
      event.preventDefault();

      const enabledInput = autopayForm.elements.namedItem('enabled');
      const thresholdInput = autopayForm.elements.namedItem('threshold');
      const limitInput = autopayForm.elements.namedItem('limit');
      const errorNode = autopayForm.querySelector<HTMLElement>(
        '[data-balance-autopay-error]',
      );
      const enabled =
        enabledInput instanceof HTMLInputElement ? enabledInput.checked : false;
      const threshold =
        thresholdInput instanceof HTMLInputElement
          ? parseAmountInput(thresholdInput.value)
          : 0;
      const limit =
        limitInput instanceof HTMLInputElement
          ? parseAmountInput(limitInput.value)
          : 0;

      if (errorNode) {
        errorNode.textContent = '';
      }

      const thresholdError = enabled
        ? validateMinAmount(
            threshold,
            1000,
            'Порог автоплатежа должен быть не меньше 1 000 ₽.',
          )
        : '';
      if (thresholdError) {
        if (errorNode) {
          errorNode.textContent = thresholdError;
        }
        return;
      }

      const limitError = enabled
        ? validateAmountNotLessThan(
            limit,
            threshold,
            'Лимит автоплатежа не может быть меньше порога.',
          )
        : '';
      if (limitError) {
        if (errorNode) {
          errorNode.textContent = limitError;
        }
        return;
      }

      if (enabled && !state.savedPaymentMethodId) {
        if (errorNode) {
          errorNode.textContent =
            'Карта не сохранена. Сделайте первое пополнение через ЮKassa, чтобы включить автоплатёж.';
        }
        return;
      }

      const normalizedThreshold = Math.max(1000, threshold || state.autopayThreshold);
      const normalizedLimit = Math.max(normalizedThreshold, limit || state.autopayLimit);

      updateAutopaySettings({
        enabled,
        threshold: normalizedThreshold,
        limit: normalizedLimit,
      })
        .then((settings) => {
          state.autopayEnabled = Boolean(settings.enabled);
          state.autopayThreshold = settings.threshold;
          state.autopayLimit = settings.limit;

          commitState();
          closeModal(autopayModal);
          toast.show(
            'Настройки автоплатежа сохранены',
            settings.enabled
              ? `Пополнение включится при падении ниже ${formatPrice(settings.threshold)}.`
              : 'Автопополнение отключено. Контролируйте остаток вручную.',
          );
        })
        .catch(() => {
          if (errorNode) {
            errorNode.textContent =
              'Не удалось сохранить настройки автоплатежа. Попробуйте позже.';
          }
        });
    },
    { signal },
  );
}
