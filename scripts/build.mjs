import { mkdir, cp, readFile, writeFile } from 'node:fs/promises';
const pkg = JSON.parse(await readFile('package.json', 'utf8'));
await mkdir('dist', { recursive: true });
for (const path of ['index.html', 'favicon.svg', 'manifest.webmanifest', 'sw.js', 'src', 'data']) await cp(path, `dist/${path}`, { recursive: true });
await mkdir('dist/assets', {recursive:true});
for(const size of [180,192,512]) await cp(`assets/pathopedia-icon-${size}.png`, `dist/assets/pathopedia-icon-${size}.png`);
await writeFile('dist/.nojekyll', '');
console.log(`PATHOPEDIA v${pkg.version}: static build → dist/`);
