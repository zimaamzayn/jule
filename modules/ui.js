// --- UI ---
export function showToast(message) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3000);
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