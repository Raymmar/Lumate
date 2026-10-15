import DashboardLayout from "@/components/layout/DashboardLayout";
import { BulletinBoard } from "@/components/bulletin/BulletinBoard";
import { CurrentSummitTicket } from "@/components/memberships/CurrentSummitTicket";

export default function Dashboard() {
  return (
    <DashboardLayout aboveLayout={<div className="px-2 sm:px-4"><CurrentSummitTicket /></div>}>
      <div className="!border-none">
        <BulletinBoard />
      </div>
    </DashboardLayout>
  );
}