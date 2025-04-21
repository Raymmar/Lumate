import DashboardLayout from "@/components/layout/DashboardLayout";
import { NewsContent } from "@/components/news/NewsContent";

export default function NewsPage() {
  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto">
        <NewsContent />
      </div>
    </DashboardLayout>
  );
}