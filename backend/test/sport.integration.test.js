const { test } = require('node:test');
const assert = require('node:assert/strict');
require('reflect-metadata');
const { DataSource } = require('typeorm');
const { plainToInstance } = require('class-transformer');
const { validate } = require('class-validator');
const { Session, SessionTemplate, Exercise, SessionType, TrainingProgram } = require('../dist/sport/sport.entity');
const { SportService } = require('../dist/sport/sport.service');
const { CreateSessionDto, ImportWorkoutHistoryDto, UpdatePersonalProgramDto, UpdateCurrentProgramDto, CreateProgramTemplateDto } = require('../dist/sport/sport.dto');
const { referenceProgram } = require('../dist/sport/sport.reference');
const { randomUUID } = require('node:crypto');
const { InitialSchema1762369200000 } = require('../dist/migrations/1762369200000-InitialSchema');
const { SessionTemplateWeeklyTarget1794043200000 } = require('../dist/migrations/1794043200000-SessionTemplateWeeklyTarget');
const { PerformedSets1794056400000 } = require('../dist/migrations/1794056400000-PerformedSets');
const { WorkoutHistoryImport1794150000000 } = require('../dist/migrations/1794150000000-WorkoutHistoryImport');
const { FlexibleTrainingProgram1794434400000 } = require('../dist/migrations/1794434400000-FlexibleTrainingProgram');

test('PostgreSQL metadata supports nullable template and module fields', async () => {
  const source = new DataSource({ type: 'postgres', entities: [Session, SessionTemplate, Exercise, TrainingProgram] });
  await source.buildMetadatas();
  assert.equal(source.getMetadata(Session).findColumnWithPropertyName('templateId').type, 'varchar');
  assert.equal(source.getMetadata(Exercise).findColumnWithPropertyName('moduleName').type, 'varchar');
});

test('nested performed sets reject invalid repetitions', async () => {
  const dto = plainToInstance(CreateSessionDto, {
    name: 'Test session', type: SessionType.PECS_TRICEPS, date: '2026-11-07',
    exercises: [{ name: 'Test exercise', performedSets: [{ reps: -1, weight: 10 }] }],
  });
  assert((await validate(dto)).length > 0);
});

test('history import validates its source hash and nested workout data', async () => {
  const valid = {
    sourceHash: 'a'.repeat(64),
    sessions: [{
      name: 'Course', type: SessionType.CARDIO, date: '2026-11-08',
      exercises: [{ name: 'Course à pied', performedSets: [{ reps: 1 }] }],
    }],
  };
  assert.deepEqual(await validate(plainToInstance(ImportWorkoutHistoryDto, valid)), []);
  assert((await validate(plainToInstance(ImportWorkoutHistoryDto, {
    ...valid, sessions: [{ ...valid.sessions[0], exercises: [{ name: 'Course', performedSets: [{ reps: 0 }] }] }],
  }))).length > 0);
  assert((await validate(plainToInstance(ImportWorkoutHistoryDto, { ...valid, sourceHash: 'bad' }))).length > 0);
});

function personalProgramFixture(initial = []) {
  const rows = structuredClone(initial).map(row => ({ type: SessionType.OTHER, weeklyTarget: 1, ...row }));
  const programs = [];
  const repositoryFor = records => ({
    async find() { return structuredClone(records); },
    async findOneBy(where) {
      return structuredClone(records.find(row => Object.entries(where).every(([key, value]) => row[key] === value)) ?? null);
    },
    create(data) { return { weeklyTarget: 1, dayOfWeek: 0, ...data }; },
    async save(data) {
      const saved = { ...data, id: data.id ?? randomUUID() };
      const index = records.findIndex(row => row.id === saved.id);
      if (index < 0) records.push(saved); else records[index] = saved;
      return structuredClone(saved);
    },
    async remove(row) { records.splice(records.findIndex(record => record.id === row.id), 1); },
  });
  const repository = repositoryFor(rows);
  const programRepo = repositoryFor(programs);
  const manager = {
    query: async () => [],
    getRepository: entity => entity === TrainingProgram ? programRepo : repository,
    async transaction(fn) {
      const snapshot = structuredClone({ rows, programs });
      try { return await fn(manager); } catch (error) {
        rows.splice(0, rows.length, ...snapshot.rows);
        programs.splice(0, programs.length, ...snapshot.programs);
        throw error;
      }
    },
  };
  repository.manager = manager;
  return { service: new SportService({}, repository, {}, programRepo), rows, programs };
}

test('personal programme is readable without creating templates or performances', async () => {
  const { service, rows } = personalProgramFixture([{ id: randomUUID(), name: 'Legacy', templateExercises: [] }]);
  const program = await service.getPersonalProgram();
  assert.equal(program.sessions.length, 4);
  assert.equal(program.weeklyMinimum, 4);
  assert.equal(program.weeklyMaximum, 7);
  assert.deepEqual(program.sessions.map(p => p.exercises[0].weight), [32, 25, 150, 47.5]);
  assert(program.sessions.every(p => p.templateId === null));
  assert.equal(program.library.length, 5);
  assert.equal(rows.length, 1, 'Reading must not write or delete templates');
});

test('preparing twice reuses the same workout and exercise ids', async () => {
  const { service, rows } = personalProgramFixture();
  const first = await service.preparePersonalWorkout(0);
  const second = await service.preparePersonalWorkout(0);
  assert.equal(first.templateId, second.templateId);
  assert.deepEqual(first.exercises, second.exercises);
  assert.equal(first.exercises.find(e => e.name === 'EMOM pompes').durationSeconds, 600);
  assert.equal(rows.length, 1);
  await assert.rejects(service.preparePersonalWorkout(-1), /introuvable/);
  await assert.rejects(service.preparePersonalWorkout(4), /introuvable/);
});

test('existing imports are reused and edits retain exercise identity and old templates', async () => {
  const exerciseId = randomUUID();
  const templateId = randomUUID();
  const oldId = randomUUID();
  const { service, rows } = personalProgramFixture([
    { id: oldId, name: 'Ancien contrat', templateExercises: [{ id: randomUUID(), name: 'Old lift', weight: 99 }] },
    { id: templateId, name: referenceProgram[0].name, templateExercises: [{ id: exerciseId, name: 'DC haltères', weight: 34 }] },
  ]);
  const prepared = await service.preparePersonalWorkout(0);
  assert.equal(prepared.templateId, templateId);
  assert.equal(prepared.exercises[0].weight, 34, 'Do not overwrite a personalised programme');
  const updated = await service.preparePersonalWorkout(0, {
    exercises: [{ id: exerciseId, name: 'DC haltères', weight: 36, sets: 3, reps: 8 }],
  });
  assert.equal(updated.exercises[0].id, exerciseId);
  assert.equal((await service.getPersonalProgram()).sessions[0].exercises[0].weight, 36);
  assert.equal(rows.length, 5, 'The four reference templates and legacy template are preserved');
  assert.equal(rows.find(t => t.id === oldId).templateExercises[0].weight, 99);
});

test('programme edits validate nested exercises and reject empty programmes', async () => {
  for (const body of [
    { exercises: [] },
    { exercises: [{ name: 'Lift', weight: -10 }] },
    { exercises: [{ name: '', reps: 0 }] },
    { exercises: [{ id: 'invalid', name: 'Lift' }] },
  ]) {
    assert((await validate(plainToInstance(UpdatePersonalProgramDto, body))).length > 0);
  }
  assert.deepEqual(await validate(plainToInstance(UpdatePersonalProgramDto, {
    exercises: [{ name: 'Lift', weight: 37.5, sets: 3, reps: 8 }],
  })), []);
});

test('old imported finishers gain a duration without overriding an explicit choice', async () => {
  const { service } = personalProgramFixture([{
    id: randomUUID(), name: referenceProgram[0].name, templateExercises: [
      { id: randomUUID(), name: 'EMOM pompes', notes: 'Finisher' },
    ],
  }]);
  const plan = (await service.getPersonalProgram()).sessions[0];
  assert.equal(plan.exercises[0].durationSeconds, 600);
  const updated = await service.preparePersonalWorkout(0, {
    exercises: [{ ...plan.exercises[0], durationSeconds: null }],
  });
  assert.equal(updated.exercises[0].durationSeconds, null);
  assert.equal((await service.getPersonalProgram()).sessions[0].exercises[0].durationSeconds, null);
});

test('programme membership and order can change without rewriting legacy workouts', async () => {
  const legacyId = randomUUID();
  const { service, rows, programs } = personalProgramFixture([
    { id: legacyId, name: 'Evening run', type: SessionType.CARDIO, templateExercises: [{ id: randomUUID(), name: 'Run', durationSeconds: 1800 }] },
  ]);
  const result = await service.updateCurrentProgram({
    sessionKeys: ['reference-2', 'reference-0', 'reference-1', 'reference-3'],
    moduleKeys: [legacyId], weeklyMinimum: 4, weeklyMaximum: 6,
  });
  assert.equal(result.sessions[0].type, SessionType.JAMBES);
  assert.equal(result.modules[0].templateId, legacyId);
  assert.equal(result.weeklyMaximum, 6);
  assert.equal(programs.length, 1);
  assert.equal(rows.length, 5);
  const renamed = await service.preparePersonalWorkout(result.sessions[0].key, {
    name: 'Legs whenever', exercises: result.sessions[0].exercises,
  });
  assert.equal((await service.getPersonalProgram()).sessions[0].name, 'Legs whenever');
  assert.equal(renamed.templateId, result.sessions[0].templateId);
  const library = (await service.getPersonalProgram()).library;
  assert.equal(library.length, rows.length, 'Renaming a reference must not recreate its old virtual name');
  assert(!library.some(plan => plan.name === referenceProgram[2].name));
  await assert.rejects(service.updateCurrentProgram({
    sessionKeys: [legacyId], moduleKeys: [legacyId], weeklyMinimum: 4, weeklyMaximum: 7,
  }), /une fois/);
  await assert.rejects(service.updateCurrentProgram({
    sessionKeys: [legacyId], moduleKeys: [], weeklyMinimum: 7, weeklyMaximum: 4,
  }), /minimum/);
  assert.equal((await service.getPersonalProgram()).sessions[0].name, 'Legs whenever');
});

test('custom sessions and reusable modules join the same current programme', async () => {
  const { service, rows } = personalProgramFixture();
  const module = await service.createProgramTemplate({
    role: 'module', name: 'EMOM test', type: SessionType.EMOM,
    exercises: [{ name: 'Push-ups', durationSeconds: 600 }],
  });
  const session = await service.createProgramTemplate({
    role: 'session', name: 'Extra session', type: SessionType.OTHER,
    exercises: [{ name: 'Extra lift', sets: 3, reps: 8 }],
  });
  const program = await service.getPersonalProgram();
  assert.equal(program.sessions.length, 5);
  assert.equal(program.modules.length, 1);
  assert.equal(program.modules[0].templateId, module.templateId);
  assert.equal((await service.preparePersonalWorkout(session.key)).name, 'Extra session');
  assert.equal(rows.length, 6);
  await service.removeTemplate(module.templateId);
  assert.equal((await service.getPersonalProgram()).modules.length, 0);
  assert.equal((await service.getPersonalProgram()).sessions.length, 5);
});

test('default reference names cannot be duplicated by creating a custom workout', async () => {
  const { service, rows, programs } = personalProgramFixture();
  await assert.rejects(service.createProgramTemplate({
    role: 'session', name: referenceProgram[0].name, type: SessionType.PECS_TRICEPS,
    exercises: [{ name: 'Lift' }],
  }), /déjà/);
  assert.equal(rows.length, 0);
  assert.equal(programs.length, 0);
});

test('flexible programme and module fields are validated', async () => {
  assert.deepEqual(await validate(plainToInstance(UpdateCurrentProgramDto, {
    sessionKeys: ['reference-0'], moduleKeys: [], weeklyMinimum: 4, weeklyMaximum: 7,
  })), []);
  for (const body of [
    { sessionKeys: [], moduleKeys: [], weeklyMinimum: 4, weeklyMaximum: 7 },
    { sessionKeys: ['reference-0', 'reference-0'], moduleKeys: [], weeklyMinimum: 4, weeklyMaximum: 7 },
    { sessionKeys: ['reference-9'], moduleKeys: [], weeklyMinimum: 4, weeklyMaximum: 7 },
    { sessionKeys: ['reference-0'], moduleKeys: [], weeklyMinimum: 4, weeklyMaximum: 8 },
  ]) assert((await validate(plainToInstance(UpdateCurrentProgramDto, body))).length > 0);
  assert.deepEqual(await validate(plainToInstance(CreateSessionDto, {
    name: 'With module', type: SessionType.OTHER, date: '2026-11-11',
    exercises: [{ name: 'Run', activityType: SessionType.CARDIO, moduleId: randomUUID(), moduleName: 'Running', durationSeconds: 1200, distanceKm: 3 }],
  })), []);
  assert((await validate(plainToInstance(CreateProgramTemplateDto, {
    role: 'module', name: ' ', type: SessionType.EMOM, exercises: [{ name: ' ' }],
  }))).length > 0);
  assert((await validate(plainToInstance(CreateSessionDto, {
    name: 'Invalid module', type: SessionType.OTHER, date: '2026-11-11',
    exercises: [{ name: 'Run', activityType: 'invalid', moduleId: 'invalid' }],
  }))).length > 0);
});

test('renaming a reference cannot duplicate an unprepared reference name', async () => {
  const { service, rows, programs } = personalProgramFixture();
  await assert.rejects(service.preparePersonalWorkout('reference-0', {
    name: referenceProgram[1].name, exercises: [{ name: 'Lift' }],
  }), /déjà/);
  assert.equal(rows.length, 0);
  assert.equal(programs.length, 0);
});

test('strength progress uses actual performed sets, not planned summary weights', async () => {
  const rows = [
    { name: 'Planned lift', date: '2026-11-06', performedSets: null, weight: 150 },
    { name: 'Bench press', date: '2026-11-06', performedSets: '[{"reps":8,"weight":20}]' },
    { name: 'Bench press', date: '2026-11-07', performedSets: [{ reps: 8, weight: 22 }, { reps: 6, weight: 24 }] },
    { name: 'Bench press', date: '2026-11-07', performedSets: [{ reps: 10, weight: 21 }] },
    { name: 'Invalid set', date: '2026-11-06', performedSets: [{ reps: 0, weight: 50 }] },
  ];
  const query = {
    innerJoin() { return this; },
    select() { return this; },
    addSelect() { return this; },
    where() { return this; },
    orderBy() { return this; },
    addOrderBy() { return this; },
    async getRawMany() { return rows; },
  };
  const service = new SportService({}, {}, { createQueryBuilder: () => query });
  assert.deepEqual(await service.getStrengthProgress(), [{
    name: 'Bench press',
    data: [
      { date: '2026-11-06', weight: 20 },
      { date: '2026-11-07', weight: 24 },
    ],
  }]);
  assert.deepEqual(await service.getStrengthProgress('bench'), [{
    name: 'Bench press',
    data: [
      { date: '2026-11-06', weight: 20 },
      { date: '2026-11-07', weight: 24 },
    ],
  }]);
});

test('PostgreSQL migrations preserve old rows; imports and sessions are atomic', {
  skip: !process.env.SPORT_TEST_DATABASE_URL,
}, async () => {
  const url = new URL(process.env.SPORT_TEST_DATABASE_URL);
  assert.equal(url.pathname, '/operation10_sport_test', 'Use a dedicated test database');
  assert(['localhost', '127.0.0.1'].includes(url.hostname), 'Only local test databases are allowed');
  const options = {
    type: 'postgres', url: url.toString(), entities: [Session, SessionTemplate, Exercise, TrainingProgram],
    synchronize: false,
  };
  let ds = new DataSource({ ...options, migrations: [InitialSchema1762369200000] });
  try {
    await ds.initialize();
    await ds.runMigrations();
    await ds.query(`INSERT INTO session_templates (name,type,"dayOfWeek") VALUES ('Legacy','other',0)`);
    await ds.destroy();
    ds = new DataSource({ ...options, migrations: [
      InitialSchema1762369200000, SessionTemplateWeeklyTarget1794043200000, PerformedSets1794056400000,
      WorkoutHistoryImport1794150000000,
      FlexibleTrainingProgram1794434400000,
    ] });
    await ds.initialize();
    await ds.runMigrations();
    const templates = ds.getRepository(SessionTemplate);
    const sessions = ds.getRepository(Session);
    const exercises = ds.getRepository(Exercise);
    const service = new SportService(sessions, templates, exercises, ds.getRepository(TrainingProgram));
    assert.equal((await templates.findOneByOrFail({ name: 'Legacy' })).weeklyTarget, 1);
    const program = { templates: [{
      name: 'Test programme', type: SessionType.PECS_TRICEPS, weeklyTarget: 1,
      exercises: [{ name: 'Test lift', weight: 20 }],
    }] };
    const [template] = await service.importProgram(program);
    assert.equal(template.templateExercises[0].weight, 20);
    assert.equal(await sessions.count(), 0, 'Reference import must not create performances');
    await assert.rejects(service.importProgram(program), /déjà/);
    assert.equal(await templates.count(), 2);
    await assert.rejects(service.importProgram({ templates: [
      { name: 'Rollback template', type: SessionType.OTHER, exercises: [] },
      { name: 'Invalid template', type: 'invalid-enum', exercises: [] },
    ] }));
    assert.equal(await templates.count(), 2, 'Failed import must roll back all templates');
    const saved = await service.createSession({
      name: 'Test session', type: SessionType.PECS_TRICEPS, date: '2026-11-07',
      exercises: [{
        name: 'Test lift', templateExerciseId: template.templateExercises[0].id,
        performedSets: [{ reps: 8, weight: 20 }, { reps: 8, weight: 22 }, { reps: 6, weight: 22 }],
      }],
    });
    const actual = await service.findSessionById(saved.id);
    assert.equal(actual.exercises[0].sets, 3);
    assert.equal(actual.exercises[0].reps, null);
    assert.equal(actual.exercises[0].weight, 22);
    assert.deepEqual(actual.exercises[0].performedSets.map(s => s.reps), [8, 8, 6]);
    await service.createSession({
      name: 'Second test session', type: SessionType.PECS_TRICEPS, date: '2026-11-06',
      exercises: [
        { name: 'Test lift', performedSets: [{ reps: 8, weight: 24 }] },
        { name: 'Reference-only lift', weight: 99 },
      ],
    });
    const progress = await service.getStrengthProgress();
    assert.deepEqual(progress, [{
      name: 'Test lift',
      data: [
        { date: '2026-11-06', weight: 24 },
        { date: '2026-11-07', weight: 22 },
      ],
    }], 'Progress uses performed sets only, never template or legacy summary weights');
    await assert.rejects(service.createSession({
      name: 'Rollback session', type: SessionType.OTHER, date: '2026-11-07',
      exercises: [{ name: 'Invalid exercise', templateExerciseId: 'not-a-uuid' }],
    }));
    assert.equal(await sessions.count(), 2, 'Failed exercise must roll back its session');
    await service.updateExercise(actual.exercises[0].id, { performedSets: [], name: 'Test lift' });
    assert.equal((await exercises.findOneByOrFail({ id: actual.exercises[0].id })).weight, null);
    assert.deepEqual(await service.getStrengthProgress(), [], 'Removing performed sets removes the progress point');
    const history = {
      sourceHash: 'a'.repeat(64),
      sessions: [{
        name: 'Imported run', type: SessionType.CARDIO, date: '2026-11-08',
        exercises: [{ name: 'Run', durationSeconds: 2856, distanceKm: 10.01 }],
      }],
    };
    assert.deepEqual(await service.importHistory(history), { imported: 1, duplicate: false });
    assert.deepEqual(await service.importHistory(history), { imported: 1, duplicate: true });
    assert.equal(await sessions.count(), 3, 'Replaying a history import must not create duplicates');
    const imported = await sessions.findOneByOrFail({ sourceImport: history.sourceHash, sourceIndex: 0 });
    assert.equal(imported.exercises[0].distanceKm, 10.01);
    const module = await service.createProgramTemplate({
      role: 'module', name: 'Running module', type: SessionType.CARDIO,
      exercises: [{ name: 'Run', durationSeconds: 1800 }],
    });
    assert.equal(await sessions.count(), 3, 'Programme edits never create performances');
    const moduleId = randomUUID();
    const combined = await service.createSession({
      name: 'Strength and running', type: SessionType.PECS_TRICEPS, date: '2026-11-11',
      exercises: [
        { name: 'Lift', performedSets: [{ reps: 8, weight: 20 }] },
        { name: 'Run', activityType: SessionType.CARDIO, moduleId, moduleName: module.name, durationSeconds: 1200, distanceKm: 3 },
      ],
    });
    assert.equal(await sessions.count(), 4, 'Attached modules create only one session');
    assert.equal((await service.findSessionById(combined.id)).exercises[1].moduleId, moduleId);
    const [security] = await ds.query("SELECT relrowsecurity FROM pg_class WHERE relname = 'training_programs'");
    assert.equal(security.relrowsecurity, true);
  } finally {
    if (ds.isInitialized) await ds.destroy();
  }
});
