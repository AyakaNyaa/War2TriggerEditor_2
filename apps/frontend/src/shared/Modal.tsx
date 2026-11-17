import { useEffect, useRef, type ReactNode } from 'react';

type Props = { titleId: string; busy?: boolean; returnFocus?: HTMLElement | null;
  onClose: () => void; children: ReactNode };

// Remember the trigger before an async operation disables it and blurs focus.
export function useModalReturnFocus() {
  const previous = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const remember = (event: FocusEvent) => {
      if (event.target instanceof HTMLElement && event.target !== document.body && !event.target.closest('dialog')) {
        previous.current = event.target;
      }
    };
    document.addEventListener('focusin', remember);
    return () => document.removeEventListener('focusin', remember);
  }, []);
  return previous;
}

export function Modal({ titleId, busy = false, returnFocus, onClose, children }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current!;
    const previous = returnFocus ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null);
    element.showModal();
    return () => {
      element.close();
      // Menu commands are hidden again after opening a dialog; return to More.
      const menu = previous?.closest('details');
      const target = menu && !menu.open ? menu.querySelector('summary') : previous;
      requestAnimationFrame(() => { if (target?.isConnected) target.focus(); });
    };
  }, []);
  return <dialog ref={dialog} className="dialog" aria-modal="true" aria-labelledby={titleId}
    onCancel={(event) => { event.preventDefault(); if (!busy) onClose(); }}>
    {children}
  </dialog>;
}
