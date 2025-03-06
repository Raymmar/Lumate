import React from 'react';
import { BusinessProfile } from "@/components/ui/business-profile";
import { User } from "@shared/schema";

interface MemberDetailsProps {
  user?: User | null;
}

export const MemberDetails: React.FC<MemberDetailsProps> = ({ user }) => {
  // Only render if there's company information
  if (!user?.companyName) {
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

  return (
    <div className="space-y-4">
      <BusinessProfile {...businessData} />
    </div>
  );
};

export default MemberDetails;