import { AdminLayout } from "@/components/layout/AdminLayout";
import { MediaLibrary } from "@/components/admin/MediaLibrary";

export default function MediaLibraryPage() {
  return (
    <AdminLayout title={
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Media Library</h1>
      </div>
    }>
      <MediaLibrary />
    </AdminLayout>
  );
}
