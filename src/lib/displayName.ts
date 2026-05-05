/**
 * Returns a user-friendly display name: first name + last initial.
 * Avoids exposing raw document numbers that may have been used as usernames.
 */
export const getDisplayName = (
  profile?: { full_name?: string | null; username?: string | null } | null
): string => {
  if (!profile) return "Usuario";

  const raw = profile.full_name?.trim();
  if (raw) {
    const parts = raw.split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0]} ${parts[1][0]}.`;
    }
    return parts[0]; // single name
  }

  // Fallback to username only if it doesn't look like a pure number (document)
  if (profile.username && !/^\d+$/.test(profile.username)) return profile.username;
  return "Usuario";
};

/**
 * Returns the full name as stored, falling back to username (if not numeric) or "Usuario".
 */
export const getFullDisplayName = (
  profile?: { full_name?: string | null; username?: string | null } | null
): string => {
  if (!profile) return "Usuario";
  const raw = profile.full_name?.trim();
  if (raw) return raw;
  if (profile.username && !/^\d+$/.test(profile.username)) return profile.username;
  return "Usuario";
};

/**
 * Returns first name + first last name in full (e.g., "Juan Pérez").
 */
export const getShortFullName = (
  profile?: { full_name?: string | null; username?: string | null } | null
): string => {
  if (!profile) return "Usuario";
  const raw = profile.full_name?.trim();
  if (raw) {
    const parts = raw.split(/\s+/);
    if (parts.length >= 2) return `${parts[0]} ${parts[1]}`;
    return parts[0];
  }
  if (profile.username && !/^\d+$/.test(profile.username)) return profile.username;
  return "Usuario";
};
