/* ============================================================
   Café Ledger · theme.js
   Cambio de familia (café / cherry) + modo (light / dark),
   con persistencia en localStorage. Además: FAB speed-dial y
   acordeón de Ajustes. Vanilla JS, sin dependencias.
   ============================================================ */

/* ---------------- TEMA ---------------- */
const THEME_KEY = 'cl-theme';

const THEME = {
  family: 'cafe',   // 'cafe' | 'cherry'
  mode:   'light',  // 'light' | 'dark'
};

// Nombres visibles según la familia activa
const LABELS = {
  cafe:   { light: 'Latte',  dark: 'Espresso' },
  cherry: { light: 'Cherry', dark: 'Dark Cherry' },
};

function applyTheme() {
  const root = document.documentElement;          // <html>
  root.setAttribute('data-family', THEME.family);
  root.setAttribute('data-mode',   THEME.mode);
  localStorage.setItem(THEME_KEY, JSON.stringify(THEME));
  syncThemeUI();
}

function setFamily(family) { THEME.family = family; applyTheme(); }
function setMode(mode)     { THEME.mode   = mode;   applyTheme(); }
function toggleMode()      { setMode(THEME.mode === 'dark' ? 'light' : 'dark'); }

function loadTheme() {
  try {
    const saved = JSON.parse(localStorage.getItem(THEME_KEY));
    if (saved && saved.family && saved.mode) Object.assign(THEME, saved);
  } catch (_) {}
  applyTheme();
}

// Refresca textos / estados activos de los controles (opcional, según tu markup)
function syncThemeUI() {
  const { family, mode } = THEME;
  const names = LABELS[family];

  // Etiqueta del toggle superior: <span data-theme-label></span>
  document.querySelectorAll('[data-theme-label]').forEach(el => {
    el.textContent = mode === 'dark' ? names.dark : names.light;
  });

  // Selector de paleta: <button data-family="cafe">  / "cherry"
  document.querySelectorAll('[data-family-btn]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.familyBtn === family);
  });

  // Segmented claro/oscuro: <button data-mode-btn="light"> / "dark"
  // (y sus labels dinámicos: <span data-mode-name="light">)
  document.querySelectorAll('[data-mode-btn]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.modeBtn === mode);
  });
  document.querySelectorAll('[data-mode-name]').forEach(el => {
    el.textContent = el.dataset.modeName === 'dark' ? names.dark : names.light;
  });
}

/* ---------------- FAB speed-dial ---------------- */
function initFab() {
  const fab     = document.querySelector('[data-fab]');
  const menu    = document.querySelector('[data-fab-menu]');
  const overlay = document.querySelector('[data-fab-overlay]');
  if (!fab || !menu) return;

  const setOpen = (open) => {
    fab.classList.toggle('open', open);
    menu.classList.toggle('open', open);
    overlay && overlay.classList.toggle('open', open);
  };
  fab.addEventListener('click', () => setOpen(!menu.classList.contains('open')));
  overlay && overlay.addEventListener('click', () => setOpen(false));
}

/* ---------------- Acordeón de Ajustes ---------------- */
function initAccordion() {
  document.querySelectorAll('[data-acc]').forEach(acc => {
    const head = acc.querySelector('.acc__head');
    const sign = acc.querySelector('.acc__sign');
    const sync = () => { if (sign) sign.textContent = acc.classList.contains('open') ? '\u2212' : '+'; }; // − / +
    sync();
    head && head.addEventListener('click', () => { acc.classList.toggle('open'); sync(); });
  });
}

/* ---------------- Wire-up de los controles de tema ---------------- */
function initThemeControls() {
  // Toggle claro/oscuro superior: <button data-mode-toggle>
  document.querySelectorAll('[data-mode-toggle]').forEach(b => b.addEventListener('click', toggleMode));

  // Selector de paleta: <button data-family-btn="cafe|cherry">
  document.querySelectorAll('[data-family-btn]').forEach(b =>
    b.addEventListener('click', () => setFamily(b.dataset.familyBtn)));

  // Segmented claro/oscuro: <button data-mode-btn="light|dark">
  document.querySelectorAll('[data-mode-btn]').forEach(b =>
    b.addEventListener('click', () => setMode(b.dataset.modeBtn)));
}

/* ---------------- Init ---------------- */
document.addEventListener('DOMContentLoaded', () => {
  loadTheme();
  initThemeControls();
  initFab();
  initAccordion();
});

// Exponer por si lo usas desde otro módulo
window.CafeTheme = { setFamily, setMode, toggleMode, get: () => ({ ...THEME }) };
