import React from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Globe, 
  Linkedin, 
  Phone, 
  Mail,
  MessageSquare,
  BookOpen
} from "lucide-react";

// Mock data for layout purposes
const mockMemberDetails = {
  bio: "Full-stack developer with 10+ years of experience in building scalable web applications. Passionate about mentoring and open source contribution.",
  linkedin: "https://linkedin.com/in/johndoe",
  website: "https://johndoe.dev",
  phone: "+1 (555) 123-4567",
  email: "john@example.com",
  callToAction: "Book a consultation"
};

export const MemberDetails: React.FC = () => {
  return (
    <div className="space-y-6 py-6">
      {/* Bio Section */}
      <Card className="p-6">
        <div className="flex items-start space-x-4">
          <BookOpen className="h-5 w-5 text-muted-foreground mt-1" />
          <div className="space-y-1">
            <h3 className="text-sm font-medium">About</h3>
            <p className="text-sm text-muted-foreground">
              {mockMemberDetails.bio}
            </p>
          </div>
        </div>
      </Card>

      {/* Contact Links */}
      <Card className="p-6">
        <div className="space-y-4">
          {mockMemberDetails.linkedin && (
            <div className="flex items-center space-x-3">
              <Linkedin className="h-5 w-5 text-muted-foreground" />
              <a
                href={mockMemberDetails.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm hover:underline"
              >
                LinkedIn Profile
              </a>
            </div>
          )}
          
          {mockMemberDetails.website && (
            <div className="flex items-center space-x-3">
              <Globe className="h-5 w-5 text-muted-foreground" />
              <a
                href={mockMemberDetails.website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm hover:underline"
              >
                Personal Website
              </a>
            </div>
          )}

          {mockMemberDetails.phone && (
            <div className="flex items-center space-x-3">
              <Phone className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm">{mockMemberDetails.phone}</span>
            </div>
          )}

          {mockMemberDetails.email && (
            <div className="flex items-center space-x-3">
              <Mail className="h-5 w-5 text-muted-foreground" />
              <a
                href={`mailto:${mockMemberDetails.email}`}
                className="text-sm hover:underline"
              >
                {mockMemberDetails.email}
              </a>
            </div>
          )}
        </div>
      </Card>

      {/* Call to Action */}
      {mockMemberDetails.callToAction && (
        <Card className="p-6">
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <MessageSquare className="h-5 w-5 text-muted-foreground" />
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
