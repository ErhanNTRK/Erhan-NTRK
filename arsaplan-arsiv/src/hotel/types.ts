/**
 * OTEL GELİRİ (GELİR İNDİRGEME YAKLAŞIMI) — MOTOR TİPLERİ
 *
 * Bu modül ArsaPlan'ın mevcut "Arsa Gelir Projeksiyon Yöntemi" akışından tamamen
 * bağımsızdır. Kendi veri modeline, kendi hesaplama motoruna ve kendi arayüzüne
 * sahiptir. engine/ klasöründeki hiçbir tip veya fonksiyon değiştirilmemiştir.
 *
 * Veri akışı sırası (değiştirilemez):
 *   1) Oda Gelirleri
 *   2) Yardımcı İşletme Gelirleri
 *   3) Ticari Alan Kira Gelirleri
 *   4) Toplam Brüt Gelir
 *   5) İşletme Giderleri
 *   6) Net İşletme Geliri (NOI)
 *   7) Kapitalizasyon Hesabı
 *   8) Nihai Piyasa Değeri
 *
 * Not: veri modeli yalnızca "otel" için dar tasarlanmamıştır; RoomRevenueRow /
 * AncillaryIncomeRow / CommercialLeaseRow yapıları ileride AVM, Ofis, Hastane vb.
 * gelir modülleri için de yeniden kullanılabilecek şekilde genelleştirilmiştir.
 */

/** Hazır oda tipi kataloğu — kullanıcı isterse serbest metinle yeni tip de girebilir. */
export const ODA_TIPLERI: string[] = [
  'Standart', 'Ekonomik', 'Deluxe', 'Superior', 'Junior Suit',
  'Executive Suit', 'King Suit', 'Villa', 'Bungalov',
  'Family Room', 'Connection Room', 'Residence', 'Diğer',
];

/** Hazır yardımcı gelir kalemi kataloğu — serbest metinle genişletilebilir. */
export const YARDIMCI_GELIR_KATALOGU: string[] = [
  'Restoran', 'Kafe', 'Bar', 'SPA', 'Masaj', 'Hamam', 'Sauna', 'Fitness',
  'Açık Havuz', 'Kapalı Havuz', 'Otopark', 'Vale', 'Transfer',
  'Araç Kiralama', 'Araç Yıkama', 'Toplantı Salonu', 'Kongre Merkezi',
  'Düğün Salonu', 'Organizasyon', 'Market', 'Hediyelik Eşya', 'Plaj',
  'İskele', 'Tekne Bağlama', 'Çamaşırhane', 'GES', 'Reklam',
  'Baz İstasyonu', 'Diğer',
];

/** Hazır ticari kira alan türü kataloğu — serbest metinle genişletilebilir. */
export const TICARI_KIRA_KATALOGU: string[] = [
  'Market', 'Banka', 'ATM', 'Eczane', 'Ofis', 'Fast Food', 'Kafe',
  'Mağaza', 'Kuaför', 'Döviz Bürosu', 'Diğer',
];

/* ─────────────────── 1) Oda Gelirleri ─────────────────── */
export interface RoomRevenueRow {
  id: string;
  roomType: string;
  roomCount: number;
  adr: number;            // Günlük Ortalama Fiyat (Average Daily Rate)
  occupancy: number;      // 0-1 arası (0.72 = %72)
  operatingDays: number;  // 1-365
}

/* ─────────────────── 2) Yardımcı İşletme Gelirleri ─────────────────── */
export interface AncillaryIncomeRow {
  id: string;
  name: string;
  /** 'tutar' → annualIncome ₺; 'oran' → oda gelirinin rate kadarı */
  mode?: 'tutar' | 'oran';
  annualIncome: number;
  /** mode='oran' iken oda gelirine uygulanan oran (0.02 = %2) */
  rate?: number;
  note: string;
}

export interface AncillaryIncomeCalc extends AncillaryIncomeRow {
  /** Satırın hesaba giren yıllık geliri (₺) */
  effectiveIncome: number;
}

/* ─────────────────── 3) Ticari Alan Kira Gelirleri ─────────────────── */
export type LeaseInputMode = 'aylik' | 'yillik';

export interface CommercialLeaseRow {
  id: string;
  areaName: string;
  areaType: string;
  tenant: string;
  inputMode: LeaseInputMode;
  /** inputMode'a göre aylık ya da yıllık tutar; diğeri otomatik türetilir. */
  amount: number;
  note: string;
}

/* ─────────────────── Genel Bilgiler ─────────────────── */
export interface HotelGeneralInfo {
  facilityName: string;
  il: string;
  ilce: string;
  mahalle: string;
  ada: string;
  parsel: string;
  address: string;
}

/* ─────────────────── İşletme Gideri ─────────────────── */
export interface HotelOpexInput {
  /** Toplam Brüt Gelir üzerinden tek oran (0.35 = %35). İlk sürümde tek yöntem budur. */
  expenseRate: number;
}

/* ─────────────────── Projeksiyon ─────────────────── */
export interface HotelProjectionInput {
  startYear: number;
  /** 3-25 yıl arası serbest */
  years: number;
  incomeGrowthRate: number;   // yıllık gelir artış oranı
  expenseGrowthRate: number;  // yıllık gider artış oranı
  capRate: number;            // Kapitalizasyon Oranı (Direkt Kapitalizasyon)
  /** İNA terminal kapitalizasyon oranı (null → capRate kullanılır) */
  terminalCapRate: number | null;
  /** İNA iskonto oranı = risksiz + risk primi (null → İNA hesaplanmaz) */
  discountRate: number | null;
  /** İskonto bileşenleri (yalnız gösterim/öneri; discountRate esas) */
  riskFreeRate?: number | null;
  riskPremium?: number | null;
  /** Dönemsel bakım-onarım: belirtilen yılda tek seferlik gider (₺) */
  maintenanceYear?: number | null;
  maintenanceAmount?: number | null;
  /** Yenileme/Bakım Fonu: HER YIL tekrarlayan, toplam gelirin oranı kadar gider (0.05 = %5). null/0 = kapalı. */
  renewalFundRate?: number | null;
}

/** Tüm otel geliri modülü girdisi — tek kaynak (Single Source of Truth). */
export type HotelFinalMethod = 'direkt' | 'ina' | 'maliyet' | 'manuel';

export interface HotelIncomeInput {
  /** Hesap para birimi ve TL kuru (yalnız gösterim; 'TRY' → kur 1) */
  currency?: 'TRY' | 'USD' | 'EUR';
  fxRate?: number | null;
  /** Maliyet Yaklaşımı — opsiyonel, istenirse hesaplanır */
  costParcelArea?: number;
  costFromKml?: boolean;
  costLandUnitValue?: number;
  costBuildings?: { id: string; type: string; area: number; unitCost: number; depreciationPct: number }[];
  /** Şerefiye — konum/ticari potansiyel primi, elle girilen tek tutar. Maliyet Yaklaşımı toplamına eklenir. */
  costGoodwill?: number | null;
  /** PDF'te hangi yöntemlerin gösterileceği (varsayılan hepsi açık) */
  showIncomeInPdf?: boolean;
  showInaInPdf?: boolean;
  showCostInPdf?: boolean;
  /** Nihai değer seçimi: uzman takdiri */
  finalMethod?: HotelFinalMethod;
  finalManualValue?: number | null;
  general: HotelGeneralInfo;
  rooms: RoomRevenueRow[];
  ancillary: AncillaryIncomeRow[];
  leases: CommercialLeaseRow[];
  opex: HotelOpexInput;
  projection: HotelProjectionInput;
}

/* ─────────────────── Hesaplama Sonuçları ─────────────────── */
export interface RoomRevenueCalc extends RoomRevenueRow {
  annualRevenue: number;
}

export interface CommercialLeaseCalc extends CommercialLeaseRow {
  monthlyAmount: number;
  annualAmount: number;
}

/** Performans göstergeleri — kullanıcı girmez, otomatik hesaplanır. */
export interface HotelPerformanceIndicators {
  totalRoomCount: number;
  /** ADR: oda sayısı ağırlıklı ortalama günlük fiyat */
  blendedAdr: number;
  /** Occupancy: oda sayısı ağırlıklı ortalama doluluk */
  blendedOccupancy: number;
  /** RevPAR = ADR × Doluluk */
  revPar: number;
}

export interface HotelInaResult {
  /** Yıl bazında nakit akımı (bakım düşülmüş, son yıla terminal eklenmiş) */
  cashFlows: number[];
  /** Terminal değer (son yıl NOI ÷ terminal oran) */
  terminalValue: number;
  /** Net Bugünkü Değer — İNA yöntemi sonucu */
  npv: number;
}

export interface HotelProjectionYear {
  year: number;
  yearIndex: number; // 1, 2, 3...
  totalRevenue: number;
  totalExpense: number;
  renewalFund: number;   // o yılın Yenileme Fonu gideri (zaten totalExpense'e dahil, ayrıca gösterim için)
  noi: number;
  capitalizedValue: number;
}

export interface HotelWarning {
  level: 'uyari' | 'dikkat';
  message: string;
}

export interface HotelIncomeResult {
  roomRows: RoomRevenueCalc[];
  totalRoomRevenue: number;

  ancillaryRows: AncillaryIncomeCalc[];
  totalAncillaryRevenue: number;

  leaseRows: CommercialLeaseCalc[];
  totalLeaseRevenue: number;

  totalGrossRevenue: number;
  totalExpense: number;
  noi: number;
  capitalizedValue: number;

  performance: HotelPerformanceIndicators;
  projectionTable: HotelProjectionYear[];
  /** İNA sonucu (discountRate girilmişse) */
  ina: HotelInaResult | null;
  /** Maliyet Yaklaşımı sonucu (bina/arsa girilmişse) */
  cost: { landValue: number; buildingsValue: number; goodwill: number; totalValue: number; totalValueRounded: number } | null;

  warnings: HotelWarning[];
  summaryText: string;
}
