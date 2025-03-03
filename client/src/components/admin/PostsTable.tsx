import { useQuery } from "@tanstack/react-query";
import type { Post } from "@shared/schema";
import { DataTable } from "./DataTable";
import type { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";

interface PostsTableProps {
  onSelect: (post: Post) => void;
}

export function PostsTable({ onSelect }: PostsTableProps) {
  const { data, isLoading } = useQuery<{ posts: Post[] }>({
    queryKey: ["/api/admin/posts"],
    queryFn: async () => {
      const response = await fetch("/api/admin/posts");
      if (!response.ok) {
        throw new Error("Failed to fetch posts");
      }
      return response.json();
    }
  });

  const columns = [
    {
      key: "title",
      header: "Title",
      cell: (row: Post) => row.title
    },
    {
      key: "status",
      header: "Status",
      cell: (row: Post) => (
        <div className="flex items-center gap-2">
          {row.isPinned && (
            <Badge variant="secondary">Pinned</Badge>
          )}
        </div>
      )
    },
    {
      key: "createdAt",
      header: "Created",
      cell: (row: Post) => format(new Date(row.createdAt), 'MMM d, yyyy')
    },
    {
      key: "updatedAt",
      header: "Last Updated",
      cell: (row: Post) => format(new Date(row.updatedAt), 'MMM d, yyyy')
    },
  ];

  // Sort posts by creation date (newest first)
  const sortedPosts = data?.posts?.sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  ) || [];

  return (
    <DataTable 
      columns={columns}
      data={sortedPosts}
      isLoading={isLoading}
      onRowClick={onSelect}
    />
  );
}