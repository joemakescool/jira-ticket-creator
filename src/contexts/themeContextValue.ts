/**
 * Theme context object and its consumer hook.
 *
 * Kept out of ThemeContext.tsx because Vite's fast refresh only works when a
 * module exports components exclusively — mixing the provider component with
 * the hook forced a full reload on every edit to either.
 */

import { createContext, useContext } from 'react';

export interface ThemeContextValue {
  isDarkMode: boolean;
  toggleTheme: () => void;
}

export const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export const THEME_STORAGE_KEY = 'theme-preference';

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
