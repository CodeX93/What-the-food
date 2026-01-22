import { Metadata } from "next";
import { notFound } from "next/navigation";
import { BlogClient } from "seobot";

// Initialize SEObot Blog Client
const SEOBOT_API_KEY = process.env.SEOBOT_API_KEY;
const blogClient = SEOBOT_API_KEY ? new BlogClient(SEOBOT_API_KEY) : null;

type Props = {
  params: { slug: string };
};

// Generate metadata for SEO
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  if (!blogClient) {
    return {
      title: "Blog Post | What The Food",
    };
  }

  try {
    const article = await blogClient.getArticle(params.slug);

    if (!article || !article.published) {
      return {
        title: "Blog Post Not Found | What The Food",
      };
    }

    return {
      title: article.headline,
      description: article.metaDescription,
      keywords: article.metaKeywords,
      openGraph: {
        title: article.headline,
        description: article.metaDescription,
        images: article.image ? [article.image] : [],
        type: "article",
        publishedTime: article.publishedAt,
      },
      twitter: {
        card: "summary_large_image",
        title: article.headline,
        description: article.metaDescription,
        images: article.image ? [article.image] : [],
      },
    };
  } catch (error) {
    return {
      title: "Blog Post | What The Food",
    };
  }
}

// Server-side rendering for blog post
export default async function BlogPostPage({ params }: Props) {
  if (!blogClient) {
    notFound();
  }

  // Fetch article - type will be inferred from getArticle return type
  let article: Awaited<ReturnType<typeof blogClient.getArticle>> = null;

  try {
    article = await blogClient.getArticle(params.slug);
  } catch (error) {
    console.error("Error fetching blog post:", error);
    notFound();
  }

  if (!article || !article.published) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-background">
      <article className="container mx-auto px-4 py-12 max-w-4xl">
        {/* Header */}
        <header className="mb-8">
          {article.category && (
            <div className="mb-4">
              <span className="inline-block px-3 py-1 text-sm font-medium rounded-full bg-primary/10 text-primary">
                {article.category.title}
              </span>
            </div>
          )}
          <h1 className="text-4xl md:text-5xl font-bold mb-4">{article.headline}</h1>
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <time dateTime={article.publishedAt}>
              {new Date(article.publishedAt).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </time>
            {article.readingTime > 0 && (
              <span>{article.readingTime} min read</span>
            )}
          </div>
          {article.tags && article.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              {article.tags.map((tag) => (
                <span
                  key={tag.id}
                  className="px-2 py-1 text-xs rounded bg-muted text-muted-foreground"
                >
                  #{tag.slug}
                </span>
              ))}
            </div>
          )}
        </header>

        {/* Featured Image */}
        {article.image && (
          <div className="mb-8">
            <img
              src={article.image}
              alt={article.headline}
              className="w-full h-auto rounded-lg"
            />
          </div>
        )}

        {/* Article Content */}
        <div
          className="prose prose-lg dark:prose-invert max-w-none
            prose-headings:font-bold prose-headings:text-foreground prose-headings:scroll-mt-20
            prose-h1:text-4xl prose-h1:mb-6 prose-h1:mt-8 prose-h1:leading-tight
            prose-h2:text-3xl prose-h2:mb-4 prose-h2:mt-8 prose-h2:leading-tight
            prose-h3:text-2xl prose-h3:mb-3 prose-h3:mt-6 prose-h3:leading-tight
            prose-h4:text-xl prose-h4:mb-2 prose-h4:mt-4 prose-h4:leading-tight
            prose-h5:text-lg prose-h5:mb-2 prose-h5:mt-4
            prose-h6:text-base prose-h6:mb-2 prose-h6:mt-4
            prose-p:text-foreground prose-p:leading-relaxed prose-p:mb-4 prose-p:text-base
            prose-a:text-primary prose-a:no-underline hover:prose-a:underline prose-a:font-medium
            prose-strong:text-foreground prose-strong:font-semibold
            prose-em:text-foreground prose-em:italic
            prose-ul:list-disc prose-ul:ml-6 prose-ul:mb-4 prose-ul:space-y-2
            prose-ol:list-decimal prose-ol:ml-6 prose-ol:mb-4 prose-ol:space-y-2
            prose-li:text-foreground prose-li:leading-relaxed
            prose-blockquote:border-l-4 prose-blockquote:border-primary prose-blockquote:pl-4 
              prose-blockquote:italic prose-blockquote:my-6 prose-blockquote:text-foreground
              prose-blockquote:bg-muted/50 prose-blockquote:py-2 prose-blockquote:rounded-r
            prose-code:text-sm prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 
              prose-code:rounded prose-code:text-foreground prose-code:font-mono
            prose-pre:bg-muted prose-pre:text-foreground prose-pre:p-4 prose-pre:rounded-lg 
              prose-pre:overflow-x-auto prose-pre:border prose-pre:border-border
            prose-img:rounded-lg prose-img:my-6 prose-img:w-full prose-img:h-auto 
              prose-img:shadow-md prose-img:border prose-img:border-border
            prose-table:w-full prose-table:my-6 prose-table:border-collapse 
              prose-table:overflow-hidden prose-table:rounded-lg prose-table:border prose-table:border-border
            prose-th:border prose-th:border-border prose-th:px-4 prose-th:py-3 
              prose-th:bg-muted prose-th:text-left prose-th:font-semibold prose-th:text-foreground
            prose-td:border prose-td:border-border prose-td:px-4 prose-td:py-3 
              prose-td:text-foreground
            prose-hr:border-border prose-hr:my-8 prose-hr:border-t-2
            prose-figcaption:text-sm prose-figcaption:text-muted-foreground prose-figcaption:mt-2
            prose-mark:bg-primary/20 prose-mark:text-foreground
            [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
          dangerouslySetInnerHTML={{ __html: article.html }}
        />

        {/* Related Posts */}
        {article.relatedPosts && article.relatedPosts.length > 0 && (
          <div className="mt-12 pt-8 border-t">
            <h2 className="text-2xl font-bold mb-6">Related Posts</h2>
            <div className="grid gap-4 md:grid-cols-2">
              {article.relatedPosts.map((relatedPost) => (
                <a
                  key={relatedPost.id}
                  href={`/blog/${relatedPost.slug}`}
                  className="block p-4 rounded-lg border hover:border-primary transition-colors"
                >
                  <h3 className="font-semibold mb-2">{relatedPost.headline}</h3>
                </a>
              ))}
            </div>
          </div>
        )}
      </article>
    </div>
  );
}
