import { useQuery } from "@tanstack/react-query";

export type BlogPost = {
  id: string;
  title: string;
  excerpt: string;
  url: string;
  publishedAt: string;
  image: string | null;
  slug: string;
  readingTime?: number;
  category?: { id: string; title: string; slug: string };
  tags?: Array<{ id: string; title: string; slug: string }>;
};

export const useBlogPosts = (limit = 6, page = 0) => {
  return useQuery<{ posts: BlogPost[]; total: number }, Error>({
    queryKey: ["blog-posts", limit, page],
    queryFn: async () => {
      const response = await fetch(`/api/blog-posts?limit=${encodeURIComponent(limit)}&page=${encodeURIComponent(page)}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch blog posts: ${response.statusText}`);
      }
      const data = await response.json();
      return data as { posts: BlogPost[]; total: number };
    },
    staleTime: 1000 * 60 * 5,
  });
};


