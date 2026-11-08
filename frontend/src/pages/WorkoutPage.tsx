import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { apiError, useWorkouts } from '../services/training';
import { clearWorkoutDraft, readWorkoutDraft, WorkoutDraft, WorkoutDraftExercise, writeWorkoutDraft } from '../utils/workoutDraft';

type TrackingRow = NonNullable<WorkoutDraftExercise['trackingSets']>[number];

function isValidRow(row: TrackingRow) {
  const reps = Number(row.reps);
  const weight = Number(row.weight);
  return row.reps.trim() !== '' && Number.isInteger(reps) && reps > 0 && reps <= 1000 &&
    (row.weight.trim() === '' || Number.isFinite(weight) && weight >= 0);
}

function isComplete(exercise: WorkoutDraftExercise) {
  return exercise.durationSeconds != null ? Boolean(exercise.effortDone)
    : Boolean(exercise.trackingSets?.length && exercise.trackingSets.every(row => row.done));
}

function normalizeDraft(draft: WorkoutDraft | null): WorkoutDraft | null {
  if (!draft) return null;
  return { ...draft, exercises: draft.exercises.map(ex => ({
    ...ex, trackingSets: ex.trackingSets ?? (ex.performedSets.length
      ? ex.performedSets.map(s => ({ reps: String(s.reps), weight: s.weight?.toString() ?? '', done: true }))
      : [{ reps: ex.reps?.toString() ?? '', weight: ex.weight?.toString() ?? '', done: false }]),
  })) };
}

export default function WorkoutPage() {
  const restored = useMemo(() => readWorkoutDraft(), []);
  const [draft, setDraft] = useState(() => normalizeDraft(restored.draft));
  const [storageError, setStorageError] = useState(restored.unavailable);
  const [active, setActive] = useState(() => Math.max(0,
    restored.draft?.exercises.findIndex(ex => ex._id === restored.draft?.activeExerciseId) ?? 0));
  const [clock, setClock] = useState(Date.now());
  const [restUntil, setRestUntil] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [review, setReview] = useState(false);
  const [durationOverride, setDurationOverride] = useState('');
  const reviewDialog = useRef<HTMLDialogElement>(null);
  const stopped = useRef(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const history = useWorkouts();

  useEffect(() => {
    const timer = window.setInterval(() => setClock(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    if (!draft || stopped.current) return;
    setStorageError(!writeWorkoutDraft({
      ...draft, activeExerciseId: draft.exercises[active]?._id, savedAt: new Date().toISOString(),
    }));
  }, [draft, active]);
  useEffect(() => {
    if (review) reviewDialog.current?.showModal();
  }, [review]);

  const updateExercise = (index: number, patch: Partial<WorkoutDraftExercise>) =>
    setDraft(current => current ? { ...current, exercises: current.exercises.map((ex, i) => i === index ? { ...ex, ...patch } : ex) } : null);
  const updateRows = (rows: TrackingRow[]) => {
    updateExercise(active, {
      trackingSets: rows,
      performedSets: rows.filter(row => row.done && isValidRow(row)).map(row => ({
        reps: Number(row.reps), ...(row.weight.trim() === '' ? {} : { weight: Number(row.weight) }),
      })),
    });
  };
  const elapsedMinutes = draft?.startedAt ? Math.max(1, Math.floor((clock - Date.parse(draft.startedAt)) / 60_000)) : draft?.durationMinutes ?? 1;
  const duration = durationOverride === '' ? elapsedMinutes : Number(durationOverride);
  const exercises = draft?.exercises ?? [];
  const finished = exercises.filter(isComplete).length;
  const confirmedSets = exercises.reduce((n, ex) => n + ex.performedSets.length, 0);
  const recordedExercises = exercises.filter(ex => ex.performedSets.length || ex.effortDone);
  const unconfirmed = exercises.reduce((n, ex) => n + (ex.trackingSets?.filter(row => !row.done && row.reps.trim() !== '').length ?? 0), 0);
  const mutation = useMutation({
    mutationFn: () => {
      if (!draft) throw new Error('Aucune séance à enregistrer.');
      return api.post('/sport/sessions', {
        name: draft.name, type: draft.type, templateId: draft.templateId ?? undefined,
        date: draft.date, durationMinutes: duration, notes: draft.notes.trim() || undefined,
        exercises: recordedExercises.map(ex => ({
          name: ex.name, templateExerciseId: ex.templateExerciseId,
          performedSets: ex.performedSets.length ? ex.performedSets : undefined,
          durationSeconds: ex.effortDone ? ex.durationSeconds : undefined,
          restSeconds: ex.restSeconds ?? undefined, notes: ex.notes || undefined,
        })),
      });
    },
    onSuccess: async () => {
      stopped.current = true;
      const cleared = clearWorkoutDraft();
      await Promise.all(['sessions', 'sport-stats', 'strength-progress'].map(key =>
        queryClient.invalidateQueries({ queryKey: [key] })));
      navigate(cleared ? '/?view=history&saved=1' : '/?view=history&saved=1&draftError=1', { replace: true });
    },
  });

  if (!draft) return <div className="training-page history-empty"><i className="ti ti-barbell" /><h1>Quelle séance aujourd’hui ?</h1><p>Ton programme et tes charges sont prêts.</p><Link className="button button-primary" to="/">Choisir ma séance <i className="ti ti-arrow-right" /></Link></div>;
  const ex = exercises[active];
  const rows = ex?.trackingSets ?? [];
  const last = ex && [...(history.data ?? [])].filter(w => w.date <= draft.date)
    .sort((a, b) => b.date.localeCompare(a.date))
    .flatMap(w => w.exercises).find(e => (ex.templateExerciseId && e.templateExerciseId === ex.templateExerciseId || e.name === ex.name) && e.performedSets?.length);
  const remainingRest = restUntil == null ? 0 : Math.max(0, Math.ceil((restUntil - clock) / 1000));
  const validDuration = Number.isInteger(duration) && duration > 0;

  return (
    <div className="training-page active-workout">
      <header className="session-heading">
        <Link className="back-link" to="/"><i className="ti ti-arrow-left" /> Mon espace</Link>
        <span className="autosave-state"><span className={storageError ? 'storage-failed' : ''} />{storageError ? 'Sauvegarde indisponible' : 'Sauvegardé sur cet appareil'}</span>
      </header>
      <div className="session-title"><div><p className="kicker">SÉANCE EN COURS</p><h1>{draft.name.replace(/^.+? · /, '')}</h1></div>
        <div className="session-time"><i className="ti ti-clock" /><strong>{elapsedMinutes}</strong><span>min</span></div></div>
      {storageError && <p className="training-error" role="alert">La sauvegarde locale a échoué. Garde cette page ouverte et termine l’enregistrement avant de quitter.</p>}
      <div className="session-progress-bar"><span style={{ width: `${exercises.length ? finished / exercises.length * 100 : 0}%` }} /></div>
      <div className="session-progress-label"><span>{finished} / {exercises.length} exercices terminés</span><strong>{confirmedSets} série{confirmedSets > 1 ? 's' : ''} validée{confirmedSets > 1 ? 's' : ''}</strong></div>
      <fieldset className="workout-fields" disabled={mutation.isPending}>
        <div className="session-layout">
          <aside className="exercise-navigation">
            <p className="kicker">TA SÉANCE</p>
            <nav aria-label="Exercices de la séance">{exercises.map((exercise, index) => <button key={exercise._id}
              className={`${index === active ? 'current' : ''}${isComplete(exercise) ? ' done' : ''}`}
              aria-current={index === active ? 'step' : undefined} onClick={() => setActive(index)}>
              <span className="exercise-nav-index">{isComplete(exercise) ? <i className="ti ti-check" /> : String(index + 1).padStart(2, '0')}</span>
              <span>{exercise.name}<small>{exercise.durationSeconds ? `${Math.round(exercise.durationSeconds / 60)} min` : `${exercise.performedSets.length} série(s) validée(s)`}</small></span>
              {index === active && <i className="ti ti-chevron-right" />}
            </button>)}</nav>
            {adding ? <form className="add-exercise-form" onSubmit={event => {
              event.preventDefault();
              if (!newName.trim()) return;
              setDraft(current => current ? { ...current, exercises: [...current.exercises, {
                _id: crypto.randomUUID(), name: newName.trim(), performedSets: [],
                trackingSets: [{ reps: '', weight: '', done: false }],
              }] } : null);
              setActive(exercises.length); setNewName(''); setAdding(false);
            }}><input aria-label="Nom du nouvel exercice" autoFocus required value={newName} maxLength={150} onChange={event => setNewName(event.target.value)} />
              <button className="text-button">Ajouter</button><button type="button" className="text-button" onClick={() => setAdding(false)}>Annuler</button></form>
              : <button className="text-button add-exercise-button" disabled={exercises.length >= 100} onClick={() => setAdding(true)}><i className="ti ti-plus" aria-hidden="true" /> Ajouter un exercice</button>}
          </aside>
          <section className="exercise-stage" aria-label="Exercice actif">
            {ex ? <>
              <div className="exercise-stage-heading"><span className="kicker">EXERCICE {String(active + 1).padStart(2, '0')} / {String(exercises.length).padStart(2, '0')}</span>
                <button className="icon-button" aria-label={`Retirer ${ex.name} de cette séance`} onClick={() => {
                  if (!window.confirm(`Retirer « ${ex.name} » de cette séance ? Ses saisies seront effacées, pas ton programme.`)) return;
                  setDraft(current => current ? { ...current, exercises: current.exercises.filter((_, i) => i !== active) } : null);
                  setActive(Math.max(0, active - 1));
                }}><i className="ti ti-x" /></button></div>
              <h2>{ex.name}</h2>
              <div className="exercise-targets"><span>REPÈRE DU PROGRAMME</span><strong>{ex.weight != null ? <>{ex.weight} <small>kg</small></> : 'Poids du corps / libre'}</strong>
                {ex.sets && <p>{ex.sets} séries{ex.reps ? ` × ${ex.reps} répétitions` : ''}</p>}</div>
              {ex.notes && <p className="exercise-instruction"><i className="ti ti-info-circle" />{ex.notes}</p>}
              {last?.performedSets && <div className="previous-performance"><i className="ti ti-history" /><div><span>La dernière fois</span><strong>{last.performedSets.map(s => `${s.reps} reps${s.weight != null ? ` × ${s.weight} kg` : ''}`).join(' / ')}</strong></div></div>}
              {history.isError && <div className="training-error" role="alert">La dernière performance est indisponible.<button onClick={() => history.refetch()}>Réessayer</button></div>}

              {ex.durationSeconds != null ? <div className="timed-effort">
                <label>Durée réalisée · secondes<input type="number" min="1" step="1" disabled={ex.effortDone} value={ex.durationSeconds} onChange={e => updateExercise(active, { durationSeconds: Number(e.target.value) })} /></label>
                <button className={`button ${ex.effortDone ? 'button-quiet' : 'button-primary'}`} disabled={!Number.isInteger(ex.durationSeconds) || ex.durationSeconds < 1}
                  onClick={() => updateExercise(active, { effortDone: !ex.effortDone })}><i className={`ti ti-${ex.effortDone ? 'check' : 'player-stop'}`} aria-hidden="true" />{ex.effortDone ? 'Effort validé · annuler' : 'Valider cet effort réalisé'}</button>
              </div> : <>
                <div className="live-set-head"><span>SÉRIE</span><span>CHARGE · KG</span><span>RÉPÉTITIONS</span><span>FAIT</span></div>
                <div className="live-sets">{rows.map((row, i) => <div key={i} className={`live-set${row.done ? ' validated' : ''}`}>
                  <span className="live-set-index">{i + 1}</span>
                  <input aria-label={`${ex.name}, série ${i + 1}, charge en kg`} type="number" min="0" step="0.5" placeholder="—" value={row.weight} disabled={row.done}
                    onChange={e => updateRows(rows.map((s, n) => n === i ? { ...s, weight: e.target.value } : s))} />
                  <input aria-label={`${ex.name}, série ${i + 1}, répétitions`} type="number" min="1" max="1000" step="1" placeholder="—" value={row.reps} disabled={row.done}
                    onChange={e => updateRows(rows.map((s, n) => n === i ? { ...s, reps: e.target.value } : s))} />
                  <button className="set-check" aria-label={`${row.done ? 'Annuler' : 'Valider'} ${ex.name}, série ${i + 1}`} aria-pressed={row.done}
                    disabled={!row.done && !isValidRow(row)} onClick={() => {
                      updateRows(rows.map((s, n) => n === i ? { ...s, done: !s.done } : s));
                      if (!row.done) { setClock(Date.now()); setRestUntil(Date.now() + (ex.restSeconds ?? 90) * 1000); }
                    }}><i className="ti ti-check" /></button>
                </div>)}</div>
                <div className="set-controls"><button className="text-button" disabled={rows.length >= 100} onClick={() => updateRows([...rows, {
                  reps: rows[rows.length - 1]?.reps ?? '', weight: rows[rows.length - 1]?.weight ?? ex.weight?.toString() ?? '', done: false,
                }])}><i className="ti ti-plus" aria-hidden="true" /> Ajouter une série</button>
                  {rows.length > 1 && !rows[rows.length - 1].done && <button className="text-button" onClick={() => updateRows(rows.slice(0, -1))}>Retirer la dernière</button>}</div>
                <p className="set-explainer">Renseigne ta série, puis coche-la. Les valeurs préremplies ne sont jamais comptées comme réalisées.</p>
              </>}
              {restUntil != null && <div className="rest-timer" role="timer"><i className="ti ti-hourglass" /><span>{remainingRest ? 'Récupération' : 'Repos terminé'}</span><strong>{Math.floor(remainingRest / 60)}:{String(remainingRest % 60).padStart(2, '0')}</strong>
                <button className="text-button" onClick={() => setRestUntil(null)}>Fermer</button></div>}
              <div className="exercise-stage-footer"><button className="button button-quiet" disabled={active === 0} onClick={() => setActive(i => i - 1)}><i className="ti ti-arrow-left" aria-hidden="true" /> Précédent</button>
                {active < exercises.length - 1 ? <button className="button button-card" onClick={() => setActive(i => i + 1)}>Suivant <i className="ti ti-arrow-right" aria-hidden="true" /></button>
                  : <button className="button button-card" onClick={() => setReview(true)}>Bilan de séance <i className="ti ti-arrow-right" aria-hidden="true" /></button>}</div>
            </> : <div className="history-empty"><h2>Ta séance est libre.</h2><p>Ajoute un exercice pour commencer à noter tes séries.</p></div>}
          </section>
        </div>
        <details className="session-settings"><summary>Notes & détails de la séance <i className="ti ti-chevron-down" /></summary>
          <div className="session-settings-grid"><label>Date<input type="date" required value={draft.date} onChange={e => setDraft({ ...draft, date: e.target.value })} /></label>
            <label>Durée · minutes<input type="number" min="1" step="1" value={durationOverride || elapsedMinutes} onChange={e => setDurationOverride(e.target.value)} /></label></div>
          <label>Notes<textarea rows={3} placeholder="Sensations, fatigue, une remarque pour la prochaine fois…" value={draft.notes} onChange={e => setDraft({ ...draft, notes: e.target.value })} /></label>
          <button type="button" className="text-button" onClick={() => {
            if (!window.confirm('Abandonner cette séance ? Les saisies seront effacées de cet appareil, pas ton programme.')) return;
            if (!clearWorkoutDraft()) { setStorageError(true); return; }
            stopped.current = true;
            navigate('/', { replace: true });
          }}>Abandonner la séance</button>
        </details>
        <footer className="finish-workout-bar"><div><strong>{confirmedSets} série{confirmedSets > 1 ? 's' : ''}. Ton travail.</strong><span>Seuls les efforts validés seront enregistrés.</span></div>
          <button className="button button-primary" disabled={!recordedExercises.length || !draft.date || !validDuration} onClick={() => setReview(true)}>Terminer ma séance <i className="ti ti-check" aria-hidden="true" /></button></footer>
      </fieldset>
      {review && <dialog ref={reviewDialog} className="training-dialog finish-dialog" aria-labelledby="workout-review-title" onCancel={event => {
        if (mutation.isPending) event.preventDefault(); else setReview(false);
      }}>
        <header className="dialog-heading"><div><p className="kicker">LE BILAN</p><h2 id="workout-review-title">Du travail bien noté.</h2></div><button className="icon-button" disabled={mutation.isPending} aria-label="Revenir à la séance" onClick={() => setReview(false)}><i className="ti ti-x" /></button></header>
        <p className="muted">{draft.name} · {duration} min</p>
        <div className="finish-metrics"><div><strong>{confirmedSets}</strong><span>séries validées</span></div><div><strong>{recordedExercises.length}</strong><span>exercices enregistrés</span></div></div>
        {(exercises.length !== recordedExercises.length || unconfirmed > 0) && <p className="finish-warning">Les exercices sans effort validé et les {unconfirmed} série(s) non cochée(s) ne seront pas enregistrés. Tu peux revenir les compléter.</p>}
        {mutation.isError && <p role="alert" className="training-error">{apiError(mutation.error, 'Enregistrement impossible. Tes saisies sont conservées. Réessaie.')}</p>}
        <footer className="dialog-actions"><button className="button button-quiet" disabled={mutation.isPending} onClick={() => setReview(false)}>Revenir à la séance</button>
          <button className="button button-primary" disabled={mutation.isPending || !recordedExercises.length || !draft.date || !validDuration}
            onClick={() => mutation.mutate()}>{mutation.isPending ? 'Enregistrement…' : 'Enregistrer la séance'} <i className="ti ti-check" aria-hidden="true" /></button></footer>
      </dialog>}
    </div>
  );
}
