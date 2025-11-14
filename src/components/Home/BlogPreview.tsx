"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useBlogPosts } from "@/hooks/useBlogPosts";

const BlogPreview = () => {
  const { data, isLoading } = useBlogPosts(6);

  return (
    <section className="relative w-full bg-white dark:bg-[#000000] transition-colors duration-300 py-16 sm:py-20 lg:py-24">
      <div className="container mx-auto px-4 w-full relative z-10">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6 gap-3">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold mb-1">Latest from Our Blog</h2>
            <p className="text-sm sm:text-base text-muted-foreground">
              Tips, guides, and insights for healthier eating
            </p>
          </div>
          <Button variant="outline" size="sm" asChild className="hidden sm:flex">
            <Link href="/blog">
              View All Posts
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          
          {isLoading &&
            Array.from({ length: 6 }).map((_, i) => (
              <Card
                key={`skeleton-${i}`}
                className="mt-2 flex h-full flex-col overflow-hidden rounded-2xl border-[0.2rem] border-primary/40 bg-white shadow-[0_25px_60px_-32px_rgba(30,41,59,0.35)] dark:border-primary/60 dark:bg-slate-950 dark:shadow-[0_25px_60px_-30px_rgba(15,23,42,0.6)]"
              >
                <div className="aspect-video bg-muted" />
                <div className="flex flex-1 flex-col gap-3 p-5">
                  <div className="h-4 w-3/4 rounded bg-muted" />
                  <div className="space-y-2">
                    <div className="h-3 w-full rounded bg-muted" />
                    <div className="h-3 w-2/3 rounded bg-muted" />
                  </div>
                </div>
              </Card>
            ))}

          {!isLoading && data &&
            data.posts.slice(0, 6).map((post) => (
              <a
                key={post.id}
                href={post.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group block h-full"
              >
                <Card className="mt-2 flex h-full flex-col overflow-hidden rounded-2xl border-[0.2rem] border-primary/40 bg-white shadow-[0_25px_60px_-32px_rgba(30,41,59,0.35)] transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:shadow-[0_28px_90px_-30px_rgba(30,41,59,0.45)] dark:border-primary/60 dark:bg-slate-950 dark:shadow-[0_25px_60px_-30px_rgba(15,23,42,0.6)] dark:group-hover:shadow-[0_28px_90px_-28px_rgba(15,23,42,0.72)]">
                  {post.image ? (
                    <img
                      src={post.image}
                      alt={post.title}
                      className="aspect-video w-full object-cover"
                    />
                  ) : (
                    <div className="aspect-video bg-muted" />
                  )}
                  <div className="flex flex-1 flex-col gap-3 p-5">
                    <CardTitle className="line-clamp-1 text-sm font-semibold tracking-tight text-slate-900 transition-colors group-hover:text-primary dark:text-white md:text-[0.95rem]">
                      {post.title}
                    </CardTitle>
                    <p className="min-h-[60px] text-xs leading-relaxed text-slate-600 line-clamp-3 dark:text-slate-300/80 md:text-[0.8rem]">
                      {post.excerpt}
                    </p>
                  </div>
                </Card>
              </a>
            ))}
        </div>

        <div className="mt-4 text-center md:hidden">
          <Button variant="outline" size="sm" className="mt-9" asChild>
            <Link href="/blog">
              View All Posts
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
};

export default BlogPreview;