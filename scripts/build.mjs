import { mkdir, cp, readFile, writeFile, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { validateFiles } from './validate-data.mjs';
import { validateMorphologyFiles } from './validate-morphology.mjs';
import { validateTreatmentFiles } from './validate-treatment.mjs';
import { generateLibraryCatalog } from './seed-cards.mjs';
const catalog=await generateLibraryCatalog();
console.log('Validated card DB:',catalog.counts);
console.log('Validated treatment questions:', validateTreatmentFiles());
console.log('Validated catalog:', await validateFiles());
const hasMorphology = existsSync('data/morphology-visuals.json');
if (hasMorphology) console.log('Validated morphology illustrations:', validateMorphologyFiles());
const pkg = JSON.parse(await readFile('package.json', 'utf8'));
const outputDirectory = path.resolve('dist');
if (path.dirname(outputDirectory) !== process.cwd() || path.basename(outputDirectory) !== 'dist') throw new Error('Unexpected build output directory');
await rm(outputDirectory, { recursive: true, force: true });
await mkdir(outputDirectory, { recursive: true });
for (const path of ['index.html', 'favicon.svg', 'manifest.webmanifest', 'sw.js', 'src', 'data']) await cp(path, `dist/${path}`, { recursive: true });
await mkdir('dist/assets', {recursive:true});
for(const size of [180,192,512]) await cp(`assets/pathopedia-icon-${size}.png`, `dist/assets/pathopedia-icon-${size}.png`);
await cp('assets/fonts', 'dist/assets/fonts', {recursive:true});
if (hasMorphology) await cp('assets/morphology', 'dist/assets/morphology', {recursive:true});
if (existsSync('data/card-art.json')) {
 const art=JSON.parse(await readFile('data/card-art.json','utf8'));
 const files=[...new Set([...Object.values(art.pathogens),...Object.values(art.diseases)].map(asset=>asset.src))];
 for(const file of files){await mkdir('dist/'+file.slice(0,file.lastIndexOf('/')),{recursive:true});await cp(file,'dist/'+file);}
 console.log('Built card illustrations:',files.length);
}
await writeFile('dist/.nojekyll', '');
console.log(`PATHOPEDIA v${pkg.version}: static build → dist/`);
