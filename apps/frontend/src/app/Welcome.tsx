import { Icon } from '../shared/Icon';
import type { Translate } from '../shared/presentation';

export function Welcome({ t, busy, open, create }: { t: Translate; busy: boolean; open: () => void; create: () => void }) {
  return <main className="workspace no-document" id="workspace-content" tabIndex={-1}><section className="welcome">
    <div className="welcome-copy"><div className="welcome-crest"><Icon name="shield" /></div><span className="eyebrow">WARCRAFT II · TRIGGER WORKSHOP</span>
      <h2>{t('workbench.welcomeTitle')}</h2><p>{t('welcome.body')}</p>
      <div className="welcome-actions"><button className="gold" disabled={busy} onClick={open}><Icon name="folder" />{t('open')}</button><button disabled={busy} onClick={create}><Icon name="plus" />{t('newfile')}</button></div>
      <div className="welcome-steps">{['open', 'build', 'save'].map((step, index) => <div key={step}><span>{String(index + 1).padStart(2, '0')}</span><strong>{t(`work.step.${step}`)}</strong><small>{t(`work.step.${step}Hint`)}</small></div>)}</div>
      <div className="welcome-example"><div><span className="type-label condition-label">{t('when')}</span><p>{t('workbench.exampleWhen')}</p></div><Icon name="chevron" /><div><span className="type-label action-label">{t('then')}</span><p>{t('command.24')}</p></div></div>
      <p className="drop-hint"><Icon name="upload" />{t('work.dropHint')}</p>
    </div></section></main>;
}
