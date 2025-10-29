import TopBar from "@/components/Layout/TopBar";
import Header from "@/components/Layout/Header";
import Footer from "@/components/Layout/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const Blog = () => {
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

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} className="hover:shadow-medium transition-shadow">
                <div className="aspect-video bg-gradient-card" />
                <CardHeader>
                  <CardTitle className="line-clamp-2">
                    Blog post from blog.whatthefood.io
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground line-clamp-3">
                    Posts from your WordPress blog will automatically populate here via RSS feed integration.
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

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