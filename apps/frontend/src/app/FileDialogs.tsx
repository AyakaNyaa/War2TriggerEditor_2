import { useEffect, useState } from 'react';
import type { BackupEntry, RecoveryEntry } from '../shared/generated';
import { matches, sorted, type Translate } from '../shared/presentation';
import { Modal } from '../shared/Modal';
import { formatBytes } from '../shared/preferences';
import { Icon } from '../shared/Icon';
import { KeyboardGuide } from './KeyboardGuide';

type Props = { help: boolean; setHelp: (value: boolean) => void; t: Translate; locale: string; busy: boolean;
  returnFocus?: HTMLElement | null; recoveries?: RecoveryEntry[]; closeRecovery: () => void; backups?: BackupEntry[]; closeBackups: () => void;
  onRecover: (id: string) => void; onRestore: (id: string) => void };

export function FileDialogs(props: Props) {
  const { t } = props;
  const [query, setQuery] = useState('');
  useEffect(() => { setQuery(''); }, [props.recoveries]);
  if (props.help) return <Modal titleId="help-title" busy={props.busy} returnFocus={props.returnFocus} onClose={() => props.setHelp(false)}>
    <span className="eyebrow">WARCRAFT II</span><h2 id="help-title">{t('help')}</h2><p>{t('builder.help')}</p><KeyboardGuide t={t} />
    <div className="dialog-actions"><button className="gold" autoFocus disabled={props.busy} onClick={() => props.setHelp(false)}>{t('close')}</button></div></Modal>;
  if (props.recoveries) {
    const entries = sorted(props.recoveries.filter((entry) => matches(query, entry.name)), (entry) => entry.name, props.locale);
    return <Modal titleId="recovery-title" busy={props.busy} returnFocus={props.returnFocus} onClose={props.closeRecovery}>
      <span className="eyebrow">{t('work.recoveryHint')}</span><h2 id="recovery-title">{t('recoveries')}</h2>
      <div className="modal-search"><Icon name="search" /><input type="search" aria-label={t('work.searchRecovery')} placeholder={t('work.searchRecovery')} value={query} onChange={(e) => setQuery(e.target.value)} />
        {query && <button className="icon-button" aria-label={t('search.clear')} onClick={() => setQuery('')}><Icon name="close" /></button>}</div>
      <div className="modal-list">{!entries.length && <p className="muted">{t(query ? 'noResults' : 'recovery.empty')}</p>}
        {entries.map((entry) => <div className="recovery-entry" key={entry.id}><div className="recovery-details"><span>{entry.name}{!entry.diagnostics.length && ' · ' + t('revision') + ' ' + entry.revision}</span>
          {entry.diagnostics.map((fault, index) => <small className="recovery-warning" key={index}><Icon name="warning" />{t('error.' + fault.code)}</small>)}</div>
          <button disabled={props.busy || entry.diagnostics.length > 0} onClick={() => props.onRecover(entry.id)}>{t('recover')}</button></div>)}</div>
      <div className="dialog-actions"><button autoFocus disabled={props.busy} onClick={props.closeRecovery}>{t('close')}</button></div></Modal>;
  }
  if (props.backups) return <Modal titleId="backup-title" busy={props.busy} returnFocus={props.returnFocus} onClose={props.closeBackups}>
    <span className="eyebrow">{t('work.newestFirst')}</span><h2 id="backup-title">{t('backups')}</h2>
    <div className="modal-list">{!props.backups.length && <p>{t('backups.empty')}</p>}
      {[...props.backups].sort((a, b) => b.created_unix - a.created_unix || a.id.localeCompare(b.id)).map((entry) => <div className="recovery-entry" key={entry.id}><span>{new Date(entry.created_unix * 1000).toLocaleString(props.locale)} · {formatBytes(entry.size, props.locale)}</span><button disabled={props.busy} onClick={() => props.onRestore(entry.id)}>{t('recover')}</button></div>)}</div>
    <div className="dialog-actions"><button autoFocus disabled={props.busy} onClick={props.closeBackups}>{t('close')}</button></div></Modal>;
  return null;
}
