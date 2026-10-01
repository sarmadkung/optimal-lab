// Light and dark mode. The theme lives in data-theme on <html>, and globals.css
// switches every colour token on it. THEME_SCRIPT runs inline in layout.tsx before
// first paint and picks the saved choice, or the OS setting when nothing is saved.
// See node_modules/next/dist/docs/01-app/02-guides/preventing-flash-before-hydration.md

export type Theme = "light" | "dark";

export const THEME_KEY = "theme";
export const LIGHT_QUERY = "(prefers-color-scheme: light)";

export const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem("${THEME_KEY}");if(t!=="light"&&t!=="dark")t=matchMedia("${LIGHT_QUERY}").matches?"light":"dark";document.documentElement.setAttribute("data-theme",t)}catch(e){}})()`;
