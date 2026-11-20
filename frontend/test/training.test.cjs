const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');

require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(
  fs.readFileSync(filename, 'utf8'),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } },
).outputText, filename);

const { matchWorkoutPlan, planWorkoutCount, programProgress, weekWorkouts, planTitle } = require('../src/utils/trainingProgress.ts');
const { draftExercises, attachWorkoutModule, workoutExercisePayload, readWorkoutDraft, writeWorkoutDraft } = require('../src/utils/workoutDraft.ts');
const plans = [
  { key: 'pecs', templateId: null, name: 'Lundi · Pecs / triceps', type: 'pecs_triceps', weeklyTarget: 1 },
  { key: 'dos', templateId: null, name: 'Mardi · Dos / biceps', type: 'dos_biceps', weeklyTarget: 1 },
  { key: 'jambes', templateId: null, name: 'Jambes', type: 'jambes', weeklyTarget: 1 },
  { key: 'epaules', templateId: null, name: 'Épaules / bras', type: 'epaules', weeklyTarget: 1 },
];

test('imported workouts count toward the week and matching programme sessions', () => {
  const workouts = [
    { name: 'Pecs / triceps barbare', type: 'pecs_triceps', templateId: null, date: '2026-11-09', sourceImport: 'import' },
    { name: 'Fractionne', type: 'cardio', templateId: null, date: '2026-11-10', sourceImport: 'import' },
    { name: 'Dos / biceps barbare', type: 'dos_biceps', templateId: null, date: '2026-11-11', sourceImport: 'import' },
  ];
  assert.equal(weekWorkouts(workouts, '2026-11-11').length, 3);
  assert.deepEqual(programProgress(plans, workouts), { completed: 2, target: 4 });
});

test('one workout cannot credit two similar sessions and ties remain unassigned', () => {
  const modules = [
    { key: 'push', templateId: null, name: 'EMOM pompes', type: 'emom' },
    { key: 'pull', templateId: null, name: 'EMOM tractions', type: 'emom' },
  ];
  assert.equal(matchWorkoutPlan({ name: 'EMOM tractions du soir', type: 'emom', templateId: null }, modules).key, 'pull');
  assert.equal(matchWorkoutPlan({ name: 'EMOM libre', type: 'emom', templateId: null }, modules), null);
  assert.deepEqual(programProgress(modules, [{ name: 'EMOM pompes', type: 'emom', templateId: null }]), { completed: 1, target: 2 });
});

test('explicit membership wins and weekly repetition targets are capped independently', () => {
  const plan = { ...plans[0], templateId: 'explicit-id', weeklyTarget: 2 };
  const workouts = Array.from({ length: 3 }, () => ({ templateId: 'explicit-id', name: 'Adapted workout', type: 'other' }));
  assert.equal(planWorkoutCount(plan, workouts, [plan]), 3);
  assert.deepEqual(programProgress([plan], workouts), { completed: 2, target: 2 });
  assert.equal(matchWorkoutPlan({ name: 'Unrelated workout', type: plan.type, templateId: 'another-id' }, [plan]), null);
});

test('a session containing only attached modules does not complete its main programme slot', () => {
  const plan = { ...plans[0], templateId: 'main-id' };
  const workout = {
    templateId: 'main-id', name: plan.name, type: plan.type, date: '2026-11-11',
    exercises: [{ moduleId: 'running-module' }],
  };
  assert.equal(weekWorkouts([workout], '2026-11-11').length, 1);
  assert.equal(planWorkoutCount(plan, [workout], [plan]), 0);
  assert.equal(planWorkoutCount(plan, [{ ...workout, exercises: [{ moduleId: null }, ...workout.exercises] }], [plan]), 1);
});

test('a standalone module or another linked model never credits a similarly named main session', () => {
  const plan = { ...plans[0], templateId: 'main-id' };
  const workout = {
    templateId: 'module-id', name: plan.name, type: plan.type, date: '2026-11-11',
    exercises: [{ moduleId: null }],
  };
  assert.equal(weekWorkouts([workout], '2026-11-11').length, 1);
  assert.equal(planWorkoutCount(plan, [workout], [plan]), 0);
});

test('weeks use local Monday through Sunday boundaries, not weekdays fixed to plans', () => {
  const dates = ['2026-11-08', '2026-11-09', '2026-11-11', '2026-11-15', '2026-11-16'].map(date => ({ date }));
  assert.deepEqual(weekWorkouts(dates, '2026-11-15').map(row => row.date), ['2026-11-09', '2026-11-11', '2026-11-15']);
  assert.equal(planTitle('Lundi · Pecs / triceps'), 'Pecs / triceps');
  assert.equal(planTitle('Course du dimanche'), 'Course du dimanche');
  assert.equal(planTitle('Bloc A · Force'), 'Bloc A · Force');
});

function draft() {
  return {
    name: 'Workout', type: 'pecs_triceps', templateId: null, date: '2026-11-11',
    durationMinutes: 45, notes: '', savedAt: '2026-11-11T12:00:00.000Z',
    exercises: draftExercises([{ name: 'Bench', sets: 3, reps: 8, weight: 20 }], 'pecs_triceps'),
  };
}
const run = {
  key: 'run', templateId: null, name: 'Course', type: 'cardio', weeklyTarget: 1,
  exercises: [{ name: 'Course a pied', durationSeconds: 1800, distanceKm: 5 }],
};

test('planned sets and timed modules are never automatically marked as performed', () => {
  const original = draft();
  const combined = attachWorkoutModule(original, run);
  assert.equal(original.exercises.length, 1);
  assert.equal(combined.exercises.length, 2);
  assert.equal(combined.exercises[0], original.exercises[0]);
  assert.equal(combined.exercises[1].moduleName, 'Course');
  assert.equal(combined.exercises[1].activityType, 'cardio');
  assert.equal(combined.exercises[1].effortDone, false);
  assert.deepEqual(workoutExercisePayload(combined.exercises), []);
  assert.ok(combined.exercises[0].trackingSets.every(row => row.done === false));
});

test('modules share one session payload and only validated efforts are saved', () => {
  const combined = attachWorkoutModule(draft(), run);
  combined.exercises[0].performedSets = [{ reps: 8, weight: 20 }];
  combined.exercises[1].effortDone = true;
  const payload = workoutExercisePayload(combined.exercises);
  assert.equal(payload.length, 2);
  assert.deepEqual(payload[0].performedSets, [{ reps: 8, weight: 20 }]);
  assert.equal(payload[1].moduleName, 'Course');
  assert.equal(payload[1].durationSeconds, 1800);
  assert.equal(payload[1].distanceKm, 5);
  assert.equal(payload[1].avgSpeedKmh, 10);
  assert.equal(combined.name, 'Workout');
  assert.equal(combined.templateId, null);
  const twice = attachWorkoutModule(combined, run);
  assert.notEqual(twice.exercises[1].moduleId, twice.exercises[2].moduleId);
  assert.notEqual(twice.exercises[1]._id, twice.exercises[2]._id);
  assert.equal(workoutExercisePayload(twice.exercises).length, 2, 'The newly attached module is still unconfirmed');
});

test('standalone cardio starts with an editable effort and old drafts remain compatible', () => {
  const cardio = draftExercises([{ name: 'Free run' }], 'cardio')[0];
  assert.equal(cardio.durationSeconds, 0);
  assert.deepEqual(cardio.trackingSets, []);
  const storage = new Map();
  global.window = { localStorage: {
    getItem: key => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, value),
    removeItem: key => storage.delete(key),
  } };
  const legacy = draft();
  delete legacy.exercises[0].activityType;
  assert.equal(writeWorkoutDraft(legacy), true);
  assert.deepEqual(readWorkoutDraft().draft, JSON.parse(JSON.stringify(legacy)));
  const combined = attachWorkoutModule(legacy, run);
  assert.equal(writeWorkoutDraft(combined), true);
  assert.deepEqual(readWorkoutDraft().draft, JSON.parse(JSON.stringify(combined)));
  assert.ok(storage.has('operation10.workout-draft.v1'));
});
