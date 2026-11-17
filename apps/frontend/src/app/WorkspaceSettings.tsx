import { Modal } from '../shared/Modal';
import { defaultWorkspace, type WorkspacePreferences } from '../shared/preferences';
import type { Translate } from '../shared/presentation';

type Props = { value: WorkspacePreferences; change: (value: WorkspacePreferences) => void; persistent: boolean;
  t: Translate; close: () => void; returnFocus?: HTMLElement | null };
export function WorkspaceSettings({ value, change, persistent, t, close, returnFocus }: Props) {
  const patch = (next: Partial<WorkspacePreferences>) => change({ ...value, ...next });
  return <Modal titleId="settings-title" onClose={close} returnFocus={returnFocus}>
    <span className="eyebrow">{t('work.personalize')}</span><h2 id="settings-title">{t('work.appearance')}</h2>
    <p className="muted">{t(persistent ? 'work.preferencesSaved' : 'work.preferencesSession')}</p>
    <div className="settings-grid">
      <div className="field"><label htmlFor="density">{t('work.density')}</label><select id="density" value={value.density} onChange={(e) => patch({ density: e.target.value })}>
        <option value="comfortable">{t('work.comfortable')}</option><option value="compact">{t('work.compact')}</option></select></div>
      <div className="field"><label htmlFor="text-scale">{t('work.textSize')}</label><select id="text-scale" value={value.scale} onChange={(e) => patch({ scale: Number(e.target.value) })}>
        {[1, 1.15, 1.3].map((scale) => <option key={scale} value={scale}>{Math.round(scale * 100)}%</option>)}</select></div>
      <label className="setting-toggle"><input type="checkbox" checked={value.contrast} onChange={(e) => patch({ contrast: e.target.checked })} />{t('work.contrast')}</label>
      <label className="setting-toggle"><input type="checkbox" checked={value.hints} onChange={(e) => patch({ hints: e.target.checked })} />{t('work.hints')}</label>
    </div>
    <p className="muted">{t('work.resizeHint')}</p>
    <div className="dialog-actions"><button onClick={() => change({ ...defaultWorkspace })}>{t('work.resetWorkspace')}</button><button autoFocus className="gold" onClick={close}>{t('close')}</button></div>
  </Modal>;
}
