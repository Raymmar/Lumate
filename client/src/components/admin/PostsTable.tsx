import { useQuery } from "@tanstack/react-query";
import type { Post } from "@shared/schema";
import { DataTable } from "./DataTable";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";

interface PostsTableProps {
  onSelect: (post: Post) => void;
  searchQuery: string;
}

export function PostsTable({ onSelect, searchQuery }: PostsTableProps) {
  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["/api/admin/posts", searchQuery],
    queryFn: async () => {
      const response = await fetch(
        `/api/admin/posts${searchQuery ? `?search=${encodeURIComponent(searchQuery)}` : ''}`
      );
      if (!response.ok) {
        throw new Error("Failed to fetch posts");
      }
      const data = await response.json();
      return data as { posts: Post[] };
    },
    keepPreviousData: true,
    staleTime: 30000,
    refetchOnWindowFocus: false
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

  return (
    <div className="min-h-[400px] relative">
      <div 
        className={`transition-opacity duration-300 ${
          isFetching ? 'opacity-50' : 'opacity-100'
        }`}
      >
        <DataTable 
          columns={columns}
          data={data?.posts || []}
          onRowClick={onSelect}
        />
      </div>
    </div>
  );
}