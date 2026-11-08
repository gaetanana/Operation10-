import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import api from '../services/api';
import { apiError, DAYS, formatWorkoutDate, PLAN_ICONS, PLAN_TITLES, planCompleted, useProgram, useWorkouts, weekWorkouts, WorkoutPlan, workoutFromPlan } from '../services/training';
import { readWorkoutDraft, writeWorkoutDraft } from '../utils/workoutDraft';
import WorkoutEditor from '../components/WorkoutEditor';

export default function TrainingPage() {
  const program = useProgram();
  const history = useWorkouts();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const tab = params.get('view') === 'history' ? 'history' : 'program';
  const [expanded, setExpanded] = useState<number | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [editing, setEditing] = useState<WorkoutPlan | null>(null);
  const [storageError, setStorageError] = useState('');
  const [draft] = useState(() => readWorkoutDraft());
  const workouts = history.data ?? [];
  const thisWeek = weekWorkouts(workouts);
  const plans = program.data ?? [];
  const done = plans.filter(p => planCompleted(p, thisWeek)).length;
  const todayIndex = (new Date().getDay() + 6) % 7;
  const suggested = plans.find(p => p.dayOfWeek >= todayIndex && !planCompleted(p, thisWeek))
    ?? plans.find(p => !planCompleted(p, thisWeek)) ?? plans[0];
  const prepare = useMutation({
    mutationFn: (key: number) => api.post<WorkoutPlan>(`/sport/program/${key}/prepare`).then(r => r.data),
    onSuccess: plan => {
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
          <h2>{draft.draft ? draft.draft.name : program.isPending ? 'Ton programme arrive…' : suggested ? PLAN_TITLES[suggested.key] : 'Prêt pour la suite ?'}</h2>
          <p>{draft.draft ? 'Tes séries sont gardées sur cet appareil. Reprends exactement où tu t’es arrêté.'
            : 'Tes exercices, tes charges. Tu t’entraînes, on garde la trace.'}</p>
          {draft.draft ? <Link className="button button-primary" to="/seance">Reprendre ma séance <i className="ti ti-arrow-up-right" aria-hidden="true" /></Link>
            : <button className="button button-primary" disabled={busy || !suggested || program.isError}
              onClick={() => suggested && prepare.mutate(suggested.key)}>{busy ? 'Préparation…' : 'Commencer la séance'} <i className="ti ti-arrow-up-right" aria-hidden="true" /></button>}
        </div>
        <div className="week-visual">
          <div className="week-orbit" style={{ '--progress': `${done / 4 * 100}%` } as React.CSSProperties}>
            <div><strong>{history.isPending || program.isPending ? '—' : errors.length ? '—' : done}<span>/ 4</span></strong><span>séances du programme</span></div>
          </div>
          <div className="week-caption"><span>Cette semaine</span><strong>{history.isError ? 'Indisponible' : `${thisWeek.length} séance${thisWeek.length > 1 ? 's' : ''} enregistrée${thisWeek.length > 1 ? 's' : ''}`}</strong></div>
        </div>
      </section>

      <div className="training-section-bar">
        <div className="training-tabs" aria-label="Vue entraînement">
          <button aria-pressed={tab === 'program'} className={tab === 'program' ? 'selected' : ''} onClick={() => setParams({})}>Mon programme <span>04</span></button>
          <button aria-pressed={tab === 'history'} className={tab === 'history' ? 'selected' : ''} onClick={() => setParams({ view: 'history' })}>Historique <i className="ti ti-history" aria-hidden="true" /></button>
        </div>
        <Link to="/archives" className="archive-link">Anciens contrats <i className="ti ti-arrow-up-right" /></Link>
      </div>

      {tab === 'program' ? <>
        <div className="program-intro"><p>Quatre jours. Un cap.</p><span>Les jours sont des repères, pas des obligations.</span></div>
        {program.isPending && <div className="training-loading" role="status">Chargement de ton programme…</div>}
        <div className="workout-grid">
          {plans.map(plan => {
            const completed = planCompleted(plan, thisWeek);
            return <article className={`workout-card${suggested?.key === plan.key ? ' suggested' : ''}`} key={plan.key}>
              <header className="workout-card-top"><span className="workout-day">{DAYS[plan.key]}</span>
                <span className={`workout-state${completed ? ' completed' : ''}`}>{completed ? <><i className="ti ti-check" /> Faite cette semaine</> : `${plan.exercises.length} exercices`}</span></header>
              <div className="workout-card-title"><div><span className="workout-number">SESSION / 0{plan.key + 1}</span><h3>{PLAN_TITLES[plan.key]}</h3></div><i className={`ti ${PLAN_ICONS[plan.key]}`} aria-hidden="true" /></div>
              <div className="workout-preview">{plan.exercises.slice(0, 3).map((ex, i) => <div key={i}><span>{ex.name}</span><strong>{ex.weight != null ? <>{ex.weight}<small> kg</small></> : '—'}</strong></div>)}</div>
              {expanded === plan.key && <div className="workout-extra" id={`exercises-${plan.key}`}>
                {plan.exercises.slice(3).map((ex, i) => <div key={i}><span>{ex.name}</span><strong>{ex.weight != null ? `${ex.weight} kg` : ex.durationSeconds ? `${ex.durationSeconds / 60} min` : 'Libre'}</strong></div>)}
                <button className="text-button" onClick={() => setEditing(plan)}><i className="ti ti-adjustments-horizontal" aria-hidden="true" /> Modifier les exercices et charges</button>
              </div>}
              <button className="workout-expand" aria-expanded={expanded === plan.key} aria-controls={`exercises-${plan.key}`}
                onClick={() => setExpanded(expanded === plan.key ? null : plan.key)}>{expanded === plan.key ? 'Réduire' : 'Tous les exercices & réglages'} <i className={`ti ti-chevron-${expanded === plan.key ? 'up' : 'down'}`} aria-hidden="true" /></button>
              <footer><button className="button button-card" disabled={busy} onClick={() => prepare.mutate(plan.key)}>Commencer <i className="ti ti-arrow-right" aria-hidden="true" /></button>
                <button className="icon-button" aria-label={`Modifier ${PLAN_TITLES[plan.key]}`} onClick={() => setEditing(plan)}><i className="ti ti-adjustments-horizontal" /></button></footer>
            </article>;
          })}
        </div>
        <p className="training-footnote"><i className="ti ti-lock" /> Ton programme est prêt. Aucune séance n’est comptée avant que tu l’aies terminée.</p>
      </> : <section className="workout-history">
        <div className="program-intro"><p>Le travail accompli.</p><span>Toutes tes séances, anciennes et nouvelles.</span></div>
        {history.isPending ? <p role="status">Chargement des séances…</p> : !history.isError && workouts.length === 0 ?
          <div className="history-empty"><i className="ti ti-barbell" /><h2>Ta première séance commence ici.</h2><p>Choisis un entraînement dans ton programme. Tes séries terminées apparaîtront ici.</p><button className="button button-primary" onClick={() => setParams({})}>Voir mon programme</button></div>
          : [...workouts].sort((a, b) => b.date.localeCompare(a.date)).map(workout => <article className="history-card" key={workout.id}>
            <button className="history-toggle" aria-expanded={selected === workout.id} onClick={() => setSelected(selected === workout.id ? null : workout.id)}>
              <span className="history-date"><strong>{new Date(`${workout.date}T00:00:00`).getDate()}</strong><span>{new Date(`${workout.date}T00:00:00`).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })}</span></span>
              <span className="history-title"><strong>{workout.name}</strong><span>{workout.exercises.length} exercices{workout.durationMinutes ? ` · ${workout.durationMinutes} min` : ''}</span></span>
              <i className={`ti ti-chevron-${selected === workout.id ? 'up' : 'down'}`} />
            </button>
            {selected === workout.id && <div className="history-detail"><p className="muted">{formatWorkoutDate(workout.date)}{workout.notes ? ` · ${workout.notes}` : ''}</p>
              {workout.exercises.map(ex => <div key={ex.id}><strong>{ex.name}</strong><span>{ex.performedSets?.length
                ? ex.performedSets.map(s => `${s.reps} reps${s.weight != null ? ` × ${s.weight} kg` : ''}`).join(' / ')
                : ex.durationSeconds ? `${Math.floor(ex.durationSeconds / 60)} min ${ex.durationSeconds % 60 ? `${ex.durationSeconds % 60} s` : ''}`
                : `${ex.sets ?? '—'} série(s)${ex.reps ? ` × ${ex.reps}` : ''}${ex.weight != null ? ` · ${ex.weight} kg` : ''}`}</span>{ex.notes && <small>{ex.notes}</small>}</div>)}
            </div>}
          </article>)}
      </section>}
      {editing && <WorkoutEditor plan={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}
