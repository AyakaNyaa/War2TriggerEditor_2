import type { CommandSpec, DocumentView, Fault } from '../shared/generated';
import { blockMatches, type Translate } from '../shared/presentation';
import { formatBytes } from '../shared/preferences';
import { Icon } from '../shared/Icon';

export function documentDiagnostics(doc?: DocumentView) {
  const unique = new Map<string, Fault>();
  for (const fault of [...(doc?.diagnostics ?? []), ...(doc?.program.diagnostics ?? [])]) unique.set(JSON.stringify(fault), fault);
  return [...unique.values()];
}
export function Diagnostics({ faults, document: doc, t, select }: { faults: Fault[]; document?: DocumentView; t: Translate; select: (index: number) => void }) {
  if (!faults.length) return null;
  return <details className="diagnostic-details"><summary><Icon name="warning" />{t('diagnostics')} ({faults.length})</summary><ul>{faults.map((fault, index) => {
    const command = fault.code.startsWith('trigger.') && fault.offset != null ? doc?.program.instructions.findIndex((item) => item.offset <= fault.offset! && item.offset + item.bytes.length > fault.offset!) : -1;
    const key = `error.${fault.code}`;
    return <li key={index}><span>{t(key) === key ? t('error.generic') : t(key)}</span>{command != null && command >= 0
      ? <button className="quiet" onClick={() => select(command)}>{t('work.goToCommand')} {command + 1}</button>
      : fault.offset != null && <small>{t('work.offset')}: {fault.offset}</small>}</li>;
  })}</ul></details>;
}
export function DocumentStatus({ document: doc, diagnostics, notice, query, catalog, locale, t, clearNotice, info }: {
  document?: DocumentView; diagnostics: number; notice: string; query: string; catalog: CommandSpec[]; locale: string; t: Translate; clearNotice: () => void; info: () => void;
}) {
  const matches = doc?.program.blocks.filter((block) => block.depth === 0 && blockMatches(block, doc.program, catalog, query, t)).length ?? 0;
  const percent = doc?.kind === 'pud' && doc.capacity > 0 && doc.program.length != null ? Math.min(100, doc.program.length / doc.capacity * 100) : null;
  return <footer className="app-status"><span className={diagnostics ? 'status-warning' : ''}><Icon name={diagnostics ? 'warning' : 'check'} />{doc ? t(diagnostics ? 'diagnostics' : 'valid') : t('localHint')}{query && ` · ${t('search.scenarioMatches')}: ${matches}`}</span>
    {notice && <span className="status-notice" role="status"><span title={notice}>{notice}</span><button className="icon-button" onClick={clearNotice} aria-label={t('work.dismissNotice')}><Icon name="close" /></button></span>}
    <div className="status-document">{percent != null && <div className="capacity-meter" role="progressbar" aria-label={t('capacity')} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(percent)} title={`${percent.toFixed(1)}%`}><span style={{ width: `${percent}%` }} /></div>}
      {doc && <button className="quiet" onClick={info} title={t('work.documentInfo')}>{formatBytes(doc.program.length ?? doc.original_size, locale)}{doc.kind === 'pud' && ` / ${formatBytes(doc.capacity, locale)}`}</button>}<span>v0.3.0</span></div>
  </footer>;
}
