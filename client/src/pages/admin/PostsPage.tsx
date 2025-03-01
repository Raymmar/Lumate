import { useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { PostsTable } from "@/components/admin/PostsTable";
import { PostPreview } from "@/components/admin/PostPreview";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import type { Post } from "@shared/schema";

export default function PostsPage() {
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);

  return (
    <AdminLayout title={
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Posts</h1>
        <Button className="bg-primary hover:bg-primary/90">
          <Plus className="w-4 h-4 mr-2" />
          New Post
        </Button>
      </div>
    }>
      <PostsTable onSelect={setSelectedPost} />
      {selectedPost && (
        <PostPreview
          post={selectedPost}
          onClose={() => setSelectedPost(null)}
        />
      )}
    </AdminLayout>
  );
}
