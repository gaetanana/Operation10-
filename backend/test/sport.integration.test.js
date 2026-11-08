const { test } = require('node:test');
const assert = require('node:assert/strict');
require('reflect-metadata');
const { DataSource } = require('typeorm');
const { plainToInstance } = require('class-transformer');
const { validate } = require('class-validator');
const { Session, SessionTemplate, Exercise, SessionType } = require('../dist/sport/sport.entity');
const { SportService } = require('../dist/sport/sport.service');
const { CreateSessionDto, UpdatePersonalProgramDto } = require('../dist/sport/sport.dto');
const { referenceProgram } = require('../dist/sport/sport.reference');
const { randomUUID } = require('node:crypto');
const { InitialSchema1762369200000 } = require('../dist/migrations/1762369200000-InitialSchema');
const { SessionTemplateWeeklyTarget1794043200000 } = require('../dist/migrations/1794043200000-SessionTemplateWeeklyTarget');
const { PerformedSets1794056400000 } = require('../dist/migrations/1794056400000-PerformedSets');

test('nested performed sets reject invalid repetitions', async () => {
  const dto = plainToInstance(CreateSessionDto, {
    name: 'Test session', type: SessionType.PECS_TRICEPS, date: '2026-11-07',
    exercises: [{ name: 'Test exercise', performedSets: [{ reps: -1, weight: 10 }] }],
  });
  assert((await validate(dto)).length > 0);
});

function personalProgramFixture(initial = []) {
  const rows = structuredClone(initial);
  const repository = {
    async find() { return structuredClone(rows); },
    create(data) { return { ...data }; },
    async save(data) {
      const saved = { ...data, id: data.id ?? randomUUID() };
      const index = rows.findIndex(row => row.id === saved.id);
      if (index < 0) rows.push(saved); else rows[index] = saved;
      return structuredClone(saved);
    },
    manager: {
      async transaction(fn) {
        return fn({ query: async () => [], getRepository: () => repository });
      },
    },
  };
  return { service: new SportService({}, repository, {}), rows };
}

test('personal programme is readable without creating templates or performances', async () => {
  const { service, rows } = personalProgramFixture([{ id: randomUUID(), name: 'Legacy', templateExercises: [] }]);
  const program = await service.getPersonalProgram();
  assert.equal(program.length, 4);
  assert.deepEqual(program.map(p => p.exercises[0].weight), [32, 25, 150, 47.5]);
  assert(program.every(p => p.templateId === null));
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
  assert.equal((await service.getPersonalProgram())[0].exercises[0].weight, 36);
  assert.equal(rows.length, 2);
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
  const plan = (await service.getPersonalProgram())[0];
  assert.equal(plan.exercises[0].durationSeconds, 600);
  const updated = await service.preparePersonalWorkout(0, {
    exercises: [{ ...plan.exercises[0], durationSeconds: null }],
  });
  assert.equal(updated.exercises[0].durationSeconds, null);
  assert.equal((await service.getPersonalProgram())[0].exercises[0].durationSeconds, null);
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
    type: 'postgres', url: url.toString(), entities: [Session, SessionTemplate, Exercise],
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
    ] });
    await ds.initialize();
    await ds.runMigrations();
    const templates = ds.getRepository(SessionTemplate);
    const sessions = ds.getRepository(Session);
    const exercises = ds.getRepository(Exercise);
    const service = new SportService(sessions, templates, exercises);
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
    assert.equal(await sessions.count(), 1, 'Failed exercise must roll back its session');
    await service.updateExercise(actual.exercises[0].id, { performedSets: [], name: 'Test lift' });
    assert.equal((await exercises.findOneByOrFail({ id: actual.exercises[0].id })).weight, null);
    assert.deepEqual(await service.getStrengthProgress(), [], 'Removing performed sets removes the progress point');
  } finally {
    if (ds.isInitialized) await ds.destroy();
  }
});
