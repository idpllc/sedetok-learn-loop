import { useEffect, useRef, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { Sidebar } from "@/components/Sidebar";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { ContentCard } from "@/components/ContentCard";
import { VideoPlayerRef } from "@/components/VideoPlayer";
import { getQuizScientistIcon } from "@/lib/quizScientists";
import { getDisplayName } from "@/lib/displayName";

interface FeedItem {
  id: string;
  title: string;
  description: string | null;
  creator_id: string;
  category: string;
  subject: string | null;
  grade_level: string;
  content_type: string;
  thumbnail_url: string | null;
  video_url: string | null;
  document_url: string | null;
  rich_text: string | null;
  likes_count: number;
  comments_count: number;
  shares_count: number;
  tags: string[];
  profiles: any;
  game_type?: string;
  questions_count?: number;
  difficulty?: string;
  [key: string]: any;
}

/**
 * Fetch a single item by ID from the appropriate table.
 */
async function fetchSingleItem(
  id: string,
  type: "content" | "quiz" | "game"
): Promise<FeedItem | null> {
  const table = type === "quiz" ? "quizzes" : type === "game" ? "games" : "content";
  const { data, error } = await (supabase
    .from(table) as any)
    .select(`*, profiles:creator_id (username, full_name, avatar_url, institution, is_verified)`)
    .eq("id", id)
    .single();

  if (error || !data) return null;

  const d = data as any;
  return {
    ...d,
    content_type: type === "quiz" ? "quiz" : type === "game" ? "game" : d.content_type,
    likes_count: d.likes_count || 0,
    comments_count: d.comments_count || 0,
    shares_count: d.shares_count || 0,
    saves_count: d.saves_count || 0,
    views_count: d.views_count || 0,
    video_url: d.video_url || null,
    document_url: d.document_url || null,
    rich_text: d.rich_text || null,
    tags: d.tags || [],
  } as FeedItem;
}

/**
 * Fetch related content: same subject first, then random filler.
 * Excludes the given ID.
 */
async function fetchRelatedContent(
  excludeIds: string[],
  subject: string | null,
  limit: number = 10
): Promise<FeedItem[]> {
  const results: FeedItem[] = [];
  const seenIds = new Set<string>(excludeIds);

  const normalize = (items: any[], type?: string) =>
    items.map((item: any) => ({
      ...item,
      content_type: type || item.content_type,
      likes_count: item.likes_count || 0,
      comments_count: item.comments_count || 0,
      shares_count: item.shares_count || 0,
      video_url: item.video_url || null,
      document_url: item.document_url || null,
      rich_text: item.rich_text || null,
      tags: item.tags || [],
    })) as FeedItem[];

  // 1. Try same-subject content
  if (subject) {
    const tables: Array<{ table: string; type: string; extra: (q: any) => any }> = [
      { table: "content", type: "", extra: (q: any) => q.eq("is_public", true) },
      { table: "quizzes", type: "quiz", extra: (q: any) => q.eq("is_public", true).eq("status", "publicado") },
      { table: "games", type: "game", extra: (q: any) => q.eq("is_public", true) },
    ];

    const subjectPromises = tables.map(async ({ table, type, extra }) => {
      let q = (supabase.from(table as any) as any)
        .select(`*, profiles:creator_id (username, full_name, avatar_url, institution, is_verified)`)
        .ilike("subject", `%${subject}%`)
        .order("created_at", { ascending: false })
        .limit(4);
      q = extra(q);
      const { data } = await q;
      return normalize(data || [], type || undefined);
    });

    const subjectResults = (await Promise.all(subjectPromises)).flat();
    for (const item of subjectResults.sort(() => Math.random() - 0.5)) {
      if (!seenIds.has(item.id) && results.length < limit) {
        seenIds.add(item.id);
        results.push(item);
      }
    }
  }

  // 2. Fill remaining with random content from all tables
  if (results.length < limit) {
    const remaining = limit - results.length;
    const fetchSize = remaining + 30;

    // Use a random offset to get different content each time
    const randomOffset = Math.floor(Math.random() * 50);

    const fillerPromises = [
      supabase
        .from("content")
        .select(`*, profiles:creator_id (username, full_name, avatar_url, institution, is_verified)`)
        .eq("is_public", true)
        .order("created_at", { ascending: false })
        .range(randomOffset, randomOffset + fetchSize - 1),
      supabase
        .from("quizzes")
        .select(`*, profiles:creator_id (username, full_name, avatar_url, institution, is_verified)`)
        .eq("is_public", true)
        .eq("status", "publicado")
        .order("created_at", { ascending: false })
        .range(randomOffset, randomOffset + fetchSize - 1),
      supabase
        .from("games")
        .select(`*, profiles:creator_id (username, full_name, avatar_url, institution, is_verified)`)
        .eq("is_public", true)
        .order("created_at", { ascending: false })
        .range(randomOffset, randomOffset + fetchSize - 1),
    ];

    const [contentRes, quizRes, gameRes] = await Promise.all(fillerPromises);

    const allFillers = [
      ...normalize((contentRes.data as any[]) || []),
      ...normalize((quizRes.data as any[]) || [], "quiz"),
      ...normalize((gameRes.data as any[]) || [], "game"),
    ].sort(() => Math.random() - 0.5);

    for (const item of allFillers) {
      if (!seenIds.has(item.id) && results.length < limit) {
        seenIds.add(item.id);
        results.push(item);
      }
    }
  }

  return results;
}

const SedeTok = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRefs = useRef<Map<string, VideoPlayerRef | null>>(new Map());

  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const loadedInitial = useRef(false);
  const currentInitId = useRef<string | null>(null);
  const playlistItemCache = useRef<Map<string, FeedItem>>(new Map());

  // Get current content from URL
  const contentId = searchParams.get("content");
  const quizId = searchParams.get("quiz");
  const gameId = searchParams.get("game");
  const playlistParam = searchParams.get("playlist");
  const currentId = contentId || quizId || gameId;
  const currentType: "content" | "quiz" | "game" = quizId ? "quiz" : gameId ? "game" : "content";

  // Parse playlist (e.g. "id1:quiz,id2:quiz"). When present, the feed is
  // limited strictly to these items — no random related fill, no infinite scroll.
  const playlist = (() => {
    if (!playlistParam) return null;
    try {
      return decodeURIComponent(playlistParam)
        .split(",")
        .filter(Boolean)
        .map((entry) => {
          const [pid, ptype] = entry.split(":");
          const t = (ptype === "quiz" || ptype === "game" ? ptype : "content") as
            | "content"
            | "quiz"
            | "game";
          return { id: pid, type: t };
        });
    } catch {
      return null;
    }
  })();
  const playlistKey = playlist ? playlist.map((p) => `${p.id}:${p.type}`).join(",") : null;
  const isPlaylistMode = !!(playlist && playlist.length > 0);
  const embed = searchParams.get("embed") === "1";

  // Initial load: fetch playlist items strictly, OR target + related, OR general feed.
  useEffect(() => {
    const initKey = (currentId || "__general__") + "|" + (playlistKey || "");
    if (currentInitId.current === initKey) return;
    currentInitId.current = initKey;
    loadedInitial.current = true;

    const load = async () => {
      setIsLoading(true);
      try {
        if (isPlaylistMode) {
          // Strict mode: load the REQUESTED item first (the one the user clicked,
          // identified by currentId), show it, then fetch the rest in the
          // background — preserving playlist order but starting at currentId.
          const requestedIndex = currentId
            ? playlist!.findIndex((p) => p.id === currentId)
            : 0;
          const startIndex = requestedIndex >= 0 ? requestedIndex : 0;
          const first = playlist![startIndex];
          const firstItem = await fetchSingleItem(first.id, first.type);
          setFeed(firstItem ? [firstItem] : []);
          setIsLoading(false);
          if (playlist!.length > 1) {
            // Background-fetch remaining items in playlist order, skipping the
            // one we already loaded. Don't block the UI; notebook embeds cache
            // the metadata but do not render extra video players.
            (async () => {
              const remaining = playlist!.filter((_, i) => i !== startIndex);
              const rest = await Promise.all(
                remaining.map((p) => fetchSingleItem(p.id, p.type))
              );
              const restItems = rest.filter(Boolean) as FeedItem[];
              restItems.forEach((item) => playlistItemCache.current.set(item.id, item));
              if (embed) return;
              if (restItems.length > 0) {
                setFeed((prev) => {
                  const seen = new Set(prev.map((f) => f.id));
                  return [...prev, ...restItems.filter((r) => !seen.has(r.id))];
                });
              }
            })();
          }
          return;
        } else if (currentId) {
          const mainItem = await fetchSingleItem(currentId, currentType);
          if (!mainItem) {
            setFeed([]);
            setIsLoading(false);
            return;
          }
          // Show the main item right away, then fetch related in the background.
          setFeed([mainItem]);
          setIsLoading(false);
          (async () => {
            const related = await fetchRelatedContent([currentId], mainItem.subject, 10);
            if (related.length > 0) {
              setFeed((prev) => {
                const seen = new Set(prev.map((f) => f.id));
                return [...prev, ...related.filter((r) => !seen.has(r.id))];
              });
            }
          })();
          return;
        } else {
          const generalFeed = await fetchRelatedContent([], null, 15);
          setFeed(generalFeed);
        }
      } catch (err) {
        console.error("Error loading SedeTok feed:", err);
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, [currentId, currentType, playlistKey, embed]);

  // Load more related content when scrolling near bottom (disabled in playlist mode).
  const loadMore = useCallback(async () => {
    if (isPlaylistMode) return;
    if (loadingMore || feed.length === 0) return;
    setLoadingMore(true);
    try {
      const existingIds = new Set(feed.map((f) => f.id));
      const moreContent = await fetchRelatedContent(
        Array.from(existingIds),
        null,
        10
      );
      const newItems = moreContent.filter((item) => !existingIds.has(item.id));
      if (newItems.length > 0) {
        setFeed((prev) => [...prev, ...newItems]);
      }
    } catch (err) {
      console.error("Error loading more content:", err);
    } finally {
      setLoadingMore(false);
    }
  }, [feed, loadingMore, isPlaylistMode]);

  // Infinite scroll detection
  useEffect(() => {
    const handleScroll = () => {
      if (!containerRef.current) return;
      const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
      if (scrollHeight - scrollTop - clientHeight < 1000) {
        loadMore();
      }
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener("scroll", handleScroll);
      return () => container.removeEventListener("scroll", handleScroll);
    }
  }, [loadMore]);

  // Handle video auto-play/pause on scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const cid = entry.target.getAttribute("data-content-id");
          if (!cid) return;
          const videoRef = videoRefs.current.get(cid);
          if (!videoRef) return;

          if (entry.isIntersecting && entry.intersectionRatio > 0.6) {
            videoRef.play();
          } else if (entry.intersectionRatio < 0.4) {
            videoRef.pause();
          }
        });
      },
      { threshold: [0.4, 0.6, 0.75] }
    );

    const container = containerRef.current;
    if (container) {
      const cards = container.querySelectorAll("[data-content-id]");
      cards.forEach((card) => observer.observe(card));
    }

    return () => observer.disconnect();
  }, [feed]);

  // Navigation between items
  const handleNavigation = (direction: "next" | "previous") => {
    const idx = feed.findIndex((c) => c.id === currentId);
    const newIndex = direction === "next" ? idx + 1 : idx - 1;
    if (newIndex >= 0 && newIndex < feed.length) {
      const newContent = feed[newIndex];
      const ct = newContent.content_type;
      const param = ct === "quiz" ? "quiz" : ct === "game" ? "game" : "content";
      const next: Record<string, string> = { [param]: newContent.id };
      if (playlistParam) next.playlist = playlistParam;
      setSearchParams(next, { replace: true });
    }
  };

  if (isLoading) {
    return (
      <>
        {!embed && <Sidebar />}
        <div className={`min-h-screen bg-background flex items-center justify-center ${embed ? "" : "md:ml-64"}`}>
          <Skeleton className="w-full max-w-md h-[600px] rounded-xl" />
        </div>
      </>
    );
  }

  return (
    <>
      {!embed && <Sidebar />}
      <div
        ref={containerRef}
        className={`h-screen overflow-y-scroll snap-y snap-mandatory bg-background scrollbar-hide ${embed ? "" : "md:ml-64"}`}
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {feed.map((content, index) => {
          const profile = content.profiles as any;
          const isQuiz = content.content_type === "quiz";
          const isGame = content.content_type === "game";

          return (
            <div
              key={content.id}
              data-content-id={content.id}
              className="h-screen snap-start snap-always"
            >
              <ContentCard
                id={content.id}
                title={content.title}
                description={content.description || ""}
                creator={getDisplayName(profile)}
                creatorId={content.creator_id}
                institution={profile?.institution}
                tags={content.tags || []}
                category={content.category || ""}
                subject={content.subject || undefined}
                thumbnail={content.thumbnail_url || undefined}
                videoUrl={content.video_url || undefined}
                documentUrl={content.document_url || undefined}
                richText={content.rich_text || undefined}
                mindMapData={(content as any).mind_map_data || undefined}
                contentType={content.content_type}
                likes={content.likes_count || 0}
                comments={content.comments_count || 0}
                shares={content.shares_count || 0}
                grade={content.grade_level || ""}
                isLiked={false}
                isSaved={false}
                creatorAvatar={profile?.avatar_url}
                onPrevious={index > 0 ? () => handleNavigation("previous") : undefined}
                onNext={index < feed.length - 1 ? () => handleNavigation("next") : undefined}
                hasPrevious={index > 0}
                hasNext={index < feed.length - 1}
                videoRef={(ref) => {
                  if (ref) {
                    videoRefs.current.set(content.id, ref);
                  } else {
                    videoRefs.current.delete(content.id);
                  }
                }}
                questionsCount={isQuiz ? content.questions_count : undefined}
                difficulty={isQuiz ? content.difficulty : undefined}
                gameType={isGame ? content.game_type : undefined}
              />
            </div>
          );
        })}
      </div>
    </>
  );
};

export default SedeTok;
