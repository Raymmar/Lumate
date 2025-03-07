import DashboardLayout from "@/components/layout/DashboardLayout";
import PersonProfile from "@/components/people/PersonProfile";
import { useParams } from "wouter";

export default function PersonProfilePage() {
  const params = useParams<{ username: string }>();

  if (!params.username) {
    return <div>Invalid username</div>;
  }

  return (
    <DashboardLayout>
      <PersonProfile username={params.username} />
    </DashboardLayout>
  );
}