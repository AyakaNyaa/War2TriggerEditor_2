import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { Translate } from '../shared/presentation';

type Props = { width: number; change: (width: number) => void; sidebar: ReactNode; children: ReactNode; t: Translate; busy: boolean };
export function ResizableWorkspace({ width, change, sidebar, children, t, busy }: Props) {
  const main = useRef<HTMLElement>(null);
  const drag = useRef<{ x: number; width: number } | null>(null);
  const [maximum, setMaximum] = useState(480);
  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => setMaximum(Math.max(220, Math.min(480, Math.round(entry.contentRect.width * .35)))));
    observer.observe(main.current!); return () => observer.disconnect();
  }, []);
  const actual = Math.min(width, maximum);
  const clamp = (next: number) => Math.round(Math.max(220, Math.min(maximum, next)));
  return <main className="workspace" id="workspace-content" tabIndex={-1} ref={main} aria-busy={busy}
    style={{ gridTemplateColumns: `${actual}px 7px minmax(0, 1fr)` }}>
    {sidebar}
    <div className="panel-resizer" role="separator" aria-orientation="vertical" aria-label={t('resize')} tabIndex={0}
      aria-valuemin={220} aria-valuemax={maximum} aria-valuenow={actual} title={t('work.resizeHint')}
      onPointerDown={(event) => { if (event.button !== 0) return; drag.current = { x: event.clientX, width: actual }; event.currentTarget.setPointerCapture(event.pointerId); }}
      onPointerMove={(event) => { if (drag.current) change(clamp(drag.current.width + event.clientX - drag.current.x)); }}
      onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }}
      onDoubleClick={() => change(320)} onKeyDown={(event) => {
        const step = event.shiftKey ? 40 : 10;
        const next = event.key === 'ArrowLeft' ? actual - step : event.key === 'ArrowRight' ? actual + step : event.key === 'Home' ? 220 : event.key === 'End' ? maximum : undefined;
        if (next != null) { event.preventDefault(); change(clamp(next)); }
      }}><span aria-hidden="true" /></div>
    {children}
  </main>;
}
