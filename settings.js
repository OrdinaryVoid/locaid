const checkbox = document.getElementById('theme-toggle-checkbox');
checkbox.addEventListener('change', () => {
  toggleTheme();
  checkbox.checked = document.documentElement.getAttribute('data-theme') === 'dark';
});

// Toggle theme and save preference
const toggleTheme = () => {
  const currentTheme = document.documentElement.getAttribute('data-theme');
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', newTheme);
  localStorage.setItem('theme', newTheme);
};

// Load saved theme on page load
document.addEventListener('DOMContentLoaded', () => {
  const savedTheme = localStorage.getItem('theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);
});