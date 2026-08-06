/**
 * AYRINTILI ÜST HAKKI DEĞER ANALİZİ — motor (saf).
 *
 * 2026-07-31 SON REVİZYON: Gelir modeli Denizbank Excel'inin GERÇEK
 * formülleriyle birebir kuruldu (Salih onayı: "mantığı o excele göre
 * kuralım, gerekirse değişiklik yaparak aynı sonuca ulaşalım").
 *
 * ESKİ MODEL (artık kullanılmıyor): Yiyecek/Diğer/Toplantı/Dükkan gelirleri
 * Toplam Gelirin yüzdesi olarak GİRİLİYOR, Toplam Gelir Oda Gelirinden
 * GERİYE türetiliyordu.
 *
 * YENİ MODEL (Excel ile birebir): Her gelir kalemi (Oda dahil) kendi 1. yıl
 * TUTARI olarak girilir; hepsi AYNI büyüme oranıyla (Oda Fiyat Artış Oranı)
 * bileşik büyür; Toplam Gelir bunların TOPLAMIDIR (bölme değil, toplama).
 * "Toplam Gelir İçerisindeki Oranı" (Excel'deki "Toplam Gelir İçerisinde
 * Oranı" sütunuyla aynı) artık yalnız BİLGİ AMAÇLI, sonradan hesaplanan bir
 * gösterimdir — girdi değildir, kullanıcı hâlâ her satırın tutarını serbestçe
 * elle değiştirebilir.
 *
 * Maliyet Yaklaşımı: Arsa Değeri (Arsa Alanı × Arsa m² Birim Değeri) +
 * Yapı Değeri (Alan × Birim Maliyet, AŞINMASIZ toplam — "Sigortaya Esas
 * Bina Değeri" ile aynı kavram) = Toplam Değer.
 *
 * Emlak Vergisi, Bina Sigortası, Yenileme Fonu ve Basit Tamirat Excel'deki
 * GERÇEK formülleriyle birebir hesaplanır:
 *   - Bina Sigortası, Yenileme Fonu, Basit Tamirat → YALNIZ Yapı Değeri
 *     üzerinden (arsa dahil değildir).
 *   - Emlak Vergisi → "Emlak Vergisine Esas Değer" üzerinden = Arsa Değeri +
 *     Yapı Değeri×(1 − Bina Aşınma Oranı%). Varsayılan %25, elle değiştirilebilir.
 *   - Diğer Gider → (Diğer Gelir + Toplantı Geliri) × oran (Excel: AQ31=+(AQ21+AQ22)*AN31).
 *
 * İskonto oranı TEK bir kutudur. İndirgeme: 1. DÖNEM İNDİRGENMEZ; 2. dönemden
 * itibaren iskonto oranıyla bugüne çekilir (üstel: dönem t için çarpan =
 * (1+i)^-(t-1)) — Excel'in NAKİT AKIŞ NET BUGÜNKÜ DEĞER formülüyle
 * (=NakitAkış/(1+i)^(Dönem-1)) birebir doğrulanmıştır.
 * Sonuç, girilen "Dönem Sonu Değer İndirgeme (%)" oranıyla bir kez azaltılır,
 * sonra en yakın 5.000'in katına yuvarlanır.
 */

export interface DetailedRoomRow {
  id: string;
  name: string;
  count: number;
  price: number;          // günlük ortalama fiyat
  occupancyPct: number;   // doluluk %
  days: number;            // faaliyet gün sayısı
}

/** Yapı türü kataloğu — Salih'in listesi; ileride kolayca genişletilebilir. */
export const BUILDING_TYPES: string[] = [
  'Diğer', 'Tüm Yapılar', 'Otel Binası', 'Apart Otel Binası',
  'Standart Bloklar', 'Süit ve Rezidans Binası', 'Villalar', 'Personel Lojmanı',
  'Lobi ve Resepsiyon Binası', 'Butik', 'Market', 'Kuaför', 'Hediyelik Eşya Dükkanı',
  'Kapalı Yeraltı Otoparkı', 'Açık Misafir Otoparkı', 'Vale Alanı', 'Mal Kabul Otoparkı',
  'Fitness Salonu', 'Tenis Kortları', 'Çok Amaçlı Spor Sahası', 'Yoga ve Pilates Stüdyosu',
  'Su Sporları Merkezi', 'Ana Açık Havuz', 'Kapalı Isıtmalı Havuz', 'Aquapark',
  'Çocuk Havuzu', 'Sonsuzluk Havuzu', 'Türk Hamamı', 'Sauna', 'Masaj Odaları', 'Dinlenme Alanı',
  'Ana Açık Büfe Restoran', 'A La Carte Restoranlar', 'Havuz ve Sahil Barları', 'Gece Kulübü',
  'Amfitiyatro', 'Mini Kulüp', 'Çocuk Parkı', 'Yönetim Ofisleri', 'Ana Depolar',
  'Merkezi Çamaşırhane', 'Trafo ve Jeneratör Odası', 'Kazan Dairesi',
];

export interface BuildingCostRow {
  id: string;
  type: string;    // BUILDING_TYPES'tan biri, ya da serbest metin
  area: number;
  unitCost: number;
}

export interface DetailedUstHakkiInput {
  hotelName: string;
  ada: string;
  parsel: string;
  parcelArea: number;
  fromKml: boolean;

  sureUnit: 'yil' | 'ay';
  kalanSureYil: number;    // her zaman yıl cinsinden saklanır (UI ay↔yıl çevirir)
  toplamSureYil: number;

  currency: 'TL' | 'USD' | 'EUR';
  fxRate: number;           // currency !== 'TL' iken kullanılır

  rooms: DetailedRoomRow[];
  roomGrowthPct: number;    // "Oda Fiyat Artış Oranı" — TÜM gelir kalemleri bu oranda büyür (Excel: tek BF11)

  foodIncomeBase: number;      // Yiyecek/İçecek — 1. yıl tutarı (₺/$/€), Oran% ile DEĞİL doğrudan girilir
  otherIncomeBase: number;     // Diğer Gelirler — 1. yıl tutarı
  meetingIncomeBase: number;   // Toplantı/Salon — 1. yıl tutarı
  shopIncomeBase: number;      // Dükkan Kira — 1. yıl tutarı

  roomExpensePct: number;   // Oda Gideri — oda geliri üzerinden
  foodExpensePct: number;   // Yiyecek Gideri — yiyecek geliri üzerinden
  otherExpensePct: number;  // Diğer Gider — diğer gelir üzerinden
  generalMgmtPct: number;   // Genel Yönetim — toplam gelir üzerinden
  energyPct: number;        // Enerji — (oda+toplantı) üzerinden
  repairPct: number;        // Basit Tamirat — toplam gelir üzerinden

  // Maliyet Yaklaşımı — Arsa Değeri + Yapı Değeri'nden hesaplanır (elle Toplam Maliyet YOK)
  landUnitValue: number;         // Arsa m² Birim Değeri
  buildings: BuildingCostRow[];
  buildingDepreciationPct: number;  // Bina Aşınma Oranı % — yalnız Emlak Vergisi tabanında kullanılır (Excel formülüyle)
  showCostApproachInPdf: boolean;

  operatorPremiumPct: number;   // İşletmeci Prim — brüt kâr üzerinden
  propertyTaxPct: number;       // Emlak Vergisi — Emlak Vergisine Esas Değer üzerinden (Arsa + Yapı×(1-Aşınma%))
  insurancePct: number;         // Bina Sigortası — Yapı Değeri üzerinden (yalnız bina, aşınmasız)
  renewalFundPct: number;       // Yenileme Fonu — Yapı Değeri üzerinden (yalnız bina, aşınmasız)

  ecrimisilBase: number; ecrimisilGrowthPct: number;          // Ecrimisil — elle
  ustHakkiOdemeBase: number; ustHakkiOdemeGrowthPct: number;  // Üst Hakkı Ödemesi — elle
  bayilikBase: number; bayilikGrowthPct: number;              // Bayilik Ödemeleri — elle

  discountRatePct: number;         // tek iskonto oranı (2026-07-31: risksiz+prim ayrımı kaldırıldı)
  donemSonuIndirgemePct: number;   // "Dönem Sonu Değer İndirgeme (%)" — nihai sonuca bir kez uygulanan haircut
}

export interface DetailedPeriodRow {
  year: number;
  roomIncome: number;
  foodIncome: number;
  otherIncome: number;
  meetingIncome: number;
  shopIncome: number;
  totalRevenue: number;
  /** Yalnız bilgi amaçlı — Excel'in "Toplam Gelir İçerisinde Oranı" sütunuyla aynı, girdi değil */
  roomIncomePct: number;

  roomExpense: number;
  foodExpense: number;
  otherExpense: number;
  generalMgmtExpense: number;
  energyExpense: number;
  repairExpense: number;
  totalOperatingExpense: number;

  grossOperatingProfit: number;
  grossOperatingProfitPct: number;

  operatorPremium: number;
  propertyTax: number;
  insurance: number;
  renewalFund: number;
  ecrimisil: number;
  ustHakkiOdeme: number;
  bayilik: number;
  totalFixedExpense: number;

  totalExpense: number;
  netOperatingProfit: number;
  netOperatingProfitPct: number;

  presentValue: number;    // "Nakit Akış Net Bugünkü Değer"
}

export interface CostApproachResult {
  landValue: number;          // Arsa Alanı × Arsa m² Birim Değeri
  buildingsCost: number;      // Σ (Alan × Yapı Birim Maliyeti) — aşınmasız ("Sigortaya Esas Bina Değeri")
  totalCost: number;          // landValue + buildingsCost (yalnız gösterim: Toplam Değer)
  totalCostRounded: number;   // en yakın 5.000'e (yalnız PDF'de gösterim amaçlı)
  propertyTaxBase: number;    // Emlak Vergisine Esas Değer = Arsa + Yapı×(1-Aşınma%) — Excel formülüyle birebir
}

export interface DetailedUstHakkiResult {
  discountRate: number;
  baseRoomIncome: number;
  cost: CostApproachResult;
  years: DetailedPeriodRow[];
  sumPresentValue: number;
  propertyValueLocal: number;     // dönem sonu indirgeme sonrası, seçilen para biriminde
  propertyValueRounded: number;   // en yakın 5.000'in katına (seçilen para biriminde)
  propertyValueTl: number;        // TL karşılığı (currency==='TL' iken aynı)
  warnings: string[];
}

const R = (v: number) => Math.round(v * 100) / 100;
const R5000 = (v: number) => Math.round(v / 5000) * 5000;

export function computeRoomIncome(rooms: DetailedRoomRow[]): number {
  return R(rooms.reduce((s, r) =>
    s + Math.max(0, r.count) * Math.max(0, r.price) * Math.min(100, Math.max(0, r.occupancyPct)) / 100 * Math.max(0, r.days), 0));
}

export function computeCostApproach(
  input: Pick<DetailedUstHakkiInput, 'parcelArea' | 'landUnitValue' | 'buildings' | 'buildingDepreciationPct'>,
): CostApproachResult {
  const landValue = R(Math.max(0, input.parcelArea) * Math.max(0, input.landUnitValue));
  const buildingsCost = R(input.buildings.reduce((s, b) => s + Math.max(0, b.area) * Math.max(0, b.unitCost), 0));
  const totalCost = R(landValue + buildingsCost);
  const depreciation = Math.min(100, Math.max(0, input.buildingDepreciationPct)) / 100;
  const propertyTaxBase = R(landValue + buildingsCost * (1 - depreciation));
  return { landValue, buildingsCost, totalCost, totalCostRounded: R5000(totalCost), propertyTaxBase };
}

export function computeDetailedUstHakki(input: DetailedUstHakkiInput): DetailedUstHakkiResult {
  const warnings: string[] = [];
  const i = Math.max(0, input.discountRatePct) / 100;
  const n = Math.max(0, Math.round(input.kalanSureYil));
  if (n <= 0) warnings.push('Kalan süre 0 veya negatif; dönemsel tablo hesaplanamıyor.');

  const baseRoomIncome = computeRoomIncome(input.rooms);
  if (baseRoomIncome <= 0) warnings.push('Oda Gelirleri girilmedi (Oda Sayısı/Fiyat/Doluluk/Gün); hesaplama için zorunludur.');
  const g = input.roomGrowthPct / 100;
  const cost = computeCostApproach(input);

  const years: DetailedPeriodRow[] = [];
  let sumPv = 0;
  for (let t = 1; t <= n; t++) {
    const growth = Math.pow(1 + g, t - 1);
    // Excel mantığı: her gelir kalemi kendi 1. yıl tutarından AYNI oranla büyür, TOPLANIR (bölünmez)
    const roomIncome = R(baseRoomIncome * growth);
    const foodIncome = R(Math.max(0, input.foodIncomeBase) * growth);
    const otherIncome = R(Math.max(0, input.otherIncomeBase) * growth);
    const meetingIncome = R(Math.max(0, input.meetingIncomeBase) * growth);
    const shopIncome = R(Math.max(0, input.shopIncomeBase) * growth);
    const totalRevenue = R(roomIncome + foodIncome + otherIncome + meetingIncome + shopIncome);
    const roomIncomePct = totalRevenue > 0 ? R((roomIncome / totalRevenue) * 100) : 0;

    const roomExpense = R(roomIncome * input.roomExpensePct / 100);
    const foodExpense = R(foodIncome * input.foodExpensePct / 100);
    const otherExpense = R((otherIncome + meetingIncome) * input.otherExpensePct / 100);   // Excel: =+(AQ21+AQ22)*AN31
    const generalMgmtExpense = R(totalRevenue * input.generalMgmtPct / 100);
    const energyExpense = R((roomIncome + meetingIncome) * input.energyPct / 100);
    const repairExpense = R(cost.buildingsCost * input.repairPct / 100 * growth);
    const totalOperatingExpense = R(roomExpense + foodExpense + otherExpense + generalMgmtExpense + energyExpense + repairExpense);

    const grossOperatingProfit = R(totalRevenue - totalOperatingExpense);
    const grossOperatingProfitPct = totalRevenue > 0 ? R((grossOperatingProfit / totalRevenue) * 100) : 0;

    const operatorPremium = R(grossOperatingProfit * input.operatorPremiumPct / 100);
    // Excel: Emlak Vergisi/Sigorta/Yenileme Fonu 1. yıl tabandan hesaplanır, 2.+ yıl ÖNCEKİ YILDAN
    // (1+g) ile büyütülür (=AQ41*(1+$BF$11) gibi) — sabit KALMAZ, her yıl büyür.
    const propertyTax = R(cost.propertyTaxBase * input.propertyTaxPct / 100 * growth);
    const insurance = R(cost.buildingsCost * input.insurancePct / 100 * growth);
    const renewalFund = R(cost.buildingsCost * input.renewalFundPct / 100 * growth);
    const ecrimisil = R(input.ecrimisilBase * Math.pow(1 + input.ecrimisilGrowthPct / 100, t - 1));
    const ustHakkiOdeme = R(input.ustHakkiOdemeBase * Math.pow(1 + input.ustHakkiOdemeGrowthPct / 100, t - 1));
    const bayilik = R(input.bayilikBase * Math.pow(1 + input.bayilikGrowthPct / 100, t - 1));
    const totalFixedExpense = R(operatorPremium + propertyTax + insurance + renewalFund + ecrimisil + ustHakkiOdeme + bayilik);

    const totalExpense = R(totalOperatingExpense + totalFixedExpense);
    const netOperatingProfit = R(totalRevenue - totalExpense);
    const netOperatingProfitPct = totalRevenue > 0 ? R((netOperatingProfit / totalRevenue) * 100) : 0;

    // 1. dönem indirgenmez; 2. dönemden itibaren (1+i)^-(t-1)
    const presentValue = t === 1 ? netOperatingProfit : R(netOperatingProfit / Math.pow(1 + i, t - 1));
    sumPv += presentValue;

    years.push({
      year: t, roomIncome, foodIncome, otherIncome, meetingIncome, shopIncome, totalRevenue, roomIncomePct,
      roomExpense, foodExpense, otherExpense, generalMgmtExpense, energyExpense, repairExpense, totalOperatingExpense,
      grossOperatingProfit, grossOperatingProfitPct,
      operatorPremium, propertyTax, insurance, renewalFund, ecrimisil, ustHakkiOdeme, bayilik, totalFixedExpense,
      totalExpense, netOperatingProfit, netOperatingProfitPct, presentValue,
    });
  }

  sumPv = R(sumPv);
  const haircut = Math.min(100, Math.max(0, input.donemSonuIndirgemePct)) / 100;
  const propertyValueLocal = R(sumPv * (1 - haircut));
  const propertyValueRounded = R5000(propertyValueLocal);
  const fx = input.currency === 'TL' ? 1 : Math.max(0, input.fxRate);
  const propertyValueTl = input.currency === 'TL' ? propertyValueRounded : R5000(propertyValueRounded * fx);

  return {
    discountRate: i, baseRoomIncome, cost, years, sumPresentValue: sumPv,
    propertyValueLocal, propertyValueRounded, propertyValueTl, warnings,
  };
}
