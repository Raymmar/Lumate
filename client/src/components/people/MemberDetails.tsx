import React from 'react';
import { BusinessProfile } from "@/components/ui/business-profile";
import { User, Company } from "@shared/schema";
import { SEO } from "@/components/ui/seo";

// Extend User type to include company property
interface ExtendedUser extends User {
  company?: Company;
}

interface MemberDetailsProps {
  user?: ExtendedUser | null;
}

export const MemberDetails: React.FC<MemberDetailsProps> = ({ user }) => {
  // Debug logging for troubleshooting
  console.log('MemberDetails - FULL DEBUG:', {
    receivedUser: user,
    hasCompanyName: Boolean(user?.companyName),
    hasDisplayName: Boolean(user?.displayName),
    hasBio: Boolean(user?.bio),
    hasCustomLinks: Boolean(user?.customLinks && user.customLinks.length > 0),
    hasAddress: Boolean(user?.address),
    hasPhone: Boolean(user?.phoneNumber),
    hasEmail: Boolean(user?.email),
    hasFeaturedImage: Boolean(user?.featuredImageUrl),
    hasTags: Boolean(user?.tags && user.tags.length > 0),
    hasCompany: Boolean(user?.company),
    companyData: user?.company
  });

  if (!user) {
    console.log('MemberDetails - No user data found');
    return null;
  }

  // Check if there's company data from the new companies table
  const company = user.company as Company;
  
  // Check if there's meaningful content to display
  const hasLegacyContent = Boolean(
    user.bio ||
    user.companyName ||
    user.companyDescription ||
    user.address ||
    (user.customLinks && user.customLinks.length > 0) ||
    user.featuredImageUrl ||
    (user.tags && user.tags.length > 0)
  );
  
  const hasCompanyContent = Boolean(company);
  
  const hasContent = hasCompanyContent || hasLegacyContent;

  console.log('MemberDetails - Content check:', { 
    hasLegacyContent, 
    hasCompanyContent,
    hasContent 
  });

  if (!hasContent) {
    console.log('MemberDetails - No meaningful content to display');
    return null;
  }

  // SEO metadata
  const seoTitle = user.displayName || 'Member Profile';
  const seoDescription = user.bio || (company?.bio || user.companyDescription) || 'Sarasota Tech Community Member';
  const seoImage = company?.featuredImageUrl || user.featuredImageUrl || undefined;

  // Always construct business data using available fields - prefer company data if available
  const businessData = {
    name: company?.name || user.companyName || user.displayName || 'Business Profile',
    description: company?.bio || user.companyDescription || user.bio || '',
    address: company?.address ? JSON.parse(company.address as string) : 
            (typeof user.address === 'object' ? user.address : undefined),
    phone: company ? (company.isPhonePublic ? company.phoneNumber : undefined) : 
           (user.isPhonePublic ? user.phoneNumber : undefined),
    email: company ? (company.isEmailPublic ? company.email : undefined) : 
           (user.isEmailPublic ? user.email : undefined),
    customLinks: company?.customLinks || user.customLinks?.filter(link => link.url && link.title) || [],
    featuredImageUrl: company?.featuredImageUrl || user.featuredImageUrl,
    tags: company?.tags || user.tags
  };

  console.log('MemberDetails - Final business data:', businessData);

  return (
    <div className="w-full max-w-full space-y-4 overflow-hidden">
      <SEO title={seoTitle} description={seoDescription} image={seoImage} />
      <BusinessProfile {...businessData} containerClassName="w-full max-w-full" />
    </div>
  );
};

export default MemberDetails;