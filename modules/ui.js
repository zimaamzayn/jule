// --- UI ---
export function showToast(message) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3000);
}

// --- Theme ---
const themeToggle = document.getElementById('theme-toggle');
const savedTheme = localStorage.getItem('theme') || 'light';
document.documentElement.setAttribute('data-theme', savedTheme);
updateThemeIcon();

themeToggle.addEventListener('click', () => {
  const newTheme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', newTheme);
  localStorage.setItem('theme', newTheme);
  updateThemeIcon();
});

function updateThemeIcon() {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  themeToggle.innerHTML = `<ion-icon name="${isDark ? 'sunny-outline' : 'moon-outline'}"></ion-icon>`;
}

// --- Navigation ---
export function showView(viewName) {
  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.view === viewName);
  });
  document.querySelectorAll('.view').forEach(el => {
    el.classList.toggle('active', el.id === viewName + '-view');
  });

  document.dispatchEvent(new CustomEvent('viewchange', { detail: { view: viewName } }));
}

document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', () => {
    showView(item.dataset.view);
  });
});