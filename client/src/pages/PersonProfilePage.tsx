import DashboardLayout from "@/components/layout/DashboardLayout";
import PersonProfile from "@/components/people/PersonProfile";
import { useParams, useLocation } from "wouter";

export default function PersonProfilePage() {
  const params = useParams<{ username?: string; apiId?: string }>();
  const [location] = useLocation();
  
  // Check if we're using the API ID route or username route
  const isApiIdRoute = location.startsWith('/people/id/');
  
  if (!params.username && !params.apiId) {
    return (
      <DashboardLayout>
        <div>Invalid profile URL</div>
      </DashboardLayout>
    );
  }

  if (isApiIdRoute && params.apiId) {
    // If using API ID route, pass the API ID directly
    return (
      <DashboardLayout>
        <PersonProfile identifier={params.apiId} isApiId={true} />
      </DashboardLayout>
    );
  } else if (params.username) {
    // For username route, decode the URL-encoded username and handle special characters
    const decodedUsername = decodeURIComponent(params.username)
      // First try to preserve the original format
      .replace(/^dr-/, "Dr. ") // Convert "dr-" prefix back to "Dr. "
      .replace(/-/g, " "); // Convert remaining hyphens to spaces for lookup

    return (
      <DashboardLayout>
        <PersonProfile identifier={decodedUsername} isApiId={false} />
      </DashboardLayout>
    );
  }
  
  // Fallback for any edge cases
  return (
    <DashboardLayout>
      <div>Invalid profile URL</div>
    </DashboardLayout>
  );
}