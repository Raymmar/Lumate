import DashboardLayout from "@/components/layout/DashboardLayout";
import PersonProfile from "@/components/people/PersonProfile";
import { useParams } from "wouter";

export default function PersonProfilePage() {
  const params = useParams<{ username: string }>();

  if (!params.username) {
    return <div>Invalid profile URL</div>;
  }

  // Decode the URL-encoded username and handle special characters
  const decodedUsername = decodeURIComponent(params.username)
    // First try to preserve the original format
    .replace(/^dr-/, "Dr. ") // Convert "dr-" prefix back to "Dr. "
    .replace(/-/g, " "); // Convert remaining hyphens to spaces for lookup

  return (
    <DashboardLayout>
      <PersonProfile username={decodedUsername} />
    </DashboardLayout>
  );
}