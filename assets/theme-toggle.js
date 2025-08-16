document.addEventListener('DOMContentLoaded', function() {
  var toggle = document.getElementById('theme-toggle');
  if (!toggle) return;
  var saved = localStorage.getItem('theme');
  var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  if (saved === 'dark' || (saved === null && prefersDark)) {
    document.body.classList.add('dark-mode');
    toggle.textContent = '☀️';
  }
  toggle.addEventListener('click', function() {
    document.body.classList.toggle('dark-mode');
    var isDark = document.body.classList.contains('dark-mode');
    toggle.textContent = isDark ? '☀️' : '🌙';
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  });
});
