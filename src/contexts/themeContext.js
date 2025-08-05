import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const [isDark, setIsDark] = useState(false);

  // Load theme từ localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem('fx-theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme) {
      setIsDark(savedTheme === 'dark');
    } else {
      setIsDark(prefersDark);
    }
  }, []);

  // Apply theme to document
  useEffect(() => {
    if (isDark) {
      document.documentElement.setAttribute('data-theme', 'dark');
      document.body.className = 'dark-theme';
    } else {
      document.documentElement.removeAttribute('data-theme');
      document.body.className = 'light-theme';
    }
    localStorage.setItem('fx-theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  const toggleTheme = () => {
    setIsDark(prev => !prev);
  };

  const theme = {
    isDark,
    colors: {
      // Light theme
      light: {
        primary: '#ffffff',
        secondary: '#f8fafc',
        tertiary: '#f1f5f9',
        text: '#1e293b',
        textSecondary: '#64748b',
        textMuted: '#94a3b8',
        border: '#e2e8f0',
        borderHover: '#cbd5e1',
        success: '#10b981',
        danger: '#ef4444',
        warning: '#f59e0b',
        info: '#3b82f6',
        gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        gradientHover: 'linear-gradient(135deg, #5a67d8 0%, #6b46c1 100%)',
        cardShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        cardShadowHover: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
      },
      // Dark theme
      dark: {
        primary: '#0f172a',
        secondary: '#1e293b',
        tertiary: '#334155',
        text: '#f1f5f9',
        textSecondary: '#cbd5e1',
        textMuted: '#94a3b8',
        border: '#334155',
        borderHover: '#475569',
        success: '#34d399',
        danger: '#f87171',
        warning: '#fbbf24',
        info: '#60a5fa',
        gradient: 'linear-gradient(135deg, #4c1d95 0%, #581c87 100%)',
        gradientHover: 'linear-gradient(135deg, #5b21b6 0%, #6b21a8 100%)',
        cardShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.3)',
        cardShadowHover: '0 20px 25px -5px rgba(0, 0, 0, 0.4)'
      }
    }
  };

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme, theme }}>
      {children}
    </ThemeContext.Provider>
  );
};