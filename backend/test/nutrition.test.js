const { test } = require('node:test');
const assert = require('node:assert/strict');
require('reflect-metadata');
const { DataSource } = require('typeorm');
const { plainToInstance } = require('class-transformer');
const { validate } = require('class-validator');
const { Meal, MealFavorite, NutritionSettings, NutritionRoutineDay } = require('../dist/nutrition/nutrition.entity');
const { NutritionService } = require('../dist/nutrition/nutrition.service');
const { CreateMealDto, CreateMealsDto, FavoriteEntryDto, NutritionGoalsDto, ShakerPortionDto, ConfirmShakerDto, CreatineEntryDto, AnalyzeImageDto } = require('../dist/nutrition/nutrition.dto');

test('nutrition columns support unknown values and retain postgres metadata', async () => {
  const source = new DataSource({ type: 'postgres', entities: [Meal, MealFavorite, NutritionSettings, NutritionRoutineDay] });
  await source.buildMetadatas();
  for (const name of ['calories', 'proteins', 'carbs', 'fats', 'quantityGrams', 'source']) {
    assert.equal(source.getMetadata(Meal).findColumnWithPropertyName(name).isNullable, true);
  }
  assert(source.getMetadata(Meal).indices.some(index => index.name === 'UQ_meals_routine_slot' && index.isUnique));
  assert.equal(source.getMetadata(NutritionSettings).findColumnWithPropertyName('shaker').type, 'jsonb');
});

test('DTOs accept missing nutrients and zero while rejecting invalid quantities and goals', async () => {
  assert.deepEqual(await validate(plainToInstance(CreateMealDto, { name: 'Repas', date: '2026-11-12', calories: 0, proteins: null })), []);
  assert((await validate(plainToInstance(CreateMealDto, { name: 'Repas', date: '2026-11-12', quantityGrams: -1 }))).length);
  assert((await validate(plainToInstance(FavoriteEntryDto, { name: 'Repas', source: 'other' }))).length);
  assert((await validate(plainToInstance(NutritionGoalsDto, { caloriesGoal: -1 }))).length);
  assert((await validate(plainToInstance(CreateMealsDto, { meals: [{ name: 'Repas', date: '2026-11-12', calories: -1 }] }))).length);
  assert((await validate(plainToInstance(CreateMealsDto, { meals: [] }))).length);
});

test('routine DTOs require deliberate confirmations and exact protein values, not assumed macros', async () => {
  const shaker = { name: 'Whey', quantityGrams: 40, proteins: 30, calories: null, carbs: 0 };
  assert.deepEqual(await validate(plainToInstance(ShakerPortionDto, shaker)), []);
  assert((await validate(plainToInstance(ShakerPortionDto, { ...shaker, proteins: null }))).length);
  assert((await validate(plainToInstance(ShakerPortionDto, { ...shaker, quantityGrams: 0 }))).length);
  assert((await validate(plainToInstance(ConfirmShakerDto, { date: '2026-11-16', taken: 'true' }))).length);
  assert((await validate(plainToInstance(CreatineEntryDto, { date: '2026-11-16', grams: -1 }))).length);
  assert((await validate(plainToInstance(CreatineEntryDto, { date: '2026-11-16', grams: Infinity }))).length);
  assert((await validate(plainToInstance(AnalyzeImageDto, { base64: 'fixture', note: 'x'.repeat(1001) }))).length);
});

function routineFixture() {
  const rows = [];
  const days = new Map();
  let nextId = 0;
  const settings = { id: 'current', caloriesGoal: 2200, proteinsGoal: 140, shaker: null };
  const repo = {
    find: async ({ where } = {}) => structuredClone(where && typeof where.routineSlot === 'object'
      ? rows.filter(row => row.date === where.date && row.routineSlot != null)
      : rows.filter(row => !where?.date || row.date === where.date)),
    findOneBy: async where => rows.find(row => Object.entries(where).every(([key, value]) => row[key] === value)) ?? null,
    create: value => structuredClone(value),
    save: async value => {
      if (Array.isArray(value)) { rows.push(...value); return value; }
      const saved = { ...value, id: value.id ?? String(++nextId) };
      const index = rows.findIndex(row => row.id === saved.id);
      if (index < 0) rows.push(saved);
      else rows[index] = saved;
      return saved;
    },
    remove: async row => rows.splice(rows.indexOf(row), 1),
  };
  const settingsRepo = {
    findOneBy: async () => structuredClone(settings),
    upsert: async value => Object.assign(settings, value),
  };
  let queue = Promise.resolve();
  const manager = {
    query: async (sql, params) => { assert.match(sql, /pg_advisory_xact_lock/); assert(params[0].includes('2026-11')); },
    getRepository: entity => entity === Meal ? repo : settingsRepo,
    transaction: fn => { const next = queue.then(() => fn(manager)); queue = next.catch(() => {}); return next; },
  };
  repo.manager = manager;
  const routineRepo = {
    findOneBy: async ({ date }) => days.get(date) ?? null,
    findOne: async ({ where }) => [...days.values()].filter(row => row.date <= where.date.value && row.creatineGrams != null).sort((a, b) => b.date.localeCompare(a.date))[0] ?? null,
    upsert: async value => days.set(value.date, value),
    delete: async ({ date }) => days.delete(date),
  };
  return { service: new NutritionService(repo, {}, settingsRepo, routineRepo), rows, settings, days };
}

test('two confirmed shaker slots contribute once each and snapshots survive product changes', async () => {
  const { service, rows, settings } = routineFixture();
  await assert.rejects(() => service.confirmShaker('2026-11-16', 1, true), /Configure/);
  await service.configureShaker({ name: 'Whey', quantityGrams: 40, proteins: 30 });
  assert.equal(settings.proteinsGoal, 140);
  await Promise.all([service.confirmShaker('2026-11-16', 1, true), service.confirmShaker('2026-11-16', 1, true)]);
  assert.equal(rows.length, 1, 'retries cannot duplicate a serving');
  await service.confirmShaker('2026-11-16', 2, true);
  assert.equal(rows.length, 2);
  assert.deepEqual(await service.getDailyTotals('2026-11-16'), { proteins: 60, calories: null, carbs: null, fats: null });
  await service.configureShaker({ name: 'Autre whey', quantityGrams: 30, proteins: 22, calories: 120 });
  assert(rows.every(row => row.proteins === 30 && row.calories == null));
  await service.updateGoals({ proteinsGoal: 150 });
  assert.equal(settings.shaker.proteins, 22, 'editing a goal must not overwrite product configuration');
  await service.confirmShaker('2026-11-16', 1, false);
  await service.confirmShaker('2026-11-16', 1, false);
  assert.equal(rows.length, 1);
  assert.equal((await service.getRoutine('2026-11-16')).shakers.length, 1);
  await service.confirmShaker('2026-11-16', 1, true);
  assert.equal(rows.find(row => row.routineSlot === 1).proteins, 22);
});

test('editing or deleting the journal shaker is reflected in the routine without a second meal', async () => {
  const { service, rows } = routineFixture();
  await service.configureShaker({ name: 'Whey', quantityGrams: 40, proteins: 30 });
  const first = await service.confirmShaker('2026-11-16', 1, true);
  await service.update(first.id, { proteins: 25 });
  assert.equal((await service.getRoutine('2026-11-16')).shakers[0].proteins, 25);
  assert.equal((await service.confirmShaker('2026-11-16', 1, true)).proteins, 25);
  assert.equal(rows.length, 1);
  await service.remove(first.id);
  assert.equal((await service.getRoutine('2026-11-16')).shakers.length, 0);
  const second = await service.confirmShaker('2026-11-16', 1, true);
  assert.notEqual(second.id, first.id);
  assert.equal(rows.length, 1);
});

test('creatine is separate from food macros and never automatically confirmed on another day', async () => {
  const { service, rows, days } = routineFixture();
  await service.logCreatine('2026-11-16', 3);
  await service.logCreatine('2026-11-16', 6);
  assert.equal(days.size, 1, 'the entered amount is the daily total, not a second dose');
  assert.equal(rows.length, 0);
  const next = await service.getRoutine('2026-11-17');
  assert.equal(next.creatineGrams, null);
  assert.equal(next.lastCreatineGrams, 6);
  assert.equal((await service.getRoutine('2026-11-15')).lastCreatineGrams, null, 'never suggest a future entry');
  await service.logCreatine('2026-11-16', 0);
  assert.equal((await service.getRoutine('2026-11-16')).creatineGrams, 0);
  await service.clearCreatine('2026-11-16');
  assert.equal(days.size, 0);
  await assert.rejects(() => service.confirmShaker('2026-11-16', 3, true));
  await assert.rejects(() => service.logCreatine('2026-02-30', 3));
});

test('copying yesterday never implicitly confirms routine shakers', async () => {
  const { service, rows } = routineFixture();
  rows.push({ name: 'Repas', date: '2026-11-16', proteins: 35, routineSlot: null }, { name: 'Whey', date: '2026-11-16', proteins: 30, routineSlot: 1 });
  const copied = await service.duplicateDay('2026-11-16', '2026-11-17');
  assert.equal(copied.length, 1);
  assert.equal(copied[0].name, 'Repas');
  assert.equal(copied[0].date, '2026-11-17');
});

test('Groq photo analysis sends images and notes without a paid-provider fallback', async () => {
  const previousKey = process.env.GROQ_API_KEY;
  const previousAnthropicKey = process.env.ANTHROPIC_API_KEY;
  const previousFetch = global.fetch;
  try {
    const service = new NutritionService({}, {}, {}, {});
    delete process.env.GROQ_API_KEY;
    process.env.ANTHROPIC_API_KEY = 'must-not-be-used';
    global.fetch = async () => { assert.fail('A missing Groq key must not call another provider'); };
    await assert.rejects(() => service.analyzeImage('fixture', 'image/jpeg'), error => error.getStatus() === 503);
    process.env.GROQ_API_KEY = 'test-fixture';
    let request;
    global.fetch = async (url, options) => {
      request = { url, options, body: JSON.parse(options.body) };
      return { ok: true, json: async () => ({ choices: [{ finish_reason: 'stop', message: { content: '{"type":"single","name":"Poulet","portionG":120,"proteins":30,"calories":null}' } }] }) };
    };
    const result = await service.analyzeImage('fixture', 'image/jpeg', 'sauce non consommée');
    assert.equal(result.proteins, 30);
    assert.equal(result.calories, null);
    assert.equal(result.portionG, 120);
    assert.equal(request.url, 'https://api.groq.com/openai/v1/chat/completions');
    assert.equal(request.options.headers.Authorization, 'Bearer test-fixture');
    assert(request.options.signal instanceof AbortSignal);
    assert.equal(request.body.model, 'qwen/qwen3.8-27b');
    assert.deepEqual(request.body.response_format, { type: 'json_object' });
    assert.deepEqual(request.body.messages[0].content[0], { type: 'image_url', image_url: { url: 'data:image/jpeg;base64,fixture' } });
    const prompt = request.body.messages[0].content[1].text;
    assert(prompt.includes('sauce non consommée'));
    assert(prompt.includes('null, jamais zéro'));
    assert(request.body.max_completion_tokens >= 2048);
    service.logger = { error: () => {} };
    global.fetch = async () => ({ ok: false, status: 401 });
    await assert.rejects(() => service.analyzeImage('fixture', 'image/jpeg'), error => error.getStatus() === 502);
    let calls = 0;
    global.fetch = async url => {
      calls++;
      assert.equal(url, 'https://api.groq.com/openai/v1/chat/completions');
      return { ok: false, status: 429 };
    };
    await assert.rejects(() => service.analyzeImage('fixture', 'image/jpeg'), error => error.getStatus() === 429 && error.message.includes('Quota'));
    assert.equal(calls, 1, 'quota errors must not retry or fall back to another provider');
    for (const invalid of [
      {},
      { choices: [] },
      { choices: [{ finish_reason: 'stop', message: { content: 'réponse incomplète' } }] },
      { choices: [{ finish_reason: 'length', message: { content: '{"type":"single","name":"Poulet","proteins":30}' } }] },
      { choices: [{ finish_reason: 'stop', message: { content: null } }] },
    ]) {
      global.fetch = async () => ({ ok: true, json: async () => invalid });
      await assert.rejects(() => service.analyzeImage('fixture', 'image/jpeg'), error => error.getStatus() === 502);
    }
    global.fetch = async () => { throw new Error('Network fixture error'); };
    await assert.rejects(() => service.analyzeImage('fixture', 'image/jpeg'), error => error.getStatus() === 502 && !error.message.includes('fixture'));
  } finally {
    if (previousKey === undefined) delete process.env.GROQ_API_KEY;
    else process.env.GROQ_API_KEY = previousKey;
    if (previousAnthropicKey === undefined) delete process.env.ANTHROPIC_API_KEY;
    else process.env.ANTHROPIC_API_KEY = previousAnthropicKey;
    global.fetch = previousFetch;
  }
});

test('copy and favorites preserve quantity, unknown macros and legacy item details', async () => {
  const meal = { name: 'Repas', date: '2026-11-11', mealType: 'lunch', calories: 200, proteins: null, carbs: 0, fats: 4, quantityGrams: 250, source: 'photo', items: [{ name: 'Riz', quantity: '250 g' }] };
  const saved = [];
  const repo = { find: async () => [meal], create: value => value, save: async values => { saved.push(...values); return values; } };
  const favs = { findOneBy: async () => ({ entries: [{ ...meal }] }) };
  const service = new NutritionService(repo, favs, {});
  await service.duplicateDay('2026-11-11', '2026-11-12');
  await service.applyFavorite('fav', '2026-11-12');
  for (const entry of saved) {
    assert.equal(entry.quantityGrams, 250);
    assert.equal(entry.proteins, null);
    assert.equal(entry.carbs, 0);
    assert.equal(entry.source, 'photo');
    assert.deepEqual(entry.items, meal.items);
  }
  await assert.rejects(() => service.duplicateDay('2026-11-12', '2026-11-12'));
});

test('daily totals do not report unknown nutrients as zero', async () => {
  const repo = { find: async () => [{ calories: 100, proteins: null, carbs: 0, fats: 5 }] };
  const service = new NutritionService(repo, {}, {});
  assert.deepEqual(await service.getDailyTotals('2026-11-12'), { calories: 100, proteins: null, carbs: 0, fats: 5 });
  assert.throws(() => service.findRange('2026-02-30', '2026-03-01'));
  assert.throws(() => service.findRange('2026-01-01', '2026-03-01'));
});
