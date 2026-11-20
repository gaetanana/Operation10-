import { useEffect, useRef, useState } from 'react';
import { useProgram, WorkoutPlan } from '../services/training';
import { planTitle } from '../utils/trainingProgress';
import WorkoutEditor from './WorkoutEditor';

export default function ModulePicker({ onPick, onClose, remaining }: {
  onPick: (plan: WorkoutPlan) => void; onClose: () => void; remaining: number;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const program = useProgram();
  const [creating, setCreating] = useState(false);
  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);
  return <>
    <dialog ref={dialog} className="training-dialog" aria-labelledby="module-picker-title" onCancel={onClose}>
      <header className="dialog-heading"><div><p className="kicker">EN COMPLÉMENT</p><h2 id="module-picker-title">Ajouter un module.</h2></div>
        <button className="icon-button" aria-label="Fermer" onClick={onClose}><i className="ti ti-x" /></button></header>
      <p className="muted">Les efforts du module seront enregistrés dans cette séance, sans créer une séance supplémentaire.</p>
      {program.isPending && <p role="status">Chargement des modules…</p>}
      {program.isError && <p className="training-error" role="alert">Impossible de charger les modules.<button onClick={() => program.refetch()}>Réessayer</button></p>}
      <div className="module-options">{program.data?.modules.map(plan => <button className="module-option" key={plan.key} disabled={plan.exercises.length > remaining}
        onClick={() => onPick(plan)}><span><strong>{planTitle(plan.name)}</strong><small>{plan.exercises.length} exercices{plan.exercises.length > remaining ? ' · limite de la séance atteinte' : ''}</small></span><i className="ti ti-plus" /></button>)}</div>
      {program.data?.modules.length === 0 && <p className="muted">Pas encore de module. Crée par exemple un EMOM ou une sortie course à pied.</p>}
      <footer className="dialog-actions"><button className="button button-quiet" onClick={onClose}>Fermer</button><button className="button button-primary" onClick={() => setCreating(true)}><i className="ti ti-plus" /> Créer un module</button></footer>
    </dialog>
    {creating && <WorkoutEditor role="module" onClose={() => setCreating(false)} />}
  </>;
}
