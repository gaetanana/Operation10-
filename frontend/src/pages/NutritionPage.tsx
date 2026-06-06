import { useRef, useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';

// Recalcule les macros d'un aliment pour une quantité donnée (base 100g)
function scale(val: number, grams: number) {
  return Math.round((val * grams / 100) * 10) / 10;
}

const GOALS = { calories: 2500, proteins: 180, carbs: 250, fats: 80 };

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
  { value: 'breakfast', label: 'Petit-déjeuner', icon: 'ti-coffee',    color: '#ffcc40' },
  { value: 'lunch',     label: 'Déjeuner',       icon: 'ti-sun',       color: '#40c0ff' },
  { value: 'dinner',    label: 'Dîner',           icon: 'ti-moon',      color: '#c040ff' },
  { value: 'snack',     label: 'Collation',       icon: 'ti-apple',     color: '#a0ff40' },
];

function getMealTypeConfig(value: string) {
  return MEAL_TYPES.find(m => m.value === value) ?? MEAL_TYPES[1];
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

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['meals', activeDate] });
    qc.invalidateQueries({ queryKey: ['totals', activeDate] });
  };

  const { data: meals = [] } = useQuery({
    queryKey: ['meals', activeDate],
    queryFn: () => api.get(`/nutrition/meals?date=${activeDate}`).then(r => r.data),
  });

  const { data: totals = { calories: 0, proteins: 0, carbs: 0, fats: 0 } } = useQuery({
    queryKey: ['totals', activeDate],
    queryFn: () => api.get(`/nutrition/totals?date=${activeDate}`).then(r => r.data),
  });

  const addMeal = useMutation({
    mutationFn: (data: any) => api.post('/nutrition/meals', { ...data, date: activeDate, mealType }),
    onSuccess: () => {
      invalidate();
      setResults([]);
      setQuantities({});
      setSearch('');
      setPreviewImg(null);
      setPhotoItems([]);
      setSelectedItems(new Set());
      setManualForm({ name: '', calories: '', proteins: '', carbs: '', fats: '' });
      setShowManual(false);
    },
  });

  // Ajoute tous les aliments sélectionnés du plateau en une fois
  const addAllSelected = useCallback(async () => {
    const toAdd = photoItems.filter((_, i) => selectedItems.has(i));
    for (const item of toAdd) {
      await api.post('/nutrition/meals', {
        name: item.name,
        calories: item.calories,
        proteins: item.proteins,
        carbs: item.carbs,
        fats: item.fats,
        date: activeDate,
        mealType,
      });
    }
    invalidate();
    setPhotoItems([]);
    setSelectedItems(new Set());
    setPreviewImg(null);
  }, [photoItems, selectedItems, mealType]);

  const removeMeal = useMutation({
    mutationFn: (id: string) => api.delete(`/nutrition/meals/${id}`),
    onSuccess: invalidate,
  });

  const handleSearch = async () => {
    if (!search.trim()) return;
    setSearching(true);
    try {
      const res = await api.get(`/nutrition/search?q=${encodeURIComponent(search)}`);
      setResults(res.data);
    } finally {
      setSearching(false);
    }
  };

  // ── Analyse photo ──────────────────────────────────────────────────────────
  const handlePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAnalyzing(true);
    setPreviewImg(null);

    try {
      // Convertir en base64
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(',')[1]); // Retirer le préfixe data:image/...;base64,
        };
        reader.readAsDataURL(file);
      });

      // Prévisualisation
      setPreviewImg(URL.createObjectURL(file));

      const mediaType = file.type || 'image/jpeg';
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
    } catch (err: any) {
      alert(`Erreur analyse : ${err?.response?.data?.message ?? err?.message ?? 'inconnue'}`);
    } finally {
      setAnalyzing(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const [portionNote, setPortionNote] = useState('');

  const pct = (val: number, goal: number) => Math.min(Math.round((val / goal) * 100), 100);
  const grouped = groupMealsByType(meals);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Nutrition</h1>
          <p className="page-sub">
            {Math.round(totals.calories)} / {GOALS.calories} kcal
          </p>
        </div>
        {/* Navigateur de date */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
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
            onClick={() => setActiveDate(d => offsetDate(d, 1))}
            disabled={isToday}
            style={{ background: 'var(--border)', border: 'none', borderRadius: 7, width: 32, height: 32, cursor: isToday ? 'default' : 'pointer', color: isToday ? 'var(--border-md)' : 'var(--text-muted)', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <i className="ti ti-chevron-right" />
          </button>
          {!isToday && (
            <button
              onClick={() => setActiveDate(getLocalToday())}
              style={{ background: 'var(--accent-bg)', border: '1px solid var(--accent-dark)', borderRadius: 7, padding: '5px 12px', cursor: 'pointer', color: 'var(--accent)', fontSize: 11, fontFamily: 'inherit' }}
            >
              Aujourd'hui
            </button>
          )}
        </div>
      </div>

      {/* ── Compteurs macro ── */}
      <div className="stat-row">
        <div className="stat-card accent">
          <div className="stat-val">{Math.round(totals.calories)}</div>
          <div className="stat-lbl">{isToday ? "kcal aujourd'hui" : "kcal ce jour"}</div>
        </div>
        <div className="stat-card">
          <div className="stat-val">{Math.max(0, GOALS.calories - Math.round(totals.calories))}</div>
          <div className="stat-lbl">kcal restantes</div>
        </div>
        <div className="stat-card">
          <div className="stat-val">{Math.round(totals.proteins)} g</div>
          <div className="stat-lbl">Protéines</div>
        </div>
        <div className="stat-card">
          <div className="stat-val">{Math.round(totals.carbs)} g</div>
          <div className="stat-lbl">Glucides</div>
        </div>
      </div>

      {/* ── Sélecteur moment de la journée ── */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {MEAL_TYPES.map(t => (
          <button
            key={t.value}
            onClick={() => setMealType(t.value)}
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
        <i className="ti ti-bottle" style={{ fontSize: 20, color: '#a0ff40', flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}>Shaker protéines</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            {shakerScoops} scoop{shakerScoops > 1 ? 's' : ''} × 30g — {shakerScoops * SHAKER_PER_SCOOP.calories} kcal · P: {shakerScoops * SHAKER_PER_SCOOP.proteins}g
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
                onClick={addAllSelected} disabled={selectedItems.size === 0}>
                Ajouter la sélection ({selectedItems.size})
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
              }} onClick={() => setSelectedItems(s => {
                const n = new Set(s);
                n.has(i) ? n.delete(i) : n.add(i);
                return n;
              })}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
                  <div style={{
                    width: 18, height: 18, borderRadius: 4, flexShrink: 0,
                    background: checked ? 'var(--accent)' : 'var(--border)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {checked && <i className="ti ti-check" style={{ fontSize: 11, color: '#000' }} />}
                  </div>
                  <div>
                    <div className="meal-name">{item.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      ~{item.portionG}g · {Math.round(item.calories)} kcal · P: {item.proteins}g · G: {item.carbs}g · L: {item.fats}g
                    </div>
                  </div>
                </div>
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

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', gap: 8, marginBottom: 10 }}>
            <input className="food-input" placeholder="Nom" value={manualForm.name}
              onChange={e => setManualForm(f => ({ ...f, name: e.target.value }))} />
            <div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 3, textTransform: 'uppercase' }}>kcal</div>
              <input className="food-input" type="number" placeholder="0" value={manualForm.calories}
                onChange={e => setManualForm(f => ({ ...f, calories: e.target.value }))} style={{ width: '100%' }} />
            </div>
            <div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 3, textTransform: 'uppercase' }}>Prot. g</div>
              <input className="food-input" type="number" placeholder="0" value={manualForm.proteins}
                onChange={e => setManualForm(f => ({ ...f, proteins: e.target.value }))} style={{ width: '100%' }} />
            </div>
            <div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 3, textTransform: 'uppercase' }}>Gluc. g</div>
              <input className="food-input" type="number" placeholder="0" value={manualForm.carbs}
                onChange={e => setManualForm(f => ({ ...f, carbs: e.target.value }))} style={{ width: '100%' }} />
            </div>
            <div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 3, textTransform: 'uppercase' }}>Lip. g</div>
              <input className="food-input" type="number" placeholder="0" value={manualForm.fats}
                onChange={e => setManualForm(f => ({ ...f, fats: e.target.value }))} style={{ width: '100%' }} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="food-btn" onClick={() => addMeal.mutate({
              name:     manualForm.name,
              calories: Number(manualForm.calories),
              proteins: Number(manualForm.proteins),
              carbs:    Number(manualForm.carbs),
              fats:     Number(manualForm.fats),
            })} disabled={!manualForm.name.trim()}>
              Enregistrer
            </button>
            <button className="food-btn" style={{ background: 'var(--border)', color: 'var(--text-muted)' }}
              onClick={() => { setShowManual(false); setPreviewImg(null); setPortionNote(''); }}>
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* ── Layout principal ── */}
      <div className="cols-2">
        {/* Macros */}
        <div>
          <p className="section-head">Macros du jour</p>
          <div className="card">
            {[
              { label: 'Protéines', val: totals.proteins, goal: GOALS.proteins, color: 'var(--accent)' },
              { label: 'Glucides',  val: totals.carbs,    goal: GOALS.carbs,    color: 'var(--cyan)' },
              { label: 'Lipides',   val: totals.fats,     goal: GOALS.fats,     color: 'var(--orange)' },
            ].map(({ label, val, goal, color }) => (
              <div key={label} style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 5 }}>
                  <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
                  <span style={{ color: 'var(--text-muted)' }}>{Math.round(val)} / {goal} g</span>
                </div>
                <div style={{ height: 6, background: 'var(--border)', borderRadius: 99, overflow: 'hidden' }}>
                  <div style={{ width: `${pct(val, goal)}%`, height: '100%', background: color, borderRadius: 99, transition: 'width .4s' }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Repas groupés par moment */}
        <div>
          <p className="section-head">Repas du jour</p>
          {meals.length === 0 && (
            <div className="card">
              <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Aucun repas enregistré.</p>
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
                  — {Math.round(group.meals.reduce((s: number, m: any) => s + m.calories, 0))} kcal
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span className="meal-kcal">{Math.round(m.calories)} kcal</span>
                      <button onClick={() => removeMeal.mutate(m.id)}
                        style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 15 }}>
                        <i className="ti ti-x" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
