import { FormEvent, useEffect, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { apiError, ProgramExercise, WorkoutPlan } from '../services/training';
import { TYPE_CONFIG } from '../pages/SportPage';
import { planTitle } from '../utils/trainingProgress';

export default function WorkoutEditor({ plan, role = 'session', onClose }: {
  plan?: WorkoutPlan; role?: 'session' | 'module'; onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [name, setName] = useState(plan?.name ?? '');
  const [type, setType] = useState(plan?.type ?? (role === 'module' ? 'emom' : 'other'));
  const [weeklyTarget, setWeeklyTarget] = useState(plan?.weeklyTarget ?? 1);
  const [description, setDescription] = useState(plan?.description ?? '');
  const [exercises, setExercises] = useState<ProgramExercise[]>(plan?.exercises.map(e => ({ ...e })) ?? [{ name: '' }]);
  const queryClient = useQueryClient();
  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);
  const mutation = useMutation({
    mutationFn: async () => {
      const body = { name: name.trim(), type, weeklyTarget, description, exercises };
      if (plan) return (await api.patch<WorkoutPlan>(`/sport/program/${plan.key}`, body)).data;
      return (await api.post<WorkoutPlan>('/sport/program/templates', { ...body, role })).data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['personal-program'] });
      await queryClient.invalidateQueries({ queryKey: ['templates'] });
      onClose();
    },
  });
  const change = (index: number, patch: Partial<ProgramExercise>) =>
    setExercises(current => current.map((e, i) => i === index ? { ...e, ...patch } : e));
  const number = (value: string) => value === '' ? undefined : Number(value);
  const submit = (event: FormEvent) => { event.preventDefault(); mutation.mutate(); };

  return (
    <dialog ref={dialog} className="training-dialog" aria-labelledby="program-editor-title" onCancel={event => {
      if (mutation.isPending) event.preventDefault(); else onClose();
    }}>
      <form onSubmit={submit}>
        <header className="dialog-heading">
          <div><p className="kicker">{role === 'module' ? 'MODULE COMPLÉMENTAIRE' : 'SÉANCE DU PROGRAMME'}</p><h2 id="program-editor-title">{plan ? planTitle(plan.name) : role === 'module' ? 'Nouveau module' : 'Nouvelle séance'}</h2></div>
          <button type="button" className="icon-button" aria-label="Fermer" onClick={onClose} disabled={mutation.isPending}><i className="ti ti-x" /></button>
        </header>
        <p className="muted">Tes repères pour les prochaines séances. Les performances déjà enregistrées ne changent pas.</p>
        <fieldset disabled={mutation.isPending} className="program-editor-fields">
          <div className="program-metadata">
            <label>Nom<input required maxLength={150} value={name} onChange={event => setName(event.target.value)} /></label>
            <label>Activité<select value={type} onChange={event => setType(event.target.value)}>
              {Object.entries(TYPE_CONFIG).map(([value, config]) => <option key={value} value={value}>{config.label}</option>)}
            </select></label>
            {role === 'session' && <label>Objectif · fois par semaine<input type="number" min="1" max="7" step="1" required value={weeklyTarget} onChange={event => setWeeklyTarget(Number(event.target.value))} /></label>}
            <label>Repères / description<input value={description} onChange={event => setDescription(event.target.value)} /></label>
          </div>
          {exercises.map((ex, index) => (
            <section className="program-edit-exercise" key={index}>
              <div className="edit-exercise-name"><span>{String(index + 1).padStart(2, '0')}</span>
                <input aria-label={`Nom de l’exercice ${index + 1}`} required maxLength={150} value={ex.name} onChange={e => change(index, { name: e.target.value })} />
                <button type="button" className="icon-button" aria-label={`Remonter ${ex.name}`} disabled={index === 0} onClick={() => setExercises(current => {
                  const next = [...current]; [next[index - 1], next[index]] = [next[index], next[index - 1]]; return next;
                })}><i className="ti ti-arrow-up" /></button>
                <button type="button" className="icon-button" aria-label={`Retirer ${ex.name}`} disabled={exercises.length === 1}
                  onClick={() => setExercises(current => current.filter((_, i) => i !== index))}><i className="ti ti-trash" /></button>
              </div>
              <div className="program-edit-numbers">
                <label>Charge · kg<input type="number" min="0" step="0.5" value={ex.weight ?? ''} placeholder="Libre" onChange={e => change(index, { weight: number(e.target.value) })} /></label>
                <label>Séries<input type="number" min="1" max="100" step="1" value={ex.sets ?? ''} placeholder="Libre" onChange={e => change(index, { sets: number(e.target.value) })} /></label>
                <label>Répétitions<input type="number" min="1" max="1000" step="1" value={ex.reps ?? ''} placeholder="Libre" onChange={e => change(index, { reps: number(e.target.value) })} /></label>
                <label>Durée · sec<input type="number" min="1" step="1" value={ex.durationSeconds ?? ''} placeholder="Facultatif" onChange={e => change(index, { durationSeconds: e.target.value === '' ? null : Number(e.target.value) })} /></label>
                <label>Repos · sec<input type="number" min="0" step="1" value={ex.restSeconds ?? ''} placeholder="90" onChange={e => change(index, { restSeconds: number(e.target.value) })} /></label>
                <label>Distance · km<input type="number" min="0" step="0.01" value={ex.distanceKm ?? ''} placeholder="Facultatif" onChange={e => change(index, { distanceKm: number(e.target.value) })} /></label>
              </div>
              <label className="edit-note">Consigne<input value={ex.notes ?? ''} placeholder="Tempo, objectif, finisher…" onChange={e => change(index, { notes: e.target.value })} /></label>
            </section>
          ))}
          <button type="button" className="button button-quiet" disabled={exercises.length >= 30}
            onClick={() => setExercises(current => [...current, { name: '' }])}><i className="ti ti-plus" aria-hidden="true" /> Ajouter un exercice</button>
        </fieldset>
        {mutation.isError && <p className="training-error" role="alert">{apiError(mutation.error, 'Modification impossible. Tes saisies sont conservées. Réessaie.')}</p>}
        <footer className="dialog-actions">
          <button type="button" className="button button-quiet" disabled={mutation.isPending} onClick={onClose}>Annuler</button>
          <button className="button button-primary" disabled={mutation.isPending || !name.trim()}>{mutation.isPending ? 'Enregistrement…' : 'Enregistrer'}</button>
        </footer>
      </form>
    </dialog>
  );
}
