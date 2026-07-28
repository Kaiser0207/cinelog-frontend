export const SITE_URL = 'https://cinerooms.vercel.app';

export function absoluteSiteUrl(path = '/') {
  if (/^https?:\/\//i.test(path)) return path;
  return new URL(path, SITE_URL).toString();
}

export function compactDescription(value, maxLength = 160) {
  const clean = String(value || '').replace(/\s+/g, ' ').trim();
  if (clean.length <= maxLength) return clean;
  return `${clean.slice(0, maxLength - 1).trimEnd()}…`;
}

function setMeta(selector, attrs, content) {
  let element = document.head.querySelector(selector);
  if (!element) {
    element = document.createElement('meta');
    Object.entries(attrs).forEach(([key, value]) => element.setAttribute(key, value));
    document.head.appendChild(element);
  }
  element.setAttribute('content', content);
}

export function applyPageMetadata({
  title,
  description,
  path = '/',
  image = '/og-image.png',
  type = 'website',
  robots = 'index,follow',
}) {
  const safeTitle = title || 'CineRooms — Your Cinematic Journal';
  const safeDescription = compactDescription(
    description || 'A personal cinematic journal: rate, review and revisit the films you love.',
  );
  const url = absoluteSiteUrl(path);
  const imageUrl = absoluteSiteUrl(image);

  document.title = safeTitle;
  setMeta('meta[name="description"]', { name: 'description' }, safeDescription);
  setMeta('meta[name="robots"]', { name: 'robots' }, robots);
  setMeta('meta[property="og:type"]', { property: 'og:type' }, type);
  setMeta('meta[property="og:title"]', { property: 'og:title' }, safeTitle);
  setMeta('meta[property="og:description"]', { property: 'og:description' }, safeDescription);
  setMeta('meta[property="og:url"]', { property: 'og:url' }, url);
  setMeta('meta[property="og:image"]', { property: 'og:image' }, imageUrl);
  setMeta('meta[name="twitter:title"]', { name: 'twitter:title' }, safeTitle);
  setMeta('meta[name="twitter:description"]', { name: 'twitter:description' }, safeDescription);
  setMeta('meta[name="twitter:image"]', { name: 'twitter:image' }, imageUrl);

  let canonical = document.head.querySelector('link[rel="canonical"]');
  if (!canonical) {
    canonical = document.createElement('link');
    canonical.rel = 'canonical';
    document.head.appendChild(canonical);
  }
  canonical.href = url;
}
