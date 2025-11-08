import dynamic from "next/dynamic";

const BlogPostsGrid = dynamic(() => import("@/components/Blog/BlogPostsGrid"), {
  ssr: false,
});

export default function BlogPage() {
  return (
    <div className="scroll-snap-proximity overflow-x-hidden">
      <section className="min-h-screen flex items-center justify-center snap-start">
        <div className="container mx-auto px-4 py-12 sm:py-16 md:py-20 w-full">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h1 className="text-4xl font-bold mb-4">Blog</h1>
              <p className="text-lg text-muted-foreground">
                Tips, guides, and insights for healthier eating
              </p>
            </div>

            <BlogPostsGrid />
          </div>
        </div>
      </section>
    </div>
  );
}