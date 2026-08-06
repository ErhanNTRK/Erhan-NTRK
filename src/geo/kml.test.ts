/** KML geometrisi — gerçek TKGM örneğiyle (Bahçelievler 611/9, tapu 1.830,40 m²) */
import { describe, it, expect } from 'vitest';
import { parseKml, inwardOffset, polygonArea, classifyEdges, setbackFootprint } from './kml';

const SAMPLE = `<?xml version="1.0" encoding="utf-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Placemark>
    <name>Kartaltepe Mahallesi 611-ada-9-parsel</name>
    <ExtendedData>
      <Data name="İl"><value>İstanbul</value></Data>
      <Data name="İlçe"><value>Bahçelievler</value></Data>
      <Data name="Mahalle"><value>Kartaltepe</value></Data>
      <Data name="Ada"><value>611</value></Data>
      <Data name="ParselNo"><value>9</value></Data>
      <Data name="Alan"><value>1.830,40</value></Data>
      <Data name="Nitelik"><value>Arsa</value></Data>
    </ExtendedData>
    <Polygon><outerBoundaryIs><LinearRing><coordinates>28.862349999999999,41.01108
28.86261,41.011209999999998
28.86279,41.011279999999999
28.86271,41.011580000000002
28.862649999999999,41.011600000000001
28.862369999999999,41.011479999999999
28.862110000000001,41.011360000000003
28.862349999999999,41.01108</coordinates></LinearRing></outerBoundaryIs></Polygon>
  </Placemark>
</kml>`;

describe('parseKml', () => {
  it('künyeyi ve poligonu okur; kapalı halkanın tekrar noktasını atar', () => {
    const k = parseKml(SAMPLE)!;
    expect(k).not.toBeNull();
    expect(k.il).toBe('İstanbul');
    expect(k.ilce).toBe('Bahçelievler');
    expect(k.mahalle).toBe('Kartaltepe');
    expect(k.ada).toBe('611');
    expect(k.parsel).toBe('9');
    expect(k.deedArea).toBeCloseTo(1830.4, 1);
    expect(k.points).toHaveLength(7);
  });

  it('poligon alanı tapu alanına %0,5 içinde yaklaşır (koordinat yuvarlaması payı)', () => {
    const k = parseKml(SAMPLE)!;
    expect(Math.abs(k.polygonArea - 1830.4) / 1830.4).toBeLessThan(0.005);
  });

  it('bozuk içerikte null döner', () => {
    expect(parseKml('<kml></kml>')).toBeNull();
    expect(parseKml('bu bir kml değil')).toBeNull();
  });
});

describe('inwardOffset', () => {
  it('kare parselde kesin sonuç: 40×40, 5 m çekme → 30×30 = 900 m²', () => {
    const sq = [{ x: 0, y: 0 }, { x: 40, y: 0 }, { x: 40, y: 40 }, { x: 0, y: 40 }];
    const inner = inwardOffset(sq, 5)!;
    expect(inner).not.toBeNull();
    expect(polygonArea(inner)).toBeCloseTo(900, 6);
  });

  it('gerçek parselde çekme alanı küçültür, aşırı çekmede null döner', () => {
    const k = parseKml(SAMPLE)!;
    const inner = inwardOffset(k.points, 5)!;
    expect(inner).not.toBeNull();
    expect(polygonArea(inner)).toBeLessThan(k.polygonArea);
    expect(polygonArea(inner)).toBeGreaterThan(k.polygonArea * 0.4);
    expect(inwardOffset(k.points, 100)).toBeNull();     // parseli tüketir
  });

  it('sıfır/negatif çekme null döner (hesaplanmaz)', () => {
    const sq = [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }];
    expect(inwardOffset(sq, 0)).toBeNull();
    expect(inwardOffset(sq, -3)).toBeNull();
  });
});

describe('classifyEdges + setbackFootprint', () => {
  const sq = [{ x: 0, y: 0 }, { x: 40, y: 0 }, { x: 40, y: 40 }, { x: 0, y: 40 }]; // CCW kare

  it('ön seçilince karşı kenar arka, komşular yan olur', () => {
    const cls = classifyEdges(sq, 0);              // alt kenar ön (dış normal güney)
    expect(cls).toEqual(['front', 'side', 'rear', 'side']);
  });

  it('kare golden: ön 5 · yan 3 · arka 3 → (40−6)×(40−8) = 1088 m²', () => {
    const fp = setbackFootprint(sq, 0, { front: 5, side: 3, rear: 3 })!;
    expect(fp).not.toBeNull();
    expect(fp.area).toBeCloseTo(1088, 6);
  });

  it('gerçek parselde ön/yan/arka oturum tek-tip 5 m ile tutarlı aralıktadır', () => {
    const k = parseKml(SAMPLE)!;
    const fp = setbackFootprint(k.points, 0, { front: 5, side: 3, rear: 3 })!;
    expect(fp).not.toBeNull();
    const uni5 = polygonArea(inwardOffset(k.points, 5)!);
    const uni3 = polygonArea(inwardOffset(k.points, 3)!);
    expect(fp.area).toBeGreaterThan(uni5);
    expect(fp.area).toBeLessThan(uni3);
  });
});
