import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { apiError, useProgram, useWorkouts, weekWorkouts, WorkoutPlan, workoutFromPlan } from '../services/training';
import { attachWorkoutModule, readWorkoutDraft, writeWorkoutDraft } from '../utils/workoutDraft';
import { planTitle, planWorkoutCount, programProgress } from '../utils/trainingProgress';
import WorkoutEditor from '../components/WorkoutEditor';
import ProgramSettings from '../components/ProgramSettings';
import SportPage, { SessionCard, TYPE_CONFIG } from './SportPage';

export default function TrainingPage() {
  const program = useProgram();
  const history = useWorkouts();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [params, setParams] = useSearchParams();
  const view = params.get('view');
  const tab = view === 'history' || view === 'week' || view === 'library' ? view : 'program';
  const [expanded, setExpanded] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [editing, setEditing] = useState<WorkoutPlan | null>(null);
  const [creating, setCreating] = useState<'session' | 'module' | null>(null);
  const [settings, setSettings] = useState(false);
  const [storageError, setStorageError] = useState('');
  const [draft] = useState(() => readWorkoutDraft());
  const workouts = history.data ?? [];
  const thisWeek = weekWorkouts(workouts);
  const plans = program.data?.sessions ?? [];
  const modules = program.data?.modules ?? [];
  const minimum = program.data?.weeklyMinimum ?? 4;
  const maximum = program.data?.weeklyMaximum ?? 7;
  const progress = programProgress(plans, thisWeek);
  const suggested = plans.find(plan => planWorkoutCount(plan, thisWeek, plans) < plan.weeklyTarget) ?? plans[0];
  const prepare = useMutation({
    mutationFn: (key: string) => api.post<WorkoutPlan>(`/sport/program/${key}/prepare`).then(r => r.data),
    onSuccess: async plan => {
      await queryClient.invalidateQueries({ queryKey: ['personal-program'] });
      const current = readWorkoutDraft().draft;
      if (current && !window.confirm('Une séance est déjà en cours. La remplacer par celle-ci ?')) {
        navigate('/seance'); return;
      }
      if (!writeWorkoutDraft(workoutFromPlan(plan))) {
        setStorageError('Impossible de sauvegarder la séance sur cet appareil. Autorise le stockage local, puis réessaie.');
        return;
      }
      navigate('/seance');
    },
  });
  const errors = [program, history].filter(q => q.isError);
  const busy = prepare.isPending;
  const startFreeWorkout = () => {
    if (readWorkoutDraft().draft && !window.confirm('Une séance est déjà en cours. La remplacer par une séance libre ?')) return;
    if (!writeWorkoutDraft(workoutFromPlan({
      key: 'free', templateId: null, name: 'Séance libre', type: 'other', weeklyTarget: 1, exercises: [],
    }))) {
      setStorageError('Impossible de sauvegarder la séance sur cet appareil. Autorise le stockage local, puis réessaie.');
      return;
    }
    navigate('/seance');
  };
  const addModule = (module: WorkoutPlan) => {
    const current = readWorkoutDraft().draft;
    if (!current || current.exercises.length + module.exercises.length > 100) {
      setStorageError('Reprends une séance avec assez de place avant d’ajouter ce module.'); return;
    }
    if (!writeWorkoutDraft(attachWorkoutModule(current, module))) {
      setStorageError('Impossible de sauvegarder le module sur cet appareil.'); return;
    }
    navigate('/seance');
  };

  return (
    <div className="training-page">
      <header className="training-heading">
        <div><p className="kicker">TON ESPACE D’ENTRAÎNEMENT</p><h1>On passe à l’action<span>.</span></h1></div>
        <p className="training-date">{new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
      </header>
      {params.get('saved') && <div className="training-notice" role="status"><i className="ti ti-circle-check" /> Séance enregistrée. Chaque série compte.</div>}
      {params.get('draftError') && <p className="training-error" role="alert">La séance est enregistrée, mais le brouillon local n’a pas pu être effacé. Ne l’enregistre pas une seconde fois.</p>}
      {errors.length > 0 && <div className="training-error" role="alert">Impossible de charger toutes tes données.
        <button onClick={() => errors.forEach(q => q.refetch())}>Réessayer</button></div>}
      {draft.unavailable && <p className="training-error" role="alert">Le stockage local est indisponible : la reprise d’une séance n’est pas garantie.</p>}
      {(storageError || prepare.isError) && <p className="training-error" role="alert">{storageError || apiError(prepare.error, 'Impossible de préparer la séance. Réessaie.')}</p>}

      <section className="training-hero">
        <div className="training-hero-copy">
          <span className="status-pill"><span /> {draft.draft ? 'SÉANCE EN COURS' : 'TON PROCHAIN RENDEZ-VOUS'}</span>
          <h2>{draft.draft ? planTitle(draft.draft.name) : program.isPending ? 'Ton programme arrive…' : suggested ? planTitle(suggested.name) : 'Prêt pour la suite ?'}</h2>
          <p>{draft.draft ? 'Tes séries sont gardées sur cet appareil. Reprends exactement où tu t’es arrêté.'
            : 'Tes exercices, tes charges. Tu t’entraînes, on garde la trace.'}</p>
          {draft.draft ? <Link className="button button-primary" to="/seance">Reprendre ma séance <i className="ti ti-arrow-up-right" aria-hidden="true" /></Link>
            : <button className="button button-primary" disabled={busy || !suggested || program.isError}
              onClick={() => suggested && prepare.mutate(suggested.key)}>{busy ? 'Préparation…' : 'Commencer la séance'} <i className="ti ti-arrow-up-right" aria-hidden="true" /></button>}
          <button className="text-button hero-free-workout" disabled={busy} onClick={startFreeWorkout}><i className="ti ti-plus" /> Faire une séance libre</button>
        </div>
        <div className="week-visual">
          <div className="week-orbit" style={{ '--progress': `${Math.min(thisWeek.length / minimum, 1) * 100}%` } as React.CSSProperties}>
            <div><strong>{history.isPending || program.isPending || errors.length ? '—' : thisWeek.length}<span>/ {minimum}</span></strong><span>objectif hebdomadaire</span></div>
          </div>
          <div className="week-caption"><span>Cette semaine · cap {minimum} à {maximum} séances</span>
            <strong>{errors.length ? 'Suivi indisponible' : `${progress.completed} / ${progress.target} séances prévues réalisées`}</strong>
            <small>Toutes les séances comptent, y compris les séances importées.</small></div>
        </div>
      </section>

      <div className="training-section-bar">
        <div className="training-tabs" aria-label="Vue entraînement">
          <button aria-pressed={tab === 'program'} className={tab === 'program' ? 'selected' : ''} onClick={() => setParams({})}>Programme <span>{plans.length}</span></button>
          <button aria-pressed={tab === 'week'} className={tab === 'week' ? 'selected' : ''} onClick={() => setParams({ view: 'week' })}>Ma semaine</button>
          <button aria-pressed={tab === 'history'} className={tab === 'history' ? 'selected' : ''} onClick={() => setParams({ view: 'history' })}>Historique <i className="ti ti-history" aria-hidden="true" /></button>
          <button aria-pressed={tab === 'library'} className={tab === 'library' ? 'selected' : ''} onClick={() => setParams({ view: 'library' })}>Bibliothèque</button>
        </div>
      </div>

      {tab === 'program' ? <>
        <div className="program-intro"><div><p>Ton programme courant.</p><span className="muted">L’ordre et les jours sont libres. Adapte chaque séance sans perdre tes repères.</span></div>
          <button className="button button-quiet" disabled={!program.data} onClick={() => setSettings(true)}><i className="ti ti-adjustments-horizontal" /> Organiser mon programme</button></div>
        {program.isPending && <div className="training-loading" role="status">Chargement de ton programme…</div>}
        <div className="workout-grid">
          {plans.map(plan => {
            const count = planWorkoutCount(plan, thisWeek, plans);
            const completed = count >= plan.weeklyTarget;
            const config = TYPE_CONFIG[plan.type] ?? TYPE_CONFIG.other;
            return <article className={`workout-card${suggested?.key === plan.key ? ' suggested' : ''}`} key={plan.key}>
              <header className="workout-card-top"><span className="workout-day">{plan.weeklyTarget} fois / semaine · jour libre</span>
                <span className={`workout-state${completed ? ' completed' : ''}`}><i className={`ti ti-${completed ? 'check' : 'circle'}`} /> {history.isError ? 'Suivi indisponible' : `${count} / ${plan.weeklyTarget} réalisée(s)`}</span></header>
              <div className="workout-card-title"><div><span className="workout-number">{config.label} · {plan.exercises.length} exercices</span><h3>{planTitle(plan.name)}</h3></div></div>
              <div className="workout-preview">{plan.exercises.slice(0, 3).map((ex, i) => <div key={i}><span>{ex.name}</span><strong>{ex.weight != null ? <>{ex.weight}<small> kg</small></> : '—'}</strong></div>)}</div>
              {expanded === plan.key && <div className="workout-extra" id={`exercises-${plan.key}`}>
                {plan.exercises.slice(3).map((ex, i) => <div key={i}><span>{ex.name}</span><strong>{ex.weight != null ? `${ex.weight} kg` : ex.durationSeconds ? `${ex.durationSeconds / 60} min` : 'Libre'}</strong></div>)}
                <button className="text-button" onClick={() => setEditing(plan)}><i className="ti ti-adjustments-horizontal" aria-hidden="true" /> Modifier les exercices et charges</button>
              </div>}
              <button className="workout-expand" aria-expanded={expanded === plan.key} aria-controls={`exercises-${plan.key}`}
                onClick={() => setExpanded(expanded === plan.key ? null : plan.key)}>{expanded === plan.key ? 'Réduire' : 'Tous les exercices & réglages'} <i className={`ti ti-chevron-${expanded === plan.key ? 'up' : 'down'}`} aria-hidden="true" /></button>
              <footer><button className="button button-card" disabled={busy} onClick={() => prepare.mutate(plan.key)}>Commencer <i className="ti ti-arrow-right" aria-hidden="true" /></button>
                <button className="icon-button" aria-label={`Modifier ${planTitle(plan.name)}`} onClick={() => setEditing(plan)}><i className="ti ti-adjustments-horizontal" /></button></footer>
            </article>;
          })}
        </div>
        <div className="training-actions"><button className="button button-quiet" disabled={program.isError} onClick={() => setCreating('session')}><i className="ti ti-plus" /> Ajouter une séance</button>
          <button className="text-button" onClick={() => setParams({ view: 'library' })}>Retrouver toutes mes séances <i className="ti ti-arrow-right" /></button></div>
        <div className="program-intro"><div><p>Les modules, à ta façon.</p><span className="muted">EMOM, course, circuit… Seuls ou en complément d’une séance.</span></div>
          <button className="button button-quiet" disabled={program.isError} onClick={() => setCreating('module')}><i className="ti ti-plus" /> Nouveau module</button></div>
        <div className="module-grid">{modules.map(module => <article className="module-card" key={module.key}>
          <h3>{planTitle(module.name)}</h3>
          <p>{module.exercises.length} exercices{module.description ? ` · ${module.description}` : ''}</p>
          <div className="training-actions"><button className="button button-card" disabled={busy} onClick={() => prepare.mutate(module.key)}>Faire seul</button>
            <button className="text-button" disabled={!draft.draft} onClick={() => addModule(module)}>Ajouter à ma séance</button>
            <button className="icon-button" aria-label={`Modifier ${planTitle(module.name)}`} onClick={() => setEditing(module)}><i className="ti ti-pencil" /></button></div>
        </article>)}</div>
        {!modules.length && !program.isPending && !program.isError && <p className="muted">Crée ton premier module ou retrouve tes modèles existants dans la bibliothèque.</p>}
        <p className="training-footnote"><i className="ti ti-lock" /> Une séance enregistrée compte une fois. Ses modules ne sont jamais comptés en double.</p>
      </> : tab === 'week' ? <SportPage /> : tab === 'library' ? <section>
        <div className="program-intro"><div><p>Toutes tes séances, au même endroit.</p><span className="muted">Les anciens modèles sont conservés ici, sans espace séparé.</span></div>
          <button className="button button-quiet" disabled={!program.data} onClick={() => setSettings(true)}>Organiser</button></div>
        <div className="training-actions"><button className="button button-primary" disabled={program.isError} onClick={() => setCreating('session')}><i className="ti ti-plus" /> Nouvelle séance</button>
          <button className="button button-quiet" disabled={program.isError} onClick={() => setCreating('module')}>Nouveau module</button></div>
        <div className="module-grid">{program.data?.library.map(plan => <article className="module-card" key={plan.key}>
          <span className="workout-state">{plans.some(p => p.key === plan.key) ? 'Programme courant' : modules.some(p => p.key === plan.key) ? 'Module complémentaire' : 'Disponible'}</span>
          <h3>{planTitle(plan.name)}</h3><p>{plan.exercises.length} exercices · {(TYPE_CONFIG[plan.type] ?? TYPE_CONFIG.other).label}</p>
          <div className="training-actions"><button className="button button-card" disabled={busy} onClick={() => prepare.mutate(plan.key)}>Commencer</button>
            <button className="icon-button" aria-label={`Modifier ${planTitle(plan.name)}`} onClick={() => setEditing(plan)}><i className="ti ti-pencil" /></button></div>
        </article>)}</div>
      </section> : <section className="workout-history">
        <div className="program-intro"><p>Le travail accompli.</p><span>Toutes tes séances, anciennes et nouvelles.</span></div>
        {history.isPending ? <p role="status">Chargement des séances…</p> : !history.isError && workouts.length === 0 ?
          <div className="history-empty"><i className="ti ti-bolt" aria-hidden="true" /><h2>Ta première séance commence ici.</h2><p>Choisis un entraînement dans ton programme. Tes séries terminées apparaîtront ici.</p><button className="button button-primary" onClick={() => setParams({})}>Voir mon programme</button></div>
          : [...workouts].sort((a, b) => b.date.localeCompare(a.date)).map(workout => <article className="history-card" key={workout.id}>
            <button className="history-toggle" aria-expanded={selected === workout.id} onClick={() => setSelected(selected === workout.id ? null : workout.id)}>
              <span className="history-date"><strong>{new Date(`${workout.date}T00:00:00`).getDate()}</strong><span>{new Date(`${workout.date}T00:00:00`).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })}</span></span>
              <span className="history-title"><strong>{workout.name}</strong><span>{workout.exercises.length} exercices{workout.durationMinutes ? ` · ${workout.durationMinutes} min` : ''}</span></span>
              <i className={`ti ti-chevron-${selected === workout.id ? 'up' : 'down'}`} />
            </button>
            {selected === workout.id && <div className="history-detail"><SessionCard s={workout} /></div>}
          </article>)}
      </section>}
      {editing && <WorkoutEditor plan={editing} role={modules.some(module => module.key === editing.key) ? 'module' : 'session'} onClose={() => setEditing(null)} />}
      {creating && <WorkoutEditor role={creating} onClose={() => setCreating(null)} />}
      {settings && program.data && <ProgramSettings program={program.data} onClose={() => setSettings(false)} />}
    </div>
  );
}
