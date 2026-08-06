/**
 * OTEL HAZIR PROFİLLERİ — yalnızca başlangıç noktası / ÖRNEK veridir.
 * Gerçek piyasa verisi DEĞİLDİR; kullanıcı seçtikten sonra kendi
 * verileriyle serbestçe değiştirmelidir. Türkiye otelcilik segmentleri
 * arasındaki genel eğilimi (yıldız arttıkça ADR artar, gider oranı
 * hafif düşer vb.) yansıtacak şekilde iç tutarlı kurulmuştur.
 */
export interface HotelProfile {
  name: string;
  desc: string;
  roomCount: number;
  adr: number;
  occupancy: number;
  operatingDays: number;
  expenseRate: number;
  capRate: number;
}

export const HOTEL_PROFILES: HotelProfile[] = [
  {
    name: 'Ekonomik Şehir Oteli (2-3 yıldız)',
    desc: 'Küçük/orta ölçekli, düşük maliyetli şehir içi konaklama',
    roomCount: 40, adr: 1500, occupancy: 0.65, operatingDays: 365, expenseRate: 0.55, capRate: 0.11,
  },
  {
    name: 'Orta Segment İş Oteli (4 yıldız)',
    desc: 'Şehir merkezi, iş seyahati ağırlıklı',
    roomCount: 80, adr: 3000, occupancy: 0.60, operatingDays: 365, expenseRate: 0.50, capRate: 0.10,
  },
  {
    name: 'Üst Segment Şehir Oteli (5 yıldız)',
    desc: 'Büyükşehir, uluslararası zincir tarzı',
    roomCount: 150, adr: 5500, occupancy: 0.58, operatingDays: 365, expenseRate: 0.48, capRate: 0.09,
  },
  {
    name: 'Sahil Resort (Mevsimlik)',
    desc: 'Yalnızca yaz sezonu açık, yüksek doluluk',
    roomCount: 200, adr: 4500, occupancy: 0.70, operatingDays: 150, expenseRate: 0.52, capRate: 0.10,
  },
  {
    name: 'Butik Otel',
    desc: 'Az oda sayılı, yüksek kişiselleştirilmiş hizmet',
    roomCount: 20, adr: 4000, occupancy: 0.55, operatingDays: 365, expenseRate: 0.45, capRate: 0.09,
  },
];
