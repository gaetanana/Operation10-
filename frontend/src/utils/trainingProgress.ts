export interface MatchablePlan {
  key: string;
  templateId: string | null;
  name: string;
  type: string;
  weeklyTarget?: number;
}

interface MatchableWorkout {
  templateId: string | null;
  name: string;
  type: string;
  exercises?: { moduleId?: string | null }[];
}

function words(value: string) {
  return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9 ]/g, ' ').split(/\s+/)
    .filter(word => word.length > 1 && !['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche', 'seance', 'de', 'du', 'et'].includes(word));
}

export function matchWorkoutPlan<T extends MatchablePlan>(workout: MatchableWorkout, plans: T[]): T | null {
  if (workout.exercises?.length && workout.exercises.every(exercise => exercise.moduleId)) return null;
  if (workout.templateId) return plans.find(plan => plan.templateId === workout.templateId) ?? null;
  const candidates = plans.filter(plan => plan.type === workout.type);
  const tokens = new Set(words(workout.name));
  const ranked = candidates.map(plan => ({ plan, score: words(plan.name).filter(word => tokens.has(word)).length }))
    .sort((a, b) => b.score - a.score);
  if (ranked[0]?.score > 0 && ranked[0].score > (ranked[1]?.score ?? 0)) return ranked[0].plan;
  if (candidates.length === 1) return candidates[0];
  return null;
}

export function planWorkoutCount(plan: MatchablePlan, workouts: MatchableWorkout[], plans: MatchablePlan[]) {
  return workouts.filter(workout => matchWorkoutPlan(workout, plans)?.key === plan.key).length;
}

export function programProgress(plans: MatchablePlan[], workouts: MatchableWorkout[]) {
  return {
    target: plans.reduce((total, plan) => total + (plan.weeklyTarget ?? 1), 0),
    completed: plans.reduce((total, plan) =>
      total + Math.min(planWorkoutCount(plan, workouts, plans), plan.weeklyTarget ?? 1), 0),
  };
}

export function planTitle(name: string) {
  return name.replace(/^(?:lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)\s*[·:–—-]\s*/i, '');
}

export function weekWorkouts<T extends { date: string }>(workouts: T[], today = getLocalDateString()) {
  const monday = new Date(`${today}T00:00:00`);
  monday.setDate(monday.getDate() - (monday.getDay() + 6) % 7);
  const sunday = new Date(monday);
  sunday.setDate(sunday.getDate() + 6);
  return workouts.filter(workout => workout.date >= getLocalDateString(monday) && workout.date <= getLocalDateString(sunday));
}
import { getLocalDateString } from './date';
