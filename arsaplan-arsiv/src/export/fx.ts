/**
 * Döviz karşılığı satırları — yalnızca gösterim katmanı. Kur kullanıcı beyanıdır;
 * hesaplara girmez, rapor tarihine sabitlenir ve çıktı üzerinde kur + tarih yazılır.
 */
import type { FxInput } from '../engine';
import { LOC } from '../i18n';

export interface FxLine {
  code: 'USD' | 'EUR';
  symbol: '$' | '€';
  rate: number;
  value: number;        // arsa değeri döviz cinsinden
  unitValue: number;    // arsa m² birim değeri döviz cinsinden
}

export function fxLines(fx: FxInput | undefined, landValue: number, landUnitValue: number): FxLine[] {
  const out: FxLine[] = [];
  if (fx?.usd && fx.usd > 0) out.push({ code: 'USD', symbol: '$', rate: fx.usd, value: landValue / fx.usd, unitValue: landUnitValue / fx.usd });
  if (fx?.eur && fx.eur > 0) out.push({ code: 'EUR', symbol: '€', rate: fx.eur, value: landValue / fx.eur, unitValue: landUnitValue / fx.eur });
  return out;
}

export const fxMoney = (symbol: string, v: number) =>
  symbol + Math.round(v).toLocaleString(LOC());

export const fxRateNote = (rate: number, date: string) =>
  `Kur: ${rate.toLocaleString(LOC(), { maximumFractionDigits: 4 })} ₺ (${date})`;
