import './feed-link-modal.scss';
import { openModal, closeModal } from 'shared/ui/modal/modal';

const MODAL_ID = 'feed-link-modal';

function extractToken(url: string): string {
  return url.split('/').pop() ?? url;
}

function buildLoaderSnippet(): string {
  return `<!-- EshkeReklama Ads -->\n<script src="https://eshkereklama.ru/sdk.js" async><\/script>`;
}

function buildBlockSnippet(token: string): string {
  return `<div id="eshkere-${token}"></div>\n<script>\n  EshkereAds.render({\n    token: "${token}",\n    container: "eshkere-${token}"\n  });\n<\/script>`;
}

function ensureModal(): HTMLElement {
  const existing = document.getElementById(MODAL_ID);
  if (existing instanceof HTMLElement) return existing;

  const wrapper = document.createElement('div');
  wrapper.innerHTML = `
    <div class="modal feed-link-modal" id="${MODAL_ID}" aria-hidden="true">
      <div class="modal__backdrop"></div>
      <div class="modal__content feed-link-modal__content" role="dialog" aria-modal="true" aria-labelledby="feed-link-modal-title">
        <div class="modal__inner feed-link-modal__inner">

          <div class="feed-link-modal__head">
            <h2 class="feed-link-modal__title" id="feed-link-modal-title">Интеграция рекламы</h2>
            <button class="feed-link-modal__close" type="button" data-flm-close aria-label="Закрыть">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M18 6 6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              </svg>
            </button>
          </div>

          <div class="feed-link-modal__section">
            <p class="feed-link-modal__section-title">Скопируйте код загрузчика рекламы</p>
            <p class="feed-link-modal__section-hint">
              Вставьте один раз между тегами <code>&lt;head&gt;</code> и <code>&lt;/head&gt;</code>
            </p>
            <div class="feed-link-modal__code-block">
              <pre class="feed-link-modal__code" data-flm-loader></pre>
              <button class="feed-link-modal__copy" type="button" data-flm-copy="loader">
                Копировать
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" stroke-width="1.8"/>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" stroke="currentColor" stroke-width="1.8"/>
                </svg>
              </button>
            </div>
          </div>

          <div class="feed-link-modal__section">
            <p class="feed-link-modal__section-title">Скопируйте код рекламного блока</p>
            <p class="feed-link-modal__section-hint">
              Вставьте между тегами <code>&lt;body&gt;</code> и <code>&lt;/body&gt;</code> в том месте, где должна отображаться реклама
            </p>
            <div class="feed-link-modal__code-block">
              <pre class="feed-link-modal__code" data-flm-block></pre>
              <button class="feed-link-modal__copy" type="button" data-flm-copy="block">
                Копировать
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" stroke-width="1.8"/>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" stroke="currentColor" stroke-width="1.8"/>
                </svg>
              </button>
            </div>
          </div>

          <div class="feed-link-modal__section feed-link-modal__section--url">
            <p class="feed-link-modal__section-title">Прямая ссылка на фид (JSON)</p>
            <div class="feed-link-modal__code-block">
              <pre class="feed-link-modal__code feed-link-modal__code--url" data-flm-url></pre>
              <button class="feed-link-modal__copy" type="button" data-flm-copy="url">
                Копировать
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" stroke-width="1.8"/>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" stroke="currentColor" stroke-width="1.8"/>
                </svg>
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  `.trim();

  const modal = wrapper.firstElementChild as HTMLElement;
  document.body.appendChild(modal);
  return modal;
}

export function openFeedLinkModal(feedUrl: string): void {
  const modal = ensureModal();
  const token = extractToken(feedUrl);

  const loaderSnippet = buildLoaderSnippet();
  const blockSnippet = buildBlockSnippet(token);

  const loaderEl = modal.querySelector('[data-flm-loader]');
  const blockEl = modal.querySelector('[data-flm-block]');
  const urlEl = modal.querySelector('[data-flm-url]');

  if (loaderEl) loaderEl.textContent = loaderSnippet;
  if (blockEl) blockEl.textContent = blockSnippet;
  if (urlEl) urlEl.textContent = feedUrl;

  const snippets: Record<string, string> = {
    loader: loaderSnippet,
    block: blockSnippet,
    url: feedUrl,
  };

  modal.querySelectorAll<HTMLButtonElement>('[data-flm-copy]').forEach((btn) => {
    btn.onclick = async () => {
      const key = btn.dataset.flmCopy ?? '';
      const text = snippets[key] ?? '';
      try {
        await navigator.clipboard.writeText(text);
        const prev = btn.textContent?.trim().split('\n')[0] ?? 'Копировать';
        btn.classList.add('feed-link-modal__copy--copied');
        btn.querySelector('svg')?.replaceWith((() => {
          const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
          s.setAttribute('width', '14'); s.setAttribute('height', '14');
          s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('fill', 'none');
          s.innerHTML = '<path d="M20 6 9 17l-5-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>';
          return s;
        })());
        const textNode = [...btn.childNodes].find(n => n.nodeType === Node.TEXT_NODE);
        if (textNode) textNode.textContent = 'Скопировано ';
        setTimeout(() => {
          btn.classList.remove('feed-link-modal__copy--copied');
          if (textNode) textNode.textContent = `${prev} `;
          btn.querySelector('svg')?.replaceWith((() => {
            const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            s.setAttribute('width', '14'); s.setAttribute('height', '14');
            s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('fill', 'none');
            s.innerHTML = '<rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" stroke-width="1.8"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" stroke="currentColor" stroke-width="1.8"/>';
            return s;
          })());
        }, 2000);
      } catch {
        // clipboard недоступен
      }
    };
  });

  const close = (): void => closeModal(modal);

  modal.querySelector('[data-flm-close]')?.addEventListener('click', close);
  modal.addEventListener('click', (e) => {
    if (e.target === modal || e.target === modal.querySelector('.modal__backdrop')) close();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.getAttribute('aria-hidden') === 'false') close();
  }, { once: true });

  openModal(modal);
}
