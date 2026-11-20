import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { localDate, nutrients, offsetDate, scaleValues, summarizeValues, weekStart, parsePhotoFood } from '../utils/nutrition';
import type { NutritionValues, Nutrient, PhotoItem } from '../utils/nutrition';
import NutritionRoutine from '../components/NutritionRoutine';
import NutritionProteinSummary from '../components/NutritionProteinSummary';
import '../styles/nutrition.css';

type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';
type Source = 'manual' | 'search' | 'photo' | null;
type Meal = NutritionValues & {
  id: string; date: string; name: string; mealType: MealType;
  quantityGrams: number | null; source: Source; items?: unknown[] | null;
  routineSlot?: number | null;
};
type Entry = Omit<Meal, 'id' | 'date' | 'routineSlot'>;
type Favorite = { id: string; name: string; entries: Entry[] };
type Goals = { caloriesGoal: number | null; proteinsGoal: number | null };
type Food = NutritionValues & { name: string };
type Form = { name: string; mealType: MealType; quantityGrams: string; source: Source } & Record<Nutrient, string>;
type PhotoResult = { type: 'multiple'; items: PhotoItem[] } | { type: 'single'; item: PhotoItem; portionNote: string };

const mealTypes: { value: MealType; label: string }[] = [
  { value: 'breakfast', label: 'Petit-déjeuner' }, { value: 'lunch', label: 'Déjeuner' },
  { value: 'dinner', label: 'Dîner' }, { value: 'snack', label: 'Collations' },
];
const labels: Record<Nutrient, string> = { calories: 'Calories', proteins: 'Protéines', carbs: 'Glucides', fats: 'Lipides' };
const units: Record<Nutrient, string> = { calories: 'kcal', proteins: 'g', carbs: 'g', fats: 'g' };
const sources: Record<Exclude<Source, null>, string> = { manual: 'Saisie manuelle', search: 'Open Food Facts', photo: 'Estimation photo' };
const emptyForm = (mealType: MealType = 'lunch'): Form => ({
  name: '', mealType, quantityGrams: '', source: 'manual', calories: '', proteins: '', carbs: '', fats: '',
});
const str = (value: number | null | undefined) => value == null ? '' : String(value);
const display = (value: number) => String(Math.round(value * 10) / 10);
const formFromEntry = (entry: Entry): Form => ({
  name: entry.name, mealType: entry.mealType, quantityGrams: str(entry.quantityGrams), source: entry.source,
  calories: str(entry.calories), proteins: str(entry.proteins), carbs: str(entry.carbs), fats: str(entry.fats),
});
const entryFromForm = (form: Form): Omit<Entry, 'items'> => ({
  name: form.name.trim(), mealType: form.mealType, source: form.source,
  quantityGrams: form.quantityGrams === '' ? null : Number(form.quantityGrams),
  calories: form.calories === '' ? null : Number(form.calories),
  proteins: form.proteins === '' ? null : Number(form.proteins),
  carbs: form.carbs === '' ? null : Number(form.carbs),
  fats: form.fats === '' ? null : Number(form.fats),
});
const validForm = (form: Form) => form.name.trim() !== '' &&
  nutrients.every(key => form[key] === '' || (Number.isFinite(Number(form[key])) && Number(form[key]) >= 0)) &&
  (form.quantityGrams === '' || (Number.isFinite(Number(form.quantityGrams)) && Number(form.quantityGrams) > 0));

async function prepareImage(file: File): Promise<Blob> {
  if (file.size <= 2_800_000) return file;
  let bitmap: ImageBitmap;
  try { bitmap = await createImageBitmap(file); }
  catch { throw new Error('Photo trop volumineuse : choisis une image plus légère.'); }
  try {
    let scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
    for (let attempt = 0; attempt < 6; attempt++) {
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Impossible de préparer la photo.');
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', Math.max(0.45, 0.82 - attempt * 0.08)));
      if (!blob) throw new Error('Impossible de préparer la photo.');
      if (blob.size <= 2_800_000) return blob;
      scale *= 0.75;
    }
  } finally { bitmap.close(); }
  throw new Error('Photo trop volumineuse après compression. Choisis une image plus légère.');
}

function summaryText(entries: NutritionValues[], nutrient: Nutrient) {
  const summary = summarizeValues(entries, nutrient);
  if (!summary.known) return 'Non renseigné';
  return `${display(summary.value)} ${units[nutrient]}${summary.complete ? '' : ' · partiel'}`;
}

function MealForm({ form, setForm, onSubmit, onCancel, pending, submitLabel }: {
  form: Form; setForm: (form: Form) => void; onSubmit: () => void; onCancel: () => void; pending: boolean; submitLabel: string;
}) {
  const quantityBase = useRef<{ grams: number; values: NutritionValues } | null>(null);
  return <form className="nutrition-form" onSubmit={event => { event.preventDefault(); if (validForm(form)) onSubmit(); }}>
    <label>Nom<input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required /></label>
    <label>Moment<select value={form.mealType} onChange={e => setForm({ ...form, mealType: e.target.value as MealType })}>
      {mealTypes.map(type => <option key={type.value} value={type.value}>{type.label}</option>)}
    </select></label>
    <label>Quantité (g), facultative<input type="number" min="0.1" step="any" value={form.quantityGrams} onFocus={() => {
      const grams = Number(form.quantityGrams);
      quantityBase.current = form.quantityGrams !== '' && grams > 0 ? { grams, values: entryFromForm(form) } : null;
    }} onBlur={() => { quantityBase.current = null; }} onChange={e => {
      const quantity = e.target.value;
      const next = Number(quantity);
      if (!quantityBase.current && form.quantityGrams !== '' && Number(form.quantityGrams) > 0) {
        quantityBase.current = { grams: Number(form.quantityGrams), values: entryFromForm(form) };
      }
      if (quantityBase.current && quantity !== '' && next > 0 && Number.isFinite(next)) {
        const scaled = scaleValues(quantityBase.current.values, next / quantityBase.current.grams);
        setForm({ ...form, quantityGrams: quantity, calories: str(scaled.calories), proteins: str(scaled.proteins), carbs: str(scaled.carbs), fats: str(scaled.fats) });
      } else if (quantityBase.current && quantity === '') {
        const values = quantityBase.current.values;
        setForm({ ...form, quantityGrams: quantity, calories: str(values.calories), proteins: str(values.proteins), carbs: str(values.carbs), fats: str(values.fats) });
      } else setForm({ ...form, quantityGrams: quantity });
    }} /></label>
    <div className="nutrition-fields">
      {nutrients.map(key => <label key={key}>{labels[key]} ({units[key]})<input type="number" min="0" step="any" value={form[key]} onChange={e => setForm({ ...form, [key]: e.target.value })} /></label>)}
    </div>
    <p className="nutrition-hint">Valeurs pour la portion indiquée. Laisse vide si tu ne sais pas ; zéro signifie une valeur connue.</p>
    <div className="nutrition-actions"><button className="button button-primary" disabled={!validForm(form) || pending}>{pending ? 'Enregistrement…' : submitLabel}</button><button type="button" className="button" onClick={onCancel} disabled={pending}>Annuler</button></div>
  </form>;
}

export default function NutritionPage() {
  const qc = useQueryClient();
  const [date, setDate] = useState(localDate);
  const [view, setView] = useState<'journal' | 'favorites' | 'trends'>('journal');
  const [addMode, setAddMode] = useState<'search' | 'photo' | 'manual' | 'recent' | null>(null);
  const [mealType, setMealType] = useState<MealType>('lunch');
  const [form, setForm] = useState<Form>(emptyForm());
  const [editing, setEditing] = useState<Meal | null>(null);
  const [copiedItems, setCopiedItems] = useState<unknown[] | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState<Food[]>([]);
  const [grams, setGrams] = useState('100');
  const [photoItems, setPhotoItems] = useState<PhotoItem[]>([]);
  const [photoSelected, setPhotoSelected] = useState<Set<number>>(new Set());
  const [photoIndex, setPhotoIndex] = useState<number | null>(null);
  const [portionNote, setPortionNote] = useState('');
  const [photoNote, setPhotoNote] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const addPanel = useRef<HTMLElement>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [favoriteName, setFavoriteName] = useState('');
  const [favoriteEntries, setFavoriteEntries] = useState<Entry[] | null>(null);
  const [goalForm, setGoalForm] = useState<{ calories: string; proteins: string } | null>(null);
  const [week, setWeek] = useState(() => weekStart(localDate()));
  const end = offsetDate(week, 6);

  const mealsQuery = useQuery<Meal[]>({ queryKey: ['meals', date], queryFn: () => api.get('/nutrition/meals', { params: { date } }).then(r => r.data) });
  const favQuery = useQuery<Favorite[]>({ queryKey: ['nutrition-favorites'], queryFn: () => api.get('/nutrition/favorites').then(r => r.data) });
  const recentQuery = useQuery<Entry[]>({ queryKey: ['nutrition-recent'], queryFn: () => api.get('/nutrition/recent').then(r => r.data) });
  const goalsQuery = useQuery<Goals>({ queryKey: ['nutrition-goals'], queryFn: () => api.get('/nutrition/goals').then(r => r.data) });
  const weekQuery = useQuery<Meal[]>({ queryKey: ['nutrition-week', week], queryFn: () => api.get('/nutrition/range', { params: { from: week, to: end } }).then(r => r.data), enabled: view === 'trends' });
  const meals = mealsQuery.data ?? [];
  const invalidateMeals = () => { qc.invalidateQueries({ queryKey: ['meals'] }); qc.invalidateQueries({ queryKey: ['totals'] }); qc.invalidateQueries({ queryKey: ['nutrition-recent'] }); qc.invalidateQueries({ queryKey: ['nutrition-week'] }); qc.invalidateQueries({ queryKey: ['nutrition-routine'] }); };
  const fail = () => setError('L’opération a échoué. Vérifie ta connexion et réessaie ; tes saisies sont conservées.');
  const save = useMutation({
    mutationFn: async ({ entry, existing }: { entry: Omit<Entry, 'items'>; existing: Meal | null }) => {
      if (existing) await api.patch(`/nutrition/meals/${existing.id}`, entry);
      else await api.post('/nutrition/meals', { ...entry, date, items: copiedItems });
    },
    onSuccess: () => {
      invalidateMeals(); setMessage(editing ? 'Entrée modifiée.' : 'Entrée ajoutée au journal.'); setError(''); setFormOpen(false); setEditing(null);
    }, onError: fail,
  });
  const remove = useMutation({ mutationFn: (id: string) => api.delete(`/nutrition/meals/${id}`), onSuccess: () => { invalidateMeals(); setMessage('Entrée supprimée.'); }, onError: fail });
  const duplicate = useMutation({ mutationFn: () => api.post('/nutrition/duplicate', { from: offsetDate(date, -1), to: date }), onSuccess: response => { invalidateMeals(); setMessage(response.data.length ? `${response.data.length} entrée(s) copiée(s).` : 'Aucune entrée la veille.'); }, onError: fail });
  const saveFavorite = useMutation({ mutationFn: () => api.post('/nutrition/favorites', { name: favoriteName.trim(), entries: favoriteEntries }), onSuccess: () => { qc.invalidateQueries({ queryKey: ['nutrition-favorites'] }); setFavoriteEntries(null); setFavoriteName(''); setMessage('Favori enregistré.'); }, onError: fail });
  const deleteFavorite = useMutation({ mutationFn: (id: string) => api.delete(`/nutrition/favorites/${id}`), onSuccess: () => { qc.invalidateQueries({ queryKey: ['nutrition-favorites'] }); setMessage('Favori supprimé.'); }, onError: fail });
  const renameFavorite = useMutation({ mutationFn: ({ id, name }: { id: string; name: string }) => api.patch(`/nutrition/favorites/${id}`, { name }), onSuccess: () => { qc.invalidateQueries({ queryKey: ['nutrition-favorites'] }); setMessage('Favori renommé.'); }, onError: fail });
  const applyFavorite = useMutation({ mutationFn: (id: string) => api.post(`/nutrition/favorites/${id}/apply`, null, { params: { date } }), onSuccess: () => { invalidateMeals(); setMessage('Favori ajouté à la journée.'); }, onError: fail });
  const saveGoals = useMutation({ mutationFn: (goals: Goals) => api.patch('/nutrition/goals', goals), onSuccess: () => { qc.invalidateQueries({ queryKey: ['nutrition-goals'] }); setGoalForm(null); setMessage('Repères enregistrés.'); }, onError: fail });
  const searchFood = useMutation({ mutationFn: () => api.get('/nutrition/search', { params: { q: query.trim() } }), onSuccess: r => { setSearch(r.data); setError(r.data.length ? '' : 'Aucun résultat. Essaie une autre recherche ou la saisie manuelle.'); }, onError: () => setError('Recherche indisponible. Réessaie ou utilise la saisie manuelle.') });
  const savePhotoSelection = useMutation({
    mutationFn: () => api.post('/nutrition/meals/bulk', { meals: photoItems.filter((_, i) => photoSelected.has(i)).map(item => ({
      name: item.name, calories: item.calories, proteins: item.proteins, carbs: item.carbs, fats: item.fats,
      quantityGrams: item.portionG ?? null, source: 'photo', mealType, date,
    })) }),
    onSuccess: () => {
      setPhotoItems([]); setPhotoSelected(new Set()); invalidateMeals(); setError(''); setMessage('Repas confirmé. Les aliments décochés n’ont pas été ajoutés.');
      setPhotoFile(null); setPhotoNote(''); setPortionNote(''); setAddMode(null);
    },
    onError: () => { invalidateMeals(); setError('L’enregistrement n’a pas pu être confirmé. Vérifie le journal avant de réessayer pour éviter les doublons.'); },
  });
  const analyze = useMutation({
    onMutate: () => { setPhotoItems([]); setPhotoSelected(new Set()); setPortionNote(''); setFormOpen(false); setPhotoIndex(null); setError(''); },
    mutationFn: async ({ file, note }: { file: File; note: string }) => {
      const blob = await prepareImage(file);
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => typeof reader.result === 'string' && reader.result.includes(',') ? resolve(reader.result.split(',')[1]) : reject(new Error('Lecture impossible.'));
        reader.onerror = () => reject(new Error('Lecture impossible.'));
        reader.readAsDataURL(blob);
      });
      const response = await api.post('/nutrition/analyze-image', { base64, mediaType: blob.type || 'image/jpeg', note });
      const data: unknown = response.data;
      if (!data || typeof data !== 'object') throw new Error('Résultat photo invalide.');
      const result = data as Record<string, unknown>;
      if (result.type === 'multiple' && Array.isArray(result.items) && result.items.length > 0 && result.items.length <= 30) {
        return { type: 'multiple', items: result.items.map(parsePhotoFood) } satisfies PhotoResult;
      }
      if (result.type === 'single') {
        return { type: 'single', item: parsePhotoFood(result), portionNote: typeof result.portionNote === 'string' ? result.portionNote : '' } satisfies PhotoResult;
      }
      throw new Error('Résultat photo incomplet.');
    },
    onSuccess: data => {
      setError('');
      if (data.type === 'multiple') {
        setPhotoItems(data.items); setPhotoSelected(new Set(data.items.map((_, i) => i))); setPortionNote('');
      } else {
        setPhotoItems([data.item]); setPhotoSelected(new Set([0])); setPortionNote(data.portionNote);
      }
      setFormOpen(false); setPhotoIndex(null); setEditing(null);
    }, onError: (cause: unknown) => {
      const status = (cause as { response?: { status?: number } })?.response?.status;
      setError(status === 503 ? 'L’analyse photo n’est pas configurée sur le serveur. La recherche et la saisie manuelle restent disponibles.' :
        status === 429 ? 'Quota d’analyse photo atteint. Réessaie plus tard ; la recherche et la saisie manuelle restent disponibles.' :
          'La photo n’a pas pu être analysée. Réessaie ou utilise la saisie manuelle.');
    },
  });
  const busy = save.isPending || savePhotoSelection.isPending || analyze.isPending;
  useEffect(() => {
    if (!photoFile) { setPhotoPreview(null); return; }
    const url = URL.createObjectURL(photoFile);
    setPhotoPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photoFile]);
  useEffect(() => {
    if (addMode) addPanel.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [addMode]);
  const discardDraft = () => {
    if ((photoItems.length || formOpen) && !window.confirm('Quitter cette saisie ? Les éléments non enregistrés seront abandonnés.')) return false;
    setPhotoItems([]); setPhotoSelected(new Set()); setPhotoNote(''); setPhotoFile(null); setPortionNote('');
    setEditing(null); setFormOpen(false); setPhotoIndex(null);
    return true;
  };
  const openPhoto = (type: MealType, source: 'camera' | 'gallery') => {
    if (!discardDraft()) return;
    setMealType(type); setAddMode('photo');
    (source === 'camera' ? cameraRef : galleryRef).current?.click();
  };
  const selectPhoto = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]; event.target.value = '';
    if (!file) return;
    if ((photoItems.length || formOpen) && !window.confirm('Remplacer la saisie non enregistrée par cette photo ?')) return;
    setAddMode('photo'); setPhotoFile(file); analyze.mutate({ file, note: photoNote });
  };
  const reviewPhoto = () => {
    if (photoIndex == null || !validForm(form)) return;
    const entry = entryFromForm(form);
    setPhotoItems(current => current.map((item, index) => index === photoIndex ? {
      name: entry.name, calories: entry.calories, proteins: entry.proteins, carbs: entry.carbs, fats: entry.fats,
      portionG: entry.quantityGrams ?? undefined,
    } : item));
    setFormOpen(false); setPhotoIndex(null);
  };
  const openForm = (entry?: Entry, existing: Meal | null = null, type: MealType = mealType) => {
    if (!discardDraft()) return;
    setMealType(entry?.mealType ?? type);
    setEditing(existing); setCopiedItems(entry?.items ?? null); setPhotoIndex(null); setForm(entry ? formFromEntry(entry) : emptyForm(type)); setFormOpen(true); setError('');
    return true;
  };
  const prepareFavorite = (entries: Entry[], name: string) => { setFavoriteEntries(entries); setFavoriteName(name); setError(''); };
  const openFavorite = (favorite: Favorite) => {
    if (favorite.entries.length === 1) {
      const entry = favorite.entries[0];
      setView('journal'); setAddMode('recent'); openForm({ ...entry, mealType });
    } else if (window.confirm(`Ajouter les ${favorite.entries.length} entrées de « ${favorite.name} » à cette journée ?`)) applyFavorite.mutate(favorite.id);
  };
  const dateLabel = date === localDate() ? "Aujourd’hui" : new Date(`${date}T00:00:00`).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  const goals = goalsQuery.data;

  return <div className="page nutrition-page">
    <header className="nutrition-header"><div><p className="nutrition-eyebrow">TON ESPACE NUTRITION</p><h1>L’essentiel, sans tout compter.</h1><p>Tes repas en photo, tes protéines en priorité.</p></div><button className="button" disabled={busy} onClick={() => { if (discardDraft()) { setView('journal'); setAddMode('recent'); } }}>Autre repas ou collation</button></header>
    <input ref={cameraRef} className="nutrition-photo-input" aria-label="Prendre une photo du repas" type="file" accept="image/*" capture="environment" disabled={busy} onChange={selectPhoto} />
    <input ref={galleryRef} className="nutrition-photo-input" aria-label="Choisir une photo du repas dans la galerie" type="file" accept="image/*" disabled={busy} onChange={selectPhoto} />
    <nav className="nutrition-tabs" aria-label="Nutrition">{([['journal', 'Journal'], ['favorites', 'Favoris'], ['trends', 'Tendances']] as const).map(([key, title]) => <button key={key} type="button" disabled={busy} className={view === key ? 'selected' : ''} aria-current={view === key ? 'page' : undefined} onClick={() => { if (key !== view && discardDraft()) { setView(key); setAddMode(null); setError(''); } }}>{title}</button>)}</nav>
    {message && <p className="nutrition-message" role="status">{message}</p>}
    {error && <p className="feedback-error" role="alert">{error}</p>}
    {view === 'journal' && <>
      <div className="nutrition-date"><button className="button" aria-label="Jour précédent" disabled={busy || formOpen || photoItems.length > 0} onClick={() => setDate(offsetDate(date, -1))}>‹</button><strong>{dateLabel}</strong><button className="button" aria-label="Jour suivant" disabled={busy || date === localDate() || formOpen || photoItems.length > 0} onClick={() => setDate(offsetDate(date, 1))}>›</button>{date !== localDate() && <button className="text-button" disabled={busy || formOpen || photoItems.length > 0} onClick={() => setDate(localDate())}>Aujourd’hui</button>}</div>
      {mealsQuery.isPending ? <p role="status">Chargement du journal…</p> : mealsQuery.isError ? <p className="feedback-error" role="alert">Impossible de charger le journal. <button onClick={() => mealsQuery.refetch()}>Réessayer</button></p> : <>
        <NutritionProteinSummary key={`protein-${date}`} entries={meals} goal={goals?.proteinsGoal ?? null} goalsError={goalsQuery.isError} goalsLoading={goalsQuery.isPending} onRetry={() => { goalsQuery.refetch(); }} />
        <div className="nutrition-secondary-summary"><span>Calories : {summaryText(meals, 'calories')}{goals?.caloriesGoal != null ? ` / repère ${goals.caloriesGoal} kcal` : ''}</span><span>Lipides : {summaryText(meals, 'fats')}</span><details><summary>Glucides et précision</summary><p>Glucides : {summaryText(meals, 'carbs')}</p><p>Les photos donnent des estimations, surtout pour les portions, huiles et sauces. Pas de jugement sur les aliments ; seule la consommation enregistrée est comptée.</p></details></div>
        <div className="nutrition-photo-shortcuts">{mealTypes.filter(type => type.value !== 'snack').map(type => {
          const entries = meals.filter(meal => meal.mealType === type.value);
          return <section className="nutrition-panel" key={type.value}><h2>{type.label}</h2><p>{entries.length ? `${summaryText(entries, 'proteins')} · ${entries.length} entrée(s)` : 'Pas encore renseigné'}</p>
            <div className="nutrition-actions"><button className="button button-primary" disabled={busy} onClick={() => openPhoto(type.value, 'camera')}>Prendre une photo</button><button className="button" disabled={busy} onClick={() => openPhoto(type.value, 'gallery')}>Choisir dans la galerie</button><button className="text-button" disabled={busy} onClick={() => { if (openForm(undefined, null, type.value)) setAddMode('manual'); }}>Ajouter sans photo</button></div>
            {type.value === 'breakfast' && <p className="nutrition-hint">Biscuits ou autre petit-déjeuner : photographie la portion ou l’étiquette, puis ajuste la quantité consommée.</p>}
          </section>;
        })}</div>
        <NutritionRoutine key={date} date={date} disabled={busy} />
        <details className="nutrition-tools"><summary>Copier ou conserver mes repas</summary><div className="nutrition-actions nutrition-quick"><button className="button" disabled={duplicate.isPending || busy} onClick={() => { if (!meals.length || window.confirm('Ajouter les repas de la veille ? Les prises de routine ne sont pas copiées.')) duplicate.mutate(); }}>Répéter la veille</button>{meals.some(meal => !meal.routineSlot) && <button className="button" onClick={() => prepareFavorite(meals.filter(meal => !meal.routineSlot), 'Ma journée')}>Enregistrer les repas en favori</button>}</div></details>
        {addMode && <section ref={addPanel} className="nutrition-panel"><div className="nutrition-panel-heading"><h2>Ajouter au journal</h2><button className="text-button" disabled={busy} onClick={() => { if (discardDraft()) setAddMode(null); }}>Fermer</button></div>
          <div className="nutrition-methods">{([['photo', 'Photo'], ['recent', 'Récents et favoris'], ['search', 'Rechercher'], ['manual', 'Manuel']] as const).map(([key, title]) => <button key={key} disabled={busy} className={addMode === key ? 'selected' : ''} onClick={() => { if (key !== addMode && discardDraft()) { setAddMode(key); setError(''); } }}>{title}</button>)}</div>
          <label className="nutrition-select">Moment du repas<select disabled={busy} value={mealType} onChange={e => { const next = e.target.value as MealType; setMealType(next); if (formOpen && !editing) setForm(current => ({ ...current, mealType: next })); }}>{mealTypes.map(type => <option key={type.value} value={type.value}>{type.label}</option>)}</select></label>
          {addMode === 'search' && <><form className="nutrition-search" onSubmit={e => { e.preventDefault(); if (query.trim()) searchFood.mutate(); }}><input aria-label="Rechercher un aliment" placeholder="Ex. riz, yaourt…" value={query} onChange={e => setQuery(e.target.value)} /><button className="button" disabled={searchFood.isPending || !query.trim()}>{searchFood.isPending ? 'Recherche…' : 'Rechercher'}</button></form>
            <label className="nutrition-select">Portion en grammes<input type="number" min="0.1" step="any" value={grams} onChange={e => setGrams(e.target.value)} /></label>
            {search.map((food, i) => <div className="nutrition-choice" key={`${food.name}-${i}`}><div><strong>{food.name}</strong><p>{summaryText([food], 'calories')} / 100 g</p></div><button className="button" disabled={!Number.isFinite(Number(grams)) || Number(grams) <= 0} onClick={() => { const quantity = Number(grams); const values = scaleValues(food, quantity / 100); openForm({ ...values, name: food.name, mealType, quantityGrams: quantity, source: 'search' }); }}>Choisir</button></div>)}</>}
          {addMode === 'manual' && !formOpen && <button className="button" onClick={() => openForm()}>Saisir un aliment ou un repas</button>}
          {addMode === 'photo' && <><p className="nutrition-hint">Photo envoyée à Groq pour estimation, puis confirmation par toi. Elle n’est pas conservée dans le journal.</p><div className="nutrition-actions"><button className="button" disabled={busy || formOpen} onClick={() => cameraRef.current?.click()}>Prendre une photo</button><button className="button" disabled={busy || formOpen} onClick={() => galleryRef.current?.click()}>Choisir dans la galerie</button></div>{analyze.isPending && <p role="status">Analyse…</p>}
            {photoPreview && <img className="nutrition-photo-preview" src={photoPreview} alt="Repas à vérifier avant enregistrement" />}
            <label className="nutrition-select">Précision facultative<textarea maxLength={1000} value={photoNote} disabled={busy} placeholder="Ex. sauce non consommée, deux portions de poulet…" onChange={e => setPhotoNote(e.target.value)} /></label>
            {photoFile && <button className="button" disabled={busy || formOpen} onClick={() => analyze.mutate({ file: photoFile, note: photoNote })}>Réestimer avec ma précision</button>}
            {portionNote && <p className="nutrition-hint">Estimation : {portionNote}. Vérifie si les valeurs correspondent à ta portion.</p>}
            {photoItems.map((item, index) => <div className="nutrition-choice" key={`${item.name}-${index}`}><label><input type="checkbox" checked={photoSelected.has(index)} disabled={busy} onChange={() => setPhotoSelected(current => { const selected = new Set(current); if (selected.has(index)) selected.delete(index); else selected.add(index); return selected; })} /> <strong>{item.name}</strong><p>~{item.portionG ?? '?'} g · protéines : {summaryText([item], 'proteins')} · {summaryText([item], 'calories')} · lipides : {summaryText([item], 'fats')}</p></label><button className="button" disabled={busy} onClick={() => { setEditing(null); setCopiedItems(null); setPhotoIndex(index); setForm({ ...emptyForm(mealType), name: item.name, source: 'photo', quantityGrams: str(item.portionG), calories: str(item.calories), proteins: str(item.proteins), carbs: str(item.carbs), fats: str(item.fats) }); setFormOpen(true); }}>Corriger</button></div>)}
            {photoItems.length > 0 && <><p className="nutrition-hint">Sélection estimée : {summaryText(photoItems.filter((_, i) => photoSelected.has(i)), 'proteins')} de protéines · {summaryText(photoItems.filter((_, i) => photoSelected.has(i)), 'calories')}. Décoche ce que tu n’as pas consommé.</p><button className="button button-primary" disabled={!photoSelected.size || formOpen || busy} onClick={() => savePhotoSelection.mutate()}>{savePhotoSelection.isPending ? 'Enregistrement…' : 'Confirmer mon repas'}</button></>}</>}
          {addMode === 'recent' && <><h3>Récents</h3>{recentQuery.isError ? <p className="feedback-error">Récents indisponibles. <button onClick={() => recentQuery.refetch()}>Réessayer</button></p> : recentQuery.isPending ? <p>Chargement…</p> : recentQuery.data?.length ? recentQuery.data.map((entry, i) => <div className="nutrition-choice" key={`${entry.name}-${i}`}><div><strong>{entry.name}</strong><p>{entry.quantityGrams ? `${display(entry.quantityGrams)} g · ` : ''}{summaryText([entry], 'calories')}</p></div><button className="button" onClick={() => openForm({ ...entry, mealType })}>Choisir</button></div>) : <p>Aucune entrée récente.</p>}
            <h3>Favoris</h3>{favQuery.isError ? <p className="feedback-error">Favoris indisponibles. <button onClick={() => favQuery.refetch()}>Réessayer</button></p> : favQuery.isPending ? <p>Chargement…</p> : favQuery.data?.length ? favQuery.data.map(favorite => <div className="nutrition-choice" key={favorite.id}><div><strong>{favorite.name}</strong><p>{favorite.entries.length} entrée(s)</p></div><button className="button" disabled={applyFavorite.isPending} onClick={() => openFavorite(favorite)}>Choisir</button></div>) : <p>Aucun favori pour le moment.</p>}</>}
          {formOpen && !editing && <>{copiedItems?.length ? <p className="nutrition-hint">Le détail d’origine est conservé tel quel : il n’est pas recalculé si tu modifies les valeurs.</p> : null}<MealForm form={form} setForm={next => { setForm(next); setMealType(next.mealType); }} pending={busy} submitLabel={photoIndex == null ? 'Ajouter' : 'Garder la correction'} onSubmit={() => photoIndex == null ? save.mutate({ entry: entryFromForm(form), existing: null }) : reviewPhoto()} onCancel={() => { setFormOpen(false); setPhotoIndex(null); }} /></>}
        </section>}
        {editing && formOpen && <section className="nutrition-panel"><h2>Modifier l’entrée</h2>{copiedItems?.length ? <p className="nutrition-hint">Le détail d’origine est conservé tel quel : il n’est pas recalculé si tu modifies les valeurs.</p> : null}<MealForm form={form} setForm={setForm} pending={save.isPending} submitLabel="Enregistrer" onSubmit={() => save.mutate({ entry: entryFromForm(form), existing: editing })} onCancel={() => { setEditing(null); setFormOpen(false); }} /></section>}
        <details className="nutrition-journal"><summary>Détail des repas et autres ajouts · {meals.length} entrée(s)</summary>{meals.length === 0 && <p className="nutrition-empty">Aucune entrée pour cette journée. Ajoute un aliment quand tu veux.</p>}
          {mealTypes.map(type => { const group = meals.filter(meal => meal.mealType === type.value); return <article className="nutrition-meal" key={type.value}><div className="nutrition-meal-header"><h3>{type.label}</h3><span>{group.length ? `Protéines : ${summaryText(group, 'proteins')}` : 'Rien de noté'}</span><button className="text-button" disabled={busy} onClick={() => { setMealType(type.value); setAddMode('recent'); setFormOpen(false); setEditing(null); }}>Ajouter</button></div>
            {group.map(meal => <div className="nutrition-entry" key={meal.id}><div><strong>{meal.name}</strong><p>{meal.quantityGrams != null && `${display(meal.quantityGrams)} g · `}Protéines : {summaryText([meal], 'proteins')} · {summaryText([meal], 'calories')} · Lipides : {summaryText([meal], 'fats')}</p>{meal.source && <small>{sources[meal.source]}</small>}<details><summary>Glucides</summary><p>{summaryText([meal], 'carbs')}</p></details></div><div className="nutrition-actions"><button className="text-button" disabled={busy} onClick={() => { setAddMode(null); openForm(meal, meal); }}>Modifier</button><button className="text-button" disabled={busy} onClick={() => prepareFavorite([meal], meal.name)}>Favori</button><button className="text-button" disabled={remove.isPending || busy} onClick={() => { if (window.confirm(`Supprimer « ${meal.name} » ?`)) remove.mutate(meal.id); }}>Supprimer</button></div></div>)}</article>; })}
        </details>
      </>}
    </>}
    {favoriteEntries && <section className="nutrition-panel"><h2>Enregistrer un favori</h2><form className="nutrition-form" onSubmit={e => { e.preventDefault(); if (favoriteName.trim()) saveFavorite.mutate(); }}><label>Nom<input autoFocus value={favoriteName} maxLength={80} onChange={e => setFavoriteName(e.target.value)} required /></label><p>{favoriteEntries.length} entrée(s) conservée(s), avec leur détail connu.</p><div className="nutrition-actions"><button className="button button-primary" disabled={!favoriteName.trim() || saveFavorite.isPending}>Enregistrer</button><button type="button" className="button" onClick={() => setFavoriteEntries(null)}>Annuler</button></div></form></section>}
    {view === 'favorites' && <section className="nutrition-panel"><h2>Mes favoris</h2><p className="nutrition-hint">Réutilise une entrée ou une journée. Une entrée seule peut être ajustée avant ajout ; une combinaison conserve ses moments d’origine.</p>{favQuery.isPending ? <p>Chargement…</p> : favQuery.isError ? <p className="feedback-error">Impossible de charger les favoris. <button onClick={() => favQuery.refetch()}>Réessayer</button></p> : favQuery.data?.length ? favQuery.data.map(favorite => <div className="nutrition-choice" key={favorite.id}><div><strong>{favorite.name}</strong><p>{favorite.entries.length} entrée(s) · {summaryText(favorite.entries, 'calories')}</p></div><div className="nutrition-actions"><button className="button" disabled={applyFavorite.isPending} onClick={() => openFavorite(favorite)}>Utiliser</button><button className="text-button" onClick={() => { const name = window.prompt('Nouveau nom du favori', favorite.name); if (name?.trim()) renameFavorite.mutate({ id: favorite.id, name: name.trim() }); }}>Renommer</button><button className="text-button" onClick={() => { if (window.confirm(`Supprimer « ${favorite.name} » ?`)) deleteFavorite.mutate(favorite.id); }}>Supprimer</button></div></div>) : <p>Aucun favori pour le moment. Enregistre une entrée ou une journée depuis ton journal.</p>}</section>}
    {view === 'trends' && <section className="nutrition-panel"><div className="nutrition-panel-heading"><h2>Tendances de la semaine</h2><div className="nutrition-actions"><button className="button" aria-label="Semaine précédente" onClick={() => setWeek(offsetDate(week, -7))}>‹</button><button className="button" aria-label="Semaine suivante" disabled={week >= weekStart(localDate())} onClick={() => setWeek(offsetDate(week, 7))}>›</button></div></div><p className="nutrition-hint">Du {week} au {end}. Seuls les jours renseignés avec toutes les valeurs connues entrent dans chaque moyenne.</p>
      {weekQuery.isPending ? <p>Chargement…</p> : weekQuery.isError ? <p className="feedback-error">Impossible de charger la semaine. <button onClick={() => weekQuery.refetch()}>Réessayer</button></p> : <>
        <div className="nutrition-summary">{nutrients.map(key => { const days = Array.from({ length: 7 }, (_, i) => (weekQuery.data ?? []).filter(meal => meal.date === offsetDate(week, i))).map(day => summarizeValues(day, key)).filter(day => day.complete); return <div key={key}><span>{labels[key]} · moyenne</span><strong>{days.length ? `${display(days.reduce((sum, day) => sum + day.value, 0) / days.length)} ${units[key]}` : 'Non renseigné'}</strong><small>{days.length} jour(s) complet(s) sur 7</small></div>; })}</div>
        <div className="nutrition-week">{Array.from({ length: 7 }, (_, i) => { const day = offsetDate(week, i); const entries = (weekQuery.data ?? []).filter(meal => meal.date === day); return <div key={day}><strong>{new Date(`${day}T00:00:00`).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' })}</strong><span>{entries.length ? summaryText(entries, 'calories') : 'Non renseigné'}</span><span>{entries.length ? summaryText(entries, 'proteins') : '—'}</span></div>; })}</div>
      </>}
      <div className="nutrition-panel-heading"><h2>Mes repères facultatifs</h2>{goals && !goalForm && <button className="button" onClick={() => setGoalForm({ calories: str(goals.caloriesGoal), proteins: str(goals.proteinsGoal) })}>Modifier</button>}</div>
      {goalsQuery.isPending ? <p>Chargement des repères…</p> : goalsQuery.isError ? <p className="feedback-error">Impossible de charger les repères. <button onClick={() => goalsQuery.refetch()}>Réessayer</button></p> : goalForm ? <form className="nutrition-form" onSubmit={e => { e.preventDefault(); saveGoals.mutate({ caloriesGoal: goalForm.calories === '' ? null : Number(goalForm.calories), proteinsGoal: goalForm.proteins === '' ? null : Number(goalForm.proteins) }); }}><div className="nutrition-fields"><label>Calories (kcal)<input type="number" min="0" step="any" value={goalForm.calories} onChange={e => setGoalForm({ ...goalForm, calories: e.target.value })} /></label><label>Protéines (g)<input type="number" min="0" step="any" value={goalForm.proteins} onChange={e => setGoalForm({ ...goalForm, proteins: e.target.value })} /></label></div><p className="nutrition-hint">À titre indicatif, sans calcul automatique. Laisse vide pour supprimer un repère.</p><div className="nutrition-actions"><button className="button button-primary" disabled={saveGoals.isPending || [goalForm.calories, goalForm.proteins].some(v => v !== '' && (!Number.isFinite(Number(v)) || Number(v) < 0))}>Enregistrer</button><button type="button" className="button" onClick={() => setGoalForm(null)}>Annuler</button></div></form> : <p>{goals?.caloriesGoal == null ? 'Calories : aucun repère' : `Calories : ${display(goals.caloriesGoal)} kcal`} · {goals?.proteinsGoal == null ? 'Protéines : aucun repère' : `Protéines : ${display(goals.proteinsGoal)} g`}</p>}
    </section>}
  </div>;
}
