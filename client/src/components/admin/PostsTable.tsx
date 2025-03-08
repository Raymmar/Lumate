import type { Post } from "@shared/schema";
import { PublicPostsTable } from "../bulletin/PublicPostsTable";

interface PostsTableProps {
  onSelect: (post: Post) => void;
  onCreatePost?: () => void;
}

export function PostsTable({ onSelect, onCreatePost }: PostsTableProps) {
  return (
    <PublicPostsTable 
      onSelect={onSelect}
      onCreatePost={onCreatePost}
      isAdminView={true}
    />
  );
}