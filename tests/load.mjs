import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.dirname(fileURLToPath(import.meta.url));

/* index.html içindeki tek <script> bloğunu sahte bir tarayıcı ortamında çalıştırır
   ve test edilecek nesneleri döndürür. `today` verilirse takvim bugünü sabitler. */
export function loadApp(today) {
  const html = fs.readFileSync(path.join(dir, '..', 'index.html'), 'utf8');
  const code = html.match(/<script>([\s\S]*?)<\/script>/)[1];
  const el = () => new Proxy(function () {}, {
    get: (t, k) => (k === Symbol.toPrimitive ? () => '' : el()),
    apply: () => el(),
    set: () => true
  });
  const store = {};
  const localStorage = {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; },
    clear: () => {}
  };
  const RealDate = Date;
  class FakeDate extends RealDate {
    constructor(...a) { if (a.length === 0 && today) super(today + 'T12:00:00'); else super(...a); }
    static now() { return today ? new RealDate(today + 'T12:00:00').getTime() : RealDate.now(); }
  }
  const win = { addEventListener() {}, localStorage, matchMedia: () => ({ matches: false, addListener() {} }), confirm: () => true, location: { reload() {} } };
  const ctx = {
    window: win,
    document: { getElementById: () => el(), querySelectorAll: () => [], querySelector: () => el(), createElement: () => el(), addEventListener() {}, body: el(), documentElement: el() },
    localStorage, navigator: {}, Date: FakeDate, console, setTimeout, clearTimeout, setInterval: () => 0, clearInterval() {},
    indexedDB: {}, Intl, URL, Blob: class {}, alert() {}, fetch: async () => ({ ok: false })
  };
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  vm.runInContext(code + '\n;globalThis.__app = { Fin, Notify, Backup, Store, S, addDays, todayStr, isRecurringOnDate, isReminderToday, esc, para };', ctx);
  const app = ctx.__app;
  app.Store.load();
  return app;
}
