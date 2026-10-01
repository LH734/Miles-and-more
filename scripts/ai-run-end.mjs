// Ende eines KI-Laufs: gibt aus, wie viele Websuchen und Seitenabrufe gebraucht wurden.

import { PATHS, readJson } from './lib/io.mjs';
import { readRunState } from './lib/run-state.mjs';

const config = readJson(PATHS.config);
const state = readRunState();
const maxS = process.env.MAX_SEARCHES ?? config.ai.maxSearchesPerRun;
const maxF = process.env.MAX_FETCHES ?? config.ai.maxFetchesPerRun;
console.log(`Websuchen in diesem Lauf: ${state.searches} von max. ${maxS}`);
console.log(`Seitenabrufe in diesem Lauf: ${state.fetches} von max. ${maxF}`);
