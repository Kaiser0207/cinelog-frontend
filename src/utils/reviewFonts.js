import { useEffect } from 'react';

// UI chrome stays on the self-hosted Nevis face. Review body faces are fetched
// only when a review (or its font-picker preview) actually asks for one.
const GOOGLE_FONT_QUERY = {
  Outfit: 'Outfit:wght@300;400;500;600;700;800;900',
  'Playfair Display': 'Playfair+Display:ital,wght@0,400;0,700;0,900;1,400',
  'Noto Serif TC': 'Noto+Serif+TC:wght@400;700;900',
  Caveat: 'Caveat:wght@400;500;600;700',
  Nunito: 'Nunito:wght@300;400;600;700;800',
  'Bebas Neue': 'Bebas+Neue',
  'JetBrains Mono': 'JetBrains+Mono:wght@300;400;500;700',
  UnifrakturCook: 'UnifrakturCook:wght@700',
  'DM Serif Display': 'DM+Serif+Display:ital@0;1',
  'Cormorant Garamond': 'Cormorant+Garamond:ital,wght@0,400;0,600;1,400',
  Lora: 'Lora:ital,wght@0,400;0,600;1,400',
  'Space Grotesk': 'Space+Grotesk:wght@300;400;500;600;700',
  'Ma Shan Zheng': 'Ma+Shan+Zheng',
  'LXGW WenKai TC': 'LXGW+WenKai+TC:wght@300;400;700',
  'Zhi Mang Xing': 'Zhi+Mang+Xing',
};

const requested = new Set();

export function reviewFontStylesheet(fontName) {
  const query = GOOGLE_FONT_QUERY[fontName];
  return query
    ? `https://fonts.googleapis.com/css2?family=${query}&display=swap`
    : null;
}

export function loadReviewFont(fontName) {
  if (typeof document === 'undefined' || requested.has(fontName)) return;
  const href = reviewFontStylesheet(fontName);
  if (!href) return;

  requested.add(fontName);
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = href;
  link.dataset.cineroomsFont = fontName;
  document.head.appendChild(link);
}

export function useReviewFont(fontName) {
  useEffect(() => {
    loadReviewFont(fontName);
  }, [fontName]);
}
