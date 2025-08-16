document.addEventListener('DOMContentLoaded', function() {
  var toggle = document.getElementById('theme-toggle');
  if (!toggle) return;
  var isDark = document.documentElement.classList.contains('dark-mode');
  toggle.textContent = isDark ? '☀️' : '🌙';
  toggle.addEventListener('click', function() {
    document.documentElement.classList.toggle('dark-mode');
    var dark = document.documentElement.classList.contains('dark-mode');
    toggle.textContent = dark ? '☀️' : '🌙';
    localStorage.setItem('theme', dark ? 'dark' : 'light');
  });
});
