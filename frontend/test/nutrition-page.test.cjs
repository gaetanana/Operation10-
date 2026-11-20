const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { QueryClient, QueryClientProvider } = require('@tanstack/react-query');

for (const extension of ['.ts', '.tsx']) {
  require.extensions[extension] = (module, filename) => module._compile(ts.transpileModule(
    fs.readFileSync(filename, 'utf8'),
    { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } },
  ).outputText, filename);
}
require.extensions['.css'] = () => {};
const apiPath = require.resolve('../src/services/api.ts');
require.cache[apiPath] = { id: apiPath, filename: apiPath, loaded: true, exports: { __esModule: true, default: {} } };
const { localDate } = require('../src/utils/nutrition.ts');
const NutritionPage = require('../src/pages/NutritionPage.tsx').default;

test('all three meals offer camera, gallery and manual entry without forcing gallery capture', () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  client.setQueryData(['meals', localDate()], []);
  client.setQueryData(['nutrition-goals'], { proteinsGoal: 140, caloriesGoal: null });
  client.setQueryData(['nutrition-routine', localDate()], { shaker: null, shakers: [], creatineGrams: null, lastCreatineGrams: null });
  const html = renderToStaticMarkup(React.createElement(QueryClientProvider, { client }, React.createElement(NutritionPage)));
  const inputs = [...html.matchAll(/<input\b[^>]*type="file"[^>]*>/g)].map(match => match[0]);
  assert.equal(inputs.length, 2);
  const camera = inputs.find(input => input.includes('aria-label="Prendre une photo du repas"'));
  const gallery = inputs.find(input => input.includes('dans la galerie'));
  assert(camera.includes('capture="environment"'));
  assert(!gallery.includes('capture'));
  assert(gallery.includes('accept="image/*"'));
  const cards = html.split('class="nutrition-photo-shortcuts"')[1].split('class="nutrition-panel nutrition-routine"')[0];
  for (const title of ['Petit-déjeuner', 'Déjeuner', 'Dîner']) assert(cards.includes(`<h2>${title}</h2>`));
  assert.equal((cards.match(/>Prendre une photo<\/button>/g) ?? []).length, 3);
  assert.equal((cards.match(/>Choisir dans la galerie<\/button>/g) ?? []).length, 3);
  assert.equal((cards.match(/>Ajouter sans photo<\/button>/g) ?? []).length, 3);
  client.clear();
});
