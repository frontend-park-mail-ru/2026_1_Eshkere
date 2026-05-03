import './add-sites-create.scss';
import { createPartnerSite } from 'features/sites';
import { renderTemplate } from 'shared/lib/render';
import { renderFormField } from 'shared/ui/form-field/form-field';
import { renderButton } from 'shared/ui/button/button';
import { checkSiteReachable } from 'shared/lib/site-reachability';
import { navigateTo } from 'shared/lib/navigation';
import {
  parseSiteInputToHttpUrl,
  setFieldState,
  validateSiteDomainOrUrl,
  validateSiteTitle,
} from 'shared/validators';
import template from './add-sites-create.hbs';

function partnerSiteCreateErrorMessage(raw: string): string {
  const lower = raw.toLowerCase();
  if (lower.includes('already exists') || lower.includes('domain already')) {
    return 'Сайт с таким доменом уже добавлен.';
  }
  if (lower.includes('invalid domain')) {
    return 'Укажите корректный домен или URL';
  }
  if (lower.includes('empty site_name')) {
    return 'Введите название сайта';
  }
  if (lower.includes('unauthorized') || lower.includes('session')) {
    return 'Сессия истекла. Войдите снова.';
  }
  return raw.trim() || 'Не удалось добавить сайт. Попробуйте ещё раз.';
}

type AddSitesCreateForm = HTMLFormElement & {
  readonly elements: HTMLFormControlsCollection & {
    title: HTMLInputElement;
    domain: HTMLInputElement;
  };
};

export async function renderAddSitesCreatePage(): Promise<string> {
  const titleField = await renderFormField({
    id: 'add-site-title',
    name: 'title',
    type: 'text',
    label: 'Название сайта',
    placeholder: 'Например, городской портал «Север»',
    required: true,
    autocomplete: 'off',
  });

  const domainField = await renderFormField({
    id: 'add-site-domain',
    name: 'domain',
    type: 'text',
    label: 'Домен или URL сайта',
    placeholder: 'site.example.ru или https://site.example.ru/page',
    required: true,
    autocomplete: 'url',
    inputmode: 'url',
  });

  const cancelButton = await renderButton({
    text: 'Отмена',
    href: '/add-sites',
    variant: 'secondary',
    className: 'site-create-page__cancel-btn',
  });

  const submitButton = await renderButton({
    text: 'Добавить сайт',
    type: 'submit',
    variant: 'primary',
    className: 'site-create-page__submit-btn',
  });

  return await renderTemplate(template, {
    titleField,
    domainField,
    cancelButton,
    submitButton,
  });
}

export function AddSitesCreate(): void | VoidFunction {
  const formEl = document.getElementById('add-sites-create-form');
  if (!(formEl instanceof HTMLFormElement)) {
    return;
  }

  const form = formEl as AddSitesCreateForm;
  const controller = new AbortController();
  const { signal } = controller;

  function validateTitle(): boolean {
    const error = validateSiteTitle(form.elements.title.value);
    setFieldState(form, 'title', error);
    return !error;
  }

  function validateDomain(): boolean {
    const error = validateSiteDomainOrUrl(form.elements.domain.value);
    setFieldState(form, 'domain', error);
    return !error;
  }

  form.elements.title.addEventListener('input', validateTitle, { signal });
  form.elements.domain.addEventListener('input', validateDomain, { signal });

  form.addEventListener(
    'submit',
    async (event) => {
      event.preventDefault();

      const titleOk = validateTitle();
      const domainOk = validateDomain();

      if (!titleOk || !domainOk) {
        return;
      }

      const parsedUrl = parseSiteInputToHttpUrl(form.elements.domain.value);
      if (!parsedUrl) {
        setFieldState(
          form,
          'domain',
          'Укажите корректный домен или URL',
        );
        return;
      }

      const submitBtn = form.querySelector<HTMLButtonElement>(
        'button[type="submit"]',
      );
      const prevLabel = submitBtn?.textContent ?? '';

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Проверка доступности…';
        submitBtn.setAttribute('aria-busy', 'true');
      }

      try {
        const reach = await checkSiteReachable(parsedUrl, { signal });

        if (!reach.ok && reach.reason === 'cancelled') {
          return;
        }

        if (!reach.ok) {
          setFieldState(form, 'domain', reach.message);
          return;
        }

        if (submitBtn) {
          submitBtn.textContent = 'Добавление сайта…';
        }

        try {
          await createPartnerSite({
            domain: parsedUrl.hostname.toLowerCase(),
            site_name: form.elements.title.value.trim(),
          });
        } catch (err) {
          const raw = err instanceof Error ? err.message : String(err);
          const msg = partnerSiteCreateErrorMessage(raw);
          if (raw.toLowerCase().includes('empty site_name')) {
            setFieldState(form, 'title', msg);
          } else {
            setFieldState(form, 'domain', msg);
          }
          return;
        }

        navigateTo('/add-sites/block');
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = prevLabel || 'Добавить сайт';
          submitBtn.removeAttribute('aria-busy');
        }
      }
    },
    { signal },
  );

  return () => {
    controller.abort();
  };
}
