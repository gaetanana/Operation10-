import { useQuery } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import api from './api';
import { getLocalDateString } from '../utils/date';
import { WorkoutDraft, draftExercises } from '../utils/workoutDraft';
export { weekWorkouts } from '../utils/trainingProgress';

export interface ProgramExercise {
  id?: string;
  name: string;
  weight?: number;
  sets?: number;
  reps?: number;
  durationSeconds?: number | null;
  restSeconds?: number;
  notes?: string;
  distanceKm?: number | null;
  avgSpeedKmh?: number | null;
  activityType?: string | null;
  moduleId?: string | null;
  moduleName?: string | null;
}

export interface WorkoutPlan {
  key: string;
  name: string;
  type: string;
  weeklyTarget: number;
  durationMinutes?: number | null;
  description?: string | null;
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
  distanceKm?: number | null;
  avgSpeedKmh?: number | null;
  activityType?: string | null;
  moduleId?: string | null;
  moduleName?: string | null;
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

export interface CurrentProgram {
  weeklyMinimum: number;
  weeklyMaximum: number;
  sessions: WorkoutPlan[];
  modules: WorkoutPlan[];
  library: WorkoutPlan[];
}

export function useProgram() {
  return useQuery({
    queryKey: ['personal-program'],
    queryFn: () => api.get<CurrentProgram>('/sport/program').then(r => r.data),
  });
}

export function useWorkouts() {
  return useQuery({
    queryKey: ['sessions'],
    queryFn: () => api.get<LoggedWorkout[]>('/sport/sessions').then(r => r.data),
  });
}

export function workoutFromPlan(plan: WorkoutPlan): WorkoutDraft {
  return {
    name: plan.name, type: plan.type, templateId: plan.templateId,
    date: getLocalDateString(), durationMinutes: 1, notes: '',
    savedAt: new Date().toISOString(), startedAt: new Date().toISOString(),
    exercises: draftExercises(plan.exercises, plan.type),
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
