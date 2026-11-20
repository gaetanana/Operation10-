import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { summarizeValues } from '../utils/nutrition';
import type { NutritionValues } from '../utils/nutrition';

export default function NutritionProteinSummary({ entries, goal, onRetry, goalsError, goalsLoading }: {
  entries: (NutritionValues & { source: string | null })[];
  goal: number | null;
  goalsError: boolean;
  goalsLoading: boolean;
  onRetry: () => void;
}) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [target, setTarget] = useState('');
  const summary = summarizeValues(entries, 'proteins');
  const estimated = entries.some(entry => entry.source === 'photo');
  const value = Math.round(summary.value * 10) / 10;
  const save = useMutation({
    mutationFn: (proteinsGoal: number | null) => api.patch('/nutrition/goals', { proteinsGoal }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['nutrition-goals'] }); setEditing(false); },
  });
  return <section className="nutrition-protein" aria-labelledby="protein-title">
    <div><h2 id="protein-title">Mes protéines</h2><strong>{summary.known ? `${estimated ? '≈ ' : ''}${value} g` : 'Non renseigné'}</strong>
      {goal != null && <p>Repère personnel : {goal} g{summary.complete && summary.value < goal ? ` · écart indicatif : ${Math.round((goal - summary.value) * 10) / 10} g` : ''}</p>}
      {goal != null && goal > 0 && summary.complete && <progress aria-label="Protéines enregistrées par rapport au repère personnel" max={goal} value={Math.min(goal, summary.value)} />}
      <p className="nutrition-hint">{!summary.complete && entries.length > 0 ? 'Total partiel : certaines protéines ne sont pas renseignées. ' : ''}{estimated ? 'Contient des estimations photo. ' : ''}Bilan des entrées notées, pas une garantie que toute ta journée est renseignée.</p>
    </div>
    {goalsLoading ? <p>Chargement du repère…</p> : goalsError ? <p className="feedback-error" role="alert">Repère indisponible. <button onClick={onRetry}>Réessayer</button></p> : editing ? <form className="nutrition-form" onSubmit={e => {
      e.preventDefault();
      if (target === '' || (Number.isFinite(Number(target)) && Number(target) > 0)) save.mutate(target === '' ? null : Number(target));
    }}><label>Mon repère protéines (g / jour)<input type="number" min="0.1" step="any" value={target} onChange={e => setTarget(e.target.value)} /></label><small>Facultatif, sans calcul automatique. Vide pour supprimer.</small><div className="nutrition-actions"><button className="button" disabled={save.isPending || (target !== '' && (!Number.isFinite(Number(target)) || Number(target) <= 0))}>Enregistrer le repère</button><button type="button" className="text-button" disabled={save.isPending} onClick={() => setEditing(false)}>Annuler</button></div>{save.isError && <p className="feedback-error" role="alert">Le repère n’a pas pu être enregistré. Réessaie.</p>}</form> :
      <button className="button" onClick={() => { setTarget(goal == null ? '' : String(goal)); setEditing(true); }}>{goal == null ? 'Définir mon repère protéines' : 'Modifier mon repère protéines'}</button>}
  </section>;
}
