import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useBlogPosts } from "@/hooks/useBlogPosts";

const BlogPreview = () => {
  const { data, isLoading } = useBlogPosts(6);

  return (
    <section className="h-screen flex items-center justify-center relative bg-white dark:bg-[#000000] snap-start snap-proximity transition-colors duration-300">
      <div className="container mx-auto px-4 sm:px-6 w-full relative z-10 py-6 sm:py-8 md:py-10">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6 gap-3">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold mb-1">Latest from Our Blog</h2>
            <p className="text-sm sm:text-base text-muted-foreground">
              Tips, guides, and insights for healthier eating
            </p>
          </div>
          <Button variant="outline" size="sm" asChild className="hidden sm:flex">
            <Link to="/blog">
              View All Posts
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {isLoading &&
            Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="overflow-hidden">
                <div className="aspect-video bg-muted" />
                <CardHeader className="p-3">
                  <div className="h-4 w-3/4 bg-muted rounded" />
                </CardHeader>
                <CardContent className="p-3 pt-0">
                  <div className="h-3 w-full bg-muted rounded mb-2" />
                  <div className="h-3 w-2/3 bg-muted rounded" />
                </CardContent>
              </Card>
            ))}

          {!isLoading && data &&
            data.posts.slice(0, 6).map((post) => (
              <a 
                key={post.id}
                href={post.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block group"
              >
                <Card className="overflow-hidden hover:shadow-strong transition-all duration-300 border-2 border-transparent hover:border-primary/20 cursor-pointer">
                  {post.image ? (
                    <img src={post.image} alt={post.title} className="aspect-video object-cover w-full group-hover:scale-105 transition-transform duration-300" />
                  ) : (
                    <div className="aspect-video bg-gradient-card" />
                  )}
                  <CardHeader className="p-3 sm:p-4">
                    <CardTitle className="line-clamp-2 text-sm sm:text-base group-hover:text-primary transition-colors leading-tight">
                      {post.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 sm:p-4 pt-0">
                    <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                      {post.excerpt}
                    </p>
                  </CardContent>
                </Card>
              </a>
            ))}
        </div>

        <div className="mt-4 text-center md:hidden">
          <Button variant="outline" size="sm" asChild>
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