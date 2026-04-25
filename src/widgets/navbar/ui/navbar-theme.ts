const themeStorageKey = 'ui-theme';

export function initNavbarTheme(signal: AbortSignal): void {
  const themeBtn = document.getElementById('navbar-theme-btn') as HTMLElement | null;

  const applyTheme = (theme: 'light' | 'dark') => {
    document.documentElement.dataset.theme = theme;
  };

  const resolveInitialTheme = (): 'light' | 'dark' => {
    const storedTheme = localStorage.getItem(themeStorageKey);
    if (storedTheme === 'dark' || storedTheme === 'light') {
      return storedTheme;
    }

    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  };

  const toggleTheme = () => {
    const isDarkTheme = document.documentElement.dataset.theme === 'dark';
    const nextTheme: 'light' | 'dark' = isDarkTheme ? 'light' : 'dark';
    localStorage.setItem(themeStorageKey, nextTheme);
    applyTheme(nextTheme);
  };

  applyTheme(resolveInitialTheme());

  themeBtn?.addEventListener('click', toggleTheme, { signal });
}
