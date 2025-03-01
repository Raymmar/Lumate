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

  const columns: ColumnDef<Post>[] = [
    {
      accessorKey: "title",
      header: "Title",
    },
    {
      accessorKey: "isPinned",
      header: "Status",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          {row.original.isPinned && (
            <Badge variant="secondary">Pinned</Badge>
          )}
        </div>
      ),
    },
    {
      accessorKey: "createdAt",
      header: "Created",
      cell: ({ row }) => format(new Date(row.original.createdAt), 'MMM d, yyyy'),
    },
    {
      accessorKey: "updatedAt",
      header: "Last Updated",
      cell: ({ row }) => format(new Date(row.original.updatedAt), 'MMM d, yyyy'),
    },
  ];

  return (
    <DataTable 
      columns={columns}
      data={data?.posts || []}
      loading={isLoading}
      onRowClick={onSelect}
    />
  );
}
