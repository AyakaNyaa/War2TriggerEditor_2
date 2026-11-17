import type { BackupEntry, RecoveryEntry } from '../shared/generated';
import type { Translate } from '../shared/presentation';
import { Modal } from '../shared/Modal';

type Props = { help: boolean; setHelp: (value: boolean) => void; t: Translate; locale: string; busy: boolean;
  returnFocus?: HTMLElement | null;
  recoveries?: RecoveryEntry[]; closeRecovery: () => void; backups?: BackupEntry[]; closeBackups: () => void;
  onRecover: (id: string) => void; onRestore: (id: string) => void };

export function FileDialogs(props: Props) {
  const { t } = props;
  if (props.help) return <Modal titleId="help-title" busy={props.busy} returnFocus={props.returnFocus} onClose={() => props.setHelp(false)}><h2 id="help-title">{t('help')}</h2><p>{t('builder.help')}</p><button className="gold" autoFocus disabled={props.busy} onClick={() => props.setHelp(false)}>{t('close')}</button></Modal>;
  if (props.recoveries) return <Modal titleId="recovery-title" busy={props.busy} returnFocus={props.returnFocus} onClose={props.closeRecovery}><h2 id="recovery-title">{t('recoveries')}</h2>
    {!props.recoveries.length && <p className="muted">{t('recovery.empty')}</p>}
    {props.recoveries.map((entry) => <div className="recovery-entry" key={entry.id}><div className="recovery-details"><span>{entry.name}{!entry.diagnostics.length && ` · ${t('revision')} ${entry.revision}`}</span>
      {entry.diagnostics.map((fault, index) => <small className="recovery-warning" key={index}>{t(`error.${fault.code}`)}</small>)}</div>
      <button disabled={props.busy || entry.diagnostics.length > 0} onClick={() => props.onRecover(entry.id)}>{t('recover')}</button></div>)}
    <button autoFocus disabled={props.busy} onClick={props.closeRecovery}>{t('close')}</button></Modal>;
  if (props.backups) return <Modal titleId="backup-title" busy={props.busy} returnFocus={props.returnFocus} onClose={props.closeBackups}><h2 id="backup-title">{t('backups')}</h2>
    {!props.backups.length && <p>{t('backups.empty')}</p>}
    {props.backups.map((entry) => <div className="recovery-entry" key={entry.id}><span>{new Date(entry.created_unix * 1000).toLocaleString(props.locale)} · {entry.size.toLocaleString()} {t('bytes')}</span><button disabled={props.busy} onClick={() => props.onRestore(entry.id)}>{t('recover')}</button></div>)}
    <button autoFocus disabled={props.busy} onClick={props.closeBackups}>{t('close')}</button></Modal>;
  return null;
}
