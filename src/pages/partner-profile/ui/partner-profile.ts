import '../../partner-overview/ui/partner-overview.scss';
import { getPartnerProfile } from 'features/partner';
import { navigateTo } from 'shared/lib/navigation';
import { renderTemplate } from 'shared/lib/render';
import partnerProfileTemplate from './partner-profile.hbs';

const COOPERATION_LABELS: Record<string, string> = {
  individual_entrepreneur: 'Индивидуальный предприниматель',
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

export async function renderPartnerProfilePage(): Promise<string> {
  const profile = await getPartnerProfile().catch(() => null);
  const fullName = [
    profile?.last_name,
    profile?.first_name,
    profile?.middle_name,
  ]
    .filter(Boolean)
    .join(' ');

  return await renderTemplate(partnerProfileTemplate, {
    balance:
      typeof profile?.balance === 'number'
        ? formatMoney(profile.balance, profile.payout_currency)
        : '—',
    cooperationForm:
      COOPERATION_LABELS[String(profile?.cooperation_form || '')] ||
      'Не указана',
    countryCode: profile?.country_code || '—',
    currency: profile?.payout_currency || '—',
    email: profile?.email || '—',
    fullName: fullName || 'Профиль партнера',
    hasProfile: Boolean(profile),
    phone: profile?.phone || '—',
    regionCode: profile?.registration_region_code || '—',
  });
}

export function PartnerProfile(): VoidFunction {
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
