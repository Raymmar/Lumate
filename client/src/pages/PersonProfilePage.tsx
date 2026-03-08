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

  const rawUsername = decodeURIComponent(params.username);
  
  // Slugs are stored as URL-friendly values (lowercase, hyphenated)
  // Pass directly to the API - the backend handles slug and legacy username lookups
  const decodedUsername = rawUsername;

  // Fetch person data for SEO at the page level
  const { data: personData } = useQuery({
    queryKey: ['/api/people/by-username', decodedUsername],
    queryFn: async () => {
      try {
        const response = await fetch(`/api/people/by-username/${encodeURIComponent(decodedUsername)}`);
        if (!response.ok) return null;
        return await response.json();
      } catch (error) {
        console.error("Error fetching person data for SEO:", error);
        return null;
      }
    }
  });

  const person = personData;

  const seoTitle = (person?.userName || person?.user?.displayName) ? `${person?.userName || person?.user?.displayName} | Sarasota Tech` : 'Member Profile | Sarasota Tech';
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