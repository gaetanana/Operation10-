import { useQuery } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import api from './api';
import { getLocalDateString } from '../utils/date';
import { WorkoutDraft, WorkoutDraftExercise } from '../utils/workoutDraft';

export interface ProgramExercise {
  id?: string;
  name: string;
  weight?: number;
  sets?: number;
  reps?: number;
  durationSeconds?: number | null;
  restSeconds?: number;
  notes?: string;
}

export interface WorkoutPlan {
  key: number;
  name: string;
  type: string;
  dayOfWeek: number;
  templateId: string | null;
  exercises: ProgramExercise[];
}

export interface LoggedExercise {
  id: string;
  name: string;
  templateExerciseId?: string | null;
  performedSets?: { reps: number; weight?: number }[] | null;
  sets?: number | null;
  reps?: number | null;
  weight?: number | null;
  durationSeconds?: number | null;
  notes?: string | null;
}

export interface LoggedWorkout {
  id: string;
  name: string;
  type: string;
  templateId: string | null;
  sourceImport?: string | null;
  date: string;
  durationMinutes: number | null;
  notes?: string;
  exercises: LoggedExercise[];
}

export const DAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi'];
export const PLAN_TITLES = ['Pecs & triceps', 'Dos & biceps', 'Jambes', 'Épaules & bras'];
export const PLAN_ICONS = ['ti-barbell', 'ti-stretching', 'ti-walk', 'ti-weight'];

export function useProgram() {
  return useQuery({
    queryKey: ['personal-program'],
    queryFn: () => api.get<WorkoutPlan[]>('/sport/program').then(r => r.data),
  });
}

export function useWorkouts() {
  return useQuery({
    queryKey: ['sessions'],
    queryFn: () => api.get<LoggedWorkout[]>('/sport/sessions').then(r => r.data),
  });
}

export function weekWorkouts(workouts: LoggedWorkout[], today = getLocalDateString()) {
  const monday = new Date(`${today}T00:00:00`);
  monday.setDate(monday.getDate() - (monday.getDay() + 6) % 7);
  const sunday = new Date(monday);
  sunday.setDate(sunday.getDate() + 6);
  return workouts.filter(w => w.date >= getLocalDateString(monday) && w.date <= getLocalDateString(sunday));
}

export function planCompleted(plan: WorkoutPlan, workouts: LoggedWorkout[]) {
  return workouts.some(w => !w.sourceImport && (plan.templateId ? w.templateId === plan.templateId : w.type === plan.type));
}

export function workoutFromPlan(plan: WorkoutPlan): WorkoutDraft {
  return {
    name: plan.name, type: plan.type, templateId: plan.templateId,
    date: getLocalDateString(), durationMinutes: 1, notes: '',
    savedAt: new Date().toISOString(), startedAt: new Date().toISOString(),
    exercises: plan.exercises.map((ex): WorkoutDraftExercise => ({
      ...ex, _id: ex.id ?? crypto.randomUUID(), templateExerciseId: ex.id,
      performedSets: [],
      trackingSets: ex.durationSeconds ? [] : Array.from({ length: ex.sets ?? 1 }, () => ({
        reps: ex.reps?.toString() ?? '', weight: ex.weight?.toString() ?? '', done: false,
      })),
      effortDone: false,
    })),
  };
}

export function apiError(error: unknown, fallback: string) {
  const message: unknown = error instanceof AxiosError ? error.response?.data?.message : undefined;
  return typeof message === 'string' ? message : Array.isArray(message) && message.every(m => typeof m === 'string')
    ? message.join(' · ') : fallback;
}

export function formatWorkoutDate(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
}
