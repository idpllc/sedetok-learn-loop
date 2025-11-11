import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Sidebar } from "@/components/Sidebar";
import { useAuth } from "@/hooks/useAuth";
import { useInfiniteContent } from "@/hooks/useContent";
import { Skeleton } from "@/components/ui/skeleton";
import { ContentCard } from "@/components/ContentCard";
import { VideoPlayerRef } from "@/components/VideoPlayer";

const SedeTok = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRefs = useRef<Map<string, VideoPlayerRef | null>>(new Map());
  
  // Get filters from URL
  const filterType = searchParams.get('type');
  const filterSubject = searchParams.get('subject');
  const filterGrade = searchParams.get('grade');
  const filterQuery = searchParams.get('q');
  
  const { data, fetchNextPage, hasNextPage, isLoading } = useInfiniteContent(
    filterType === 'all' ? undefined : filterType as any,
    filterQuery || undefined,
    filterSubject === 'all' ? undefined : filterSubject,
    filterGrade === 'all' ? undefined : filterGrade as any
  );

  const allContent = data?.pages.flatMap(page => page.items) || [];

  // Get current content from URL
  const contentId = searchParams.get('content');
  const quizId = searchParams.get('quiz');
  const gameId = searchParams.get('game');
  
  const currentId = contentId || quizId || gameId;
  const currentIndex = currentId ? allContent.findIndex(c => c.id === currentId) : 0;

  // Infinite scroll - load more when near bottom
  useEffect(() => {
    const handleScroll = () => {
      if (!containerRef.current) return;
      
      const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
      if (scrollHeight - scrollTop - clientHeight < 1000 && hasNextPage) {
        fetchNextPage();
      }
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, [hasNextPage, fetchNextPage]);

  // Handle video control when scrolling (pause videos not in view)
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const contentId = entry.target.getAttribute('data-content-id');
          if (!contentId) return;

          const videoRef = videoRefs.current.get(contentId);
          if (!videoRef) return;

          if (entry.isIntersecting && entry.intersectionRatio > 0.6) {
            // Auto-play when in view
            videoRef.play();
          } else if (entry.intersectionRatio < 0.4) {
            // Pause when out of view
            videoRef.pause();
          }
        });
      },
      { threshold: [0.4, 0.6, 0.75] }
    );

    const container = containerRef.current;
    if (container) {
      const cards = container.querySelectorAll('[data-content-id]');
      cards.forEach((card) => observer.observe(card));
    }

    return () => observer.disconnect();
  }, [allContent]);

  // Scroll to content if URL has an ID
  useEffect(() => {
    if (currentId && containerRef.current) {
      const index = allContent.findIndex(c => c.id === currentId);
      if (index >= 0) {
        const card = containerRef.current.querySelector(`[data-content-id="${currentId}"]`);
        if (card) {
          card.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
    }
  }, [currentId, allContent]);

  const handleNavigation = (direction: 'next' | 'previous') => {
    const newIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;
    if (newIndex >= 0 && newIndex < allContent.length) {
      const newContent = allContent[newIndex];
      const contentType = newContent.content_type;
      const param = contentType === 'quiz' ? 'quiz' : contentType === 'game' ? 'game' : 'content';
      setSearchParams({ [param]: newContent.id });
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
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {allContent.map((content, index) => {
          const profile = content.profiles as any;
          const isQuiz = content.content_type === 'quiz';
          const isGame = content.content_type === 'game';

          return (
            <div
              key={content.id}
              data-content-id={content.id}
              className="h-screen snap-start snap-always"
            >
              <ContentCard
                id={content.id}
                title={content.title}
                description={content.description}
                creator={profile?.username || profile?.full_name || 'Usuario'}
                creatorId={content.created_by}
                institution={content.institution}
                tags={content.tags || []}
                category={content.category || ''}
                subject={content.subject}
                thumbnail={content.thumbnail_url}
                videoUrl={content.video_url}
                documentUrl={content.document_url}
                richText={content.rich_text}
                contentType={content.content_type}
                likes={content.likes_count || 0}
                comments={content.comments_count || 0}
                shares={content.shares_count || 0}
                grade={content.grade_level || ''}
                isLiked={false} // Will be managed by ContentCard internally
                isSaved={false} // Will be managed by ContentCard internally
                creatorAvatar={profile?.avatar_url}
                onPrevious={index > 0 ? () => handleNavigation('previous') : undefined}
                onNext={index < allContent.length - 1 ? () => handleNavigation('next') : undefined}
                hasPrevious={index > 0}
                hasNext={index < allContent.length - 1}
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
