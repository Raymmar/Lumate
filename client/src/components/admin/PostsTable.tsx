import type { Post } from "@shared/schema";
import { PublicPostsTable } from "../bulletin/PublicPostsTable";

interface PostsTableProps {
  onSelect: (post: Post) => void;
}

export function PostsTable({ onSelect }: PostsTableProps) {
  return (
    <PublicPostsTable 
      onSelect={onSelect}
      isAdminView={true}
    />
  );
}