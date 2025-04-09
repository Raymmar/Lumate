import { PageContainer } from "@/components/layout/PageContainer";
import CompanyMigration from "@/components/admin/CompanyMigration";
import { AuthGuard } from "@/components/AuthGuard";
import { AdminGuard } from "@/components/AdminGuard";

export default function MigrationPage() {
  return (
    <AuthGuard>
      <AdminGuard>
        <PageContainer className="max-w-screen-xl mx-auto">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="w-full px-4">
              <h1 className="text-3xl font-bold mb-6">Data Migration</h1>
              <CompanyMigration />
            </div>
          </div>
        </PageContainer>
      </AdminGuard>
    </AuthGuard>
  );
}