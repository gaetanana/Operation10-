import { SetEntry } from '../components/SetTracker';

const STORAGE_KEY = 'operation10.workout-draft.v1';

function isLocalDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const date = new Date(`${value}T00:00:00`);
  return date.getFullYear() === Number(match[1]) &&
    date.getMonth() === Number(match[2]) - 1 &&
    date.getDate() === Number(match[3]);
}

export interface WorkoutDraftExercise {
  _id: string;
  name: string;
  sets?: number | null;
  reps?: number | null;
  weight?: number | null;
  restSeconds?: number | null;
  durationSeconds?: number | null;
  distanceKm?: number | null;
  avgSpeedKmh?: number | null;
  notes?: string | null;
  templateExerciseId?: string;
  performedSets: SetEntry[];
  trackingSets?: { reps: string; weight: string; done: boolean }[];
  effortDone?: boolean;
}

export interface WorkoutDraft {
  date: string;
  type: string;
  templateId: string | null;
  name: string;
  durationMinutes: number;
  notes: string;
  exercises: WorkoutDraftExercise[];
  savedAt: string;
  startedAt?: string;
  activeExerciseId?: string;
}

function isDraft(value: unknown): value is WorkoutDraft {
  if (!value || typeof value !== 'object') return false;
  const draft = value as Partial<WorkoutDraft>;
  return typeof draft.date === 'string' && isLocalDate(draft.date) &&
    typeof draft.type === 'string' &&
    (draft.templateId === null || typeof draft.templateId === 'string') &&
    typeof draft.name === 'string' &&
    Number.isFinite(draft.durationMinutes) &&
    typeof draft.notes === 'string' &&
    Array.isArray(draft.exercises) &&
    draft.exercises.every(ex => Boolean(ex) && typeof ex._id === 'string' &&
      typeof ex.name === 'string' && Array.isArray(ex.performedSets) &&
      (ex.trackingSets === undefined || Array.isArray(ex.trackingSets) && ex.trackingSets.every(row =>
        Boolean(row) && typeof row.reps === 'string' && typeof row.weight === 'string' && typeof row.done === 'boolean')) &&
      (ex.effortDone === undefined || typeof ex.effortDone === 'boolean') &&
      ex.performedSets.every(set => Boolean(set) && Number.isInteger(set.reps) &&
        (set.weight === undefined || Number.isFinite(set.weight)))) &&
    (draft.startedAt === undefined || typeof draft.startedAt === 'string' && !Number.isNaN(Date.parse(draft.startedAt))) &&
    (draft.activeExerciseId === undefined || typeof draft.activeExerciseId === 'string') &&
    typeof draft.savedAt === 'string' && !Number.isNaN(Date.parse(draft.savedAt));
}

export function readWorkoutDraft(): { draft: WorkoutDraft | null; unavailable: boolean } {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return { draft: null, unavailable: false };
    const value: unknown = JSON.parse(stored);
    if (isDraft(value)) return { draft: value, unavailable: false };
    window.localStorage.removeItem(STORAGE_KEY);
    return { draft: null, unavailable: false };
  } catch {
    return { draft: null, unavailable: true };
  }
}

export function writeWorkoutDraft(draft: WorkoutDraft): boolean {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
    return true;
  } catch {
    return false;
  }
}

export function clearWorkoutDraft(): boolean {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}

export function hasWorkoutProgress(draft: WorkoutDraft): boolean {
  return Boolean(draft.name || draft.notes || draft.templateId ||
    draft.exercises.some(ex => ex.performedSets.length > 0 ||
      ex.durationSeconds != null || ex.distanceKm != null || ex.notes));
}
