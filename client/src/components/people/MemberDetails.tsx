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
  BookOpen
} from "lucide-react";

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
  callToAction: "Book a consultation"
};

export const MemberDetails: React.FC = () => {
  return (
    <div className="space-y-4">
      {/* Bio Section */}
      <Card className="p-4">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            <BookOpen className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="space-y-1 min-w-0">
            <h3 className="text-sm font-medium">About</h3>
            <p className="text-sm text-muted-foreground">
              {mockMemberDetails.bio}
            </p>
          </div>
        </div>
      </Card>

      {/* Contact Links */}
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

          {mockMemberDetails.phone && (
            <Button
              variant="secondary"
              className="w-full justify-start gap-2"
              asChild
            >
              <a href={`tel:${mockMemberDetails.phone}`}>
                <Phone className="h-4 w-4" />
                {mockMemberDetails.phone}
              </a>
            </Button>
          )}

          {mockMemberDetails.email && (
            <Button
              variant="secondary"
              className="w-full justify-start gap-2"
              asChild
            >
              <a href={`mailto:${mockMemberDetails.email}`}>
                <Mail className="h-4 w-4" />
                {mockMemberDetails.email}
              </a>
            </Button>
          )}
        </div>
      </Card>

      {/* Call to Action */}
      {mockMemberDetails.callToAction && (
        <Card className="p-4">
          <div>
            <Button className="w-full">
              {mockMemberDetails.callToAction}
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
};

export default MemberDetails;