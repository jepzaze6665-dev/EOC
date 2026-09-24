// Only one DOM screen is visible at a time. The canvas always renders behind them.

export function showScreen(id) {
  document.querySelectorAll('.screen').forEach((el) => {
    el.classList.toggle('active', el.id === id);
  });
}

export function hideAllScreens() {
  document.querySelectorAll('.screen').forEach((el) => el.classList.remove('active'));
}
