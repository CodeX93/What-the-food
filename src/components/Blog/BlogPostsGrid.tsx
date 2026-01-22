'use client';

import { useState, useEffect } from "react";
import { useBlogPosts } from "@/hooks/useBlogPosts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { BlogPost } from "@/hooks/useBlogPosts";

const POSTS_PER_PAGE = 6;

export default function BlogPostsGrid() {
  const [currentPage, setCurrentPage] = useState(0);
  const [allPosts, setAllPosts] = useState<BlogPost[]>([]);
  const [totalPosts, setTotalPosts] = useState(0);
  const { data, isLoading, isError, isFetching } = useBlogPosts(POSTS_PER_PAGE, currentPage);

  // Update all posts when new data arrives
  useEffect(() => {
    if (data) {
      // Store total from first fetch
      if (data.total && totalPosts === 0) {
        setTotalPosts(data.total);
      }
      
      if (data.posts) {
        setAllPosts((prev) => {
          // Combine previous posts with new posts, avoiding duplicates
          const existingIds = new Set(prev.map((p) => p.id));
          const newPosts = data.posts.filter((post) => !existingIds.has(post.id));
          if (newPosts.length > 0) {
            return [...prev, ...newPosts];
          }
          return prev;
        });
      }
    }
  }, [data, totalPosts]);

  const hasMore = totalPosts > 0 && allPosts.length < totalPosts;
  const displayedPosts = allPosts;

  const handleLoadMore = () => {
    if (hasMore && !isFetching) {
      setCurrentPage((prev) => prev + 1);
    }
  };

  if (isLoading && currentPage === 0) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card
            key={`loading-${i}`}
            className="flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200/60 dark:border-white/10 bg-white/90 dark:bg-white/5 shadow-[0_25px_60px_-32px_rgba(30,41,59,0.35)] backdrop-blur-sm transition-all duration-300 dark:shadow-[0_25px_60px_-30px_rgba(15,23,42,0.6)]"
          >
            <div className="aspect-video bg-muted" />
            <div className="flex flex-1 flex-col gap-3 p-5">
              <div className="h-5 w-3/4 rounded bg-muted" />
              <div className="space-y-2">
                <div className="h-4 w-full rounded bg-muted" />
                <div className="h-4 w-2/3 rounded bg-muted" />
              </div>
            </div>
          </Card>
        ))}
      </div>
    );
  }

  if (isError && currentPage === 0) {
    return <p className="text-center text-muted-foreground">Failed to load blog posts. Please try again later.</p>;
  }

  if (displayedPosts.length === 0 && !isLoading) {
    return <p className="text-center text-muted-foreground">No blog posts available.</p>;
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {displayedPosts.map((post) => (
          <a
            key={post.id}
            href={post.url}
            className="group block h-full"
          >
            <Card className="flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200/60 dark:border-white/10 bg-white/90 dark:bg-white/5 shadow-[0_25px_60px_-32px_rgba(30,41,59,0.35)] backdrop-blur-sm transition-all duration-300 group-hover:-translate-y-0.5 group-hover:shadow-strong group-hover:border-primary/30 dark:group-hover:border-primary/30">
              <div className="aspect-video w-full overflow-hidden rounded-xl bg-muted">
                {post.image ? (
                  <img
                    src={post.image}
                    alt={post.title}
                    className="aspect-video w-full object-cover"
                  />
                ) : null}
              </div>
              <div className="flex flex-1 flex-col gap-3 p-5">
                <CardTitle className="line-clamp-1 text-base font-semibold tracking-tight text-slate-900 transition-colors group-hover:text-primary dark:text-white md:text-[1.05rem]">
                  {post.title}
                </CardTitle>
                <p className="min-h-[68px] text-xs leading-relaxed text-slate-600 line-clamp-3 dark:text-slate-300/80 md:text-[0.85rem]">
                  {post.excerpt}
                </p>
              </div>
            </Card>
          </a>
        ))}
      </div>

      {hasMore && (
        <div className="text-center mt-12">
          <Button
            size="lg"
            className="bg-primary hover:bg-primary-hover"
            onClick={handleLoadMore}
            disabled={isFetching}
          >
            {isFetching ? "Loading..." : "Load More Posts"}
          </Button>
        </div>
      )}
    </>
  );
}
