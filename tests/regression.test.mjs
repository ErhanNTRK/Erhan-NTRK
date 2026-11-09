import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadApp } from './load.mjs';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');
const titles = (l) => Array.from(l, (r) => r.title);

function appWith(today, patch) {
  const app = loadApp(today);
  const s = app.S();
  s.payments = []; s.events = []; s.members = []; s.children = []; s.docs = []; s.meds = [];
  Object.assign(s, patch);
  return app;
}

test('tekrarlayan ajanda: "1 gün önce" hatırlatması her tekrarda gelir', () => {
  const ev = { id: 'e1', title: 'Haftalık toplantı', date: '2026-05-04', repeat: 'weekly', notify: true, notifyLead: '1d', time: '' };
  const app = appWith('2026-06-01', { events: [ev] });
  /* 2026-06-08 Pazartesi bir tekrardır; hatırlatma 06-07'de gelmeli */
  assert.deepEqual(titles(app.Notify.listFor('2026-06-07')), ['Haftalık toplantı']);
  assert.equal(app.Notify.listFor('2026-06-08').length, 0);
  assert.equal(app.Notify.listFor('2026-06-06').length, 0);
});

test('tekrarlayan ajanda: "aynı gün" hatırlatması çalışmaya devam eder', () => {
  const ev = { id: 'e2', title: 'Spor', date: '2026-05-04', repeat: 'weekly', notify: true, notifyLead: 'same' };
  const app = appWith('2026-06-01', { events: [ev] });
  assert.deepEqual(titles(app.Notify.listFor('2026-06-08')), ['Spor']);
  assert.equal(app.Notify.listFor('2026-06-09').length, 0);
});

test('tek seferlik ajanda: önceden hatırlatma yalnız bir kez gelir', () => {
  const ev = { id: 'e3', title: 'Doktor', date: '2026-06-10', repeat: 'none', notify: true, notifyLead: '3d' };
  const app = appWith('2026-06-01', { events: [ev] });
  assert.deepEqual(titles(app.Notify.listFor('2026-06-07')), ['Doktor']);
  assert.equal(app.Notify.listFor('2026-06-10').length, 0);
});

test('gecikmiş ödeme gelecek günlerin push takvimine de girer', () => {
  const p = { id: 'p1', name: 'Kira', amount: 9000, cat: 'Diğer', repeat: 'none', dueDate: '2026-05-30', paid: false, paidPeriods: [], notify: true, notifyLead: 'same' };
  const app = appWith('2026-06-01', { payments: [p] });
  const { items, dates } = app.Notify.buildSchedule();
  assert.ok(dates.includes('2026-06-01') && dates.includes('2026-06-10'));
  assert.ok(items.some((r) => r.date === '2026-06-05' && /gecikti/.test(r.title)));
});

test('ödendi işaretlenince gecikme uyarısı kalkar', () => {
  const p = { id: 'p1', name: 'Kira', amount: 9000, cat: 'Diğer', repeat: 'none', dueDate: '2026-05-30', paid: true, paidPeriods: [], notify: true, notifyLead: 'same' };
  const app = appWith('2026-06-01', { payments: [p] });
  assert.equal(app.Notify.buildSchedule().items.length, 0);
});

test('sürüm numaraları tutarlı: index.html, sw.js, package.json', () => {
  const pkg = JSON.parse(read('package.json')).version;
  const app = read('index.html').match(/NTRK v(\d+\.\d+) ·/)[1];
  const sw = read('sw.js').match(/ntrk-v(\d+\.\d+)\.\d+/)[1];
  assert.equal(pkg.split('.').slice(0, 2).join('.'), app, 'package.json ile APP_VERSION farklı');
  assert.equal(sw, app, 'sw.js CACHE adı APP_VERSION ile aynı olmalı');
});

test('değişen sabit adresler: ölü kaynaklar kalmadı', () => {
  const html = read('index.html');
  assert.ok(!html.includes('genelpara'), 'GenelPara artık kullanılmıyor');
  assert.ok(!html.includes('api.frankfurter.app'), 'Frankfurter yeni adrese taşındı');
  assert.ok(!html.includes('finance.yahoo.com'), 'Yahoo yalnız Worker üzerinden');
});
