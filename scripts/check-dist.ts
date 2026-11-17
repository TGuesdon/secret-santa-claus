import { inspectDist, readPublicDraws } from './dist-guard';

await inspectDist('dist', await readPublicDraws('public'), process.env);
console.log('Build verified: unchanged draws and no private files published.');
