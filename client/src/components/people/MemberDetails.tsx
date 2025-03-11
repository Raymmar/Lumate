import React from 'react';
import { BusinessProfile } from "@/components/ui/business-profile";
import { User } from "@shared/schema";
import { ProfileBadge } from "@/components/ui/profile-badge";
import { Star } from 'lucide-react';
import { Card, CardContent, CardHeader } from "@/components/ui/card";

interface MemberDetailsProps {
  user?: User | null;
}

export const MemberDetails: React.FC<MemberDetailsProps> = ({ user }) => {
  // Debug logging for troubleshooting
  console.log('MemberDetails - FULL DEBUG:', {
    receivedUser: user,
    hasCompanyName: Boolean(user?.companyName),
    hasDisplayName: Boolean(user?.displayName),
    hasBio: Boolean(user?.bio),
    hasCustomLinks: Boolean(user?.customLinks?.length > 0),
    hasAddress: Boolean(user?.address),
    hasPhone: Boolean(user?.phoneNumber),
    hasEmail: Boolean(user?.email),
    hasFeaturedImage: Boolean(user?.featuredImageUrl),
    hasTags: Boolean(user?.tags?.length > 0),
    hasBadges: Boolean(user?.badges?.length > 0),
    badges: user?.badges
  });

  if (!user) {
    console.log('MemberDetails - No user data found');
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
    (user.tags && user.tags.length > 0) ||
    (user.badges && user.badges.length > 0)
  );

  console.log('MemberDetails - Content check:', { hasContent });

  if (!hasContent) {
    console.log('MemberDetails - No meaningful content to display');
    return null;
  }

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

  console.log('MemberDetails - Final business data:', businessData);

  return (
    <div className="space-y-4">
      {user.badges && user.badges.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <h3 className="font-medium">Badges & Achievements</h3>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {user.badges.map((badge) => (
                <ProfileBadge
                  key={badge.id}
                  name={badge.name}
                  icon={<Star className="h-3 w-3" />}
                  variant="default"
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}
      <BusinessProfile {...businessData} />
    </div>
  );
};

export default MemberDetails;