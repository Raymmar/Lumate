import React from 'react';
import { BusinessProfile } from "@/components/ui/business-profile";
import { User } from "@shared/schema";

interface MemberDetailsProps {
  user?: User | null;
}

export const MemberDetails: React.FC<MemberDetailsProps> = ({ user }) => {
  console.log('MemberDetails - FULL DEBUG:', {
    receivedUser: user,
    hasCompanyName: Boolean(user?.companyName),
    hasDisplayName: Boolean(user?.displayName),
    hasBio: Boolean(user?.bio),
    hasSubscription: Boolean(user?.subscriptionStatus === 'active'),
    isAdmin: Boolean(user?.isAdmin)
  });

  if (!user) {
    console.log('MemberDetails - No user data found');
    return null;
  }

  // Always construct business data using available fields, with fallbacks
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

  console.log('MemberDetails - Prepared business data:', businessData);

  return (
    <div className="space-y-4">
      <BusinessProfile {...businessData} />
    </div>
  );
};

export default MemberDetails;