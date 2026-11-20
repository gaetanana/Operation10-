import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import type { NutritionValues } from '../utils/nutrition';

type Shaker = NutritionValues & { name: string; quantityGrams: number; proteins: number };
type Routine = {
  shaker: Shaker | null;
  creatineGrams: number | null;
  lastCreatineGrams: number | null;
  shakers: (NutritionValues & { id: string; routineSlot: number; name: string })[];
};
type ShakerForm = Record<keyof Shaker, string>;
const labels = { calories: 'Calories (kcal)', proteins: 'Protéines (g)', carbs: 'Glucides (g)', fats: 'Lipides (g)' };
const text = (value: number | null) => value == null ? '' : String(value);

export default function NutritionRoutine({ date, disabled }: { date: string; disabled: boolean }) {
  const qc = useQueryClient();
  const [shakerForm, setShakerForm] = useState<ShakerForm | null>(null);
  const [creatine, setCreatine] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const query = useQuery<Routine>({
    queryKey: ['nutrition-routine', date],
    queryFn: () => api.get('/nutrition/routine', { params: { date } }).then(r => r.data),
  });
  const refresh = () => {
    for (const key of ['nutrition-routine', 'meals', 'totals', 'nutrition-week', 'nutrition-recent']) {
      qc.invalidateQueries({ queryKey: [key] });
    }
    setError('');
  };
  const failed = () => {
    refresh();
    setError('Enregistrement non confirmé. Vérifie ta connexion puis réessaie : une même prise de shaker ne sera pas ajoutée deux fois.');
  };
  const configure = useMutation({
    mutationFn: (shaker: Shaker) => api.patch('/nutrition/routine/shaker', shaker),
    onSuccess: () => { refresh(); setShakerForm(null); setMessage('Portion enregistrée pour les prochaines prises. Les prises déjà notées ne changent pas.'); },
    onError: failed,
  });
  const confirm = useMutation({
    mutationFn: ({ slot, taken }: { slot: number; taken: boolean }) => api.patch(`/nutrition/routine/shakers/${slot}`, { date, taken }),
    onSuccess: () => { refresh(); setMessage('Prise de shaker mise à jour.'); },
    onError: failed,
  });
  const saveCreatine = useMutation({
    mutationFn: (grams: number) => api.patch('/nutrition/routine/creatine', { date, grams }),
    onSuccess: () => { refresh(); setCreatine(null); setMessage('Prise de créatine enregistrée, séparément des macros.'); },
    onError: failed,
  });
  const clearCreatine = useMutation({
    mutationFn: () => api.delete('/nutrition/routine/creatine', { params: { date } }),
    onSuccess: () => { refresh(); setCreatine(null); setMessage('Prise de créatine retirée.'); },
    onError: failed,
  });
  const data = query.data;
  const pending = disabled || configure.isPending || confirm.isPending || saveCreatine.isPending || clearCreatine.isPending;
  const valid = shakerForm && shakerForm.name.trim() && Number(shakerForm.quantityGrams) > 0 &&
    shakerForm.proteins !== '' && Number(shakerForm.proteins) >= 0 &&
    Object.entries(shakerForm).every(([key, value]) => key === 'name' || (value === '' ? key !== 'quantityGrams' && key !== 'proteins' : Number.isFinite(Number(value)) && Number(value) >= 0));
  const startConfiguration = () => {
    const shaker = data?.shaker;
    setShakerForm({
      name: shaker?.name ?? 'Mon shaker', quantityGrams: shaker ? String(shaker.quantityGrams) : '',
      proteins: shaker ? String(shaker.proteins) : '', calories: text(shaker?.calories ?? null),
      carbs: text(shaker?.carbs ?? null), fats: text(shaker?.fats ?? null),
    });
  };
  return <section className="nutrition-panel nutrition-routine" aria-labelledby="routine-title">
    <div className="nutrition-panel-heading"><h2 id="routine-title">Ma routine</h2>{data && <button className="text-button" disabled={pending} onClick={startConfiguration}>{data.shaker ? 'Régler mon shaker' : 'Configurer mon shaker'}</button>}</div>
    {query.isPending ? <p role="status">Chargement des prises…</p> : query.isError ? <p className="feedback-error" role="alert">Impossible de charger la routine. <button onClick={() => query.refetch()}>Réessayer</button></p> : data && <>
      {shakerForm && <form className="nutrition-form" onSubmit={event => {
        event.preventDefault();
        if (!valid) return;
        const nullable = (value: string) => value === '' ? null : Number(value);
        configure.mutate({ name: shakerForm.name.trim(), quantityGrams: Number(shakerForm.quantityGrams), proteins: Number(shakerForm.proteins), calories: nullable(shakerForm.calories), carbs: nullable(shakerForm.carbs), fats: nullable(shakerForm.fats) });
      }}>
        <p className="nutrition-hint">Recopie les valeurs de l’étiquette pour <strong>une portion réellement préparée</strong>, lait compris si nécessaire. 30 g de poudre ne signifient pas forcément 30 g de protéines.</p>
        <label>Produit / préparation<input value={shakerForm.name} maxLength={100} onChange={e => setShakerForm({ ...shakerForm, name: e.target.value })} required /></label>
        <label>Poudre par shaker (g)<input type="number" min="0.1" step="any" value={shakerForm.quantityGrams} onChange={e => setShakerForm({ ...shakerForm, quantityGrams: e.target.value })} required /></label>
        <div className="nutrition-fields">{(Object.keys(labels) as (keyof NutritionValues)[]).map(key => <label key={key}>{labels[key]} par shaker<input type="number" min="0" step="any" required={key === 'proteins'} value={shakerForm[key]} onChange={e => setShakerForm({ ...shakerForm, [key]: e.target.value })} /></label>)}</div>
        <p className="nutrition-hint">Protéines requises ; laisse les autres valeurs vides si inconnues, pas à zéro.</p>
        <div className="nutrition-actions"><button className="button button-primary" disabled={!valid || pending}>Enregistrer la portion</button><button type="button" className="button" disabled={pending} onClick={() => setShakerForm(null)}>Annuler</button></div>
      </form>}
      {!data.shaker && <p className="nutrition-hint">Configure ta portion une fois, puis confirme chaque shaker après l’avoir pris.</p>}
      {data.shaker && <p className="nutrition-hint">{data.shaker.name} · {data.shaker.quantityGrams} g de poudre · {data.shaker.proteins} g de protéines par prise configurée.</p>}
      <div className="nutrition-shakers">{[1, 2].map(slot => {
        const taken = data.shakers.find(meal => meal.routineSlot === slot);
        return <div key={slot}><strong>Shaker {slot}</strong><span>{taken ? `${taken.proteins == null ? 'Protéines non renseignées' : `${taken.proteins} g de protéines`} · enregistré` : 'Pas encore renseigné'}</span><button className="button" disabled={pending || (!taken && !data.shaker)} aria-pressed={Boolean(taken)} onClick={() => confirm.mutate({ slot, taken: !taken })}>{taken ? 'Annuler la prise' : 'Confirmer la prise'}</button></div>;
      })}</div>
      <div className="nutrition-creatine"><div><strong>Créatine</strong><p>{data.creatineGrams == null ? 'Pas encore renseignée' : `${data.creatineGrams} g enregistrés`}</p></div>
        {creatine === null ? <button className="button" disabled={pending} onClick={() => setCreatine(text(data.creatineGrams ?? data.lastCreatineGrams))}>{data.creatineGrams == null ? 'Noter ma prise' : 'Modifier'}</button> :
          <form className="nutrition-actions" onSubmit={event => { event.preventDefault(); if (creatine !== '' && Number.isFinite(Number(creatine)) && Number(creatine) >= 0) saveCreatine.mutate(Number(creatine)); }}>
            <label className="nutrition-select">Total pris ce jour (g)<input type="number" min="0" step="any" value={creatine} onChange={e => setCreatine(e.target.value)} required /></label><button className="button" disabled={pending || creatine === '' || !Number.isFinite(Number(creatine)) || Number(creatine) < 0}>Enregistrer la prise</button><button className="text-button" type="button" disabled={pending} onClick={() => setCreatine(null)}>Annuler</button>
          </form>}
        {data.creatineGrams != null && <button className="text-button" disabled={pending} onClick={() => clearCreatine.mutate()}>Retirer la prise</button>}
      </div>
      <p className="nutrition-hint">La créatine est suivie à part, sans calories ni protéines ajoutées. Quantité saisie, pas dose recommandée. Rien n’est coché automatiquement.</p>
    </>}
    {message && <p className="nutrition-message" role="status">{message}</p>}
    {error && <p className="feedback-error" role="alert">{error}</p>}
  </section>;
}
