// TikTok URL helpers

const PATTERNS = [
  /tiktok\.com\/@[^/]+\/video\/(\d+)/i,
  /tiktok\.com\/v\/(\d+)/i,
  /m\.tiktok\.com\/v\/(\d+)/i,
  /vm\.tiktok\.com\/([A-Za-z0-9]+)/i,
  /vt\.tiktok\.com\/([A-Za-z0-9]+)/i,
  /tiktok\.com\/embed\/v2\/(\d+)/i,
  /tiktok\.com\/embed\/(\d+)/i,
];

export const extractTikTokId = (url: string | null | undefined): string | null => {
  if (!url) return null;
  const trimmed = url.trim();
  if (/^\d{6,}$/.test(trimmed)) return trimmed;
  for (const re of PATTERNS) {
    const m = trimmed.match(re);
    if (m?.[1]) return m[1];
  }
  return null;
};

export const isTikTokUrl = (url: string | null | undefined): boolean => {
  if (!url) return false;
  return /tiktok\.com/i.test(url);
};

export const isNumericTikTokId = (id: string | null): boolean => !!id && /^\d{6,}$/.test(id);

export const getTikTokEmbedUrl = (url: string): string | null => {
  const id = extractTikTokId(url);
  if (!id || !isNumericTikTokId(id)) return null;
  return `https://www.tiktok.com/embed/v2/${id}?lang=es&autoplay=1`;
};

export const getTikTokThumbnailViaOEmbed = async (url: string): Promise<string | null> => {
  try {
    const r = await fetch(`https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`);
    if (!r.ok) return null;
    const j = await r.json();
    return j?.thumbnail_url || null;
  } catch {
    return null;
  }
};
