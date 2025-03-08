const handleDeletePost = async (post: Post) => {
    try {
      const endpoint = isAdminView ? `/api/admin/posts/${post.id}` : `/api/posts/${post.id}`;
      await apiRequest(endpoint, 'DELETE');
      await queryClient.invalidateQueries({ queryKey: [queryKey] });
      toast({
        title: "Success",
        description: "Post deleted successfully"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete post",
        variant: "destructive"
      });
    } finally {
      setPostToDelete(null);
    }
  };
