import React from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Globe, 
  Linkedin,
  Phone, 
  Mail,
  MessageSquare,
  BookOpen,
  Github,
  Facebook,
  Instagram,
  X
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
        <div className="space-y-4">
          {mockMemberDetails.linkedin && (
            <div className="flex items-center gap-4">
              <div className="flex-shrink-0">
                <Linkedin className="h-5 w-5 text-muted-foreground" />
              </div>
              <a
                href={mockMemberDetails.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm hover:underline min-w-0 truncate"
              >
                LinkedIn
              </a>
            </div>
          )}

          {mockMemberDetails.github && (
            <div className="flex items-center gap-4">
              <div className="flex-shrink-0">
                <Github className="h-5 w-5 text-muted-foreground" />
              </div>
              <a
                href={mockMemberDetails.github}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm hover:underline min-w-0 truncate"
              >
                GitHub
              </a>
            </div>
          )}

          {mockMemberDetails.twitter && (
            <div className="flex items-center gap-4">
              <div className="flex-shrink-0">
                <X className="h-5 w-5 text-muted-foreground" />
              </div>
              <a
                href={mockMemberDetails.twitter}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm hover:underline min-w-0 truncate"
              >
                X
              </a>
            </div>
          )}

          {mockMemberDetails.facebook && (
            <div className="flex items-center gap-4">
              <div className="flex-shrink-0">
                <Facebook className="h-5 w-5 text-muted-foreground" />
              </div>
              <a
                href={mockMemberDetails.facebook}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm hover:underline min-w-0 truncate"
              >
                Facebook
              </a>
            </div>
          )}

          {mockMemberDetails.instagram && (
            <div className="flex items-center gap-4">
              <div className="flex-shrink-0">
                <Instagram className="h-5 w-5 text-muted-foreground" />
              </div>
              <a
                href={mockMemberDetails.instagram}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm hover:underline min-w-0 truncate"
              >
                Instagram
              </a>
            </div>
          )}

          {mockMemberDetails.website && (
            <div className="flex items-center gap-4">
              <div className="flex-shrink-0">
                <Globe className="h-5 w-5 text-muted-foreground" />
              </div>
              <a
                href={mockMemberDetails.website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm hover:underline min-w-0 truncate"
              >
                Personal Website
              </a>
            </div>
          )}

          {mockMemberDetails.phone && (
            <div className="flex items-center gap-4">
              <div className="flex-shrink-0">
                <Phone className="h-5 w-5 text-muted-foreground" />
              </div>
              <span className="text-sm min-w-0 truncate">{mockMemberDetails.phone}</span>
            </div>
          )}

          {mockMemberDetails.email && (
            <div className="flex items-center gap-4">
              <div className="flex-shrink-0">
                <Mail className="h-5 w-5 text-muted-foreground" />
              </div>
              <a
                href={`mailto:${mockMemberDetails.email}`}
                className="text-sm hover:underline min-w-0 truncate"
              >
                {mockMemberDetails.email}
              </a>
            </div>
          )}
        </div>
      </Card>

      {/* Call to Action */}
      {mockMemberDetails.callToAction && (
        <Card className="p-4">
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex-shrink-0">
                <MessageSquare className="h-5 w-5 text-muted-foreground" />
              </div>
              <h3 className="text-sm font-medium">Get in touch</h3>
            </div>
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