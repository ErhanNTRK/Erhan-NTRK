import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadApp } from './load.mjs';

function appWith(today, payments) {
  const app = loadApp(today);
  const s = app.S();
  s.payments = payments; s.events = []; s.members = []; s.children = []; s.docs = []; s.meds = [];
  return app;
}
const pay = (o) => ({ id: 'p1', name: 'Elektrik', amount: 450, cat: 'Fatura', repeat: 'none', dueDate: '2026-06-15', paid: false, paidPeriods: [], notify: true, notifyLead: 'same', ...o });
const titles = (l) => Array.from(l, (r) => r.title);

test('ödeme günü bildirimi gelir', () => {
  const app = appWith('2026-06-15', [pay()]);
  assert.deepEqual(titles(app.Notify.listFor('2026-06-15')), ['Elektrik ödeme günü']);
});

test('1 gün önce hatırlatma + ödeme günü ayrı ayrı gelir', () => {
  const app = appWith('2026-06-14', [pay({ notifyLead: '1d' })]);
  assert.deepEqual(titles(app.Notify.listFor('2026-06-14')), ['Elektrik ödemesi yaklaşıyor']);
  assert.deepEqual(titles(app.Notify.listFor('2026-06-15')), ['Elektrik ödeme günü']);
  assert.equal(app.Notify.listFor('2026-06-13').length, 0);
});

test('ödenmiş ödeme için bildirim gelmez', () => {
  const app = appWith('2026-06-15', [pay({ paid: true, notifyLead: '3d' })]);
  assert.equal(app.Notify.listFor('2026-06-12').length, 0);
  assert.equal(app.Notify.listFor('2026-06-15').length, 0);
});

test('bildirimi kapalı ödeme için bildirim gelmez', () => {
  const app = appWith('2026-06-15', [pay({ notify: false })]);
  assert.equal(app.Notify.listFor('2026-06-15').length, 0);
});

test('gecikmiş ödeme bugün için uyarı verir', () => {
  const app = appWith('2026-06-20', [pay()]);
  assert.deepEqual(titles(app.Notify.listFor('2026-06-20')), ['Elektrik ödemesi gecikti ⚠️']);
});

test('aylık ödeme gelecek günlerin push takviminde görünür', () => {
  const app = appWith('2026-06-01', [pay({ repeat: 'monthly', dueDate: '2026-01-20', notifyLead: '3d' })]);
  const { items, dates } = app.Notify.buildSchedule();
  assert.ok(dates.includes('2026-06-17'), 'üç gün önce');
  assert.ok(dates.includes('2026-06-20'), 'ödeme günü');
  assert.ok(items.some((r) => r.date === '2026-06-20' && /ödeme günü/.test(r.title)));
});

test('yedek doğrulama: bozuk liste reddedilir', () => {
  const app = loadApp('2026-06-01');
  assert.match(app.Backup.validate({ state: { payments: 'x' } }), /payments/);
  assert.equal(app.Backup.validate({ state: { payments: [] }, files: { a: 'data:x' } }), '');
  assert.match(app.Backup.validate({ state: [], files: {} }), /bozuk/);
});

test('esc: HTML kaçışı', () => {
  const app = loadApp('2026-06-01');
  assert.equal(app.esc('<img onerror=1>'), '&lt;img onerror=1&gt;');
});
