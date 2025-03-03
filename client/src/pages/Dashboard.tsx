import DashboardLayout from "@/components/layout/DashboardLayout";
import { BulletinBoard } from "@/components/bulletin/BulletinBoard";

export default function Dashboard() {
  return (
    <DashboardLayout>
      <div className="p-2">
        <BulletinBoard />
      </div>
    </DashboardLayout>
  );
}