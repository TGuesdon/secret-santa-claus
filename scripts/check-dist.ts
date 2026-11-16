import { readFile } from 'node:fs/promises';
import { inspectDist } from './dist-guard';

await inspectDist('dist', await readFile('public/draws.json', 'utf8'), process.env);
console.log('Build verified: unchanged draw and no private files published.');
