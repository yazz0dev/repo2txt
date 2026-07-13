import { useState, useEffect, useMemo } from 'react';

const palette = {
    primary: '#0055FF', // Electric Blue
    primaryLight: '#3377FF',
    primaryDark: '#0033CC',
    secondary: '#32CD32', // Lime Green

    success: '#32CD32',
    warning: '#f59e0b',
    error: '#ef4444',

    // Light Theme
    white: '#FFFFFF',
    gray50: '#F7F7F8',
    gray100: '#ECECF1',
    gray200: '#D9D9E3',
    gray300: '#C5C5D2',
    gray400: '#ACACBE',
    gray500: '#8E8EA0',
    gray600: '#565869',
    gray700: '#40414F',
    gray800: '#343541',
    gray900: '#202123',

    // Dark Theme
    darkBg: '#000000', // Pure black
    darkCard: '#111111',
    darkSurface: '#222222',
    darkBorder: '#333333',
};

export const useTheme = () => {
    const [isDark, setIsDark] = useState(
        typeof window !== 'undefined' ? window.matchMedia('(prefers-color-scheme: dark)').matches : false
    );

    useEffect(() => {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handler = (e) => setIsDark(e.matches);
        mediaQuery.addEventListener('change', handler);
        return () => mediaQuery.removeEventListener('change', handler);
    }, []);

    return useMemo(() => {
        return {
            isDark,
            colors: {
                primary: palette.primary,
                primaryLight: palette.primaryLight,
                primaryDark: palette.primaryDark,
                secondary: palette.secondary,
                success: palette.success,
                warning: palette.warning,
                error: palette.error,

                background: isDark ? palette.darkBg : palette.white,
                card: isDark ? palette.darkCard : palette.white,
                surface: isDark ? palette.darkSurface : palette.gray50,
                border: isDark ? palette.darkBorder : palette.gray200,

                text: isDark ? '#ffffff' : '#000000',
                textSecondary: isDark ? '#cccccc' : '#555555',
                textPlaceholder: isDark ? '#888888' : '#999999',

                icon: isDark ? '#ffffff' : '#000000',

                primaryGradient: 'linear-gradient(135deg, #0055FF 0%, #32CD32 100%)',
            },
            spacing: {
                xs: 4,
                sm: 8,
                md: 16,
                lg: 24,
                xl: 32,
                xxl: 48,
            },
            borderRadius: {
                sm: 4,
                md: 6,
                lg: 8,
                xl: 12,
                full: 9999,
            },
            shadows: {
                sm: { boxShadow: isDark ? '0 1px 2px rgba(0,0,0,0.8)' : '0 1px 2px rgba(0,0,0,0.05)' },
                md: { boxShadow: isDark ? '0 4px 6px rgba(0,0,0,0.8)' : '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)' },
                lg: { boxShadow: isDark ? '0 10px 15px rgba(0,0,0,0.9)' : '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)' },
            }
        };
    }, [isDark]);
};
