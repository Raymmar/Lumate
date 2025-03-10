import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Post } from "@shared/schema";
import { ImageIcon } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

interface MembersOnlyCardProps {
  post: Post;
  onSelect: (post: Post) => void;
}

export function MembersOnlyCard({ post, onSelect }: MembersOnlyCardProps) {
  const { user } = useAuth();
  // Get first name by splitting on space and taking first part
  const firstName = user?.displayName?.split(' ')[0] || 'back';

  return (
    <Card className="border cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => onSelect(post)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">
            Welcome {firstName}!
          </CardTitle>
          <Badge variant="secondary" className="text-xs flex items-center gap-1">
            <Lock className="w-3 h-3" />
            Exclusive
          </Badge>
        </div>
      </CardHeader>
      <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-border/50" />
      <CardContent className="pt-6">
        <div className="flex gap-6">
          {post.featuredImage ? (
            <div className="w-28 h-28 rounded-md overflow-hidden bg-muted flex-shrink-0">
              <img
                src={post.featuredImage}
                alt=""
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="w-28 h-28 rounded-md bg-muted flex items-center justify-center flex-shrink-0">
              <ImageIcon className="h-12 w-12 text-muted-foreground/50" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-lg mb-2">{post.title}</h3>
            {post.summary && (
              <p className="text-sm text-muted-foreground line-clamp-3">{post.summary}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}