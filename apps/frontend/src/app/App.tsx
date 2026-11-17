import { useEffect, useRef, useState } from 'react';
import { api } from '../shared/api';
import { useModalReturnFocus } from '../shared/Modal';
import { translator, type Locale } from '../shared/i18n';
import { matches, commandDescription } from '../shared/presentation';
import { storedText, storeText, useStored, defaultWorkspace, sanitizeWorkspace } from '../shared/preferences';
import { Icon } from '../shared/Icon';
import type { BackupEntry, ChangePreview, CommandSpec, DocumentView, RecoveryEntry, SaveReceipt, ScenarioBlock } from '../shared/generated';
import { Catalog } from '../features/Catalog';
import { Builder, type BuilderSelection, type BuilderValue } from '../features/Builder';
import { Scenario } from '../features/Scenario';
import { Preview } from '../features/Preview';
import { DocumentInfo, SaveDetails } from '../features/DocumentInfo';
import { initialCondition } from '../features/ConditionFields';
import { FileDialogs } from './FileDialogs';
import { AppChrome } from './AppChrome';
import { WorkspaceSettings } from './WorkspaceSettings';
import { ResizableWorkspace } from './ResizableWorkspace';
import { Welcome } from './Welcome';
import { Diagnostics, DocumentStatus, documentDiagnostics } from './DocumentStatus';
import { useShortcuts } from './useShortcuts';
import { useFileDrop } from './useFileDrop';

export function App() {
  const [locale, setLocale] = useState<Locale>(storedText('war2.locale') === 'en' ? 'en' : 'ru');
  const [preferences, setPreferences, persistent] = useStored('war2.workspace.v1', defaultWorkspace, sanitizeWorkspace);
  const [settings, setSettings] = useState(false);
  const [info, setInfo] = useState(false);
  const [receipt, setReceipt] = useState<SaveReceipt>();
  const [showSaveDetails, setShowSaveDetails] = useState(false);
  const [doc, setDoc] = useState<DocumentView>();
  const [catalog, setCatalog] = useState<CommandSpec[]>([]);
  const [query, setQuery] = useState('');
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [draft, setDraft] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [selection, setSelection] = useState<BuilderSelection>();
  const [preview, setPreview] = useState<{ documentId: string; value: ChangePreview; index: number }>();
  const [help, setHelp] = useState(false);
  const [recoveries, setRecoveries] = useState<RecoveryEntry[]>([]);
  const [showRecovery, setShowRecovery] = useState(false);
  const [backups, setBackups] = useState<BackupEntry[]>();
  const counter = useRef(0);
  const search = useRef<HTMLInputElement>(null);
  const returnFocus = useModalReturnFocus();
  const t = translator(locale);
  const activePreview = preview?.documentId === doc?.id && preview?.value.base_revision === doc?.revision ? preview : undefined;
  const diagnostics = documentDiagnostics(doc);
  useEffect(() => { api.catalog().then(setCatalog).catch(() => setError('api.unavailable')); api.recoveries().then(setRecoveries).catch(() => {}); }, []);
  useEffect(() => { document.documentElement.lang = locale; storeText('war2.locale', locale); setNotice(''); }, [locale]);
  useEffect(() => { document.documentElement.style.setProperty('--font-scale', String(preferences.scale)); }, [preferences.scale]);
  useEffect(() => {
    const unload = (event: BeforeUnloadEvent) => { if (doc?.dirty || draft) { event.preventDefault(); event.returnValue = ''; } };
    window.addEventListener('beforeunload', unload); return () => window.removeEventListener('beforeunload', unload);
  }, [doc?.dirty, draft]);
  useShortcuts({ search, save, history, clearSearch: () => setQuery('') });
  const dragging = useFileDrop((file) => open(() => api.import(file)), setError, busy);
  async function work(action: () => Promise<void>) {
    if (busyRef.current) return; busyRef.current = true; setBusy(true); setError(''); setNotice('');
    try { await action(); } catch (cause) { setError(cause instanceof Error ? cause.message : 'api.unavailable'); }
    finally { busyRef.current = false; setBusy(false); }
  }
  const canLeave = () => !draft || window.confirm(t('discardDraft'));
  const chooseBlock = (next: DocumentView, block: ScenarioBlock, guard = true) => {
    if (guard && (busyRef.current || !canLeave())) return;
    setPreview(undefined); setDraft(false);
    if (block.kind === 'rule' && block.editable_rule && block.condition) {
      setSelection({ key: ++counter.current, mode: 'rule', index: block.start, replaceEnd: block.end,
        condition: block.condition, actions: block.action_indices.map((index) => next.program.instructions[index]) });
    } else setSelection({ key: ++counter.current, mode: 'command', index: block.start, instruction: next.program.instructions[block.start] });
  };
  const accept = (next: DocumentView, index?: number) => {
    setDoc(next); setPreview(undefined); setDraft(false);
    const block = next.program.blocks.find((b) => b.start === (index ?? selection?.index) && b.depth === 0) ?? next.program.blocks.find((b) => b.depth === 0);
    if (block) chooseBlock(next, block, false); else setSelection(undefined);
  };
  function selectInstruction(index: number) {
    if (!doc || busyRef.current || !doc.program.instructions[index] || !canLeave()) return;
    setPreview(undefined); setSelection({ key: ++counter.current, mode: 'command', index, instruction: doc.program.instructions[index] }); setDraft(false);
  }
  function open(action: () => Promise<DocumentView>) {
    if (busyRef.current || (doc?.dirty || draft) && !window.confirm(t('closeDirty'))) return;
    work(async () => {
      const next = await action(); setQuery(''); setReceipt(undefined); setInfo(false); setShowSaveDetails(false); setBackups(undefined); setShowRecovery(false);
      accept(next); setNotice(t('notice.opened'));
    });
  }
  function newRule(template?: 'victory' | 'resources' | 'message') {
    if (!doc?.writable || busyRef.current || !canLeave()) return;
    const condition = initialCondition();
    if (template === 'resources') Object.assign(condition, { kind: 'resources', amount: 50000, comparison: 2, player: 0 });
    if (template === 'message') condition.kind = 'always';
    setSelection({ key: ++counter.current, mode: 'rule', index: doc.program.instructions.length,
      condition: template ? condition : undefined, opcode: template === 'message' ? 37 : 24 });
    setDraft(false); setPreview(undefined);
  }
  function choose(spec: CommandSpec) {
    if (!doc?.writable || busyRef.current || !canLeave()) return;
    setCatalogOpen(false); setQuery(''); setPreview(undefined);
    if (spec.opcode === 35) setSelection({ key: ++counter.current, mode: 'rule', index: doc.program.instructions.length, condition: { ...initialCondition(), kind: 'resources' } });
    else setSelection({ key: ++counter.current, mode: spec.kind === 'setting' || spec.kind === 'condition' || spec.kind === 'structure' || spec.group === 'values' ? 'command' : 'rule',
      opcode: spec.opcode, index: spec.stage === 'preload' ? 0 : doc.program.instructions.length });
    setDraft(false);
  }
  function submit(value: BuilderValue, showPreview: boolean) {
    if (!doc) return;
    work(async () => {
      const edit = value.selection;
      const result = edit.mode === 'rule' ? await api.rulePreview(doc.id, {
        expected_revision: doc.revision, index: edit.index, replace_end: edit.replaceEnd, condition: value.condition, actions: value.actions,
      }) : await api.commandPreview(doc.id, { expected_revision: doc.revision, index: edit.index,
        action: edit.instruction ? 'replace' : 'add', opcode: value.actions[0].opcode, values: value.actions[0].values ?? [], text: value.actions[0].text });
      if (showPreview) setPreview({ documentId: doc.id, value: result, index: edit.index });
      else { accept(await api.apply(doc.id, result), edit.index); setNotice(t('notice.applied')); }
    });
  }
  function history(redo: boolean) {
    if (busyRef.current || !doc || !(redo ? doc.can_redo : doc.can_undo) || !canLeave()) return;
    work(async () => accept(await api.history(doc, redo)));
  }
  function save(saveAs: boolean) {
    if (!doc || busyRef.current) return;
    if (draft) { setError('document.unapplied_fields'); return; }
    work(async () => {
      const next = await api.save(doc, saveAs); setReceipt(next); accept(await api.document(doc.id));
      setNotice(t('backup') + ': ' + next.backup); if (next.warnings.length) setError(next.warnings[0].code);
      setRecoveries(await api.recoveries());
    });
  }
  const errorKey = 'error.' + error;
  const catalogMatches = catalog.filter((spec) => spec.kind !== 'structure' && matches(query, t(spec.name_key), t('group.' + spec.group), commandDescription(spec, t))).length;
  const showCatalog = () => setCatalogOpen(true);
  return <div className="app-shell" data-density={preferences.density} data-contrast={preferences.contrast ? 'high' : 'normal'} data-hints={preferences.hints}>
    <a className="skip-link" href="#workspace-content">{t('work.skipToEditor')}</a>
    <AppChrome document={doc} busy={busy} draft={draft} query={query} catalogMatches={catalogMatches} recoveries={recoveries.length} locale={locale} t={t} search={search}
      onLocale={setLocale} onQuery={setQuery} onOpen={() => open(api.open)} onNew={() => open(api.create)} onImport={(file) => open(() => api.import(file))}
      onSave={save} onHistory={history} onSettings={() => setSettings(true)} onInfo={() => setInfo(true)} onSaveDetails={() => setShowSaveDetails(true)} hasReceipt={Boolean(receipt)}
      onBackups={() => { if (doc) work(async () => setBackups(await api.backups(doc.id))); }} onHelp={() => setHelp(true)} onCatalog={showCatalog}
      onRecovery={() => work(async () => { setRecoveries(await api.recoveries()); setShowRecovery(true); })} />
    {error && error !== 'dialog.cancelled' && <div className="message error" role="alert"><Icon name="warning" /><span>{t(errorKey) === errorKey ? t('error.generic') : t(errorKey)}</span><button className="icon-button" onClick={() => setError('')} aria-label={t('close')}><Icon name="close" /></button></div>}
    {busy && <div className="loading-bar" role="progressbar" aria-label={t('pending')} />}
    {doc ? <ResizableWorkspace width={preferences.width} change={(width) => setPreferences((old) => ({ ...old, width }))} busy={busy} t={t}
      sidebar={<Scenario document={doc} catalog={catalog} query={query} locale={locale} t={t} selected={selection?.index} busy={busy} onSelect={(block) => chooseBlock(doc, block)}
        onInstruction={selectInstruction} onNewRule={() => newRule()} onCatalog={showCatalog} onClearQuery={() => setQuery('')} onBlock={(block, action) => {
          if (!canLeave()) return; work(async () => { const result = await api.blockPreview(doc.id, { expected_revision: doc.revision, start: block.start, action }); accept(await api.apply(doc.id, result), action === 'duplicate' ? block.end : block.start); setNotice(t('notice.applied')); });
        }} />}>
      <Builder selection={selection} catalog={catalog} locale={locale} t={t} busy={busy || !doc.writable} onSubmit={submit} onDraft={setDraft} onError={setError}
        onNewRule={() => newRule()} onTemplate={newRule} onCatalog={showCatalog} onClose={() => { if (canLeave()) { setSelection(undefined); setDraft(false); } }} />
    </ResizableWorkspace> : <Welcome t={t} busy={busy} open={() => open(api.open)} create={() => open(api.create)} />}
    <Diagnostics document={doc} faults={diagnostics} t={t} select={selectInstruction} />
    <DocumentStatus document={doc} diagnostics={diagnostics.length} notice={notice} query={query} catalog={catalog} locale={locale} t={t} clearNotice={() => setNotice('')} info={() => setInfo(true)} />
    {dragging && <div className="file-drop-overlay"><Icon name="upload" /><h2>{t('work.dropFile')}</h2><p>PUD · W2TR</p></div>}
    {catalogOpen && <Catalog catalog={catalog} initialQuery={query} locale={locale} t={t} disabled={busy || !doc?.writable} onChoose={choose} onClose={() => setCatalogOpen(false)} />}
    {activePreview && doc && <Preview preview={activePreview.value} document={doc} busy={busy} returnFocus={returnFocus.current} t={t} cancel={() => setPreview(undefined)} apply={() => work(async () => { accept(await api.apply(activePreview.documentId, activePreview.value), activePreview.index); setNotice(t('notice.applied')); })} />}
    {settings && <WorkspaceSettings value={preferences} change={setPreferences} persistent={persistent} t={t} close={() => setSettings(false)} returnFocus={returnFocus.current} />}
    {info && doc && <DocumentInfo document={doc} t={t} locale={locale} close={() => setInfo(false)} returnFocus={returnFocus.current} />}
    {showSaveDetails && receipt && <SaveDetails receipt={receipt} t={t} locale={locale} close={() => setShowSaveDetails(false)} returnFocus={returnFocus.current} />}
    <FileDialogs help={help} setHelp={setHelp} t={t} locale={locale} busy={busy} returnFocus={returnFocus.current} recoveries={showRecovery ? recoveries : undefined}
      closeRecovery={() => setShowRecovery(false)} backups={backups} closeBackups={() => setBackups(undefined)}
      onRecover={(id) => { if ((doc?.dirty || draft) && !window.confirm(t('closeDirty'))) return; work(async () => { accept(await api.recover(id)); setReceipt(undefined); setShowRecovery(false); }); }}
      onRestore={(id) => { if (!doc || !window.confirm(t('restore.confirm'))) return; work(async () => { const result = await api.restore(doc, id); accept(result.document); setReceipt(result.receipt); setBackups(undefined); setNotice(t('backup') + ': ' + result.receipt.backup); }); }} />
  </div>;
}
