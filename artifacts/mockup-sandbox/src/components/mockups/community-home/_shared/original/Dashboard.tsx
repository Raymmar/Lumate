import DashboardLayout from "./DashboardLayout";
import { BulletinBoard } from "./BulletinBoard";

export default function Dashboard() {
  return (
    <DashboardLayout>
      <div className="!border-none">
        <BulletinBoard />
      </div>
    </DashboardLayout>
  );
}
