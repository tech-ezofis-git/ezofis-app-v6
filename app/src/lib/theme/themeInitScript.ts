import { DEFAULT_THEME_MODE, THEME_STORAGE_KEY } from './constants'

/**
 * Inline script executed before React hydration to prevent theme flash (FART).
 * Mirrors Mantine ColorSchemeScript behavior for Vite SPA.
 */
export const themeInitScript = `
(function () {
  try {
    var stored = localStorage.getItem('${THEME_STORAGE_KEY}');
    var preference =
      stored === 'light' || stored === 'dark' || stored === 'auto'
        ? stored
        : '${DEFAULT_THEME_MODE}';
    var resolved =
      preference !== 'auto'
        ? preference
        : window.matchMedia('(prefers-color-scheme: dark)').matches
          ? 'dark'
          : 'light';
    document.documentElement.setAttribute('data-mantine-color-scheme', resolved);
    document.documentElement.setAttribute('data-theme-preference', preference);
    document.documentElement.setAttribute('data-resolved-theme', resolved);
    document.documentElement.style.colorScheme = resolved;
  } catch (e) {}
})();
`.trim()
