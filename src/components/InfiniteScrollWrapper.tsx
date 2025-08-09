import React, { useEffect, useRef, useCallback } from "react";
import { LoaderCircle } from "lucide-react";

interface InfiniteScrollWrapperProps {
  children: React.ReactNode;
  hasMore?: boolean;
  onLoadMore?: () => Promise<void>;
  isLoadingMore?: boolean;
  className?: string;
  loadingMessage?: string;
  endMessage?: string;
  threshold?: number;
  rootMargin?: string;
  showEndMessage?: boolean;
}

export function InfiniteScrollWrapper({
  children,
  hasMore = false,
  onLoadMore,
  isLoadingMore = false,
  className = "",
  loadingMessage = "Loading more posts...",
  endMessage = "No more posts to load",
  threshold = 0.1,
  rootMargin = "100px",
  showEndMessage = true,
}: InfiniteScrollWrapperProps) {
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Intersection Observer for infinite scroll
  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [target] = entries;
      if (target.isIntersecting && hasMore && onLoadMore && !isLoadingMore) {
        onLoadMore();
      }
    },
    [hasMore, onLoadMore, isLoadingMore]
  );

  useEffect(() => {
    const element = loadMoreRef.current;
    if (!element || !onLoadMore) return;

    // Disconnect existing observer
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    // Create new observer
    observerRef.current = new IntersectionObserver(handleObserver, {
      threshold,
      rootMargin,
    });

    observerRef.current.observe(element);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [
    handleObserver,
    threshold,
    rootMargin,
    onLoadMore,
    isLoadingMore,
    hasMore,
  ]);

  return (
    <div className={className}>
      {children}

      {/* Infinite scroll trigger and loading states */}
      {hasMore && (
        <div
          ref={loadMoreRef}
          className="flex items-center justify-center py-8"
        >
          {isLoadingMore ? (
            <div className="flex items-center gap-2 text-black/70 dark:text-white/70">
              <LoaderCircle className="animate-spin w-5 h-5" />
              <span className="text-sm">{loadingMessage}</span>
            </div>
          ) : (
            <div className="text-gray-400 text-sm">Scroll to load more</div>
          )}
        </div>
      )}

      {/* End of posts indicator */}
      {!hasMore && showEndMessage && (
        <div className="flex items-center justify-center py-6">
          <p className="text-gray-400 text-sm">{endMessage}</p>
        </div>
      )}
    </div>
  );
}
