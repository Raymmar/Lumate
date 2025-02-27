import DashboardLayout from "@/components/layout/DashboardLayout";
import PersonProfile from "@/components/people/PersonProfile";
import { useParams } from "wouter";

export default function PersonProfilePage() {
  const params = useParams<{ id: string }>();

  if (!params.id) {
    return <div>Invalid person ID</div>;
  }

  return (
    <DashboardLayout>
      <PersonProfile personId={params.id} />
    </DashboardLayout>
  );
}