import { useState } from 'react';
import type { DocumentView, SaveReceipt } from '../shared/generated';
import { Modal } from '../shared/Modal';
import { Icon } from '../shared/Icon';
import { formatBytes } from '../shared/preferences';
import type { Translate } from '../shared/presentation';

type Common = { t: Translate; locale: string; close: () => void; returnFocus?: HTMLElement | null };
export function DocumentInfo({ document: doc, t, locale, close, returnFocus }: Common & { document: DocumentView }) {
  const rows = [[t('work.fileType'), doc.kind.toUpperCase()], [t('work.sourceSize'), formatBytes(doc.original_size, locale)],
    [t('revision'), doc.revision.toLocaleString(locale)], [t('work.programSize'), doc.program.length == null ? '—' : formatBytes(doc.program.length, locale)],
    [t('work.commandsTotal'), doc.program.instructions.length.toLocaleString(locale)],
    [t('work.mode'), t(doc.writable ? 'work.editable' : 'readonly')]];
  return <Modal titleId="document-info-title" onClose={close} returnFocus={returnFocus}>
    <span className="eyebrow">{doc.name}</span><h2 id="document-info-title">{t('work.documentInfo')}</h2>
    <dl className="document-facts">{rows.map(([key, value]) => <div key={key}><dt>{key}</dt><dd>{value}</dd></div>)}</dl>
    {doc.kind === 'pud' && <p className="capacity-detail">{t('capacity')}: {formatBytes(doc.capacity, locale)}</p>}
    {!!doc.sections.length && <div className="section-table"><table><caption>{t('sections')}</caption><thead><tr><th>{t('work.section')}</th><th>{t('work.size')}</th></tr></thead>
      <tbody>{doc.sections.map((section, index) => <tr key={index}><td><code>{section.tag}</code></td><td>{formatBytes(section.size, locale)}</td></tr>)}</tbody></table></div>}
    <div className="dialog-actions"><button autoFocus className="gold" onClick={close}>{t('close')}</button></div>
  </Modal>;
}
function CopyValue({ label, value, t }: { label: string; value: string; t: Translate }) {
  const [status, setStatus] = useState('');
  return <div className="receipt-value"><label><span>{label}</span><input readOnly value={value} onFocus={(e) => e.target.select()} /></label>
    <button aria-label={`${t('work.copy')} ${label}`} onClick={async () => {
      try { await navigator.clipboard.writeText(value); setStatus('work.copied'); } catch { setStatus('work.copyFailed'); }
    }}><Icon name="copy" />{t('work.copy')}</button>{status && <small role="status">{t(status)}</small>}</div>;
}
export function SaveDetails({ receipt, t, close, returnFocus }: Common & { receipt: SaveReceipt }) {
  return <Modal titleId="save-details-title" onClose={close} returnFocus={returnFocus}>
    <span className="eyebrow">{t('saved')}</span><h2 id="save-details-title">{t('work.saveDetails')}</h2>
    <CopyValue label={t('work.savedFile')} value={receipt.path} t={t} />
    <CopyValue label={t('backup')} value={receipt.backup} t={t} />
    {!!receipt.warnings.length && <div role="alert" className="receipt-warnings">{receipt.warnings.map((fault, index) => <p key={index}>{t(`error.${fault.code}`)}</p>)}</div>}
    <div className="dialog-actions"><button autoFocus className="gold" onClick={close}>{t('close')}</button></div>
  </Modal>;
}
