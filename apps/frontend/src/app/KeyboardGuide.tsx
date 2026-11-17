import type { Translate } from '../shared/presentation';

export function KeyboardGuide({ t }: { t: Translate }) {
  const keys = [['Ctrl K', 'search.global'], ['Ctrl S', 'save'], ['Ctrl Shift S', 'saveAs'], ['Ctrl Z', 'undo'],
    ['Ctrl Shift Z / Ctrl Y', 'redo'], ['Ctrl Enter', 'builder.apply'], ['Esc', 'work.dismiss'], ['↑ / ↓ / Home / End', 'work.navigate']];
  return <section className="keyboard-guide"><h3>{t('work.shortcuts')}</h3><dl>{keys.map(([key, label]) => <div key={key}><dt><kbd>{key}</kbd></dt><dd>{t(label)}</dd></div>)}</dl><p className="muted">{t('work.textUndo')}</p></section>;
}
