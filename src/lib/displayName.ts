/**
 * Returns a user-friendly display name, preferring full_name over username.
 * Avoids exposing raw document numbers that may have been used as usernames.
 */
export const getDisplayName = (
  profile?: { full_name?: string | null; username?: string | null } | null
): string => {
  if (!profile) return "Usuario";
  // Prefer full_name when available and non-empty
  if (profile.full_name && profile.full_name.trim()) return profile.full_name;
  // Fallback to username only if it doesn't look like a pure number (document)
  if (profile.username && !/^\d+$/.test(profile.username)) return profile.username;
  return "Usuario";
};
