import { useEffect, useRef, useState } from 'react';
import type { CommandSpec } from '../shared/generated';
import { commandDescription, matches, sorted, type Translate } from '../shared/presentation';
import { commandIds, useStored, storeText } from '../shared/preferences';
import { Highlight } from '../shared/Highlight';
import { Icon } from '../shared/Icon';

type Props = { catalog: CommandSpec[]; locale: string; t: Translate; disabled: boolean; initialQuery?: string;
  actionsOnly?: boolean; onChoose: (spec: CommandSpec) => void; onClose: () => void };

export function Catalog({ catalog, initialQuery = '', onChoose, onClose, locale, t, disabled, actionsOnly }: Props) {
  const [query, setQuery] = useState(initialQuery);
  const [group, setGroup] = useState('all');
  const [manual, setManual] = useState(false);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [favorites, setFavorites] = useStored('war2.catalog.favorites', [] as number[], commandIds);
  const [recent, setRecent] = useStored('war2.catalog.recent', [] as number[], commandIds);
  const dialog = useRef<HTMLDialogElement>(null);
  const search = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const element = dialog.current!;
    const previous = document.activeElement as HTMLElement | null;
    element.showModal(); search.current?.focus();
    return () => { element.close(); if (previous?.isConnected) previous.focus(); };
  }, []);
  const available = catalog.filter((s) => actionsOnly ? s.kind !== 'condition' && s.kind !== 'structure' && s.stage !== 'preload'
    : s.kind !== 'structure' || manual && [22, 33, 125].includes(s.opcode));
  const groups = sorted([...new Set(available.map((s) => s.group ?? 'advanced'))], (g) => t('group.' + g), locale);
  const matching = available.filter((s) => (!favoritesOnly || favorites.includes(s.opcode)) && matches(query, t(s.name_key), t('group.' + s.group), commandDescription(s, t), manual ? String(s.opcode) : ''));
  const visible = sorted(matching.filter((s) => group === 'all' || s.group === group), (s) => t(s.name_key), locale);
  const recentCommands = recent.map((id) => available.find((s) => s.opcode === id)).filter((s): s is CommandSpec => Boolean(s)).slice(0, 6);
  const choose = (spec: CommandSpec) => {
    if (disabled) return;
    const next = [spec.opcode, ...recent.filter((id) => id !== spec.opcode)].slice(0, 8);
    setRecent(next); storeText('war2.catalog.recent', JSON.stringify(next)); onChoose(spec);
  };
  return <dialog ref={dialog} className="catalog-dialog" aria-labelledby="catalog-heading" onCancel={(event) => { event.preventDefault(); onClose(); }}
    onKeyDown={(event) => {
      if (event.altKey && event.key.toLowerCase() === 'f') { event.preventDefault(); setFavoritesOnly((old) => !old); return; }
      if (!(event.target instanceof HTMLElement) || !event.target.matches('.catalog-item')) return;
      const buttons = Array.from(dialog.current!.querySelectorAll<HTMLButtonElement>('.catalog-item:not(:disabled)'));
      const index = buttons.indexOf(event.target as HTMLButtonElement);
      const next = event.key === 'ArrowDown' ? Math.min(index + 1, buttons.length - 1) : event.key === 'ArrowUp' ? Math.max(0, index - 1) : event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : -1;
      if (next >= 0) { event.preventDefault(); buttons[next]?.focus(); }
    }} onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="catalog-frame">
      <header className="catalog-heading"><div><span className="eyebrow">{t('work.commandLibrary')}</span><h2 id="catalog-heading">{t(actionsOnly ? 'workbench.pickAction' : 'workbench.catalog')}</h2><p>{t('workbench.catalogHint')}</p></div>
        <button className="icon-button" aria-label={t('close')} onClick={onClose}><Icon name="close" /></button></header>
      <div className="catalog-search"><Icon name="search" /><input ref={search} type="search" aria-label={t('workbench.catalogSearch')} placeholder={t('workbench.catalogSearch')} value={query}
        onChange={(event) => { setQuery(event.target.value); setGroup('all'); }} onKeyDown={(event) => {
          if (['ArrowDown', 'ArrowUp'].includes(event.key)) { event.preventDefault(); const buttons = dialog.current?.querySelectorAll<HTMLButtonElement>('.catalog-item:not(:disabled)'); buttons?.[event.key === 'ArrowDown' ? 0 : buttons.length - 1]?.focus(); }
          if (event.key === 'Enter' && visible.length === 1) { event.preventDefault(); choose(visible[0]); }
        }} />{query && <button className="icon-button" aria-label={t('search.clear')} onClick={() => { setQuery(''); search.current?.focus(); }}><Icon name="close" /></button>}
        <button className="favorites-filter" aria-pressed={favoritesOnly} title="Alt F" onClick={() => setFavoritesOnly((old) => !old)}><Icon name="star" />{t('work.favorites')} <small>{favorites.length}</small></button></div>
      {!query && !favoritesOnly && recentCommands.length > 0 && <div className="recent-commands"><span><Icon name="clock" />{t('work.recentCommands')}</span>{recentCommands.map((spec) => <button className="recent-command" key={spec.opcode} disabled={disabled} onClick={() => choose(spec)}>{t(spec.name_key)}</button>)}</div>}
      <div className="catalog-body"><nav className="category-list" aria-label={t('catalog.groups')}>
        <button aria-pressed={group === 'all'} onClick={() => setGroup('all')}><span>{t('catalog.all')}</span><small>{matching.length}</small></button>
        {groups.map((key) => <button key={key} aria-pressed={group === key} disabled={!matching.some((s) => s.group === key)} onClick={() => setGroup(key)}>
          <i className={'group-dot group-' + key} /><span>{t('group.' + key)}</span><small>{matching.filter((s) => s.group === key).length}</small>
        </button>)}
      </nav><section className="catalog-results"><div className="catalog-result-count"><span role="status">{t('catalog.results')} · {visible.length} / {available.length}</span><span>{t('sort.alphabet')}</span></div>
        <div className="catalog-items">{visible.map((spec) => <div className="catalog-row" key={spec.opcode}><button data-opcode={spec.opcode} disabled={disabled} className={'catalog-item group-' + spec.group} onClick={() => choose(spec)}>
          <i className={'group-dot group-' + spec.group} /><span className="catalog-item-copy"><span className="catalog-item-name"><Highlight text={t(spec.name_key)} query={query} /></span><small><Highlight text={commandDescription(spec, t)} query={query} /></small>
            <span className="command-meta"><span>{t(spec.stage === 'preload' ? 'work.preload' : 'work.runtime')}</span>{manual && <code>#{spec.opcode} · {spec.length == null ? t('work.variableLength') : spec.length + ' B'}</code>}</span></span>
          <span className="catalog-item-tag">{t('group.' + spec.group)}</span><Icon name="chevron" />
        </button><button className="favorite-toggle icon-button" aria-label={t(favorites.includes(spec.opcode) ? 'work.unfavorite' : 'work.favorite') + ' ' + t(spec.name_key)}
          aria-pressed={favorites.includes(spec.opcode)} onClick={() => setFavorites((old) => old.includes(spec.opcode) ? old.filter((id) => id !== spec.opcode) : [...old, spec.opcode])}><Icon name="star" /></button></div>)}
          {!visible.length && <div className="catalog-empty"><Icon name={favoritesOnly ? 'star' : 'search'} /><h3>{t(favoritesOnly && !favorites.length ? 'work.noFavorites' : 'noResults')}</h3><p>{t(favoritesOnly && !favorites.length ? 'work.favoriteHint' : 'search.emptyHint')}</p><button onClick={() => { setQuery(''); setGroup('all'); setFavoritesOnly(false); }}>{t('work.clearFilters')}</button></div>}</div>
      </section></div>
      <div className="catalog-footer">{!actionsOnly && <label className="manual-toggle"><input type="checkbox" checked={manual} onChange={(e) => setManual(e.target.checked)} />{t('catalog.manual')}</label>}
        <span><kbd>↑ ↓</kbd> <kbd>Enter</kbd> <kbd>Esc</kbd> {t('workbench.dismiss')}</span></div>
    </div>
  </dialog>;
}
