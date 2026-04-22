const themeStorageKey = 'ui-theme';

export function initNavbarTheme(signal: AbortSignal): void {
  const themeToggle = document.getElementById('navbar-theme-toggle') as HTMLElement | null;
  const themeToggleTitle = document.getElementById('navbar-theme-toggle-title');
  const themeBtn = document.getElementById('navbar-theme-btn') as HTMLElement | null;

  const applyTheme = (theme: 'light' | 'dark') => {
    const isDarkTheme = theme === 'dark';
    document.documentElement.dataset.theme = theme;
    if (themeToggleTitle) {
      themeToggleTitle.textContent = isDarkTheme ? 'Светлая тема' : 'Темная тема';
    }
    if (themeToggle) {
      themeToggle.setAttribute(
        'aria-label',
        isDarkTheme ? 'Включить светлую тему' : 'Включить темную тему',
      );
    }
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

  themeToggle?.addEventListener('click', toggleTheme, { signal });
  themeBtn?.addEventListener('click', toggleTheme, { signal });

  themeToggle?.addEventListener(
    'keydown',
    (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        toggleTheme();
      }
    },
    { signal },
  );
}
