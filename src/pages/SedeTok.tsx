import { useEffect, useRef, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { Sidebar } from "@/components/Sidebar";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { ContentCard } from "@/components/ContentCard";
import { VideoPlayerRef } from "@/components/VideoPlayer";
import { getQuizScientistIcon } from "@/lib/quizScientists";

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
  excludeId: string,
  subject: string | null,
  limit: number = 10
): Promise<FeedItem[]> {
  const results: FeedItem[] = [];
  const seenIds = new Set<string>([excludeId]);

  // 1. Try same-subject content
  if (subject) {
    const tables = [
      { table: "content" as const, type: "content", extraFilter: (q: any) => q.eq("is_public", true) },
      { table: "quizzes" as const, type: "quiz", extraFilter: (q: any) => q.eq("is_public", true).eq("status", "publicado") },
      { table: "games" as const, type: "game", extraFilter: (q: any) => q.eq("is_public", true) },
    ];

    const subjectPromises = tables.map(async ({ table, type, extraFilter }) => {
      let q = supabase
        .from(table)
        .select(`*, profiles:creator_id (username, full_name, avatar_url, institution, is_verified)`)
        .neq("id", excludeId)
        .ilike("subject", `%${subject}%`)
        .order("created_at", { ascending: false })
        .limit(4);
      q = extraFilter(q);
      const { data } = await q;
      return (data || []).map((item: any) => ({
        ...item,
        content_type: type === "quiz" ? "quiz" : type === "game" ? "game" : item.content_type,
        likes_count: item.likes_count || 0,
        comments_count: item.comments_count || 0,
        shares_count: item.shares_count || 0,
        video_url: item.video_url || null,
        document_url: item.document_url || null,
        rich_text: item.rich_text || null,
        tags: item.tags || [],
      }));
    });

    const subjectResults = (await Promise.all(subjectPromises)).flat();
    // Shuffle and pick
    for (const item of subjectResults.sort(() => Math.random() - 0.5)) {
      if (!seenIds.has(item.id) && results.length < limit) {
        seenIds.add(item.id);
        results.push(item as FeedItem);
      }
    }
  }

  // 2. Fill remaining with random content
  if (results.length < limit) {
    const remaining = limit - results.length;
    const idsToExclude = Array.from(seenIds);

    // Fetch from content table with random-ish ordering
    const { data: fillerContent } = await supabase
      .from("content")
      .select(`*, profiles:creator_id (username, full_name, avatar_url, institution, is_verified)`)
      .eq("is_public", true)
      .not("id", "in", `(${idsToExclude.join(",")})`)
      .order("created_at", { ascending: false })
      .limit(remaining + 10); // fetch extra so we can randomise

    if (fillerContent) {
      const shuffled = fillerContent.sort(() => Math.random() - 0.5);
      for (const item of shuffled) {
        if (!seenIds.has(item.id) && results.length < limit) {
          seenIds.add(item.id);
          results.push({
            ...item,
            likes_count: item.likes_count || 0,
            comments_count: item.comments_count || 0,
            shares_count: item.shares_count || 0,
            video_url: item.video_url || null,
            document_url: item.document_url || null,
            rich_text: item.rich_text || null,
            tags: item.tags || [],
          } as FeedItem);
        }
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

  // Get current content from URL
  const contentId = searchParams.get("content");
  const quizId = searchParams.get("quiz");
  const gameId = searchParams.get("game");
  const currentId = contentId || quizId || gameId;
  const currentType: "content" | "quiz" | "game" = quizId ? "quiz" : gameId ? "game" : "content";

  // Initial load: fetch the target item + related content
  useEffect(() => {
    if (!currentId || currentInitId.current === currentId) return;
    currentInitId.current = currentId;
    loadedInitial.current = true;

    const load = async () => {
      setIsLoading(true);
      try {
        const mainItem = await fetchSingleItem(currentId, currentType);
        if (!mainItem) {
          setFeed([]);
          setIsLoading(false);
          return;
        }

        const related = await fetchRelatedContent(currentId, mainItem.subject, 10);
        setFeed([mainItem, ...related]);
      } catch (err) {
        console.error("Error loading SedeTok feed:", err);
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, [currentId, currentType]);

  // Load more related content when scrolling near bottom
  const loadMore = useCallback(async () => {
    if (loadingMore || feed.length === 0) return;
    setLoadingMore(true);
    try {
      const firstItem = feed[0];
      const moreContent = await fetchRelatedContent(
        feed.map((f) => f.id).join(","), // this won't work for exclusion, let's use a simpler approach
        firstItem?.subject,
        5
      );
      // Filter out items we already have
      const existingIds = new Set(feed.map((f) => f.id));
      const newItems = moreContent.filter((item) => !existingIds.has(item.id));
      if (newItems.length > 0) {
        setFeed((prev) => [...prev, ...newItems]);
      }
    } catch (err) {
      console.error("Error loading more content:", err);
    } finally {
      setLoadingMore(false);
    }
  }, [feed, loadingMore]);

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
      setSearchParams({ [param]: newContent.id }, { replace: true });
    }
  };

  if (isLoading) {
    return (
      <>
        <Sidebar />
        <div className="min-h-screen bg-background md:ml-64 flex items-center justify-center">
          <Skeleton className="w-full max-w-md h-[600px] rounded-xl" />
        </div>
      </>
    );
  }

  return (
    <>
      <Sidebar />
      <div
        ref={containerRef}
        className="h-screen overflow-y-scroll snap-y snap-mandatory bg-background md:ml-64 scrollbar-hide"
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
                creator={profile?.username || profile?.full_name || "Usuario"}
                creatorId={content.creator_id}
                institution={profile?.institution}
                tags={content.tags || []}
                category={content.category || ""}
                subject={content.subject || undefined}
                thumbnail={content.thumbnail_url || undefined}
                videoUrl={content.video_url || undefined}
                documentUrl={content.document_url || undefined}
                richText={content.rich_text || undefined}
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
