import { useEffect, type RefObject } from 'react';

/**
 * Closes a non-modal popover (avatar menu, notification panel) on an outside click or
 * Escape. Unlike useFocusTrap, Tab is left alone — it moves focus past the menu rather
 * than cycling inside it, matching the WAI-ARIA disclosure-menu pattern (DESIGN_SYSTEM §13).
 */
export function useDismissableMenu(
  containerRef: RefObject<HTMLElement | null>,
  open: boolean,
  onClose: () => void
) {
  useEffect(() => {
    if (!open) return;

    function handlePointerDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
}
