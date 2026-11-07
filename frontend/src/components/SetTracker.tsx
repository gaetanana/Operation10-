export interface SetEntry {
  reps: number;
  weight?: number;
}

export default function SetTracker({ name, value, onChange }: {
  name: string;
  value: SetEntry[];
  onChange: (sets: SetEntry[]) => void;
}) {
  return (
    <fieldset className="set-tracker">
      <legend>Séries réalisées · {name}</legend>
      <p className="set-hint">Renseigne uniquement les séries effectuées. Le poids est facultatif.</p>
      {value.map((set, i) => (
        <div className="set-entry" key={i}>
          <span className="set-index">{i + 1}</span>
          <label>Reps
            <input className="food-input" type="number" min="1" max="1000" step="1"
              aria-label={`${name}, série ${i + 1}, répétitions`} value={set.reps || ''}
              onChange={e => onChange(value.map((s, n) => n === i ? { ...s, reps: Number(e.target.value) } : s))} />
          </label>
          <label>Kg
            <input className="food-input" type="number" min="0" step="0.5"
              aria-label={`${name}, série ${i + 1}, poids`} value={set.weight ?? ''}
              onChange={e => onChange(value.map((s, n) => n === i
                ? { ...s, weight: e.target.value === '' ? undefined : Number(e.target.value) } : s))} />
          </label>
          <button type="button" className="set-remove" aria-label={`Supprimer ${name}, série ${i + 1}`}
            onClick={() => onChange(value.filter((_, n) => n !== i))}><i className="ti ti-x" aria-hidden="true" /></button>
        </div>
      ))}
      <button type="button" className="secondary-action" disabled={value.length >= 100}
        onClick={() => onChange([...value, { reps: 0 }])}><i className="ti ti-plus" aria-hidden="true" /> Ajouter une série réalisée</button>
    </fieldset>
  );
}

export function validSets(sets: SetEntry[]): boolean {
  return sets.every(s => Number.isInteger(s.reps) && s.reps >= 1 && s.reps <= 1000 &&
    (s.weight === undefined || Number.isFinite(s.weight) && s.weight >= 0));
}
