import { AdminGuard } from "@/components/AdminGuard";
import { SiteSettings } from "@/components/admin/SiteSettings";

export default function AdminSettingsPage() {
  return (
    <AdminGuard>
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold">Site Settings</h1>
        <SiteSettings />
      </div>
    </AdminGuard>
  );
}
