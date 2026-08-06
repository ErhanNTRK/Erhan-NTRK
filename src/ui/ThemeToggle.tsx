/**
 * TEMA GEÇİŞİ — Açık/Koyu. Uygulamanın neresinde olursa olsun tek tıklamayla
 * geçiş yapılabilir; seçim localStorage'da saklanır, uygulama tekrar
 * açıldığında korunur. Mevcut tasarım (renk paleti, bileşenler) değişmedi —
 * yalnızca `[data-theme="dark"]` CSS bloğu aynı değişkenleri (--bg, --surface,
 * --text vb.) koyu karşılıklarıyla ezer.
 */
import { useEffect, useState } from 'react';

const KEY = 'arsaplan-theme';
type Theme = 'light' | 'dark';

function getInitial(): Theme {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved === 'light' || saved === 'dark') return saved;
  } catch { /* yok */ }
  return 'light';
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(getInitial);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try { localStorage.setItem(KEY, theme); } catch { /* dolu */ }
  }, [theme]);

  return (
    <button
      type="button"
      className="theme-toggle no-print"
      title={theme === 'light' ? 'Koyu Temaya Geç' : 'Açık Temaya Geç'}
      onClick={() => setTheme((t) => (t === 'light' ? 'dark' : 'light'))}
    >
      {theme === 'light' ? '🌙' : '☀️'}
    </button>
  );
}
