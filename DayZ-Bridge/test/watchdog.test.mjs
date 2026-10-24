// Poll watchdog: exit only when the mod is silent AND the network namespace is stale.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PollWatchdog, namespaceHasExternalInterface } from '../dist/watchdog.js';

const TICK = 5000;
const make = (alive) => new PollWatchdog({ thresholdMs: 60_000, tickMs: TICK, namespaceAlive: () => alive.value });

function run(w, from, to, lastPoll) {
  let r;
  for (let t = from; t <= to; t += TICK) r = w.tick(t, lastPoll);
  return r;
}

test('never polled: always ok', () => {
  const w = make({ value: false });
  assert.equal(run(w, 0, 600_000, null).verdict, 'ok');
});

test('recent poll: ok', () => {
  const w = make({ value: false });
  assert.equal(run(w, 0, 50_000, 0).verdict, 'ok');
});

test('silent past threshold with only loopback left: exit', () => {
  const w = make({ value: false });
  const r = run(w, 0, 65_000, 0);
  assert.equal(r.verdict, 'exit');
  assert.equal(r.silentMs, 65_000);
});

test('silent past threshold but the namespace is alive (game hung): stays up', () => {
  const w = make({ value: true });
  assert.equal(run(w, 0, 600_000, 0).verdict, 'silent');
});

test('a bridge stall is not counted as mod silence', () => {
  const alive = { value: false };
  const w = make(alive);
  run(w, 0, 30_000, 0);
  // Event loop blocked for 150 s (host swapping): the next tick arrives late.
  const late = w.tick(180_000, 0);
  assert.equal(late.verdict, 'ok');
  assert.equal(late.stalledMs, 145_000);
  // Silence counts again from the end of the stall.
  assert.equal(run(w, 185_000, 235_000, 0).verdict, 'ok');
  assert.equal(run(w, 240_000, 245_000, 0).verdict, 'exit');
});

test('a poll after the stall resets the clock', () => {
  const w = make({ value: false });
  run(w, 0, 30_000, 0);
  w.tick(180_000, 0);
  assert.equal(run(w, 185_000, 300_000, 200_000).verdict, 'exit');
  const w2 = make({ value: false });
  assert.equal(run(w2, 0, 100_000, 90_000).verdict, 'ok');
});

test('namespaceHasExternalInterface reads the real interfaces', () => {
  assert.equal(typeof namespaceHasExternalInterface(), 'boolean');
});
