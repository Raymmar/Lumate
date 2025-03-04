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
    <div className="space-y-6 py-6">
      {/* Bio Section */}
      <Card className="p-6">
        <div className="flex items-start gap-4">
          <div className="p-2 bg-primary/5 rounded-md">
            <BookOpen className="h-4 w-4 text-foreground" />
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
      <Card className="p-6">
        <div className="space-y-4">
          {mockMemberDetails.linkedin && (
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/5 rounded-md">
                <Linkedin className="h-4 w-4 text-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">LinkedIn</p>
                <a
                  href={mockMemberDetails.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm hover:underline min-w-0 truncate"
                >
                  {mockMemberDetails.linkedin.replace('https://linkedin.com/in/', '@')}
                </a>
              </div>
            </div>
          )}

          {mockMemberDetails.github && (
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/5 rounded-md">
                <Github className="h-4 w-4 text-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">GitHub</p>
                <a
                  href={mockMemberDetails.github}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm hover:underline min-w-0 truncate"
                >
                  {mockMemberDetails.github.replace('https://github.com/', '@')}
                </a>
              </div>
            </div>
          )}

          {mockMemberDetails.twitter && (
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/5 rounded-md">
                <X className="h-4 w-4 text-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">X</p>
                <a
                  href={mockMemberDetails.twitter}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm hover:underline min-w-0 truncate"
                >
                  {mockMemberDetails.twitter.replace('https://twitter.com/', '@')}
                </a>
              </div>
            </div>
          )}

          {mockMemberDetails.facebook && (
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/5 rounded-md">
                <Facebook className="h-4 w-4 text-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Facebook</p>
                <a
                  href={mockMemberDetails.facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm hover:underline min-w-0 truncate"
                >
                  {mockMemberDetails.facebook.replace('https://facebook.com/', '@')}
                </a>
              </div>
            </div>
          )}

          {mockMemberDetails.instagram && (
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/5 rounded-md">
                <Instagram className="h-4 w-4 text-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Instagram</p>
                <a
                  href={mockMemberDetails.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm hover:underline min-w-0 truncate"
                >
                  {mockMemberDetails.instagram.replace('https://instagram.com/', '@')}
                </a>
              </div>
            </div>
          )}

          {mockMemberDetails.website && (
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/5 rounded-md">
                <Globe className="h-4 w-4 text-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Personal Website</p>
                <a
                  href={mockMemberDetails.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm hover:underline min-w-0 truncate"
                >
                  {mockMemberDetails.website.replace('https://', '')}
                </a>
              </div>
            </div>
          )}

          {mockMemberDetails.phone && (
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/5 rounded-md">
                <Phone className="h-4 w-4 text-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Phone</p>
                <span className="text-sm min-w-0 truncate">{mockMemberDetails.phone}</span>
              </div>
            </div>
          )}

          {mockMemberDetails.email && (
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/5 rounded-md">
                <Mail className="h-4 w-4 text-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Email</p>
                <a
                  href={`mailto:${mockMemberDetails.email}`}
                  className="text-sm hover:underline min-w-0 truncate"
                >
                  {mockMemberDetails.email}
                </a>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Call to Action */}
      {mockMemberDetails.callToAction && (
        <Card className="p-6">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/5 rounded-md">
                <MessageSquare className="h-4 w-4 text-foreground" />
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