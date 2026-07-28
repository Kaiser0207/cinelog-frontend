import { useEffect, useRef } from 'react';

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

/**
 * Basic modal keyboard contract shared by the site's overlays:
 * initial focus, Escape close, Tab containment and focus return.
 */
export function useDialogA11y({
  open = true,
  containerRef,
  initialFocusRef,
  onClose,
}) {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!open) return undefined;
    const returnTo = document.activeElement;
    const container = containerRef.current;
    if (!container) return undefined;

    const focusTimer = window.setTimeout(() => {
      const target =
        initialFocusRef?.current ||
        container.querySelector(FOCUSABLE) ||
        container;
      target?.focus?.();
    }, 0);

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeRef.current?.();
        return;
      }
      if (event.key !== 'Tab') return;

      const focusable = Array.from(container.querySelectorAll(FOCUSABLE))
        .filter((element) => !element.closest('[inert]'));
      if (focusable.length === 0) {
        event.preventDefault();
        container.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener('keydown', onKeyDown);
      if (returnTo instanceof HTMLElement && returnTo.isConnected) returnTo.focus();
    };
  }, [containerRef, initialFocusRef, open]);
}
