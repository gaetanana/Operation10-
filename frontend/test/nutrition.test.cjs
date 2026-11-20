const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(
  fs.readFileSync(filename, 'utf8'),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } },
).outputText, filename);
const { summarizeValues, scaleValues, weekStart, offsetDate, parsePhotoFood } = require('../src/utils/nutrition.ts');

test('photo estimates preserve unknowns and reject invalid macro or portion shapes', () => {
  const parsed = parsePhotoFood({ name: 'Poulet', proteins: 30, fats: 0, portionG: 120 });
  assert.equal(parsed.proteins, 30);
  assert.equal(parsed.fats, 0);
  assert.equal(parsed.calories, null);
  assert.equal(parsed.carbs, null);
  for (const invalid of [null, {}, { name: 'Riz', proteins: '30' }, { name: 'Riz', fats: -1 }, { name: 'Riz', portionG: Infinity }, { name: 'Riz', proteins: NaN }]) {
    assert.throws(() => parsePhotoFood(invalid));
  }
});

test('known zero is complete but unknown values remain partial', () => {
  const entries = [{ calories: 0 }, { calories: null }, { calories: 100 }];
  assert.deepEqual(summarizeValues(entries, 'calories'), { value: 100, known: 2, total: 3, complete: false });
  assert.deepEqual(summarizeValues([{ calories: 0 }], 'calories'), { value: 0, known: 1, total: 1, complete: true });
  assert.equal(summarizeValues([], 'calories').complete, false);
});

test('portion scaling preserves unknown values', () => {
  assert.deepEqual(scaleValues({ calories: 100, proteins: null, carbs: 10, fats: 0 }, 1.5),
    { calories: 150, proteins: null, carbs: 15, fats: 0 });
});

test('nutrition weeks run locally from Monday to Sunday', () => {
  assert.equal(weekStart('2026-11-15'), '2026-11-09');
  assert.equal(offsetDate(weekStart('2026-11-15'), 6), '2026-11-15');
  assert.equal(weekStart('2026-11-16'), '2026-11-16');
});
