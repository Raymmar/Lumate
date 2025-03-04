import React from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Globe, 
  Linkedin,
  Phone, 
  Mail,
  Github,
  Facebook,
  Instagram,
  X,
  Star,
  Code,
  Heart
} from "lucide-react";
import { ProfileBadge } from "@/components/ui/profile-badge";
import { BusinessProfile } from "@/components/ui/business-profile";

// Mock data for layout purposes
const mockMemberDetails = {
  bio: "Full-stack developer with 10+ years of experience in building scalable web applications. Passionate about mentoring and open source contribution.",
  linkedin: "https://linkedin.com/in/johndoe",
  github: "https://github.com/johndoe",
  facebook: "https://facebook.com/johndoe",
  instagram: "https://instagram.com/johndoe",
  twitter: "https://twitter.com/johndoe",
  website: "https://johndoe.dev",
  phone: "+1 (555) 123-4567",
  email: "john@example.com",
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

      {/* Social Links */}
      <Card className="p-4">
        <div className="space-y-2">
          {mockMemberDetails.linkedin && (
            <Button
              variant="secondary"
              className="w-full justify-start gap-2"
              asChild
            >
              <a
                href={mockMemberDetails.linkedin}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Linkedin className="h-4 w-4" />
                LinkedIn
              </a>
            </Button>
          )}

          {mockMemberDetails.github && (
            <Button
              variant="secondary"
              className="w-full justify-start gap-2"
              asChild
            >
              <a
                href={mockMemberDetails.github}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Github className="h-4 w-4" />
                GitHub
              </a>
            </Button>
          )}

          {mockMemberDetails.twitter && (
            <Button
              variant="secondary"
              className="w-full justify-start gap-2"
              asChild
            >
              <a
                href={mockMemberDetails.twitter}
                target="_blank"
                rel="noopener noreferrer"
              >
                <X className="h-4 w-4" />
                X
              </a>
            </Button>
          )}

          {mockMemberDetails.facebook && (
            <Button
              variant="secondary"
              className="w-full justify-start gap-2"
              asChild
            >
              <a
                href={mockMemberDetails.facebook}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Facebook className="h-4 w-4" />
                Facebook
              </a>
            </Button>
          )}

          {mockMemberDetails.instagram && (
            <Button
              variant="secondary"
              className="w-full justify-start gap-2"
              asChild
            >
              <a
                href={mockMemberDetails.instagram}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Instagram className="h-4 w-4" />
                Instagram
              </a>
            </Button>
          )}

          {mockMemberDetails.website && (
            <Button
              variant="secondary"
              className="w-full justify-start gap-2"
              asChild
            >
              <a
                href={mockMemberDetails.website}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Globe className="h-4 w-4" />
                Personal Website
              </a>
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
};

export default MemberDetails;