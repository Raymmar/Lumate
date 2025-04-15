import DashboardLayout from "@/components/layout/DashboardLayout";
import PersonProfile from "@/components/people/PersonProfile";
import { useParams } from "wouter";
import { SEO } from "@/components/ui/seo";
import { useQuery } from "@tanstack/react-query";

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

  // Fetch person data for SEO at the page level
  const { data: personData } = useQuery({
    queryKey: ['/api/people/by-username', decodedUsername],
    queryFn: async () => {
      try {
        const response = await fetch(`/api/people/by-username/${encodeURIComponent(decodedUsername)}`);
        if (!response.ok) return { person: null };
        return await response.json();
      } catch (error) {
        console.error("Error fetching person data for SEO:", error);
        return { person: null };
      }
    }
  });

  const person = personData?.person;

  // Generate SEO metadata with properly formatted values
  const seoTitle = person?.userName ? `${person.userName} | Sarasota Tech` : 'Member Profile | Sarasota Tech';
  const seoDescription = person?.user?.bio || `Member profile for ${person?.userName || 'a tech professional'} on Sarasota Tech.`;
  const seoImage = person?.avatarUrl || undefined;

  console.log("Setting SEO for person:", {
    title: seoTitle,
    description: seoDescription,
    image: seoImage
  });

  return (
    <DashboardLayout>
      {/* Place SEO component at the page level for proper social sharing */}
      <SEO 
        title={seoTitle} 
        description={seoDescription} 
        image={seoImage} 
      />
      <PersonProfile username={decodedUsername} />
    </DashboardLayout>
  );
}