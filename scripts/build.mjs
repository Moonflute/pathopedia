import { mkdir, cp, readFile, writeFile } from 'node:fs/promises';
const pkg = JSON.parse(await readFile('package.json', 'utf8'));
await mkdir('dist', { recursive: true });
for (const path of ['index.html', 'favicon.svg', 'src', 'data']) await cp(path, `dist/${path}`, { recursive: true });
await writeFile('dist/.nojekyll', '');
console.log(`PATHOPEDIA v${pkg.version}: static build → dist/`);
