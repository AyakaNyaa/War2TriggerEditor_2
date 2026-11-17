import { useEffect, type RefObject } from 'react';

type Actions = { search: RefObject<HTMLInputElement | null>; save: (as: boolean) => void;
  history: (redo: boolean) => void; clearSearch: () => void };
export function useShortcuts(actions: Actions) {
  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      if (event.isComposing || event.defaultPrevented) return;
      const key = event.key.toLowerCase();
      const modifier = event.ctrlKey || event.metaKey;
      const modal = document.querySelector('dialog[open]');
      if (modifier && key === 'k') {
        event.preventDefault(); (modal?.querySelector<HTMLInputElement>('input[type=search]') ?? (!modal ? actions.search.current : null))?.focus(); return;
      }
      if (modal) { if (modifier && key === 's') event.preventDefault(); return; }
      if (modifier && key === 's') { event.preventDefault(); actions.save(event.shiftKey); return; }
      if (modifier && key === 'enter') {
        const button = document.querySelector<HTMLButtonElement>('.builder-submit button[type=submit]:not(:disabled)');
        if (button) { event.preventDefault(); button.form?.requestSubmit(button); } return;
      }
      const target = event.target;
      const editing = target instanceof HTMLElement && (target.matches('input,textarea,select') || target.isContentEditable);
      if (modifier && !editing && ['z', 'y'].includes(key)) { event.preventDefault(); actions.history(key === 'y' || event.shiftKey); }
      if (!modifier && key === 'escape' && (!editing || target === actions.search.current)) {
        actions.clearSearch(); actions.search.current?.focus();
      }
    };
    window.addEventListener('keydown', keydown); return () => window.removeEventListener('keydown', keydown);
  }, [actions]);
}
