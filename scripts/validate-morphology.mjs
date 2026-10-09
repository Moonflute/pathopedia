import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(here, '..');
const fail = message => { throw new Error(`morphology catalog: ${message}`); };
const nonempty = value => typeof value === 'string' && value.trim().length > 0;
const slug = value => typeof value === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);

export function validateMorphologyCatalog(catalog, data, sources) {
  if (!catalog || typeof catalog !== 'object') fail('missing catalog');
  if (catalog.schemaVersion !== 1) fail('schemaVersion must be 1');
  if (!nonempty(catalog.illustrationNotice)) fail('illustration notice is empty');
  if (!Array.isArray(catalog.assets) || !catalog.assets.length) fail('assets are missing');
  if (!Array.isArray(catalog.taxa) || !catalog.taxa.length) fail('taxa are missing');
  if (!data || !Array.isArray(data.records)) fail('dataset records are missing');
  if (!sources || typeof sources !== 'object' || Array.isArray(sources)) fail('sources are missing');

  const assets = new Map();
  for (const asset of catalog.assets) {
    if (!slug(asset?.id)) fail(`invalid asset id: ${asset?.id ?? ''}`);
    if (assets.has(asset.id)) fail(`duplicate asset id: ${asset.id}`);
    if (asset.src !== `./assets/morphology/${asset.id}.webp`) fail(`bad asset path: ${asset.src}`);
    if (asset.width !== 512 || asset.height !== 512) fail(`asset dimensions must be square 512: ${asset.id}`);
    if (!nonempty(asset.alt)) fail(`asset alt is empty: ${asset.id}`);
    assets.set(asset.id, asset);
  }

  const recordsByTaxon = new Map();
  for (const record of data.records) {
    if (!slug(record?.taxonId)) fail(`record has invalid taxonId: ${record?.id ?? 'unknown'}`);
    const hint = record?.hints?.morphology;
    if (!nonempty(hint?.text) || !Array.isArray(hint.sourceIds) || !hint.sourceIds.length) fail(`record has invalid morphology hint: ${record?.id ?? 'unknown'}`);
    const group = recordsByTaxon.get(record.taxonId) ?? [];
    group.push(record); recordsByTaxon.set(record.taxonId, group);
  }

  const taxa = new Map();
  const usedAssets = new Set();
  for (const entry of catalog.taxa) {
    if (!slug(entry?.taxonId)) fail(`invalid taxon id: ${entry?.taxonId ?? ''}`);
    if (taxa.has(entry.taxonId)) fail(`duplicate taxon: ${entry.taxonId}`);
    const records = recordsByTaxon.get(entry.taxonId);
    if (!records) fail(`unknown taxon: ${entry.taxonId}`);
    if (entry.visualId !== `taxon-${entry.taxonId}` || !assets.has(entry.visualId)) fail(`bad taxon asset: ${entry.taxonId}`);
    if (usedAssets.has(entry.visualId)) fail(`shared taxon asset: ${entry.visualId}`);
    if (!nonempty(entry.caption) || !nonempty(entry.modality)) fail(`missing caption or modality: ${entry.taxonId}`);
    if (!Array.isArray(entry.recordIds) || entry.recordIds.length !== records.length || new Set(entry.recordIds).size !== entry.recordIds.length) fail(`bad record IDs: ${entry.taxonId}`);
    const expectedIds = records.map(record => record.id).sort();
    if (entry.recordIds.slice().sort().some((id, index) => id !== expectedIds[index])) fail(`record IDs do not match taxon: ${entry.taxonId}`);
    if (!Array.isArray(entry.sourceIds) || !entry.sourceIds.length) fail(`source IDs are empty: ${entry.taxonId}`);
    const allowedSources = new Set(records.flatMap(record => record.hints.morphology.sourceIds));
    for (const sourceId of entry.sourceIds) {
      if (!Object.hasOwn(sources, sourceId)) fail(`unknown source: ${sourceId}`);
      if (!allowedSources.has(sourceId)) fail(`source does not belong to morphology hint: ${entry.taxonId}/${sourceId}`);
    }
    if (!Array.isArray(entry.referenceUrls) || !entry.referenceUrls.length || entry.referenceUrls.some(url => !/^https:\/\//.test(url))) fail(`invalid morphology references: ${entry.taxonId}`);
    taxa.set(entry.taxonId, entry); usedAssets.add(entry.visualId);
  }

  if (taxa.size !== recordsByTaxon.size) fail(`missing taxa: expected ${recordsByTaxon.size}, found ${taxa.size}`);
  for (const taxonId of recordsByTaxon.keys()) if (!taxa.has(taxonId)) fail(`missing taxon: ${taxonId}`);
  for (const id of assets.keys()) if (!usedAssets.has(id)) fail(`unused asset: ${id}`);
  if (assets.size !== taxa.size) fail(`one visual per taxon required: ${assets.size}/${taxa.size}`);
  return { records: data.records.length, taxa: taxa.size, assets: assets.size };
}

export function validateMorphologyFiles(root = repositoryRoot) {
  const catalog = JSON.parse(readFileSync(join(root, 'data', 'morphology-visuals.json'), 'utf8'));
  const data = JSON.parse(readFileSync(join(root, 'data', 'organisms.json'), 'utf8'));
  const sources = JSON.parse(readFileSync(join(root, 'data', 'sources.json'), 'utf8'));
  const result = validateMorphologyCatalog(catalog, data, sources);
  for (const asset of catalog.assets) {
    const path = join(root, asset.src.slice(2));
    if (!existsSync(path)) fail(`asset file is missing: ${asset.id}`);
    const header = readFileSync(path).subarray(0, 12);
    if (header.length < 12 || header.toString('ascii', 0, 4) !== 'RIFF' || header.toString('ascii', 8, 12) !== 'WEBP') fail(`invalid WEBP header: ${asset.id}`);
  }
  return result;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) console.log(JSON.stringify(validateMorphologyFiles()));
