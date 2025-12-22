import { useQuery, useMutation } from "@tanstack/react-query";
import type { Post } from "@shared/schema";
import { DataTable } from "./DataTable";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Eye, Edit, Trash2 } from "lucide-react";
import { formatPostTitleForUrl } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useState } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface PostsTableProps {
  onSelect: (post: Post) => void;
}

export function PostsTable({ onSelect }: PostsTableProps) {
  const { toast } = useToast();
  const [deletePost, setDeletePost] = useState<Post | null>(null);

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

  const deleteMutation = useMutation({
    mutationFn: async (postId: number) => {
      await apiRequest(`/api/posts/${postId}`, 'DELETE');
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Post deleted successfully"
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/posts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/public/posts'] });
      setDeletePost(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete post",
        variant: "destructive"
      });
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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={(e) => e.stopPropagation()}
                data-testid={`button-actions-post-${row.id}`}
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
              <DropdownMenuItem
                onClick={() => onSelect(row)}
                data-testid={`menu-edit-post-${row.id}`}
              >
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => window.open(postUrl, '_blank')}
                data-testid={`menu-view-post-${row.id}`}
              >
                <Eye className="mr-2 h-4 w-4" />
                View
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setDeletePost(row)}
                className="text-red-600 focus:text-red-600"
                data-testid={`menu-delete-post-${row.id}`}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      }
    },
  ];

  const sortedPosts = data?.posts?.sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  ) || [];

  return (
    <>
      <DataTable 
        columns={columns}
        data={sortedPosts}
        onRowClick={onSelect}
      />
      
      <AlertDialog open={!!deletePost} onOpenChange={(open) => !open && setDeletePost(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Post</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletePost?.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletePost && deleteMutation.mutate(deletePost.id)}
              className="bg-red-600 hover:bg-red-700"
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
