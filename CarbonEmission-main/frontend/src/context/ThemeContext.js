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
  const [theme, setTheme] = useState('dark');

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    setTheme(savedTheme);
    applyTheme(savedTheme);
  }, []);

  const applyTheme = (newTheme) => {
    const root = document.documentElement;
    
    if (newTheme === 'light') {
      root.style.setProperty('--background', '255 255 255');
      root.style.setProperty('--foreground', '0 0 0');
      root.style.setProperty('--card', '250 250 250');
      root.style.setProperty('--card-foreground', '0 0 0');
      root.style.setProperty('--muted', '245 245 245');
      root.style.setProperty('--muted-foreground', '100 100 100');
      root.classList.add('light');
      root.classList.remove('dark');
      document.body.style.background = '#ffffff';
      document.body.style.color = '#000000';
    } else {
      root.style.setProperty('--background', '11 5 24');
      root.style.setProperty('--foreground', '243 244 246');
      root.style.setProperty('--card', '21 14 37');
      root.style.setProperty('--card-foreground', '255 255 255');
      root.style.setProperty('--muted', '42 36 56');
      root.style.setProperty('--muted-foreground', '156 163 175');
      root.classList.add('dark');
      root.classList.remove('light');
      document.body.style.background = '#0B0518';
      document.body.style.color = '#F3F4F6';
    }
  };

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    applyTheme(newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export default ThemeContext;