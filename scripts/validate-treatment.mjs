import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const nonempty = value => typeof value === 'string' && value.trim().length > 0;
const fail = message => { throw new Error(`treatment catalog: ${message}`); };
export function validateTreatmentCatalog(catalog) {
  if (!catalog || catalog.schemaVersion !== 1 || !nonempty(catalog.datasetVersion) || !/^\d{4}-\d{2}-\d{2}$/.test(catalog.checkedAt || '') || !nonempty(catalog.scope)) fail('invalid metadata');
  if (catalog.reviewStatus !== 'educational-draft') fail('unverified clinical review status');
  if (!Array.isArray(catalog.tracks) || catalog.tracks.length !== 3 || new Set(catalog.tracks.map(t => t.id)).size !== 3 || !['empiric','pathogen','disease'].every(id => catalog.tracks.some(t => t.id === id))) fail('invalid tracks');
  for (const t of catalog.tracks) if (!nonempty(t.name) || !nonempty(t.description)) fail(`incomplete track ${t.id}`);
  if (!catalog.sources || Array.isArray(catalog.sources) || !Object.keys(catalog.sources).length) fail('missing sources');
  for (const [id, s] of Object.entries(catalog.sources)) {
    if (![s.title, s.organization, s.region, s.note].every(nonempty) || !Number.isInteger(s.year) || s.year < 2000 || !/^https:\/\//.test(s.url || '') || s.accessedAt !== catalog.checkedAt) fail(`invalid source ${id}`);
  }
  if (!Array.isArray(catalog.questions) || !catalog.questions.length) fail('missing questions');
  const ids = new Set();
  for (const q of catalog.questions) {
    if (!/^[a-z0-9-]+$/.test(q.id || '') || ids.has(q.id)) fail(`duplicate or invalid question ${q.id}`);
    ids.add(q.id);
    if (!catalog.tracks.some(t => t.id === q.track)) fail(`unknown track ${q.id}`);
    if (![q.title, q.topic, q.case, q.prompt, q.evidence].every(nonempty)) fail(`incomplete question ${q.id}`);
    if (!Array.isArray(q.context) || q.context.length < 2 || q.context.some(c => !nonempty(c.label) || !nonempty(c.value))) fail(`missing clinical context ${q.id}`);
    if (!Array.isArray(q.options) || q.options.length !== 4 || new Set(q.options.map(o => o.id)).size !== 4 || new Set(q.options.map(o => o.text)).size !== 4 || q.options.some(o => !/^[a-d]$/.test(o.id) || !nonempty(o.text) || !nonempty(o.rationale))) fail(`invalid options ${q.id}`);
    if (!q.options.some(o => o.id === q.answerId)) fail(`invalid answer ${q.id}`);
    if (!q.explanation || !Array.isArray(q.explanation.reasoning) || !q.explanation.reasoning.length || !q.explanation.reasoning.every(nonempty) || !['regimen','alternatives','reassess','pearl'].every(key => nonempty(q.explanation[key]))) fail(`incomplete explanation ${q.id}`);
    if (!Array.isArray(q.sourceRefs) || !q.sourceRefs.length || q.sourceRefs.some(ref => !Object.hasOwn(catalog.sources, ref.id) || !nonempty(ref.section))) fail(`unknown or imprecise source ${q.id}`);
  }
  for (const t of catalog.tracks) if (!catalog.questions.some(q => q.track === t.id)) fail(`empty track ${t.id}`);
  return { questions: ids.size, tracks: Object.fromEntries(catalog.tracks.map(t => [t.id, catalog.questions.filter(q => q.track === t.id).length])), sources: Object.keys(catalog.sources).length };
}
export function validateTreatmentFiles() {
  return validateTreatmentCatalog(JSON.parse(readFileSync(new URL('../data/treatment-questions.json', import.meta.url), 'utf8')));
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) console.log(validateTreatmentFiles());
