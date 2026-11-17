import { useEffect, useRef, useState } from 'react';

export function useFileDrop(open: (file: File) => void, error: (code: string) => void, busy: boolean) {
  const [dragging, setDragging] = useState(false);
  const depth = useRef(0);
  useEffect(() => {
    const files = (event: DragEvent) => event.dataTransfer?.types.includes('Files');
    const allowed = () => !busy && !document.querySelector('dialog[open]');
    const enter = (event: DragEvent) => { if (files(event)) { event.preventDefault(); depth.current++; if (allowed()) setDragging(true); } };
    const leave = (event: DragEvent) => { if (files(event) && --depth.current <= 0) { depth.current = 0; setDragging(false); } };
    const over = (event: DragEvent) => { if (files(event)) { event.preventDefault(); if (event.dataTransfer) event.dataTransfer.dropEffect = allowed() ? 'copy' : 'none'; } };
    const drop = (event: DragEvent) => {
      if (!files(event)) return; event.preventDefault(); depth.current = 0; setDragging(false);
      if (!allowed()) return;
      const list = event.dataTransfer!.files;
      if (list.length !== 1) { error('work.singleFile'); return; }
      if (!/\.(pud|w2tr)$/i.test(list[0].name)) { error('file.unsupported_type'); return; }
      open(list[0]);
    };
    window.addEventListener('dragenter', enter); window.addEventListener('dragleave', leave); window.addEventListener('dragover', over); window.addEventListener('drop', drop);
    return () => { window.removeEventListener('dragenter', enter); window.removeEventListener('dragleave', leave); window.removeEventListener('dragover', over); window.removeEventListener('drop', drop); };
  }, [open, error, busy]);
  return dragging;
}
