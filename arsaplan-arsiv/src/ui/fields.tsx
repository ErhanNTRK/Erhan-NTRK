import { useEffect, useState, type ReactNode } from 'react';
import { LOC } from '../i18n';

export const fmtTL = (v: number) =>
  isFinite(v) ? Math.round(v).toLocaleString(LOC()) + ' ₺' : '–';
export const fmtTLm2 = (v: number) =>
  isFinite(v) ? Math.round(v).toLocaleString(LOC()) + ' ₺/m²' : '–';
export const fmtM2 = (v: number) =>
  isFinite(v) ? Math.round(v).toLocaleString(LOC()) + ' m²' : '–';
export const fmtPct = (v: number, d = 1) =>
  isFinite(v) ? '%' + (v * 100).toFixed(d).replace('.', ',') : '–';
export const fmtNum = (v: number, d = 2) =>
  isFinite(v) ? v.toLocaleString(LOC(), { maximumFractionDigits: d }) : '–';

export function Field({ label, hint, error, children }:
  { label: string; hint?: string; error?: string | null; children: ReactNode }) {
  return (
    <div className={error ? 'field field-error' : 'field'}>
      <label className="label">{label}</label>
      {children}
      {error ? <div className="field-error-msg">⚠ {error}</div>
             : hint && <div className="hint">{hint}</div>}
    </div>
  );
}

export function Txt({ value, onChange, placeholder }: {
  value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  return <input type="text" value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />;
}

/** Sayısal alan — boş bırakılabilir, 0 silinebilir (Dora dersi). */
export function Num({ value, onChange, suffix, step, placeholder, plain }: {
  value: number; onChange: (v: number) => void; suffix?: string; step?: string; placeholder?: string; plain?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  const [raw, setRaw] = useState('');
  useEffect(() => { if (!focused) setRaw(value === 0 ? '' : String(value)); }, [value, focused]);

  const display = focused ? raw : (value === 0 ? '' : plain ? String(value) : value.toLocaleString(LOC(), { maximumFractionDigits: 2 }));

  return (
    <div className="suffix-wrap">
      <input
        type="text"
        inputMode="decimal"
        placeholder={placeholder}
        title={step ? `Adım: ${step}` : undefined}
        value={display}
        onFocus={() => { setFocused(true); setRaw(value === 0 ? '' : String(value)); }}
        onChange={(e) => setRaw(e.target.value.replace(/[^\d.,-]/g, ''))}
        onBlur={() => {
          setFocused(false);
          const n = parseFloat(raw.replace(',', '.')) || 0;
          onChange(n);
        }}
      />
      {suffix && <span className="suffix">{suffix}</span>}
    </div>
  );
}

/** Yüzde alanı: kullanıcı 25 yazar, motor 0.25 alır. */
export function Pct({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="suffix-wrap">
      <input
        type="number"
        inputMode="decimal"
        step="0.5"
        value={String(Math.round(value * 1000) / 10)}
        onChange={(e) => onChange(e.target.value === '' ? 0 : Number(e.target.value) / 100)}
      />
      <span className="suffix">%</span>
    </div>
  );
}

export function Sel<T extends string>({ value, onChange, options }: {
  value: T; onChange: (v: T) => void; options: Array<{ value: T; label: string }>;
}) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value as T)}>
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

export function Choice({ on, name, desc, onClick }: {
  on: boolean; name: string; desc?: string; onClick: () => void;
}) {
  return (
    <button type="button" className={`choice ${on ? 'on' : ''}`} onClick={onClick}>
      <span className="choice-dot" />
      <span>
        <span className="choice-name">{name}</span>
        {desc && <span className="choice-desc" style={{ display: 'block' }}>{desc}</span>}
      </span>
    </button>
  );
}

export function Seg<T extends string | boolean>({ value, onChange, options }: {
  value: T; onChange: (v: T) => void; options: Array<{ value: T; label: string }>;
}) {
  return (
    <div className="seg">
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          className={value === o.value ? 'on' : ''}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Row({ label, value, tone }: { label: string; value: string; tone?: 'neg' | 'pos' | 'total' }) {
  return (
    <div className={`row ${tone === 'total' ? 'total' : ''}`}>
      <span className="row-label">{label}</span>
      <span className={`row-value ${tone === 'neg' ? 'neg' : tone === 'pos' ? 'pos' : ''}`}>{value}</span>
    </div>
  );
}
