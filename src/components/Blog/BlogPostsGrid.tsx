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
          <div
            key={`loading-${i}`}
            className="mt-2 h-full rounded-3xl border border-slate-100/80 bg-slate-50/90 p-3 shadow-[0_18px_40px_-28px_rgba(30,41,59,0.22)] dark:border-slate-800/40 dark:bg-slate-900/60 dark:shadow-[0_18px_40px_-26px_rgba(15,23,42,0.48)]"
          >
            <Card className="flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-[0_25px_60px_-32px_rgba(30,41,59,0.35)] transition-shadow dark:border-slate-800/70 dark:bg-slate-950 dark:shadow-[0_25px_60px_-30px_rgba(15,23,42,0.6)]">
              <div className="aspect-video bg-muted" />
              <div className="flex flex-1 flex-col gap-3 p-5">
                <div className="h-5 w-3/4 rounded bg-muted" />
                <div className="space-y-2">
                  <div className="h-4 w-full rounded bg-muted" />
                  <div className="h-4 w-2/3 rounded bg-muted" />
                </div>
              </div>
            </Card>
          </div>
        ))}
      </div>
    );
  }

  if (isError || !data) {
    return <p className="text-center text-muted-foreground">Failed to load blog posts. Please try again later.</p>;
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
        {data.posts.slice(0, 6).map((post) => (
          <div
            key={post.id}
            className="mt-2 h-full rounded-3xl border border-slate-100/80 bg-slate-50/90 p-3 shadow-[0_18px_40px_-28px_rgba(30,41,59,0.22)] transition-transform duration-300 hover:-translate-y-1 hover:shadow-[0_22px_54px_-26px_rgba(30,41,59,0.28)] dark:border-slate-800/40 dark:bg-slate-900/60 dark:shadow-[0_18px_40px_-26px_rgba(15,23,42,0.48)] dark:hover:shadow-[0_22px_54px_-24px_rgba(15,23,42,0.62)]"
          >
            <a
              href={post.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block h-full group"
            >
              <Card className="flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-[0_25px_60px_-32px_rgba(30,41,59,0.35)] transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:shadow-[0_28px_90px_-30px_rgba(30,41,59,0.45)] dark:border-slate-800/70 dark:bg-slate-950 dark:shadow-[0_25px_60px_-30px_rgba(15,23,42,0.6)] dark:group-hover:shadow-[0_28px_90px_-28px_rgba(15,23,42,0.72)]">
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
          </div>
        ))}
      </div>

      <div className="text-center">
        <Button size="lg" className="bg-primary hover:bg-primary-hover" asChild>
          <a href="https://blog.whatthefood.io" target="_blank" rel="noopener noreferrer">
            Visit Our Blog
          </a>
        </Button>
      </div>
    </>
  );
}
