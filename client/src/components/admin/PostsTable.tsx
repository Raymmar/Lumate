import { useQuery } from "@tanstack/react-query";
import type { Post } from "@shared/schema";
import { DataTable } from "./DataTable";
import type { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, Edit } from "lucide-react";
import { formatPostTitleForUrl } from "@/lib/utils";

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
          {row.status === 'draft' ? (
            <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50">Draft</Badge>
          ) : (
            <Badge variant="outline" className="text-green-600 border-green-300 bg-green-50">Published</Badge>
          )}
          {row.isPinned && (
            <Badge variant="secondary">Featured</Badge>
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
    {
      key: "actions",
      header: "",
      cell: (row: Post) => {
        const slug = formatPostTitleForUrl(row.title, row.id.toString());
        const postUrl = `/post/${slug}`;
        return (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation(); // Prevent row click
                onSelect(row);
              }}
              className="h-8 w-8 p-0"
              data-testid={`button-edit-post-${row.id}`}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation(); // Prevent row click
                window.open(postUrl, '_blank');
              }}
              className="h-8 w-8 p-0"
              data-testid={`button-view-post-${row.id}`}
            >
              <Eye className="h-4 w-4" />
            </Button>
          </div>
        );
      }
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