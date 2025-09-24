import React from 'react';
import { BusinessProfile } from "@/components/ui/business-profile";
import { User } from "@shared/schema";
import { SEO } from "@/components/ui/seo";

interface MemberDetailsProps {
  user?: User | null;
}

export const MemberDetails: React.FC<MemberDetailsProps> = ({ user }) => {
  if (!user) {
    return null;
  }

  // Check if there's meaningful content to display
  const hasContent = Boolean(
    user.bio ||
    user.companyName ||
    user.companyDescription ||
    user.address ||
    (user.customLinks && user.customLinks.length > 0) ||
    user.featuredImageUrl ||
    (user.tags && user.tags.length > 0)
  );

  if (!hasContent) {
    return null;
  }

  // SEO metadata
  const seoTitle = user.displayName || 'Member Profile';
  const seoDescription = user.bio || user.companyDescription || 'Sarasota Tech Community Member';
  const seoImage = user.featuredImageUrl || undefined;

  // Always construct business data using available fields
  const businessData = {
    name: user.companyName || user.displayName || 'Business Profile',
    description: user.companyDescription || user.bio || '',
    address: typeof user.address === 'object' ? user.address : undefined,
    phone: user.isPhonePublic ? user.phoneNumber : undefined,
    email: user.isEmailPublic ? user.email : undefined,
    customLinks: user.customLinks?.filter(link => link.url && link.title) || [],
    featuredImageUrl: user.featuredImageUrl,
    tags: user.tags
  };


  return (
    <div className="w-full max-w-full space-y-4 overflow-hidden">
      <SEO title={seoTitle} description={seoDescription} image={seoImage} />
      <BusinessProfile {...businessData} containerClassName="w-full max-w-full" />
    </div>
  );
};

export default MemberDetails;