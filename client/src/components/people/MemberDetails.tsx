import React from 'react';
import { BusinessProfile } from "@/components/ui/business-profile";

// Mock data for layout purposes - only keeping business related data
const mockMemberDetails = {
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
      {/* Business Profile Section */}
      <BusinessProfile {...mockMemberDetails.business} />
    </div>
  );
};

export default MemberDetails;