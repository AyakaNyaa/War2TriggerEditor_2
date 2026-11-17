import type { CSSProperties } from 'react';
const paths = {
  folder: 'M2 6h7l2 2h11v12H2z M2 6V4h7l2 2',
  plus: 'M12 5v14 M5 12h14',
  save: 'M4 3h13l4 4v14H3V3z M7 3v6h10V3 M7 21v-8h10v8',
  undo: 'M8 4 3 9l5 5 M3 9h11a7 7 0 0 1 0 14',
  redo: 'm16 4 5 5-5 5 M21 9H10a7 7 0 0 0 0 14',
  search: 'M15 15 21 21 M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0',
  catalog: 'M4 3h6v7H4z M14 3h6v7h-6z M4 14h6v7H4z M14 14h6v7h-6z',
  chevron: 'm8 5 7 7-7 7',
  shield: 'M12 2 3 6v6c0 5 9 10 9 10s9-5 9-10V6z M8 9l4 7 4-7 M12 6v10',
  settings: 'M4 6h16 M4 12h16 M4 18h16 M8 3v6 M16 9v6 M10 15v6',
  close: 'm6 6 12 12 M6 18 18 6',
  check: 'm5 12 4 4L19 6',
  warning: 'm12 3 10 18H2z M12 9v5 M12 17v1',
  info: 'M12 11v6 M12 7v1 M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',
  copy: 'M8 8h13v13H8z M16 8V3H3v13h5',
  trash: 'M3 6h18 M9 6V3h6v3 M6 6l1 15h10l1-15 M10 10v7 M14 10v7',
  up: 'm5 14 7-7 7 7',
  down: 'm5 10 7 7 7-7',
  star: 'm12 3 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z',
  refresh: 'M20 7V2l-3 3a8 8 0 1 0 3 10 M20 7h-6',
  expand: 'M4 9V4h5 M15 4h5v5 M20 15v5h-5 M9 20H4v-5',
  collapse: 'M9 4v5H4 M20 9h-5V4 M15 20v-5h5 M4 15h5v5',
  upload: 'M4 16v5h16v-5 M12 16V3 M7 8l5-5 5 5',
  clock: 'M12 7v6l4 2 M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',
};
export function Icon({ name, style }: { name: keyof typeof paths; style?: CSSProperties }) {
  return <svg className="icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={style}><path d={paths[name]} /></svg>;
}
