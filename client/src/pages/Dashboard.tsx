import DashboardLayout from "@/components/layout/DashboardLayout";
import { BulletinBoard } from "@/components/bulletin/BulletinBoard";

export default function Dashboard() {
  return (
    <DashboardLayout>
      <BulletinBoard />
    </DashboardLayout>
  );
}