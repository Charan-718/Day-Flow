import { useEffect, useRef, type RefObject } from 'react';

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

interface UseFocusTrapOptions {
  active: boolean;
  onClose: () => void;
  initialFocusRef?: RefObject<HTMLElement | null>;
}

/**
 * Traps Tab focus inside the returned container ref while `active`, moves focus in on open,
 * restores it to whatever was focused before on close, locks body scroll, and calls
 * `onClose` on Escape. Shared by Modal, Drawer and ConfirmDialog so all three overlays
 * behave identically (DESIGN_SYSTEM §10/§16).
 */
export function useFocusTrap<T extends HTMLElement>({
  active,
  onClose,
  initialFocusRef,
}: UseFocusTrapOptions): RefObject<T | null> {
  const containerRef = useRef<T>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);

  // Keep the ref current without making `onClose` a dependency of the effect below —
  // assigning during an effect (not render) keeps this safe under Strict Mode / concurrent
  // rendering, where a render can be discarded before it commits.
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!active) return;

    previouslyFocused.current = document.activeElement as HTMLElement | null;
    const container = containerRef.current;

    const focusTarget =
      initialFocusRef?.current ?? container?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
    focusTarget?.focus();

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (e.key !== 'Tab' || !container) return;

      const focusable = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
        (el) => el.offsetParent !== null
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', handleKeyDown, true);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
      document.body.style.overflow = previousOverflow;
      previouslyFocused.current?.focus();
    };
  }, [active, initialFocusRef]);

  return containerRef;
}
