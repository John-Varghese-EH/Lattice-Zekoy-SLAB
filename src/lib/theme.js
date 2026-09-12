export const initializeTheme = () => {
  const savedTheme = localStorage.getItem('theme') || 'system';
  applyTheme(savedTheme);
  return savedTheme;
};

export const applyTheme = (theme) => {
  const root = document.documentElement;
  
  if (theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    root.setAttribute('data-theme', 'dark');
    root.classList.add('dark');
  } else {
    root.setAttribute('data-theme', 'light');
    root.classList.remove('dark');
  }
};

export const toggleTheme = () => {
  const current = localStorage.getItem('theme');
  const root = document.documentElement;
  
  if (current === 'dark' || (current === 'system' && root.classList.contains('dark'))) {
    localStorage.setItem('theme', 'light');
    applyTheme('light');
    return 'light';
  } else {
    localStorage.setItem('theme', 'dark');
    applyTheme('dark');
    return 'dark';
  }
};
