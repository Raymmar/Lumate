import DashboardLayout from "@/components/layout/DashboardLayout";
import PersonProfile from "@/components/people/PersonProfile";
import { useParams } from "wouter";

export default function PersonProfilePage() {
  const params = useParams<{ username: string }>();

  if (!params.username) {
    return <div>Invalid profile URL</div>;
  }

  // The username parameter now includes the API ID suffix
  // The actual component will handle the parsing internally
  return (
    <DashboardLayout>
      <PersonProfile username={decodeURIComponent(params.username)} />
    </DashboardLayout>
  );
}