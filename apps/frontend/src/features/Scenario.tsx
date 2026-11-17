import { useEffect, useRef, useState } from 'react';
import type { CommandSpec, DocumentView, ScenarioBlock } from '../shared/generated';
import { blockMatches, conditionText, describe, sorted, type Translate } from '../shared/presentation';
import { storedText, storeText } from '../shared/preferences';
import { Highlight } from '../shared/Highlight';
import { Icon } from '../shared/Icon';

type Props = { document: DocumentView; catalog: CommandSpec[]; query: string; t: Translate; locale: string; selected?: number;
  onSelect: (block: ScenarioBlock) => void; onInstruction: (index: number) => void; onNewRule: () => void;
  onCatalog: () => void; onClearQuery: () => void; onBlock: (block: ScenarioBlock, action: string) => void; busy: boolean };

export function Scenario({ document: doc, catalog, query, t, locale, selected, onSelect, onInstruction, onNewRule, onCatalog, onClearQuery, onBlock, busy }: Props) {
  const [view, setView] = useState(() => { const saved = storedText('war2.scenario.view'); return ['groups', 'alphabet'].includes(saved) ? saved : 'execution'; });
  const [kind, setKind] = useState('all');
  const [category, setCategory] = useState('all');
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const list = useRef<HTMLDivElement>(null);
  const program = doc.program;
  const roots = program.blocks.filter((block) => block.depth === 0);
  const group = (block: ScenarioBlock) => block.kind === 'rule' ? 'conditions' : catalog.find((s) => s.opcode === program.instructions[block.start]?.opcode)?.group ?? 'advanced';
  const groups = sorted([...new Set(roots.map(group))], (key) => t('group.' + key), locale);
  const blocks = roots.filter((block) => (kind === 'all' || block.kind === kind) && (category === 'all' || group(block) === category) && blockMatches(block, program, catalog, query, t));
  const filtered = query || kind !== 'all' || category !== 'all';
  useEffect(() => { storeText('war2.scenario.view', view); }, [view]);
  useEffect(() => { setExpanded(new Set()); setKind('all'); setCategory('all'); }, [doc.id]);
  useEffect(() => { list.current?.querySelector<HTMLElement>('.scenario-card-main[aria-pressed=true]')?.scrollIntoView({ block: 'nearest' }); }, [selected, doc.revision]);
  const clear = () => { setKind('all'); setCategory('all'); onClearQuery(); };
  const render = (block: ScenarioBlock) => {
    const instruction = program.instructions[block.start];
    const isRule = block.kind === 'rule';
    const category = group(block);
    const isOpen = expanded.has(block.start);
    const position = roots.indexOf(block);
    const descendants = program.blocks.filter((item) => item.start > block.start && item.end < block.end && item.depth === block.depth + 1);
    const active = selected != null && selected >= block.start && selected < block.end;
    const commandsId = 'commands-' + doc.id + '-' + block.start;
    const title = isRule ? block.action_indices.slice(0, 2).map((i) => t('command.' + program.instructions[i].opcode)).join(' + ') + (block.action_indices.length > 2 ? ' +' + (block.action_indices.length - 2) : '') : t('command.' + instruction.opcode);
    const description = isRule && block.condition ? conditionText(block.condition, t, locale) : describe(instruction, t) || t('field.noParameters');
    return <article className={'scenario-card group-' + category + (active ? ' is-selected' : '')} key={block.start}>
      <button className="scenario-card-main" aria-pressed={active} onClick={() => onSelect(block)} aria-label={t('scenario.edit') + ' ' + (isRule ? t('rule.title') : title) + ' ' + (position + 1)}>
        <div className="scenario-card-heading"><span className="sequence-number">{String(position + 1).padStart(2, '0')}</span><span>{t(isRule ? 'rule.title' : 'group.' + category)}</span><i className={'group-dot group-' + category} /></div>
        <h3><Highlight text={title} query={query} /></h3><p className="card-description" title={description}><Highlight text={description} query={query} /></p>
      </button>
      <div className="card-footer"><button className="quiet" aria-expanded={isOpen} aria-controls={commandsId} onClick={() => setExpanded((old) => { const next = new Set(old); if (next.has(block.start)) next.delete(block.start); else next.add(block.start); return next; })}><Icon name={isOpen ? 'down' : 'chevron'} />{t('workbench.commands')} ({block.end - block.start})</button>
        <div className="block-tools"><button className="icon-button" disabled={busy || !doc.writable} aria-label={t('duplicate') + ' ' + (position + 1)} title={t('duplicate')} onClick={() => onBlock(block, 'duplicate')}><Icon name="copy" /></button>
          <button className="icon-button" disabled={busy || !doc.writable || position === 0} aria-label={t('up') + ' ' + (position + 1)} title={t('up')} onClick={() => onBlock(block, 'up')}><Icon name="up" /></button>
          <button className="icon-button" disabled={busy || !doc.writable || position === roots.length - 1} aria-label={t('down') + ' ' + (position + 1)} title={t('down')} onClick={() => onBlock(block, 'down')}><Icon name="down" /></button>
          <button className="icon-button danger" disabled={busy || !doc.writable} aria-label={t('delete') + ' ' + (position + 1)} title={t('delete')} onClick={() => { if (window.confirm(t('work.deleteBlock') + ' (' + (block.end - block.start) + ')')) onBlock(block, 'delete'); }}><Icon name="trash" /></button></div></div>
      {isOpen && <div className="raw-instructions" id={commandsId}>{program.instructions.slice(block.start, block.end).map((item, i) => <button className="raw-command" key={i} disabled={busy} aria-current={selected === block.start + i ? 'true' : undefined} onClick={() => onInstruction(block.start + i)}><span>{i + 1}</span><strong>{t('command.' + item.opcode)}</strong><small>{describe(item, t)}</small></button>)}
        {descendants.map((child) => <div className="nested-rule" key={child.start}><span className="type-label condition-label">{t('rule.nested')}</span>{child.condition && conditionText(child.condition, t, locale)}</div>)}</div>}
    </article>;
  };
  return <aside className="scenario-pane" aria-label={t('scenario.title')}><header className="scenario-header"><h2>{t('scenario.title')} <span>{roots.length}</span></h2>
      <button className="gold" disabled={busy || !doc.writable} onClick={onNewRule}><Icon name="plus" />{t('rule.new')}</button></header>
    <div className="scenario-controls"><label>{t('scenario.view')} <select value={view} onChange={(event) => setView(event.target.value)}>
      <option value="execution">{t('sort.execution')}</option><option value="groups">{t('sort.groups')}</option><option value="alphabet">{t('sort.alphabet')}</option></select></label></div>
    <div className="scenario-filters"><select aria-label={t('work.filterKind')} value={kind} onChange={(e) => setKind(e.target.value)}>
      <option value="all">{t('work.allKinds')}</option><option value="rule">{t('work.rules')}</option><option value="command">{t('work.standalone')}</option><option value="repeat">{t('work.loops')}</option></select>
      <select aria-label={t('work.filterGroup')} value={category} onChange={(e) => setCategory(e.target.value)}><option value="all">{t('catalog.all')}</option>{groups.map((key) => <option value={key} key={key}>{t('group.' + key)}</option>)}</select></div>
    <div className="outline-summary"><span role="status">{blocks.length} / {roots.length} {t('work.visible')}</span><div>
      <button className="icon-button" aria-label={t('work.expandAll')} title={t('work.expandAll')} disabled={!blocks.length} onClick={() => setExpanded(new Set(blocks.map((block) => block.start)))}><Icon name="expand" /></button>
      <button className="icon-button" aria-label={t('work.collapseAll')} title={t('work.collapseAll')} disabled={!expanded.size} onClick={() => setExpanded(new Set())}><Icon name="collapse" /></button></div></div>
    {view !== 'execution' && <p className="order-note">{t('workbench.viewOnly')}</p>}
    {!doc.writable && <p className="readonly">{t('readonly')}</p>}
    <div className="scenario-list" ref={list} onKeyDown={(event) => {
      if (!(event.target instanceof HTMLElement) || !event.target.matches('.scenario-card-main')) return;
      const buttons = Array.from(list.current!.querySelectorAll<HTMLButtonElement>('.scenario-card-main'));
      const current = buttons.indexOf(event.target as HTMLButtonElement);
      const next = event.key === 'ArrowDown' ? Math.min(current + 1, buttons.length - 1) : event.key === 'ArrowUp' ? Math.max(0, current - 1) : event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : -1;
      if (next >= 0) { event.preventDefault(); buttons[next]?.focus(); }
    }}>{view === 'groups' ? sorted([...new Set(blocks.map(group))], (key) => t('group.' + key), locale).map((key) => <section key={key} className="scenario-group"><h3><i className={'group-dot group-' + key} />{t('group.' + key)}</h3>{blocks.filter((block) => group(block) === key).map(render)}</section>)
      : (view === 'alphabet' ? sorted(blocks, (block) => block.condition ? conditionText(block.condition, t) : t('command.' + program.instructions[block.start]?.opcode), locale) : blocks).map(render)}
      {!blocks.length && <div className="scenario-empty"><Icon name={filtered ? 'search' : 'catalog'} /><h3>{t(filtered ? 'noResults' : 'workbench.emptyOutline')}</h3><p>{t(filtered ? 'search.emptyHint' : 'workbench.outlineHint')}</p>
        {filtered ? <button onClick={clear}>{t('work.clearFilters')}</button> : <button disabled={busy || !doc.writable} onClick={onNewRule}><Icon name="plus" />{t('rule.new')}</button>}</div>}
    </div><div className="scenario-bottom">{filtered && <button className="quiet" onClick={clear}>{t('work.clearFilters')}</button>}<button disabled={busy || !doc.writable} onClick={onCatalog}><Icon name="plus" />{t('workbench.addFromCatalog')}</button></div>
  </aside>;
}
