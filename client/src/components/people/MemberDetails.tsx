import React from 'react';
import { BusinessProfile } from "@/components/ui/business-profile";
import { User } from "@shared/schema";

interface MemberDetailsProps {
  user?: User | null;
}

export const MemberDetails: React.FC<MemberDetailsProps> = ({ user }) => {
  console.log('MemberDetails - Received user data:', user); // Debug log

  // Only render if there's company information
  if (!user?.companyName) {
    console.log('MemberDetails - No company name found, not rendering'); // Debug log
    return null;
  }

  const businessData = {
    name: user.companyName,
    description: user.companyDescription || '',
    address: typeof user.address === 'object' ? user.address : undefined,
    phone: user.isPhonePublic ? user.phoneNumber : undefined,
    email: user.isEmailPublic ? user.email : undefined,
    customLinks: user.customLinks?.filter(link => link.url && link.title) || []
  };

  console.log('MemberDetails - Prepared business data:', businessData); // Debug log

  return (
    <div className="space-y-4">
      <BusinessProfile {...businessData} />
    </div>
  );
};

export default MemberDetails;