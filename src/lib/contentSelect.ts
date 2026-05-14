// Shared column list for `content` listings.
// IMPORTANT: omit heavy JSONB fields (presentation_data) from listings, since
// rows can be many MB each (inline base64 images). Detail pages should fetch
// the heavy fields explicitly.
export const CONTENT_LIST_COLUMNS =
  "id, creator_id, title, description, content_type, category, grade_level, " +
  "thumbnail_url, video_url, document_url, tags, is_public, " +
  "likes_count, comments_count, shares_count, saves_count, views_count, " +
  "created_at, updated_at, rich_text, subject, reading_type, mind_map_data";

export const CONTENT_LIST_SELECT = `${CONTENT_LIST_COLUMNS}, profiles:creator_id (username, full_name, avatar_url, institution, is_verified)`;
