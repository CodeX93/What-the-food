import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useBlogPosts } from "@/hooks/useBlogPosts";

const BlogPreview = () => {
  const { data, isLoading } = useBlogPosts(3);

  return (
    <section className="min-h-screen flex items-center overflow-y-auto relative bg-white dark:bg-[#000000] snap-start snap-proximity transition-colors duration-300">
      <div className="container mx-auto px-4 sm:px-6 w-full relative z-10 py-8 sm:py-0">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 sm:mb-12 gap-4">
          <div>
            <h2 className="text-3xl sm:text-4xl font-bold mb-2">Latest from Our Blog</h2>
            <p className="text-base sm:text-lg text-muted-foreground">
              Tips, guides, and insights for healthier eating
            </p>
          </div>
          <Button variant="outline" asChild className="hidden sm:flex">
            <Link to="/blog">
              View All Posts
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {isLoading &&
            Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="h-full">
                <div className="aspect-video bg-muted" />
                <CardHeader className="p-4 sm:p-6">
                  <div className="h-5 w-3/4 bg-muted rounded" />
                </CardHeader>
                <CardContent className="p-4 sm:p-6 pt-0">
                  <div className="h-4 w-full bg-muted rounded mb-2" />
                  <div className="h-4 w-2/3 bg-muted rounded" />
                </CardContent>
              </Card>
            ))}

          {!isLoading && data &&
            data.posts.map((post) => (
              <Card key={post.id} className="h-full">
                {post.image ? (
                  <img src={post.image} alt={post.title} className="aspect-video object-cover w-full" />
                ) : (
                  <div className="aspect-video bg-gradient-card" />
                )}
                <CardHeader className="p-4 sm:p-6">
                  <CardTitle className="line-clamp-2 text-base sm:text-lg">
                    {post.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 pt-0">
                  <p className="text-xs sm:text-sm text-muted-foreground line-clamp-3 mb-3 sm:mb-4">
                    {post.excerpt}
                  </p>
                  <Button asChild variant="link" className="p-0 h-auto text-xs sm:text-sm">
                    <a href={post.url} target="_blank" rel="noopener noreferrer">
                      Read More <ArrowRight className="ml-1 h-3 w-3" />
                    </a>
                  </Button>
                </CardContent>
              </Card>
            ))}
        </div>

        <div className="mt-8 text-center md:hidden">
          <Button variant="outline" asChild>
            <Link to="/blog">
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