export function initCampaignPagination(signal: AbortSignal): void {
  const table = document.querySelector<HTMLElement>('.campaigns-table');
  const body = table?.querySelector<HTMLElement>('.campaigns-table__body');
  const footer = table?.querySelector<HTMLElement>(
    '[data-campaigns-pagination]',
  );
  const prevButton = footer?.querySelector<HTMLButtonElement>(
    '[data-pagination-prev]',
  );
  const nextButton = footer?.querySelector<HTMLButtonElement>(
    '[data-pagination-next]',
  );
  const pagesNode = footer?.querySelector<HTMLElement>(
    '[data-pagination-pages]',
  );

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
