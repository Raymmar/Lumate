import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Post } from "@shared/schema";
import { ArticleContent } from "@/components/news/ArticleContent";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { formatPostTitleForUrl } from "@/lib/utils";
import NotFound from "./not-found";
import { Skeleton } from "@/components/ui/skeleton";

export function ArticlePage() {
  const { title } = useParams<{ title: string }>();
  const [, setLocation] = useLocation();

  // Fetch the specific post by slug
  const { data: postData, isLoading: isPostLoading, error: postError } = useQuery<Post>({
    queryKey: ["/api/posts/by-title", title],
    queryFn: async () => {
      const response = await fetch(`/api/posts/by-title/${title}`, {
        credentials: "include",
        headers: {
          'Accept': 'application/json',
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch post: ${response.status} ${response.statusText}`);
      }
      
      return response.json();
    }
  });

  // Fetch all posts for navigation
  const { data: postsData, isLoading: isPostsLoading } = useQuery<{ posts: Post[] }>({
    queryKey: ["/api/public/posts"],
  });

  const posts = postsData?.posts || [];
  const post = postData;

  const handleNavigate = (nextPost: Post) => {
    const slug = formatPostTitleForUrl(nextPost.title, nextPost.id.toString());
    setLocation(`/post/${slug}`);
  };

  const handleBackToNews = () => {
    setLocation("/news");
  };

  if (isPostLoading || isPostsLoading) {
    return (
      <DashboardLayout>
        <div className="max-w-4xl mx-auto">
          {/* Back button skeleton */}
          <div className="mb-6">
            <Skeleton className="h-10 w-32" />
          </div>
          
          {/* Title skeleton */}
          <div className="space-y-4">
            <Skeleton className="h-12 w-3/4" />
            <Skeleton className="h-6 w-1/2" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
          
          {/* Featured image skeleton */}
          <div className="mt-8">
            <Skeleton className="w-full aspect-video" />
          </div>
          
          {/* Content skeleton */}
          <div className="mt-8 space-y-3">
            {[...Array(8)].map((_, i) => (
              <Skeleton key={i} className="h-4 w-full" />
            ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (postError || !post) {
    return <NotFound />;
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto">
        {/* Back to News Button */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={handleBackToNews}
            className="gap-2"
            data-testid="button-back-to-news"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to News
          </Button>
        </div>

        {/* Article Content */}
        <ArticleContent
          post={post}
          posts={posts}
          onNavigate={handleNavigate}
          showNavigation={true}
          showMembersOnlyOverlay={true}
        />
      </div>
    </DashboardLayout>
  );
}