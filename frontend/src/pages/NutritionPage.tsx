import { useRef, useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';

// Recalcule les macros d'un aliment pour une quantité donnée (base 100g)
function scale(val: number, grams: number) {
  return Math.round((val * grams / 100) * 10) / 10;
}

// Toujours en heure locale — évite le décalage UTC
function getLocalToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function offsetDate(base: string, days: number): string {
  const d = new Date(base + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatDateLabel(dateStr: string): string {
  const today = getLocalToday();
  const yesterday = offsetDate(today, -1);
  if (dateStr === today) return "Aujourd'hui";
  if (dateStr === yesterday) return 'Hier';
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
}

const MEAL_TYPES = [
  { value: 'breakfast', label: 'Petit-déjeuner', icon: 'ti-coffee', color: '#bd5b37' },
  { value: 'lunch',     label: 'Déjeuner',       icon: 'ti-sun',    color: '#287b91' },
  { value: 'dinner',    label: 'Dîner',          icon: 'ti-moon',   color: '#7453a6' },
  { value: 'snack',     label: 'Collation',      icon: 'ti-apple',  color: '#9a6b1c' },
];

function getMealTypeConfig(value: string) {
  return MEAL_TYPES.find(m => m.value === value) ?? MEAL_TYPES[1];
}

const MAX_ANALYSIS_IMAGE_BYTES = 2_800_000;

async function prepareAnalysisImage(file: File): Promise<{ blob: Blob; mediaType: string }> {
  if (file.size <= MAX_ANALYSIS_IMAGE_BYTES) {
    return { blob: file, mediaType: file.type || 'image/jpeg' };
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error('Cette photo est trop volumineuse et ne peut pas être redimensionnée. Choisis une image plus légère.');
  }

  try {
    let scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
    for (let attempt = 0; attempt < 6; attempt += 1) {
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Impossible de préparer cette photo pour l’analyse.');
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

      const blob = await new Promise<Blob | null>(resolve =>
        canvas.toBlob(resolve, 'image/jpeg', Math.max(0.45, 0.82 - attempt * 0.08)),
      );
      if (!blob) throw new Error('Impossible de préparer cette photo pour l’analyse.');
      if (blob.size <= MAX_ANALYSIS_IMAGE_BYTES) return { blob, mediaType: 'image/jpeg' };
      scale *= 0.75;
    }
  } finally {
    bitmap.close();
  }

  throw new Error('Cette photo reste trop volumineuse après compression. Choisis une image plus légère.');
}

function groupMealsByType(meals: any[]) {
  const map = new Map<string, any[]>();
  for (const m of MEAL_TYPES) map.set(m.value, []);
  for (const meal of meals) {
    const key = meal.mealType ?? 'lunch';
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(meal);
  }
  return MEAL_TYPES.map(t => ({ ...t, meals: map.get(t.value) ?? [] })).filter(t => t.meals.length > 0);
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function NutritionPage() {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const [activeDate, setActiveDate] = useState(getLocalToday);
  const isToday = activeDate === getLocalToday();

  const [search, setSearch]         = useState('');
  const [results, setResults]       = useState<any[]>([]);
  const [quantities, setQuantities] = useState<Record<number, number>>({});  // grammes par index résultat
  const [searching, setSearching]   = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [analyzing, setAnalyzing]   = useState(false);
  const [previewImg, setPreviewImg] = useState<string | null>(null);
  const [photoItems, setPhotoItems] = useState<any[]>([]);  // résultats multi-aliments photo
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());

  const [mealType, setMealType] = useState('lunch');
  const [manualForm, setManualForm] = useState({
    name: '', calories: '', proteins: '', carbs: '', fats: '',
  });
  const [shakerScoops, setShakerScoops] = useState(1);
  // 1 scoop 30g = ~120kcal, 25g protéines, 3g glucides, 2g lipides (valeurs typiques whey)
  const SHAKER_PER_SCOOP = { calories: 120, proteins: 25, carbs: 3, fats: 2 };
  const [favoriteForm, setFavoriteForm] = useState<{ name: string; entries: any[] } | null>(null);
  const [actionMessage, setActionMessage] = useState('');
  const [searchError, setSearchError] = useState('');
  const [photoError, setPhotoError] = useState('');
  const [bulkSaving, setBulkSaving] = useState(false);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['meals', activeDate] });
    qc.invalidateQueries({ queryKey: ['totals', activeDate] });
    qc.invalidateQueries({ queryKey: ['nutrition-recent'] });
  };

  const mealsQuery = useQuery({
    queryKey: ['meals', activeDate],
    queryFn: () => api.get(`/nutrition/meals?date=${activeDate}`).then(r => r.data),
  });
  const meals = mealsQuery.data ?? [];

  const totalsQuery = useQuery({
    queryKey: ['totals', activeDate],
    queryFn: () => api.get(`/nutrition/totals?date=${activeDate}`).then(r => r.data),
  });
  const totals = totalsQuery.data ?? { calories: 0, proteins: 0, carbs: 0, fats: 0 };

  const { data: favorites = [] } = useQuery({
    queryKey: ['nutrition-favorites'],
    queryFn: () => api.get('/nutrition/favorites').then(r => r.data),
  });

  const { data: recents = [] } = useQuery({
    queryKey: ['nutrition-recent'],
    queryFn: () => api.get('/nutrition/recent').then(r => r.data),
  });

  const addMeal = useMutation({
    mutationFn: (data: any) => api.post('/nutrition/meals', { ...data, date: activeDate, mealType }),
    onSuccess: () => {
      invalidate();
      setActionMessage('Repas ajouté au journal.');
      setResults([]);
      setQuantities({});
      setSearch('');
      setPreviewImg(null);
      setPhotoItems([]);
      setSelectedItems(new Set());
      setManualForm({ name: '', calories: '', proteins: '', carbs: '', fats: '' });
      setShowManual(false);
    },
    onError: () => setActionMessage('Le repas n’a pas pu être enregistré. Tes champs restent disponibles ; réessaie.'),
  });

  // Ajoute tous les aliments sélectionnés du plateau en une fois
  const addAllSelected = useCallback(async () => {
    const toAdd = photoItems.filter((_, i) => selectedItems.has(i));
    setBulkSaving(true);
    setPhotoError('');
    let saved = 0;
    try {
      for (let i = 0; i < photoItems.length; i++) {
        if (!selectedItems.has(i)) continue;
        const item = photoItems[i];
        await api.post('/nutrition/meals', {
          name: item.name,
          calories: item.calories,
          proteins: item.proteins,
          carbs: item.carbs,
          fats: item.fats,
          date: activeDate,
          mealType,
        });
        saved++;
        setSelectedItems(current => {
          const next = new Set(current);
          next.delete(i);
          return next;
        });
      }
      invalidate();
      setPhotoItems([]);
      setSelectedItems(new Set());
      setPreviewImg(null);
      setActionMessage(`${saved} aliment${saved > 1 ? 's' : ''} ajouté${saved > 1 ? 's' : ''} au journal.`);
    } catch (error) {
      invalidate();
      setPhotoError(`Enregistrement interrompu après ${saved} aliment${saved > 1 ? 's' : ''}. Les éléments restants sont encore sélectionnés ; tu peux réessayer sans dupliquer ceux déjà ajoutés.`);
    } finally {
      setBulkSaving(false);
    }
  }, [photoItems, selectedItems, mealType, activeDate]);

  const removeMeal = useMutation({
    mutationFn: (id: string) => api.delete(`/nutrition/meals/${id}`),
    onSuccess: invalidate,
    onError: () => setActionMessage('Le repas n’a pas pu être supprimé. Réessaie.'),
  });

  // ── Ajout rapide : favoris, duplication, récents ──
  const invalidateFav = () => qc.invalidateQueries({ queryKey: ['nutrition-favorites'] });

  const applyFav = useMutation({
    mutationFn: (id: string) => api.post(`/nutrition/favorites/${id}/apply?date=${activeDate}`),
    onSuccess: (res: any) => { invalidate(); setActionMessage(`${res?.data?.length ?? 0} repas ajouté${res?.data?.length === 1 ? '' : 's'} depuis le favori.`); },
    onError: () => setActionMessage('Le favori n’a pas pu être appliqué. Réessaie.'),
  });
  const saveFav = useMutation({
    mutationFn: (body: any) => api.post('/nutrition/favorites', body),
    onSuccess: () => { invalidateFav(); setFavoriteForm(null); setActionMessage('Favori enregistré.'); },
    onError: () => setActionMessage('Le favori n’a pas pu être enregistré. Réessaie.'),
  });
  const delFav = useMutation({
    mutationFn: (id: string) => api.delete(`/nutrition/favorites/${id}`),
    onSuccess: invalidateFav,
    onError: () => setActionMessage('Le favori n’a pas pu être supprimé. Réessaie.'),
  });
  const dupDay = useMutation({
    mutationFn: (body: { from: string; to: string }) => api.post('/nutrition/duplicate', body),
    onSuccess: (res: any) => {
      invalidate();
      setActionMessage(res?.data?.length
        ? `${res.data.length} repas copié${res.data.length > 1 ? 's' : ''}.`
        : 'Aucun repas trouvé à la date précédente.');
    },
    onError: () => setActionMessage('La copie des repas a échoué. Réessaie.'),
  });

  const favKcal = (f: any) => Math.round((f.entries ?? []).reduce((s: number, e: any) => s + (e.calories ?? 0), 0));

  const repeatYesterday = () => dupDay.mutate({ from: offsetDate(activeDate, -1), to: activeDate });

  const saveDayFavorite = () => {
    if (!meals.length) return;
    setFavoriteForm({
      name: 'Mon combo',
      entries: meals.map((m: any) => ({
        name: m.name, mealType: m.mealType, calories: m.calories, proteins: m.proteins, carbs: m.carbs, fats: m.fats,
      })),
    });
  };

  const saveMealFavorite = (m: any) => {
    setFavoriteForm({
      name: m.name,
      entries: [{ name: m.name, mealType: m.mealType, calories: m.calories, proteins: m.proteins, carbs: m.carbs, fats: m.fats }],
    });
  };

  const addRecent = (r: any) => addMeal.mutate({ name: r.name, calories: r.calories, proteins: r.proteins, carbs: r.carbs, fats: r.fats });

  const handleSearch = async () => {
    if (!search.trim()) return;
    setSearching(true);
    setSearchError('');
    try {
      const res = await api.get(`/nutrition/search?q=${encodeURIComponent(search)}`);
      setResults(res.data);
      if (!res.data.length) setSearchError('Aucun aliment trouvé. Essaie un autre nom ou utilise la saisie manuelle.');
    } catch {
      setSearchError('La recherche est momentanément indisponible. Réessaie ou saisis les informations manuellement.');
    } finally {
      setSearching(false);
    }
  };

  // ── Analyse photo ──────────────────────────────────────────────────────────
  const handlePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAnalyzing(true);
    setPhotoError('');
    setPreviewImg(null);
    setPortionNote('');

    try {
      const { blob, mediaType } = await prepareAnalysisImage(file);
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = typeof reader.result === 'string' ? reader.result : '';
          if (!result.includes(',')) {
            reject(new Error('Lecture de la photo impossible.'));
            return;
          }
          resolve(result.split(',')[1]); // Retirer le préfixe data:image/...;base64,
        };
        reader.onerror = () => reject(new Error('Lecture de la photo impossible.'));
        reader.readAsDataURL(blob);
      });

      // Prévisualisation
      setPreviewImg(URL.createObjectURL(file));

      const res = await api.post('/nutrition/analyze-image', { base64, mediaType });
      const data = res.data;

      if (data.type === 'multiple' && data.items?.length > 0) {
        // Plateau multi-aliments
        setPhotoItems(data.items);
        setSelectedItems(new Set(data.items.map((_: any, i: number) => i)));
      } else {
        // Aliment unique — pré-remplir le formulaire manuel
        setManualForm({
          name:     data.name     ?? '',
          calories: data.calories != null ? String(Math.round(data.calories)) : '',
          proteins: data.proteins != null ? String(Math.round(data.proteins * 10) / 10) : '',
          carbs:    data.carbs    != null ? String(Math.round(data.carbs * 10) / 10) : '',
          fats:     data.fats     != null ? String(Math.round(data.fats * 10) / 10) : '',
        });
        setShowManual(true);
        if (data.portionNote) setPortionNote(data.portionNote);
      }
    } catch (error) {
      setPhotoError(error instanceof Error
        ? error.message
        : 'La photo n’a pas pu être analysée. Réessaie ou renseigne ton repas manuellement.');
    } finally {
      setAnalyzing(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const [portionNote, setPortionNote] = useState('');
  const manualValues = [manualForm.calories, manualForm.proteins, manualForm.carbs, manualForm.fats];
  const canSaveManual = Boolean(manualForm.name.trim()) && manualValues.every(value =>
    value !== '' && Number.isFinite(Number(value)) && Number(value) >= 0,
  );
  useEffect(() => {
    if (!previewImg) return;
    return () => URL.revokeObjectURL(previewImg);
  }, [previewImg]);

  const grouped = groupMealsByType(meals);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Nutrition</h1>
          <p className="page-sub">{mealsQuery.isPending ? 'Chargement du journal…' : `${meals.length} repas noté${meals.length === 1 ? '' : 's'}`}</p>
        </div>
        {/* Navigateur de date */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            type="button"
            aria-label="Jour précédent"
            onClick={() => setActiveDate(d => offsetDate(d, -1))}
            style={{ background: 'var(--border)', border: 'none', borderRadius: 7, width: 32, height: 32, cursor: 'pointer', color: 'var(--text-muted)', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <i className="ti ti-chevron-left" />
          </button>
          <div style={{ textAlign: 'center', minWidth: 140 }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: isToday ? 'var(--accent)' : 'var(--text-secondary)' }}>
              {formatDateLabel(activeDate)}
            </div>
            {!isToday && (
              <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{activeDate}</div>
            )}
          </div>
          <button
            type="button"
            aria-label="Jour suivant"
            onClick={() => setActiveDate(d => offsetDate(d, 1))}
            disabled={isToday}
            style={{ background: 'var(--border)', border: 'none', borderRadius: 7, width: 32, height: 32, cursor: isToday ? 'default' : 'pointer', color: isToday ? 'var(--border-md)' : 'var(--text-muted)', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <i className="ti ti-chevron-right" />
          </button>
          {!isToday && (
            <button
              type="button"
              onClick={() => setActiveDate(getLocalToday())}
              style={{ background: 'var(--accent-bg)', border: '1px solid var(--accent-dark)', borderRadius: 7, padding: '5px 12px', cursor: 'pointer', color: 'var(--accent)', fontSize: 11, fontFamily: 'inherit' }}
            >
              Aujourd'hui
            </button>
          )}
        </div>
        <p className="form-hint">Les valeurs de l’analyse sont des estimations. Vérifie-les avant l’enregistrement ; indique 0 uniquement si c’est bien la valeur connue.</p>
      </div>

      {/* ── Compteurs macro ── */}
      {mealsQuery.isError || totalsQuery.isError
        ? <p className="feedback-error" role="alert">Le journal ne peut pas être chargé. <button type="button" onClick={() => { mealsQuery.refetch(); totalsQuery.refetch(); }}>Réessayer</button></p>
        : mealsQuery.isPending || totalsQuery.isPending ? <p role="status">Chargement du journal…</p>
          : meals.length > 0 && <div className="stat-row">
            {[['Calories', `${Math.round(totals.calories)} kcal`], ['Protéines', `${Math.round(totals.proteins)} g`], ['Glucides', `${Math.round(totals.carbs)} g`], ['Lipides', `${Math.round(totals.fats)} g`]].map(([label, value], i) => (
              <div className={`stat-card ${i === 0 ? 'accent' : ''}`} key={label}>
                <div className="stat-val">{value}</div>                <div className="stat-lbl">Valeur enregistrée</div>
              </div>
            ))}
          </div>}

      {actionMessage && <p className="save-success" role="status">{actionMessage}</p>}

      {/* ── Ajout rapide : favoris, récents, répéter ── */}
      <div className="quick-add">
        <div className="quick-head">
          <span className="section-head" style={{ margin: 0 }}>Ajout rapide</span>
          <div className="quick-actions">
            <button className="quick-btn" onClick={repeatYesterday} disabled={dupDay.isPending} title="Copier les repas de la veille">
              <i className="ti ti-rotate-clockwise" /> Répéter hier
            </button>
            {meals.length > 0 && (
              <button className="quick-btn" onClick={saveDayFavorite} disabled={saveFav.isPending} title="Enregistrer tous les repas du jour comme favori">
                <i className="ti ti-star" /> Enregistrer la journée
              </button>
            )}
          </div>
        </div>

        {favorites.length > 0 && (
          <div className="chip-row">
            {favorites.map((f: any) => (
              <div className="fav-chip" key={f.id}>
                <button className="fav-apply" onClick={() => applyFav.mutate(f.id)} title="Ajouter à ce jour">
                  <i className="ti ti-star-filled" />
                  <span className="fav-name">{f.name}</span>
                  <span className="fav-kcal">{favKcal(f)} kcal{f.entries?.length > 1 ? ` · ${f.entries.length} items` : ''}</span>
                </button>
                <button className="fav-del" aria-label={`Supprimer le favori ${f.name}`} onClick={() => { if (confirm(`Supprimer le favori « ${f.name} » ?`)) delFav.mutate(f.id); }} title="Supprimer">
                  <i className="ti ti-x" />
                </button>
              </div>
            ))}
          </div>
        )}

        {recents.length > 0 && (
          <>
            <div className="quick-sub">Récents — clic pour ré-ajouter ({MEAL_TYPES.find(t => t.value === mealType)?.label})</div>
            <div className="chip-row">
              {recents.map((r: any, i: number) => (
                <button className="recent-chip" key={i} onClick={() => addRecent(r)} title={`${Math.round(r.calories)} kcal · P${Math.round(r.proteins)} G${Math.round(r.carbs)} L${Math.round(r.fats)}`}>
                  <i className="ti ti-plus" /> {r.name} <span className="recent-kcal">{Math.round(r.calories)}</span>
                </button>
              ))}
            </div>
          </>
        )}

        {favorites.length === 0 && recents.length === 0 && (
          <p className="quick-empty">Logge un repas, puis enregistre-le en favori (★) pour le réutiliser en 1 clic.</p>
        )}
      </div>

      {favoriteForm && (
        <form className="card favorite-form" onSubmit={e => {
          e.preventDefault();
          if (!favoriteForm.name.trim()) return;
          saveFav.mutate({ name: favoriteForm.name.trim(), entries: favoriteForm.entries });
        }}>
          <label htmlFor="favorite-name">Nom du favori</label>
          <input id="favorite-name" className="food-input" autoFocus maxLength={80}
            value={favoriteForm.name} onChange={e => setFavoriteForm(current => current && ({ ...current, name: e.target.value }))} />
          <div className="favorite-form-actions">
            <button className="food-btn" type="submit" disabled={!favoriteForm.name.trim() || saveFav.isPending}>
              {saveFav.isPending ? 'Enregistrement…' : 'Enregistrer le favori'}
            </button>
            <button className="food-btn" type="button" onClick={() => setFavoriteForm(null)}>Annuler</button>
          </div>
        </form>
      )}

      {/* ── Sélecteur moment de la journée ── */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {MEAL_TYPES.map(t => (
          <button
            type="button"
            key={t.value}
            onClick={() => setMealType(t.value)}
            aria-pressed={mealType === t.value}
            aria-label={`Moment du repas : ${t.label}`}
            style={{
              flex: 1,
              background: mealType === t.value ? 'var(--bg-card)' : 'var(--border)',
              border: mealType === t.value ? `1px solid ${t.color}` : '1px solid transparent',
              borderRadius: 8, padding: '8px 4px', cursor: 'pointer',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
            }}
          >
            <i className={`ti ${t.icon}`} style={{ fontSize: 16, color: mealType === t.value ? t.color : 'var(--text-muted)' }} />
            <span style={{ fontSize: 11, color: mealType === t.value ? t.color : 'var(--text-muted)', fontWeight: mealType === t.value ? 600 : 400 }}>
              {t.label}
            </span>
          </button>
        ))}
      </div>

      {/* ── Shaker protéines rapide ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 14px', marginBottom: 12 }}>
        <i className="ti ti-bottle" style={{ fontSize: 20, color: '#287b91', flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}>Shaker — estimation générique</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            {shakerScoops} scoop{shakerScoops > 1 ? 's' : ''} × 30g — {shakerScoops * SHAKER_PER_SCOOP.calories} kcal · P: {shakerScoops * SHAKER_PER_SCOOP.proteins}g. Valeurs à vérifier sur l’étiquette.
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-main)', borderRadius: 7, border: '1px solid var(--border-md)', overflow: 'hidden' }}>
          <button onClick={() => setShakerScoops(s => Math.max(1, s - 1))}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '6px 12px', fontSize: 16 }}>−</button>
          <span style={{ fontSize: 14, color: 'var(--text-secondary)', minWidth: 20, textAlign: 'center' }}>{shakerScoops}</span>
          <button onClick={() => setShakerScoops(s => Math.min(5, s + 1))}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '6px 12px', fontSize: 16 }}>+</button>
        </div>
        <button className="food-btn" style={{ fontSize: 12, padding: '6px 14px', flexShrink: 0 }}
          onClick={() => addMeal.mutate({
            name: `Shaker protéines (${shakerScoops} scoop${shakerScoops > 1 ? 's' : ''})`,
            calories: shakerScoops * SHAKER_PER_SCOOP.calories,
            proteins: shakerScoops * SHAKER_PER_SCOOP.proteins,
            carbs:    shakerScoops * SHAKER_PER_SCOOP.carbs,
            fats:     shakerScoops * SHAKER_PER_SCOOP.fats,
          })}>
          + Ajouter
        </button>
      </div>

      {/* ── Barre d'ajout ── */}
      <p className="section-head">Ajouter un aliment</p>
      <div className="add-food" style={{ marginBottom: 8 }}>
        <input
          aria-label="Rechercher un aliment"
          className="food-input"
          placeholder="Ex : blanc de poulet, riz basmati…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSearch()}
        />
        <button className="food-btn" onClick={handleSearch} disabled={searching}>
          {searching ? '…' : 'Rechercher'}
        </button>
        <button
          className="food-btn"
          style={{ background: 'var(--border)', color: 'var(--text-muted)' }}
          onClick={() => setShowManual(v => !v)}
        >
          Manuel
        </button>
        {/* Bouton photo */}
        <button
          className="food-btn"
          style={{ background: analyzing ? 'var(--border)' : 'var(--accent-dark)', color: analyzing ? 'var(--text-muted)' : 'var(--accent-text)', minWidth: 46 }}
          onClick={() => fileRef.current?.click()}
          disabled={analyzing}
          title="Analyser une photo"
        >
          {analyzing
            ? <i className="ti ti-loader-2" style={{ animation: 'spin 1s linear infinite' }} />
            : <i className="ti ti-camera" />
          }
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          style={{ display: 'none' }}
          onChange={handlePhoto}
        />
      </div>
      {searchError && <p className="feedback-error" role="alert">{searchError}</p>}
      {photoError && <p className="feedback-error" role="alert">{photoError}</p>}

      {/* ── Résultats Open Food Facts avec sélecteur de quantité ── */}
      {results.length > 0 && (
        <div className="card" style={{ marginBottom: 14 }}>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '.4px' }}>
            Résultats — ajuste la quantité consommée
          </p>
          {results.map((r, i) => {
            const g = quantities[i] ?? 100;
            return (
              <div key={i} className="meal-row" style={{ flexWrap: 'wrap', gap: 8, paddingBottom: 10, marginBottom: 10, borderBottom: '1px solid var(--border)' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="meal-name">{r.name || 'Sans nom'}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                    {scale(r.calories, g)} kcal · P: {scale(r.proteins, g)}g · G: {scale(r.carbs, g)}g · L: {scale(r.fats, g)}g
                  </div>
                </div>
                {/* Sélecteur quantité */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-main)', borderRadius: 7, border: '1px solid var(--border-md)', overflow: 'hidden' }}>
                    <button onClick={() => setQuantities(q => ({ ...q, [i]: Math.max(10, (q[i] ?? 100) - 10) }))}
                      style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '6px 10px', fontSize: 16 }}>−</button>
                    <input
                      type="number"
                      value={g}
                      onChange={e => setQuantities(q => ({ ...q, [i]: Math.max(1, Number(e.target.value)) }))}
                      style={{ width: 48, background: 'none', border: 'none', color: 'var(--text-secondary)', textAlign: 'center', fontSize: 13, outline: 'none' }}
                    />
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', paddingRight: 6 }}>g</span>
                    <button onClick={() => setQuantities(q => ({ ...q, [i]: (q[i] ?? 100) + 10 }))}
                      style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '6px 10px', fontSize: 16 }}>+</button>
                  </div>
                  <button
                    className="food-btn"
                    style={{ fontSize: 12, padding: '5px 12px', flexShrink: 0 }}
                    onClick={() => addMeal.mutate({
                      name: r.name,
                      calories: scale(r.calories, g),
                      proteins: scale(r.proteins, g),
                      carbs:    scale(r.carbs, g),
                      fats:     scale(r.fats, g),
                    })}
                  >
                    + Ajouter
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Résultats photo — plateau multi-aliments ── */}
      {photoItems.length > 0 && (
        <div className="card" style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}>
              📷 {photoItems.length} aliments détectés sur le plateau
            </p>
            <div style={{ display: 'flex', gap: 6 }}>
              <button className="food-btn" style={{ fontSize: 11, padding: '4px 12px' }}
                onClick={addAllSelected} disabled={selectedItems.size === 0 || bulkSaving}>
                {bulkSaving ? 'Enregistrement…' : `Ajouter la sélection (${selectedItems.size})`}
              </button>
              <button className="food-btn" style={{ fontSize: 11, padding: '4px 10px', background: 'var(--border)', color: 'var(--text-muted)' }}
                onClick={() => { setPhotoItems([]); setPreviewImg(null); }}>
                ✕
              </button>
            </div>
          </div>
          {previewImg && (
            <img src={previewImg} alt="Plateau" style={{ width: '100%', maxHeight: 160, objectFit: 'cover', borderRadius: 8, marginBottom: 10 }} />
          )}
          {photoItems.map((item, i) => {
            const checked = selectedItems.has(i);
            return (
              <div key={i} className="meal-row" style={{
                background: checked ? 'var(--accent-bg)' : 'transparent',
                borderRadius: 8, padding: '8px 10px', cursor: 'pointer', marginBottom: 4,
                border: checked ? '1px solid var(--accent-dark)' : '1px solid transparent',
                transition: 'all .15s',
              }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
                  <input type="checkbox" checked={checked} disabled={bulkSaving} aria-label={`Ajouter ${item.name}`}
                    onChange={() => setSelectedItems(s => {
                      const n = new Set(s);
                      n.has(i) ? n.delete(i) : n.add(i);
                      return n;
                    })} />
                  <div>
                    <div className="meal-name">{item.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      ~{item.portionG}g · {Math.round(item.calories)} kcal · P: {item.proteins}g · G: {item.carbs}g · L: {item.fats}g
                    </div>
                    </div>
                  </label>
              </div>
            );
          })}
          <div style={{ marginTop: 10, padding: '8px 10px', background: 'var(--bg-main)', borderRadius: 8, fontSize: 12, color: 'var(--text-muted)' }}>
            Total sélection : <span style={{ color: 'var(--accent)', fontWeight: 600 }}>
              {Math.round(photoItems.filter((_, i) => selectedItems.has(i)).reduce((s, m) => s + m.calories, 0))} kcal
            </span>
            {' · '}P: {Math.round(photoItems.filter((_, i) => selectedItems.has(i)).reduce((s, m) => s + m.proteins, 0))}g
            {' · '}G: {Math.round(photoItems.filter((_, i) => selectedItems.has(i)).reduce((s, m) => s + m.carbs, 0))}g
            {' · '}L: {Math.round(photoItems.filter((_, i) => selectedItems.has(i)).reduce((s, m) => s + m.fats, 0))}g
          </div>
        </div>
      )}

      {/* ── Ajout manuel / pré-rempli par IA ── */}
      {showManual && (
        <div className="card" style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <p className="section-head" style={{ margin: 0 }}>
              {previewImg ? '📷 Analysé par IA — vérifie et ajuste' : 'Ajout manuel'}
            </p>
            {portionNote && previewImg && (
              <span style={{ fontSize: 11, color: 'var(--accent)', background: 'var(--accent-bg)', borderRadius: 6, padding: '2px 8px' }}>
                {portionNote}
              </span>
            )}
          </div>

          {/* Prévisualisation photo */}
          {previewImg && (
            <img
              src={previewImg}
              alt="Aperçu"
              style={{ width: '100%', maxHeight: 180, objectFit: 'cover', borderRadius: 8, marginBottom: 12 }}
            />
          )}

          <div className="manual-meal-form">
            <label>Nom<input className="food-input" placeholder="Nom de l’aliment ou du repas" value={manualForm.name}
              onChange={e => setManualForm(f => ({ ...f, name: e.target.value }))} />
            </label>
            <label>Calories (kcal)<input className="food-input" type="number" min="0" step="any" placeholder="0" value={manualForm.calories}
                onChange={e => setManualForm(f => ({ ...f, calories: e.target.value }))} style={{ width: '100%' }} />
            </label>
            <label>Protéines (g)<input className="food-input" type="number" min="0" step="any" placeholder="0" value={manualForm.proteins}
                onChange={e => setManualForm(f => ({ ...f, proteins: e.target.value }))} style={{ width: '100%' }} />
            </label>
            <label>Glucides (g)<input className="food-input" type="number" min="0" step="any" placeholder="0" value={manualForm.carbs}
                onChange={e => setManualForm(f => ({ ...f, carbs: e.target.value }))} style={{ width: '100%' }} />
            </label>
            <label>Lipides (g)<input className="food-input" type="number" min="0" step="any" placeholder="0" value={manualForm.fats}
                onChange={e => setManualForm(f => ({ ...f, fats: e.target.value }))} style={{ width: '100%' }} />
            </label>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="food-btn" onClick={() => addMeal.mutate({
              name:     manualForm.name,
              calories: Number(manualForm.calories),
              proteins: Number(manualForm.proteins),
              carbs:    Number(manualForm.carbs),
              fats:     Number(manualForm.fats),
            })} disabled={!canSaveManual}>
              Enregistrer
            </button>
            <button className="food-btn" style={{ background: 'var(--border)', color: 'var(--text-muted)' }}
              onClick={() => { setShowManual(false); setPreviewImg(null); setPortionNote(''); }}>
              Annuler
            </button>
          </div>
        </div>
      )}

      <section aria-labelledby="meals-heading">
        <p className="section-head" id="meals-heading">{formatDateLabel(activeDate)} · repas</p>
        {meals.length === 0 && !mealsQuery.isPending && !mealsQuery.isError && (
          <div className="card empty-guidance" role="status">
            Aucun repas noté pour cette journée. Tu peux commencer par une recherche, une photo ou une saisie manuelle.
          </div>
        )}
        {grouped.map(group => (
          <div key={group.value} style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <i className={`ti ${group.icon}`} style={{ fontSize: 13, color: group.color }} />
              <span style={{ fontSize: 11, fontWeight: 600, color: group.color, textTransform: 'uppercase', letterSpacing: '.4px' }}>
                {group.label}
              </span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                — {Math.round(group.meals.reduce((s: number, m: any) => s + m.calories, 0))} kcal notées
              </span>
            </div>
            <div className="card" style={{ padding: '8px 12px' }}>
              {group.meals.map((m: any) => (
                <div key={m.id} className="meal-row">
                  <div>
                    <div className="meal-name">{m.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      P: {Math.round(m.proteins)}g · G: {Math.round(m.carbs)}g · L: {Math.round(m.fats)}g
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span className="meal-kcal">{Math.round(m.calories)} kcal</span>
                    <button type="button" onClick={() => saveMealFavorite(m)} aria-label={`Enregistrer ${m.name} comme favori`} title="Enregistrer comme favori"
                      style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 14 }}>
                      <i className="ti ti-star" aria-hidden="true" />
                    </button>
                    <button type="button" onClick={() => removeMeal.mutate(m.id)} aria-label={`Supprimer ${m.name}`}
                      style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 15 }}>
                      <i className="ti ti-x" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
