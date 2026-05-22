import '../../partner-overview/ui/partner-overview.scss';
import { getPartnerProfile, type PartnerProfileDto } from 'features/partner';
import { navigateTo } from 'shared/lib/navigation';
import { renderTemplate } from 'shared/lib/render';
import partnerPayoutsTemplate from './partner-payouts.hbs';

const COOPERATION_LABELS: Record<string, string> = {
  individual_entrepreneur: 'ИП',
  legal_entity: 'Юридическое лицо',
  self_employed: 'Самозанятый',
};

function formatMoney(value: number, currency = 'RUB'): string {
  return new Intl.NumberFormat('ru-RU', {
    currency: currency.trim() || 'RUB',
    maximumFractionDigits: 0,
    style: 'currency',
  }).format(Math.max(0, value));
}

function getProfileChecklist(profile: PartnerProfileDto | null) {
  return [
    {
      complete: Boolean(profile?.first_name && profile?.last_name),
      label: 'Личные данные',
      text: 'Имя и фамилия нужны для финансового профиля.',
    },
    {
      complete: Boolean(profile?.cooperation_form),
      label: 'Форма сотрудничества',
      text: 'Самозанятый, ИП или юридическое лицо.',
    },
    {
      complete: Boolean(profile?.payout_currency),
      label: 'Валюта выплат',
      text: 'Валюта задает отображение баланса партнера.',
    },
  ];
}

export async function renderPartnerPayoutsPage(): Promise<string> {
  const profile = await getPartnerProfile().catch(() => null);
  const hasBalance = typeof profile?.balance === 'number';

  return await renderTemplate(partnerPayoutsTemplate, {
    balance: hasBalance
      ? formatMoney(profile.balance, profile.payout_currency)
      : '—',
    cooperationForm:
      COOPERATION_LABELS[String(profile?.cooperation_form || '')] ||
      'Не указана',
    currency: profile?.payout_currency || '—',
    email: profile?.email || '—',
    hasBalance,
    payoutChecklist: getProfileChecklist(profile),
  });
}

export function PartnerPayouts(): VoidFunction {
  const controller = new AbortController();
  const root = document.querySelector<HTMLElement>('[data-partner-links]');

  root?.querySelectorAll<HTMLAnchorElement>('a[href]').forEach((link) => {
    link.addEventListener(
      'click',
      (event) => {
        const href = link.getAttribute('href');
        if (!href) {
          return;
        }
        event.preventDefault();
        navigateTo(href);
      },
      { signal: controller.signal },
    );
  });

  return () => controller.abort();
}
