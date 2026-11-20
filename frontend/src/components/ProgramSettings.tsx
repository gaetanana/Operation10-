import { FormEvent, useEffect, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { apiError, CurrentProgram } from '../services/training';
import { planTitle } from '../utils/trainingProgress';

export default function ProgramSettings({ program, onClose }: { program: CurrentProgram; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [sessionKeys, setSessions] = useState(program.sessions.map(plan => plan.key));
  const [moduleKeys, setModules] = useState(program.modules.map(plan => plan.key));
  const [minimum, setMinimum] = useState(program.weeklyMinimum);
  const [maximum, setMaximum] = useState(program.weeklyMaximum);
  const queryClient = useQueryClient();
  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);
  const save = useMutation({
    mutationFn: () => api.patch('/sport/program', {
      sessionKeys, moduleKeys, weeklyMinimum: minimum, weeklyMaximum: maximum,
    }),
    onSuccess: async () => {
      await Promise.all(['personal-program', 'templates'].map(key =>
        queryClient.invalidateQueries({ queryKey: [key] })));
      onClose();
    },
  });
  const chooseRole = (key: string, role: string) => {
    setSessions(current => role === 'session' && !current.includes(key)
      ? [...current, key] : role !== 'session' ? current.filter(id => id !== key) : current);
    setModules(current => role === 'module' && !current.includes(key)
      ? [...current, key] : role !== 'module' ? current.filter(id => id !== key) : current);
  };
  const valid = sessionKeys.length > 0 && minimum >= 1 && maximum <= 7 && minimum <= maximum;
  const submit = (event: FormEvent) => { event.preventDefault(); if (valid) save.mutate(); };
  const ordered = [...sessionKeys, ...program.library.map(plan => plan.key).filter(key => !sessionKeys.includes(key))];

  return <dialog ref={dialog} className="training-dialog" aria-labelledby="program-settings-title" onCancel={event => {
    if (save.isPending) event.preventDefault(); else onClose();
  }}>
    <form onSubmit={submit}>
      <header className="dialog-heading"><div><p className="kicker">TON PROGRAMME COURANT</p><h2 id="program-settings-title">Un cadre, pas un calendrier.</h2></div>
        <button type="button" className="icon-button" aria-label="Fermer" disabled={save.isPending} onClick={onClose}><i className="ti ti-x" /></button></header>
      <p className="muted">Choisis les séances à retrouver chaque semaine et tes modules complémentaires. Rien n’est imposé à un jour précis. Retirer un modèle d’ici ne supprime ni ce modèle ni son historique.</p>
      <fieldset className="program-editor-fields" disabled={save.isPending}>
        <div className="program-metadata">
          <label>Minimum de séances / semaine<input type="number" required min="1" max="7" step="1" value={minimum} onChange={event => setMinimum(Number(event.target.value))} /></label>
          <label>Haut de ta fourchette<input type="number" required min={minimum} max="7" step="1" value={maximum} onChange={event => setMaximum(Number(event.target.value))} /></label>
        </div>
        <div className="program-selection">{ordered.map(key => {
          const plan = program.library.find(candidate => candidate.key === key);
          if (!plan) return null;
          const position = sessionKeys.indexOf(key);
          const role = position >= 0 ? 'session' : moduleKeys.includes(key) ? 'module' : 'library';
          return <div className="program-selection-row" key={key}>
            <div><strong>{planTitle(plan.name)}</strong><small>{plan.exercises.length} exercices</small></div>
            <select aria-label={`Place de ${planTitle(plan.name)}`} value={role} onChange={event => chooseRole(key, event.target.value)}>
              <option value="session">Séance du programme</option><option value="module">Module complémentaire</option><option value="library">Bibliothèque uniquement</option>
            </select>
            {position >= 0 && <button type="button" className="icon-button" aria-label={`Remonter ${planTitle(plan.name)}`} disabled={position === 0} onClick={() => setSessions(current => {
              const next = [...current]; [next[position - 1], next[position]] = [next[position], next[position - 1]]; return next;
            })}><i className="ti ti-arrow-up" /></button>}
          </div>;
        })}</div>
      </fieldset>
      {!valid && <p className="training-error" role="alert">Garde au moins une séance dans le programme et une fourchette valide entre 1 et 7.</p>}
      {save.isError && <p className="training-error" role="alert">{apiError(save.error, 'Impossible de modifier le programme. Tes choix sont conservés.')}</p>}
      <footer className="dialog-actions"><button type="button" className="button button-quiet" onClick={onClose} disabled={save.isPending}>Annuler</button>
        <button className="button button-primary" disabled={save.isPending || !valid}>{save.isPending ? 'Enregistrement…' : 'Enregistrer mon programme'}</button></footer>
    </form>
  </dialog>;
}
