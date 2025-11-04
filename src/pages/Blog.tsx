import TopBar from "@/components/Layout/TopBar";
import Header from "@/components/Layout/Header";
import Footer from "@/components/Layout/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useBlogPosts } from "@/hooks/useBlogPosts";

const Blog = () => {
  const { data, isLoading, isError } = useBlogPosts(9);
  return (
    <div className="min-h-screen">
      <TopBar />
      <Header />
      <main className="container mx-auto px-4 py-20">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-4">Blog</h1>
            <p className="text-lg text-muted-foreground">
              Tips, guides, and insights for healthier eating
            </p>
          </div>

          {isLoading && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <Card key={i} className="hover:shadow-medium transition-shadow">
                  <div className="aspect-video bg-muted" />
                  <CardHeader>
                    <div className="h-5 w-3/4 bg-muted rounded" />
                  </CardHeader>
                  <CardContent>
                    <div className="h-4 w-full bg-muted rounded mb-2" />
                    <div className="h-4 w-2/3 bg-muted rounded" />
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {!isLoading && isError && (
            <p className="text-center text-muted-foreground">Failed to load blog posts. Please try again later.</p>
          )}

          {!isLoading && data && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {data.posts.map((post) => (
                <Card key={post.id} className="hover:shadow-medium transition-shadow">
                  {post.image ? (
                    <img src={post.image} alt={post.title} className="aspect-video object-cover w-full" />
                  ) : (
                    <div className="aspect-video bg-gradient-card" />
                  )}
                  <CardHeader>
                    <CardTitle className="line-clamp-2">{post.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground line-clamp-3 mb-3">{post.excerpt}</p>
                    <Button asChild variant="link" className="p-0 h-auto">
                      <a href={post.url} target="_blank" rel="noopener noreferrer">Read article →</a>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          <div className="mt-12 text-center">
            <p className="text-muted-foreground">
              Visit{" "}
              <a 
                href="https://blog.whatthefood.io" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                blog.whatthefood.io
              </a>
              {" "}for more articles
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Blog;