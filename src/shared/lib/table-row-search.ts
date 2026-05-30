export type BindTableRowSearchOptions = {
  inputId: string;
  signal: AbortSignal;
  rowSelector?: string;
  buildSearchText: (row: HTMLElement) => string;
  /** Скрывать несовпадающие строки напрямую (без пагинации). */
  hideNonMatching?: boolean;
  onApply?: () => void;
};

export function bindTableRowSearch({
  inputId,
  signal,
  rowSelector = '.campaign-row',
  buildSearchText,
  hideNonMatching = false,
  onApply,
}: BindTableRowSearchOptions): void {
  const searchInput = document.getElementById(inputId) as HTMLInputElement | null;
  if (!searchInput) return;

  let searchFrameId = 0;

  const applySearch = (query: string): void => {
    const normalizedQuery = query.trim().toLowerCase();

    document.querySelectorAll<HTMLElement>(rowSelector).forEach((row) => {
      row.dataset.searchText ||= buildSearchText(row)
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase();

      const hidden = Boolean(
        normalizedQuery && !row.dataset.searchText.includes(normalizedQuery),
      );
      row.dataset.searchHidden = hidden ? 'true' : 'false';

      if (hideNonMatching) {
        row.hidden = hidden;
      }
    });

    onApply?.();
  };

  searchInput.addEventListener(
    'input',
    () => {
      if (searchFrameId) {
        cancelAnimationFrame(searchFrameId);
      }
      searchFrameId = requestAnimationFrame(() => {
        applySearch(searchInput.value);
        searchFrameId = 0;
      });
    },
    { signal },
  );

  signal.addEventListener(
    'abort',
    () => {
      if (searchFrameId) {
        cancelAnimationFrame(searchFrameId);
      }
    },
    { once: true },
  );
}
