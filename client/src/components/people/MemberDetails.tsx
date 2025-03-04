import React from 'react';
import { Card } from "@/components/ui/card";
import { 
  Star,
  Code,
  Heart
} from "lucide-react";
import { ProfileBadge } from "@/components/ui/profile-badge";
import { BusinessProfile } from "@/components/ui/business-profile";

// Mock data for layout purposes
const mockMemberDetails = {
  bio: "Full-stack developer with 10+ years of experience in building scalable web applications. Passionate about mentoring and open source contribution.",
  badges: [
    { name: "Top Contributor", icon: <Star className="h-3 w-3" /> },
    { name: "Code Mentor", icon: <Code className="h-3 w-3" /> },
    { name: "Community Leader", icon: <Heart className="h-3 w-3" /> }
  ],
  business: {
    name: "TechFlow Solutions",
    description: "Providing innovative software solutions and consulting services to help businesses transform their digital presence.",
    industry: "Technology Consulting",
    imageUrl: "https://images.unsplash.com/photo-1497366216548-37526070297c",
    address: {
      street: "123 Tech Avenue",
      city: "San Francisco",
      state: "CA",
      zip: "94105"
    },
    phone: "+1 (555) 123-4567",
    email: "contact@techflow.com",
    website: "https://techflow.com",
    linkedin: "https://linkedin.com/in/johndoe",
    github: "https://github.com/johndoe",
    facebook: "https://facebook.com/johndoe",
    instagram: "https://instagram.com/johndoe",
    twitter: "https://twitter.com/johndoe",
    consultationEnabled: true,
    consultationUrl: "/book-consultation"
  }
};

export const MemberDetails: React.FC = () => {
  return (
    <div className="space-y-4">
      {/* Badges Section */}
      <div className="flex flex-wrap gap-2">
        {mockMemberDetails.badges.map((badge, index) => (
          <ProfileBadge
            key={index}
            name={badge.name}
            icon={badge.icon}
          />
        ))}
      </div>

      {/* Bio Section */}
      <Card className="p-4">
        <div className="space-y-1">
          <h3 className="text-sm font-medium">About</h3>
          <p className="text-sm text-muted-foreground">
            {mockMemberDetails.bio}
          </p>
        </div>
      </Card>

      {/* Business Profile Section */}
      <BusinessProfile {...mockMemberDetails.business} />
    </div>
  );
};

export default MemberDetails;