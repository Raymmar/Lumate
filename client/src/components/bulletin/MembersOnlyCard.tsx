import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Post } from "@shared/schema";
import { ImageIcon } from "lucide-react";

interface MembersOnlyCardProps {
  post: Post;
  onSelect: (post: Post) => void;
}

export function MembersOnlyCard({ post, onSelect }: MembersOnlyCardProps) {
  return (
    <Card className="border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle>Members Only</CardTitle>
          <Badge variant="secondary" className="text-xs flex items-center gap-1">
            <Lock className="w-3 h-3" />
            Exclusive
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div 
          className="relative p-4 -mx-2 border cursor-pointer hover:bg-muted/50 transition-colors rounded-lg"
          onClick={() => onSelect(post)}
        >
          <div className="flex gap-4">
            {post.featuredImage ? (
              <div className="w-20 h-20 rounded-md overflow-hidden bg-muted flex-shrink-0">
                <img
                  src={post.featuredImage}
                  alt=""
                  className="w-full h-full object-cover"
                  style={{ aspectRatio: '1 / 1' }}
                />
              </div>
            ) : (
              <div className="w-20 h-20 rounded-md bg-muted flex items-center justify-center flex-shrink-0">
                <ImageIcon className="h-10 w-10 text-muted-foreground/50" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-wrap-balance max-w-[80ch] truncate">
                {post.title}
              </h4>
              {post.summary && (
                <p className="text-sm text-muted-foreground mt-1 text-wrap-balance max-w-[80ch] line-clamp-2">
                  {post.summary}
                </p>
              )}
              <Button
                variant="default"
                size="sm"
                className="mt-2"
              >
                Read More
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
