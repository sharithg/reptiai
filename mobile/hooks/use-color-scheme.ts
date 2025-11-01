import { useTheme } from '@/contexts/ThemeContext';

/**
 * Custom hook to get the current color scheme
 * Uses the theme context instead of system color scheme
 */
export function useColorScheme(): 'light' | 'dark' {
  const { theme } = useTheme();
  return theme;
}
