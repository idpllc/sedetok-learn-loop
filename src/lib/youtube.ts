// YouTube URL helpers

const PATTERNS = [
  /(?:youtube\.com\/watch\?(?:.*&)?v=)([A-Za-z0-9_-]{11})/i,
  /(?:youtu\.be\/)([A-Za-z0-9_-]{11})/i,
  /(?:youtube\.com\/(?:embed|shorts|v|live)\/)([A-Za-z0-9_-]{11})/i,
];

export const extractYouTubeId = (url: string | null | undefined): string | null => {
  if (!url) return null;
  const trimmed = url.trim();
  if (/^[A-Za-z0-9_-]{11}$/.test(trimmed)) return trimmed;
  for (const re of PATTERNS) {
    const m = trimmed.match(re);
    if (m?.[1]) return m[1];
  }
  return null;
};

export const isYouTubeUrl = (url: string | null | undefined): boolean => {
  if (!url) return false;
  return /youtube\.com|youtu\.be/i.test(url) && !!extractYouTubeId(url);
};

export const getYouTubeThumbnail = (url: string): string | null => {
  const id = extractYouTubeId(url);
  if (!id) return null;
  return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
};

export const getYouTubeEmbedUrl = (
  url: string,
  opts: { autoplay?: boolean; mute?: boolean; controls?: boolean } = {}
): string | null => {
  const id = extractYouTubeId(url);
  if (!id) return null;
  const params = new URLSearchParams({
    autoplay: opts.autoplay ? "1" : "0",
    mute: opts.mute ? "1" : "0",
    controls: opts.controls === false ? "0" : "1",
    rel: "0",
    modestbranding: "1",
    playsinline: "1",
    enablejsapi: "1",
    loop: "1",
    playlist: id,
  });
  return `https://www.youtube.com/embed/${id}?${params.toString()}`;
};
