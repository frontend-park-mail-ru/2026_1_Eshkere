import './payment-result.scss';
import { renderTemplate } from 'shared/lib/render';
import { getSubscription } from 'features/subscription';
import { request } from 'shared/lib/request';
import paymentResultTemplate from './payment-result.hbs';

interface PaymentResultViewModel {
  amountLabel: string;
  iconLabel: string;
  isSuccess: boolean;
  kicker: string;
  primaryHref: string;
  primaryText: string;
  secondaryHref: string;
  secondaryText: string;
  statusText: string;
  subtitle: string;
  title: string;
}

function getAmountLabel(): string {
  const params = new URLSearchParams(window.location.search);
  const amount = params.get('amount');

  if (!amount) {
    return 'Сумма уточняется';
  }

  const normalizedAmount = Number(amount.replace(',', '.'));

  if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0) {
    return 'Сумма уточняется';
  }

  return new Intl.NumberFormat('ru-RU', {
    maximumFractionDigits: 0,
    style: 'currency',
    currency: 'RUB',
  }).format(normalizedAmount);
}

function createSuccessViewModel(): PaymentResultViewModel {
  return {
    amountLabel: getAmountLabel(),
    iconLabel: 'Успешная оплата',
    isSuccess: true,
    kicker: 'Оплата принята',
    primaryHref: '/advertiser/balance',
    primaryText: 'Перейти к балансу',
    secondaryHref: '/advertiser/campaigns',
    secondaryText: 'К кампаниям',
    statusText: 'Баланс обновится после подтверждения платежа от ЮKassa.',
    subtitle:
      'Платеж прошел. Мы проверяем подтверждение от платежного сервиса и обновим баланс кабинета автоматически.',
    title: 'Спасибо, оплата в обработке',
  };
}

function createFailViewModel(): PaymentResultViewModel {
  return {
    amountLabel: getAmountLabel(),
    iconLabel: 'Оплата не завершена',
    isSuccess: false,
    kicker: 'Оплата не завершена',
    primaryHref: '/advertiser/balance',
    primaryText: 'Повторить оплату',
    secondaryHref: '/advertiser/support',
    secondaryText: 'Написать в поддержку',
    statusText: 'Деньги не списаны, если банк не подтвердил платеж.',
    subtitle:
      'Платеж был отменен или не прошел проверку банка. Можно вернуться к балансу и создать новую оплату.',
    title: 'Не удалось завершить оплату',
  };
}

export async function renderPaymentSuccessPage(): Promise<string> {
  return renderTemplate(paymentResultTemplate, createSuccessViewModel());
}

export async function renderPaymentFailPage(): Promise<string> {
  return renderTemplate(paymentResultTemplate, createFailViewModel());
}

export function PaymentResult(): void {
  document.querySelector<HTMLElement>('.payment-result__primary')?.focus();

  // Webhook активирует Pro асинхронно — обновляем данные в фоне после успешной оплаты
  if (window.location.pathname.includes('/success')) {
    void Promise.all([
      getSubscription().catch(() => null),
      request('/advertisers/me').catch(() => null),
    ]);
  }
}
