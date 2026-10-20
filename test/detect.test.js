'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { detectOmp } = require('../src/detect');

test('finds a main OMP process and excludes background workers', async () => {
  let script;
  const running = await detectOmp((_command, args, _options, callback) => {
    script = args.at(-1);
    callback(null, '23276\r\n');
  });
  assert.equal(running, true);
  assert.match(script, /__omp_worker/);
  assert.equal(await detectOmp((_command, _args, _options, callback) => callback(null, '')), false);
  assert.equal(await detectOmp((_command, _args, _options, callback) => callback(new Error('unavailable'), '')), false);
});
