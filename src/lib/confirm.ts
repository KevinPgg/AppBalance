import { Alert, Platform } from 'react-native';
import { useThemeStore } from '@/store/theme';
import { THEMES, themeKey, type Theme } from '@/theme/themes';

// Diálogos estilo "SweetAlert" temáticos.
// - En web (la PWA) se construye un modal en el DOM con la paleta del tema
//   activo, en lugar de window.confirm/alert del sistema (feos y sin tema).
// - En nativo se usa Alert (la app se distribuye como PWA; es un fallback).
//
// No se usa la librería sweetalert2: importa su SCSS por el campo `module` y
// Metro/Expo no la empaqueta limpio cross-platform. Este modal propio no añade
// dependencias y se tematiza al 100%.

function activeTheme(): Theme {
  const { family, mode } = useThemeStore.getState();
  return THEMES[themeKey(family, mode)];
}

// rgba con alfa desde un hex (#rrggbb o #rgb).
function hexA(hex: string, a: number): string {
  const h = hex.replace('#', '');
  const n = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const r = parseInt(n.slice(0, 2), 16);
  const g = parseInt(n.slice(2, 4), 16);
  const b = parseInt(n.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}

type ModalOpts = {
  title: string;
  message?: string;
  confirmText: string;
  cancelText?: string; // sin cancelText => un solo botón (notify)
  destructive?: boolean;
};

let closeOpen: (() => void) | null = null;

function showModal(opts: ModalOpts): Promise<boolean> {
  const t = activeTheme();
  closeOpen?.(); // cierra un modal previo si lo hubiera

  return new Promise<boolean>((resolve) => {
    const accent = opts.destructive ? t.danger : t.caramel;

    const overlay = document.createElement('div');
    Object.assign(overlay.style, {
      position: 'fixed',
      inset: '0',
      zIndex: '99999',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      background: 'rgba(0,0,0,0.45)',
      opacity: '0',
      transition: 'opacity 140ms ease',
    } as Partial<CSSStyleDeclaration>);

    const card = document.createElement('div');
    Object.assign(card.style, {
      width: '100%',
      maxWidth: '340px',
      boxSizing: 'border-box',
      background: t.surface,
      color: t.textPrimary,
      border: `1px solid ${t.border}`,
      borderRadius: '18px',
      padding: '24px',
      boxShadow: '0 18px 50px rgba(0,0,0,0.35)',
      transform: 'scale(0.96)',
      transition: 'transform 140ms ease',
      fontFamily: 'inherit',
      textAlign: 'center',
    } as Partial<CSSStyleDeclaration>);

    const icon = document.createElement('div');
    Object.assign(icon.style, {
      width: '52px',
      height: '52px',
      borderRadius: '26px',
      margin: '0 auto 14px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: hexA(accent, 0.15),
      color: accent,
      fontSize: '26px',
      fontWeight: '700',
    } as Partial<CSSStyleDeclaration>);
    icon.textContent = opts.destructive ? '!' : opts.cancelText ? '?' : 'i';

    const h = document.createElement('div');
    Object.assign(h.style, {
      fontSize: '18px',
      fontWeight: '700',
      marginBottom: opts.message ? '6px' : '0',
    } as Partial<CSSStyleDeclaration>);
    h.textContent = opts.title;

    card.appendChild(icon);
    card.appendChild(h);

    if (opts.message) {
      const p = document.createElement('div');
      Object.assign(p.style, {
        fontSize: '14px',
        color: t.textSecondary,
        lineHeight: '1.4',
      } as Partial<CSSStyleDeclaration>);
      p.textContent = opts.message;
      card.appendChild(p);
    }

    const row = document.createElement('div');
    Object.assign(row.style, {
      display: 'flex',
      gap: '10px',
      marginTop: '20px',
    } as Partial<CSSStyleDeclaration>);

    function makeBtn(label: string, kind: 'confirm' | 'cancel'): HTMLButtonElement {
      const b = document.createElement('button');
      b.textContent = label;
      Object.assign(b.style, {
        flex: '1',
        borderRadius: '12px',
        padding: '12px 14px',
        fontSize: '15px',
        fontWeight: '700',
        cursor: 'pointer',
        fontFamily: 'inherit',
        border: kind === 'confirm' ? 'none' : `1px solid ${t.border}`,
        background: kind === 'confirm' ? accent : 'transparent',
        color: kind === 'confirm' ? t.textOnDark : t.textPrimary,
      } as Partial<CSSStyleDeclaration>);
      return b;
    }

    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') close(false);
      else if (e.key === 'Enter') close(true);
    }

    function close(result: boolean) {
      document.removeEventListener('keydown', onKey);
      overlay.style.opacity = '0';
      card.style.transform = 'scale(0.96)';
      setTimeout(() => overlay.remove(), 150);
      closeOpen = null;
      resolve(result);
    }

    if (opts.cancelText) {
      const cancel = makeBtn(opts.cancelText, 'cancel');
      cancel.onclick = () => close(false);
      row.appendChild(cancel);
    }
    const confirm = makeBtn(opts.confirmText, 'confirm');
    confirm.onclick = () => close(true);
    row.appendChild(confirm);

    card.appendChild(row);
    overlay.appendChild(card);
    overlay.onclick = (e) => {
      if (e.target === overlay) close(false);
    };

    document.body.appendChild(overlay);
    document.addEventListener('keydown', onKey);
    closeOpen = () => {
      document.removeEventListener('keydown', onKey);
      overlay.remove();
      closeOpen = null;
    };

    requestAnimationFrame(() => {
      overlay.style.opacity = '1';
      card.style.transform = 'scale(1)';
    });
  });
}

function isDestructive(title: string, confirmText: string): boolean {
  return /elimin|borrar|deshacer|cerrar sesi/i.test(`${title} ${confirmText}`);
}

export function confirmAsync(
  title: string,
  message?: string,
  confirmText = 'Eliminar',
  cancelText = 'Cancelar',
): Promise<boolean> {
  if (Platform.OS === 'web') {
    return showModal({
      title,
      message,
      confirmText,
      cancelText,
      destructive: isDestructive(title, confirmText),
    });
  }
  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: cancelText, style: 'cancel', onPress: () => resolve(false) },
      { text: confirmText, style: 'destructive', onPress: () => resolve(true) },
    ]);
  });
}

// Aviso simple (un solo botón).
export function notify(title: string, message?: string): void {
  if (Platform.OS === 'web') {
    void showModal({ title, message, confirmText: 'Entendido' });
    return;
  }
  Alert.alert(title, message);
}
