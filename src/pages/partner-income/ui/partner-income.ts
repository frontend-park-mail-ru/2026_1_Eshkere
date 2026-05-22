import '../../partner-overview/ui/partner-overview.scss';
import { listPartnerSites } from 'features/sites';
import { navigateTo } from 'shared/lib/navigation';
import { renderTemplate } from 'shared/lib/render';
import partnerIncomeTemplate from './partner-income.hbs';

export async function renderPartnerIncomePage(): Promise<string> {
  const sitesResult = await listPartnerSites().catch(() => null);
  const sites = sitesResult?.sites ?? [];

  return await renderTemplate(partnerIncomeTemplate, {
    hasSites: sites.length > 0,
    sites: sites.map((site) => ({
      domain: site.domain,
      name: site.site_name || site.domain,
    })),
  });
}

export function PartnerIncome(): VoidFunction {
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

  root
    ?.querySelectorAll<HTMLButtonElement>('.partner-segment')
    .forEach((button) => {
      button.addEventListener(
        'click',
        () => {
          root.querySelectorAll('.partner-segment').forEach((segment) => {
            segment.classList.toggle(
              'partner-segment--active',
              segment === button,
            );
          });
        },
        { signal: controller.signal },
      );
    });

  return () => controller.abort();
}
