const { test } = require('node:test');
const assert = require('node:assert/strict');
require('reflect-metadata');
const { DataSource } = require('typeorm');
const { plainToInstance } = require('class-transformer');
const { validate } = require('class-validator');
const { Session, SessionTemplate, Exercise, SessionType } = require('../dist/sport/sport.entity');
const { SportService } = require('../dist/sport/sport.service');
const { CreateSessionDto } = require('../dist/sport/sport.dto');
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
    await assert.rejects(service.createSession({
      name: 'Rollback session', type: SessionType.OTHER, date: '2026-11-07',
      exercises: [{ name: 'Invalid exercise', templateExerciseId: 'not-a-uuid' }],
    }));
    assert.equal(await sessions.count(), 1, 'Failed exercise must roll back its session');
    await service.updateExercise(actual.exercises[0].id, { performedSets: [], name: 'Test lift' });
    assert.equal((await exercises.findOneByOrFail({ id: actual.exercises[0].id })).weight, null);
  } finally {
    if (ds.isInitialized) await ds.destroy();
  }
});
