import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadApp } from './load.mjs';

const near = (a, b, eps = 0.01) => assert.ok(Math.abs(a - b) < eps, a + ' ≈ ' + b);

test('vadeli mevduat: 100.000 TL, %40, 90 gün, %15 stopaj', () => {
  const app = loadApp('2026-06-01');
  const c = app.Fin.depositCalc({ principal: 100000, rate: 40, termDays: 90, taxRate: 15, startDate: '2026-06-01' });
  near(c.grossInterest, 100000 * 0.4 * 90 / 365);
  near(c.netInterest, c.grossInterest * 0.85);
  near(c.maturityTotal, 100000 + c.netInterest);
  assert.equal(c.end, '2026-08-30');
  assert.equal(c.daysLeft, 90);
  near(c.currentValue, 100000); /* ilk gün tahakkuk yok */
});

test('vadeli mevduat: yarı vadede tahakkuk orantılı, vade dolunca tamamı', () => {
  let app = loadApp('2026-07-16'); /* 45. gün */
  const half = app.Fin.depositCalc({ principal: 100000, rate: 40, termDays: 90, taxRate: 15, startDate: '2026-06-01' });
  near(half.currentValue, 100000 + half.netInterest * 0.5);
  app = loadApp('2027-01-01');
  const done = app.Fin.depositCalc({ principal: 100000, rate: 40, termDays: 90, taxRate: 15, startDate: '2026-06-01' });
  near(done.currentValue, done.maturityTotal);
  assert.equal(done.daysLeft, 0);
});

test('vadeli mevduat: stopaj boşsa varsayılan %15, vade 0 ise faiz yok', () => {
  const app = loadApp('2026-06-01');
  const c = app.Fin.depositCalc({ principal: 1000, rate: 50, termDays: 30, startDate: '2026-06-01' });
  assert.equal(c.taxRate, 15);
  const z = app.Fin.depositCalc({ principal: 1000, rate: 50, termDays: 0, startDate: '2026-06-01' });
  near(z.netInterest, 0);
  near(z.currentValue, 1000);
});

test('piyasa varlığı: değer hesabı', () => {
  const app = loadApp('2026-06-01');
  assert.equal(app.Fin.assetValue({ type: 'BIST Hisse', qty: 100, avgCost: 10, price: 12.5 }), 1250);
});

test('ödeme: tek seferlik vade ve ödendi durumu', () => {
  const app = loadApp('2026-06-10');
  const p = { id: 'a', repeat: 'none', dueDate: '2026-06-15', paid: false };
  assert.equal(app.Fin.dueOn(p, '2026-06-15'), true);
  assert.equal(app.Fin.dueOn(p, '2026-06-14'), false);
  assert.equal(app.Fin.dueOn({ ...p, paid: true }, '2026-06-15'), false);
});

test('ödeme: aylık tekrar, ödenen dönem atlanır', () => {
  const app = loadApp('2026-06-10');
  const p = { id: 'b', repeat: 'monthly', dueDate: '2026-01-15', paidPeriods: [] };
  assert.equal(app.Fin.dueOn(p, '2026-06-15'), true);
  assert.equal(app.Fin.dueOn(p, '2026-06-16'), false);
  p.paidPeriods.push(app.Fin.paymentPeriodKey(p, '2026-06-15'));
  assert.equal(app.Fin.dueOn(p, '2026-06-15'), false);
  assert.equal(app.Fin.dueOn(p, '2026-07-15'), true);
});
