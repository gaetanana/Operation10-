import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import api from '../services/api';
import { TYPE_CONFIG, ExForm, ExerciseRow } from './SportPage';
import { getLocalDateString } from '../utils/date';
import SetTracker, { SetEntry, validSets } from '../components/SetTracker';
import { AxiosError } from 'axios';
import { clearWorkoutDraft, hasWorkoutProgress, readWorkoutDraft, WorkoutDraft, WorkoutDraftExercise, writeWorkoutDraft } from '../utils/workoutDraft';

type DraftEx = WorkoutDraftExercise;

export default function SeanceDuJourPage() {
  const today = getLocalDateString();
  const [searchParams] = useSearchParams();
  const requestedTemplate = searchParams.get('template');
  const initializedTemplate = useRef<string | null>(null);
  const restored = useMemo(() => readWorkoutDraft(), []);
  const [restoredDraft, setRestoredDraft] = useState(Boolean(restored.draft && hasWorkoutProgress(restored.draft)));
  const qc = useQueryClient();
  const idRef = useRef(restored.draft?.exercises.length ?? 0);
  const newId = () => `d${idRef.current++}`;

  const [type, setType] = useState(restored.draft?.type ?? 'pecs_triceps');
  const [templateId, setTemplateId] = useState<string | null>(restored.draft?.templateId ?? null);
  const [name, setName] = useState(restored.draft?.name ?? '');
  const [durationMinutes, setDurationMinutes] = useState<number>(restored.draft?.durationMinutes ?? 60);
  const [notes, setNotes] = useState(restored.draft?.notes ?? '');
  const [date, setDate] = useState(restored.draft?.date ?? today);
  const [exercises, setExercises] = useState<DraftEx[]>(restored.draft?.exercises ?? []);
  const [showAdd, setShowAdd] = useState(false);
  const [draftStorageError, setDraftStorageError] = useState(restored.unavailable);
  const [draftSavedAt, setDraftSavedAt] = useState(restored.draft?.savedAt ?? '');

  const { data: templates = [] } = useQuery({
    queryKey: ['templates'],
    queryFn: () => api.get('/sport/templates').then(r => r.data),
  });
  const history = useQuery({
    queryKey: ['sessions'],
    queryFn: () => api.get<{ date: string; exercises: {
      templateExerciseId: string | null; performedSets: SetEntry[] | null;
    }[] }[]>('/sport/sessions').then(r => r.data),
  });

  const cfg = TYPE_CONFIG[type] ?? TYPE_CONFIG.other;
  const hasDraft = hasWorkoutProgress({ date, type, templateId, name, durationMinutes, notes, exercises, savedAt: draftSavedAt });
  const dateLabel = date
    ? new Date(`${date}T00:00:00`).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
    : '';

  // Choix d'un contrat ou d'un type → pré-remplit + importe les exercices du contrat
  const pick = (value: string, replace = false) => {
    const currentDraft: WorkoutDraft = { date, type, templateId, name, durationMinutes, notes, exercises, savedAt: draftSavedAt };
    if (hasWorkoutProgress(currentDraft) && !replace) {
      if (!window.confirm('Remplacer le brouillon en cours ? Il sera effacé de cet appareil.')) return;
      clearWorkoutDraft();
      setRestoredDraft(false);
    }
    if (value.startsWith('c:')) {
      const tpl = (templates as any[]).find((t: any) => t.id === value.slice(2));
      if (!tpl) return;
      setTemplateId(tpl.id);
      setType(tpl.type);
      setName(tpl.name);
      setDurationMinutes(tpl.durationMinutes ?? 60);
      setExercises((tpl.templateExercises ?? []).map((e: any) => ({
        _id: e.id || newId(),
        templateExerciseId: e.id,
        performedSets: [],
        name: e.name, sets: e.sets ?? null, reps: e.reps ?? null, weight: e.weight ?? null,
        restSeconds: e.restSeconds ?? null, durationSeconds: e.durationSeconds ?? null,
        distanceKm: e.distanceKm ?? null, avgSpeedKmh: e.avgSpeedKmh ?? null, notes: e.notes ?? null,
      })));
    } else {
      setTemplateId(null);
      setType(value.slice(2));
      setName('');
      setExercises([]);
    }
  };

  useEffect(() => {
    if (restoredDraft) return;
    if (!requestedTemplate || initializedTemplate.current === requestedTemplate) return;
    if (!(templates as any[]).some(t => t.id === requestedTemplate)) return;
    initializedTemplate.current = requestedTemplate;
    pick(`c:${requestedTemplate}`, true);
  }, [requestedTemplate, templates]);

  useEffect(() => {
    const draft: WorkoutDraft = {
      date, type, templateId, name, durationMinutes, notes, exercises,
      savedAt: new Date().toISOString(),
    };
    if (!hasWorkoutProgress(draft)) {
      clearWorkoutDraft();
      setDraftSavedAt('');
      return;
    }
    const saved = writeWorkoutDraft(draft);
    setDraftStorageError(!saved);
    if (saved) setDraftSavedAt(draft.savedAt);
  }, [date, type, templateId, name, durationMinutes, notes, exercises]);

  const addEx = (data: Omit<DraftEx, '_id' | 'performedSets'>) => { setExercises(xs => [...xs, { ...data, performedSets: [], _id: newId() }]); setShowAdd(false); };
  const updateEx = (id: string, data: any) => setExercises(xs => xs.map(x => x._id === id ? { ...x, ...data, _id: id } : x));
  const deleteEx = (id: string) => setExercises(xs => xs.filter(x => x._id !== id));

  const reset = () => {
    clearWorkoutDraft();
    setRestoredDraft(false);
    setTemplateId(null); setType('pecs_triceps'); setName(''); setDurationMinutes(60); setDate(today);
    setNotes(''); setExercises([]); setShowAdd(false);
  };

  const validate = useMutation({
    mutationFn: async () => {
      return api.post('/sport/sessions', {
        name: name.trim() || cfg.label, type, date,
        durationMinutes, notes: notes.trim() || undefined, templateId: templateId || undefined,
        exercises: exercises.filter(ex => ex.performedSets.length > 0 ||
          type === 'cardio' && (ex.durationSeconds || ex.distanceKm)).map(ex => ({
          name: ex.name,
          templateExerciseId: ex.templateExerciseId,
          performedSets: ex.performedSets.length ? ex.performedSets : undefined,
          restSeconds: ex.restSeconds ?? undefined,
          durationSeconds: type === 'cardio' ? ex.durationSeconds ?? undefined : undefined,
          distanceKm: type === 'cardio' ? ex.distanceKm ?? undefined : undefined,
          avgSpeedKmh: type === 'cardio' ? ex.avgSpeedKmh ?? undefined : undefined,
          notes: ex.notes ?? undefined,
        })),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sessions'] });
      qc.invalidateQueries({ queryKey: ['sport-stats'] });
      qc.invalidateQueries({ queryKey: ['strength-progress'] });
      reset();
    },
  });
  const hasPerformance = exercises.some(ex => ex.performedSets.length > 0 ||
    type === 'cardio' && (ex.durationSeconds || ex.distanceKm));
  const isValid = Boolean(date) && hasPerformance && exercises.every(ex => validSets(ex.performedSets)) &&
    Number.isFinite(durationMinutes) && durationMinutes >= 1;
  const saveError = validate.error instanceof AxiosError ? validate.error.response?.data?.message : undefined;

  return (
    <div className="page sdj">
      <div className="page-header">
        <div>
          <h1 className="page-title">Préparer une séance</h1>
          <p className="page-sub" style={{ textTransform: 'capitalize' }}>{dateLabel}</p>
        </div>
      </div>

      {hasDraft && (
        <div className="draft-status" role="status">
          <div><strong>{restoredDraft ? 'Brouillon repris' : 'Brouillon en cours'}</strong><span>Enregistré sur cet appareil{draftSavedAt ? ` · ${new Date(draftSavedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}` : ''}</span></div>
          <button type="button" className="quiet-link" onClick={() => {
            if (!window.confirm('Effacer ce brouillon ? Cette action est définitive.')) return;
            reset();
          }}>Effacer</button>
        </div>
      )}
      {draftStorageError && <p className="feedback-error" role="alert">La sauvegarde locale est indisponible sur cet appareil. Garde cette page ouverte jusqu’à l’enregistrement.</p>}

      {/* Choix de la séance */}
      <div className="card sdj-card">
        <label htmlFor="session-choice" className="sdj-label">Quelle séance aujourd'hui ?</label>
        <select
          id="session-choice"
          className="food-input sdj-select"
          value={templateId ? `c:${templateId}` : `t:${type}`}
          onChange={e => pick(e.target.value)}
        >
          {templates.length > 0 && (
            <optgroup label="Mes contrats">
              {(templates as any[]).map((t: any) => (
                <option key={t.id} value={`c:${t.id}`}>{t.name} (×{t.weeklyTarget ?? 1}/sem)</option>
              ))}
            </optgroup>
          )}
          <optgroup label="Type libre (hors contrat)">
            {Object.entries(TYPE_CONFIG).map(([v, { label }]) => <option key={v} value={`t:${v}`}>{label}</option>)}
          </optgroup>
        </select>

        <div className="sdj-meta">
          <div className={`sess-icon ${cfg.color}`}><i className={`ti ${cfg.icon}`} /></div>
          <input aria-label="Nom de la séance" className="food-input" placeholder="Nom de la séance" value={name} onChange={e => setName(e.target.value)} style={{ flex: 1 }} />
          <label className="duration-field">Durée (min)<input className="food-input" type="number" min="1" value={durationMinutes} onChange={e => setDurationMinutes(Number(e.target.value))} /></label>
        </div>
        <label className="duration-field session-date-field">Date de la séance<input className="food-input" type="date" value={date} onChange={e => setDate(e.target.value)} required /></label>
      </div>

      {/* Exercices (adaptables) */}
      <p className="section-head">Exercices {exercises.length > 0 && `· ${exercises.length}`}</p>
      <p className="set-hint">Les charges affichées sont des repères. Ajoute les séries que tu as vraiment réalisées ; les exercices sans série ne seront pas enregistrés (sauf les efforts cardio renseignés).</p>
      <div className="card">
        {exercises.length === 0 && <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: 0 }}>Choisis un contrat pour importer ses exercices, ou ajoute-les un par un.</p>}
        {exercises.map((ex, i) => (
          <div key={ex._id}>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: 2 }}>Exercice {i + 1}</div>
            <ExerciseRow ex={ex} sessionType={type} onUpdate={d => updateEx(ex._id, d)} onDelete={() => deleteEx(ex._id)} />
            {ex.templateExerciseId && (() => {
              const last = history.data?.filter(s => s.date <= today)
                .sort((a, b) => b.date.localeCompare(a.date))
                .flatMap(s => s.exercises)
                .find(e => e.templateExerciseId === ex.templateExerciseId && e.performedSets?.length);
              return last?.performedSets && <p className="last-performance">Dernières séries : {last.performedSets.map(s =>
                `${s.reps} reps${s.weight == null ? '' : ` à ${s.weight} kg`}`).join(' · ')}</p>;
            })()}
            {type !== 'cardio' && <SetTracker name={ex.name} value={ex.performedSets}
              onChange={performedSets => updateEx(ex._id, { performedSets })} />}
          </div>
        ))}
        {history.isError && <p role="alert" className="feedback-error">L’historique des séries n’a pas pu être chargé.
          <button type="button" onClick={() => history.refetch()}>Réessayer</button>
        </p>}

        <div style={{ marginTop: 10 }}>
          {showAdd ? (
            <ExForm sessionType={type} onSave={addEx} onCancel={() => setShowAdd(false)} />
          ) : (
            <button className="sdj-addbtn" onClick={() => setShowAdd(true)}>
              <i className="ti ti-plus" /> Ajouter un {type === 'cardio' ? 'effort cardio' : 'exercice'}
            </button>
          )}
        </div>
      </div>

      {/* Notes + validation */}
      <label className="notes-field">Notes de séance (facultatif)<textarea className="food-input" placeholder="Comment tu t’es senti ? Une note à garder ?" value={notes} onChange={e => setNotes(e.target.value)} rows={3} /></label>

      {validate.isError && <p className="feedback-error" role="alert">{typeof saveError === 'string' ? saveError : 'Enregistrement impossible. Tes saisies sont conservées ; vérifie la connexion et réessaie.'}</p>}
      {validate.isSuccess && <p role="status" className="save-success">Séance enregistrée avec ses séries. Retrouve-la dans ton carnet Sport.</p>}
      <button className="sdj-validate" onClick={() => validate.mutate()} disabled={validate.isPending || !isValid}>
        {validate.isPending
          ? <><i className="ti ti-loader-2 spin" /> Enregistrement…</>
          : <><i className="ti ti-circle-check" /> Valider la séance</>}
      </button>
      <p className="sdj-hint">{dateLabel ? `La séance sera enregistrée au ${dateLabel} et apparaîtra dans ta vue semaine et tes stats.` : 'Choisis une date pour enregistrer ta séance.'}</p>
    </div>
  );
}
