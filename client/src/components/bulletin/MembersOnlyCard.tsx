import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    <Card className="border" onClick={() => onSelect(post)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">
            Welcome back! Here's the latest members-only content
          </CardTitle>
          <Badge variant="secondary" className="text-xs flex items-center gap-1">
            <Lock className="w-3 h-3" />
            Exclusive
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {post.featuredImage ? (
          <div className="w-full h-48 overflow-hidden">
            <img
              src={post.featuredImage}
              alt=""
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div className="w-full h-48 bg-muted flex items-center justify-center">
            <ImageIcon className="h-16 w-16 text-muted-foreground/50" />
          </div>
        )}
        <div className="p-6">
          <h3 className="font-medium text-xl mb-2">{post.title}</h3>
          {post.summary && (
            <p className="text-muted-foreground">{post.summary}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}