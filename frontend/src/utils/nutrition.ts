export type Nutrient = 'calories' | 'proteins' | 'carbs' | 'fats';
export const nutrients: Nutrient[] = ['calories', 'proteins', 'carbs', 'fats'];
export type NutritionValues = Record<Nutrient, number | null>;
export type PhotoItem = NutritionValues & { name: string; portionG?: number };

export function parsePhotoFood(value: unknown): PhotoItem {
  if (!value || typeof value !== 'object') throw new Error('Résultat photo invalide.');
  const item = value as Record<string, unknown>;
  if (typeof item.name !== 'string' || !item.name.trim()) throw new Error('Aliment sans nom.');
  const number = (key: Nutrient) => {
    const raw = item[key];
    if (raw == null) return null;
    if (typeof raw !== 'number' || !Number.isFinite(raw) || raw < 0) throw new Error('Valeur nutritionnelle invalide.');
    return raw;
  };
  if (item.portionG != null && (typeof item.portionG !== 'number' || !Number.isFinite(item.portionG) || item.portionG <= 0)) throw new Error('Portion invalide.');
  return { name: item.name, calories: number('calories'), proteins: number('proteins'), carbs: number('carbs'), fats: number('fats'), portionG: typeof item.portionG === 'number' ? item.portionG : undefined };
}

export function summarizeValues(entries: NutritionValues[], nutrient: Nutrient) {
  const known = entries.filter(entry => entry[nutrient] != null);
  return {
    value: known.reduce((sum, entry) => sum + (entry[nutrient] ?? 0), 0),
    known: known.length,
    total: entries.length,
    complete: entries.length > 0 && known.length === entries.length,
  };
}

export function scaleValues(values: NutritionValues, factor: number): NutritionValues {
  const scale = (value: number | null) => value == null ? null : Math.round(value * factor * 10) / 10;
  return { calories: scale(values.calories), proteins: scale(values.proteins), carbs: scale(values.carbs), fats: scale(values.fats) };
}

export function localDate(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function offsetDate(value: string, days: number): string {
  const date = new Date(`${value}T00:00:00`);
  date.setDate(date.getDate() + days);
  return localDate(date);
}

export function weekStart(value: string): string {
  const day = new Date(`${value}T00:00:00`).getDay();
  return offsetDate(value, -((day + 6) % 7));
}
