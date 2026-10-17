import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { publishArtCatalog } from './save-card-art.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const moduleIndex = args.indexOf('--module-dir');
const moduleDir = moduleIndex >= 0 ? path.resolve(args[moduleIndex + 1]) : null;
const require = createRequire(moduleDir ? path.join(moduleDir, 'package.json') : import.meta.url);
const sharp = require('sharp');
const planDirectory = args.includes('--immune') ? 'assets/cards/immune-production-v1' : args.includes('--drugs') ? 'assets/cards/drug-production-v1' : 'assets/cards/production-v1';
const planFile = path.join(root, planDirectory, 'jobs.json');
const plan = JSON.parse(await fs.readFile(planFile, 'utf8'));
if (plan.jobs.some(job => job.status !== 'ready' || job.needsRepair)) {
  throw new Error('Finish the planned illustrations before publishing the full web catalog.');
}

const expectedDirectory = path.join(root, 'assets', 'cards', 'illustrations-v1') + path.sep;
let cursor = 0;
let completed = 0;
let reused = 0;
let originalBytes = 0;
let webBytes = 0;
const findings = [];
async function worker() {
  while (cursor < plan.jobs.length) {
    const job = plan.jobs[cursor++];
    const input = path.resolve(root, job.file);
    const webFile = job.file.replace(/\.png$/, '.webp');
    const output = path.resolve(root, webFile);
    if (!input.startsWith(expectedDirectory) || !output.startsWith(expectedDirectory) || input === output) {
      throw new Error('Unexpected artwork path: ' + job.file);
    }
    const metadata = await sharp(input).metadata();
    const stats = await sharp(input).stats();
    if (!metadata.hasAlpha || stats.channels[3].min !== 0 || stats.channels[3].max !== 255) {
      throw new Error('Artwork needs a transparent exterior and opaque painted subject: ' + job.id);
    }
    // Reuse completed outputs after an interrupted run; source revisions have separate paths.
    const inputInfo = await fs.stat(input);
    let encoded;
    try {
      const outputInfo = await fs.stat(output);
      const bytes = await fs.readFile(output);
      const candidate = await sharp(bytes).metadata();
      if (outputInfo.mtimeMs >= inputInfo.mtimeMs && bytes.subarray(0, 128).includes(Buffer.from('VP8L')) && candidate.width === metadata.width && candidate.height === metadata.height && candidate.hasAlpha) {
        encoded = candidate;
        reused++;
      }
    } catch (error) { if (error.code && error.code !== 'ENOENT') throw error; }
    if (!encoded) {
      // Format encoding only: retain source pixels, canvas dimensions, and transparency.
      await sharp(input).webp({ lossless: true, effort: 4 }).toFile(output);
      encoded = await sharp(output).metadata();
    }
    if (encoded.width !== metadata.width || encoded.height !== metadata.height || !encoded.hasAlpha) {
      throw new Error('Web artwork metadata differs from the source: ' + job.id);
    }
    job.webFile = webFile;
    job.webEncoding = { format: 'webp', lossless: true, width: metadata.width, height: metadata.height };
    originalBytes += inputInfo.size;
    webBytes += (await fs.stat(output)).size;
    findings.push({ kind: job.kind, id: job.id, width: metadata.width, height: metadata.height, alpha: true });
    completed++;
    if (completed % 30 === 0 || completed === plan.jobs.length) console.log('Prepared ' + completed + '/' + plan.jobs.length);
  }
}
await Promise.all(Array.from({ length: 4 }, () => worker()));
await fs.writeFile(planFile, JSON.stringify(plan, null, 2) + '\n');
await fs.writeFile(path.join(root, planDirectory, 'asset-integrity.json'), JSON.stringify({
  checkedAt: new Date().toISOString(), total: findings.length, originalBytes, webBytes,
  originalFilesPreserved: true, format: 'lossless WebP', findings
}, null, 2) + '\n');
console.log(JSON.stringify({ ...await publishArtCatalog(), reused, originalMB: Math.round(originalBytes / 1048576), webMB: Math.round(webBytes / 1048576) }));
