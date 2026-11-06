/** Yöntem 1 (Toplam Değerden) ve Yöntem 2 (Sadece Arsa) — golden testler (2026-07-31). */
import { describe, it, expect } from 'vitest';
import { computeSimpleCost, computeWholeValueMethod, computeLandOnlyMethod, type BuildingValueRow } from './simpleCostEngine';

describe('computeSimpleCost — amortismanlı yapı değeri', () => {
  it('Yapı Değeri = Alan × Birim Maliyet × Amortisman%', () => {
    const buildings: BuildingValueRow[] = [{ id: 'b1', type: 'Standart Bloklar', area: 1000, unitCost: 20000, depreciationPct: 80 }];
    const c = computeSimpleCost({ parcelArea: 0, landUnitValue: 0, buildings });
    expect(c.buildingValues).toBe(1000 * 20000 * 0.8);
  });
});

describe('Yöntem 1 — Toplam Değer Esaslı Üst Hakkı Tespiti (Salih örneği)', () => {
  it('golden: Toplam Değer 150M, Kalan 10, Toplam 20 → Üst Hakkı Değeri 50M', () => {
    // Daimi Müstakil Hak = 150M × 2/3 = 100M; Üst Hakkı = 100M × (10/20) = 50M
    const r = computeWholeValueMethod(
      { parcelArea: 1000, landUnitValue: 150000, buildings: [] }, 10, 20,
    );
    expect(r.cost.totalValue).toBe(150000000);
    expect(r.permanentValue).toBeCloseTo(100000000, 0);
    expect(r.ustHakkiValue).toBeCloseTo(50000000, 0);
  });
  it('Daimi Müstakil Hak her zaman Toplam Değerin 2/3\'üdür (kullanıcı değiştiremez)', () => {
    const r = computeWholeValueMethod({ parcelArea: 100, landUnitValue: 9000, buildings: [] }, 5, 10);
    expect(r.permanentValue).toBeCloseTo(r.cost.totalValue * (2 / 3), 0);
  });
  it('Parsel Alanı 0 iken zorunlu alan uyarısı verir', () => {
    const r = computeWholeValueMethod({ parcelArea: 0, landUnitValue: 1000, buildings: [] }, 5, 10);
    expect(r.warnings.some((w) => w.includes('Parsel Alanı'))).toBe(true);
  });
});

describe('Yöntem 2 — Sadece Arsa Değeri Üzerinden (Salih örneği)', () => {
  it('golden: Arsa 90M, Bina 50M, Kalan 10, Toplam 30 → Nihai 70M', () => {
    // Arsa Daimi Müstakil Hak = 90M × 2/3 = 60M; Üst Hakkı Arsa = 60M × (10/30) = 20M; + Bina 50M = 70M
    const buildings: BuildingValueRow[] = [{ id: 'b1', type: 'Diğer', area: 1, unitCost: 50000000, depreciationPct: 100 }];
    const r = computeLandOnlyMethod({ parcelArea: 1000, landUnitValue: 90000, buildings }, 10, 30);
    expect(r.cost.landValue).toBe(90000000);
    expect(r.cost.buildingValues).toBeCloseTo(50000000, 0);
    expect(r.ustHakkiArsaDegeri).toBeCloseTo(20000000, 0);
    expect(r.nihaiUstHakkiDegeri).toBeCloseTo(70000000, 0);
  });
  it('Bina Değeri oranlanmadan TAM eklenir (yalnız arsa süreye göre oranlanır)', () => {
    const buildings: BuildingValueRow[] = [{ id: 'b1', type: 'Diğer', area: 1, unitCost: 1000000, depreciationPct: 100 }];
    const r = computeLandOnlyMethod({ parcelArea: 100, landUnitValue: 10000, buildings }, 1, 100); // çok kısa kalan süre
    expect(r.buildingValueAdded).toBe(1000000); // süre oranından etkilenmedi
    expect(r.nihaiUstHakkiDegeri).toBeCloseTo(r.ustHakkiArsaDegeri + 1000000, 0);
  });
});
