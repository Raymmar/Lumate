import DashboardLayout from "@/components/layout/DashboardLayout";
import PersonProfile from "@/components/people/PersonProfile";
import { useParams } from "wouter";
import { SEO } from "@/components/ui/seo";

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

  // Set a temporary default SEO title while loading the profile data
  // The PersonProfile component will update this with user-specific data when loaded
  const tempTitle = `${decodedUsername} | Sarasota Tech`;

  return (
    <DashboardLayout>
      <SEO title={tempTitle} description="Loading profile..." />
      <PersonProfile username={decodedUsername} />
    </DashboardLayout>
  );
}