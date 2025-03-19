import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Post } from "@shared/schema";
import { ImageIcon } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import TimeAgo from 'javascript-time-ago';
import en from 'javascript-time-ago/locale/en';

// Initialize TimeAgo
TimeAgo.addLocale(en);
const timeAgo = new TimeAgo('en-US');

interface MembersOnlyCardProps {
  post: Post;
  onSelect: (post: Post) => void;
}

export function MembersOnlyCard({ post, onSelect }: MembersOnlyCardProps) {
  const { user } = useAuth();
  // Get first name by splitting on space and taking first part
  const firstName = user?.displayName?.split(' ')[0] || 'back';

  const fallbackImage = 'https://images.unsplash.com/photo-1596443686812-2f45229eebc3?q=80&w=2070&auto=format&fit=crop';
  const backgroundImage = post.featuredImage || fallbackImage;

  return (
    <Card className="h-full border cursor-pointer hover:bg-muted/50 transition-colors flex flex-col" onClick={() => onSelect(post)}>
      <CardHeader className="pb-3 flex-none">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0 flex-1">
            <CardTitle className="text-lg truncate">
              Welcome {firstName}!
            </CardTitle>
          </div>
          <Badge variant="secondary" className="w-6 h-6 p-0.5 flex items-center justify-center flex-shrink-0">
            <Lock className="w-4 h-4" />
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0 flex-1 flex">
        <div className="relative flex-1 overflow-hidden rounded-md m-[1px]">
          <img
            src={backgroundImage}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent" />
          <div className="absolute inset-0 p-6 flex flex-col justify-end text-white">
            <h3 className="font-semibold text-xl mb-2 text-balance text-pretty break-normal hyphens-auto">{post.title}</h3>
            <div className="flex items-center gap-2 text-xs text-white/70">
              {post.creator?.displayName && (
                <>
                  <span>{post.creator.displayName}</span>
                  <span>•</span>
                </>
              )}
              <span>{timeAgo.format(new Date(post.createdAt))}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}