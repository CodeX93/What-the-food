import TopBar from "@/components/Layout/TopBar";
import Header from "@/components/Layout/Header";
import Footer from "@/components/Layout/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useBlogPosts } from "@/hooks/useBlogPosts";

const Blog = () => {
  const { data, isLoading, isError } = useBlogPosts(6);
  return (
    <div>
      <TopBar />
      <Header />
      <main className="scroll-snap-proximity">
        <section className="h-screen flex items-center justify-center snap-start overflow-auto">
          <div className="container mx-auto px-4 py-12 sm:py-16 md:py-20 w-full">
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-12">
                <h1 className="text-4xl font-bold mb-4">Blog</h1>
                <p className="text-lg text-muted-foreground">
                  Tips, guides, and insights for healthier eating
                </p>
              </div>

              {isLoading && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Card key={i} className="hover:shadow-medium transition-shadow overflow-hidden">
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
                  {data.posts.slice(0, 6).map((post) => (
                    <a 
                      key={post.id} 
                      href={post.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="block group"
                    >
                      <Card className="hover:shadow-strong transition-all duration-300 border-2 border-transparent hover:border-primary/20 h-full overflow-hidden cursor-pointer">
                        {post.image ? (
                          <img src={post.image} alt={post.title} className="aspect-video object-cover w-full group-hover:scale-105 transition-transform duration-300" />
                        ) : (
                          <div className="aspect-video bg-gradient-card" />
                        )}
                        <CardHeader>
                          <CardTitle className="line-clamp-2 group-hover:text-primary transition-colors">{post.title}</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-muted-foreground line-clamp-3">{post.excerpt}</p>
                        </CardContent>
                      </Card>
                    </a>
                  ))}
                </div>
              )}

              <div className="text-center">
                <Button 
                  size="lg" 
                  className="bg-primary hover:bg-primary-hover" 
                  asChild
                >
                  <a 
                    href="https://blog.whatthefood.io" 
                    target="_blank" 
                    rel="noopener noreferrer"
                  >
                    Visit Our Blog
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Blog;