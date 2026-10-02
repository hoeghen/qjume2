/**
 * The introduction video offered to a business with no shop yet.
 *
 * Null until there is one: the intro page then shows a short written
 * walkthrough instead, so the option is never a dead end. Set it to a
 * YouTube link (embedded privacy-enhanced, via youtube-nocookie.com) or a
 * direct video file URL.
 */
export const INTRO_VIDEO_URL: string | null = null;

/** The embeddable form of a YouTube link, or null for anything else. */
export function youTubeEmbed(url: string): string | null {
  const match = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/,
  );
  return match ? `https://www.youtube-nocookie.com/embed/${match[1]}` : null;
}
