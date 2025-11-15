'use client';

import { useBlogPosts } from "@/hooks/useBlogPosts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function BlogPostsGrid() {
  const { data, isLoading, isError } = useBlogPosts(6);

  if (isLoading) {
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

  if (isError || !data) {
    return <p className="text-center text-muted-foreground">Failed to load blog posts. Please try again later.</p>;
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {data.posts.slice(0, 6).map((post) => (
          <a
            key={post.id}
            href={post.url}
            target="_blank"
            rel="noopener noreferrer"
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

      <div className="text-center">
        <Button size="lg" className="bg-primary hover:bg-primary-hover mt-9" asChild>
          <a href="https://blog.whatthefood.io" target="_blank" rel="noopener noreferrer">
            Visit Our Blog
          </a>
        </Button>
      </div>
    </>
  );
}
