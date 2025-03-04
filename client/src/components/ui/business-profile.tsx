import * as React from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Building2,
  MapPin,
  Phone,
  Globe,
  Mail,
  Calendar,
  Linkedin,
  Github,
  Facebook,
  Instagram,
  X
} from "lucide-react";

export interface BusinessProfileProps {
  name: string;
  description: string;
  industry?: string;
  imageUrl?: string;
  address?: {
    street: string;
    city: string;
    state: string;
    zip: string;
  };
  phone?: string;
  email?: string;
  website?: string;
  linkedin?: string;
  github?: string;
  twitter?: string;
  facebook?: string;
  instagram?: string;
  consultationEnabled?: boolean;
  consultationUrl?: string;
}

function generateGoogleMapsUrl(address: BusinessProfileProps['address']) {
  if (!address) return '';
  const query = encodeURIComponent(
    `${address.street}, ${address.city}, ${address.state} ${address.zip}`
  );
  return `https://www.google.com/maps/search/?api=1&query=${query}`;
}

export function BusinessProfile({
  name,
  description,
  industry,
  imageUrl,
  address,
  phone,
  email,
  website,
  linkedin,
  github,
  twitter,
  facebook,
  instagram,
  consultationEnabled = false,
  consultationUrl = "#"
}: BusinessProfileProps) {
  return (
    <Card className="overflow-hidden">
      {imageUrl && (
        <div className="relative h-48 w-full">
          <img
            src={imageUrl}
            alt={name}
            className="h-full w-full object-cover"
          />
        </div>
      )}

      <CardHeader className="space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-semibold">{name}</h3>
            {industry && (
              <Badge variant="secondary" className="mt-1">
                {industry}
              </Badge>
            )}
          </div>
          {consultationEnabled && (
            <Button asChild>
              <a href={consultationUrl}>
                <Calendar className="mr-2 h-4 w-4" />
                Book Consultation
              </a>
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">{description}</p>

        <div className="space-y-2">
          {address && (
            <Button
              variant="secondary"
              className="w-full justify-start gap-2 text-left"
              asChild
            >
              <a 
                href={generateGoogleMapsUrl(address)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start"
              >
                <MapPin className="h-4 w-4 mt-1 flex-shrink-0" />
                <div>
                  <p className="font-medium">{address.street}</p>
                  <p className="text-sm text-muted-foreground">
                    {address.city}, {address.state} {address.zip}
                  </p>
                </div>
              </a>
            </Button>
          )}

          {linkedin && (
            <Button
              variant="secondary"
              className="w-full justify-start gap-2"
              asChild
            >
              <a href={linkedin} target="_blank" rel="noopener noreferrer">
                <Linkedin className="h-4 w-4" />
                LinkedIn
              </a>
            </Button>
          )}

          {github && (
            <Button
              variant="secondary"
              className="w-full justify-start gap-2"
              asChild
            >
              <a href={github} target="_blank" rel="noopener noreferrer">
                <Github className="h-4 w-4" />
                GitHub
              </a>
            </Button>
          )}

          {twitter && (
            <Button
              variant="secondary"
              className="w-full justify-start gap-2"
              asChild
            >
              <a href={twitter} target="_blank" rel="noopener noreferrer">
                <X className="h-4 w-4" />
                X
              </a>
            </Button>
          )}

          {facebook && (
            <Button
              variant="secondary"
              className="w-full justify-start gap-2"
              asChild
            >
              <a href={facebook} target="_blank" rel="noopener noreferrer">
                <Facebook className="h-4 w-4" />
                Facebook
              </a>
            </Button>
          )}

          {instagram && (
            <Button
              variant="secondary"
              className="w-full justify-start gap-2"
              asChild
            >
              <a href={instagram} target="_blank" rel="noopener noreferrer">
                <Instagram className="h-4 w-4" />
                Instagram
              </a>
            </Button>
          )}

          {phone && (
            <Button
              variant="secondary"
              className="w-full justify-start gap-2"
              asChild
            >
              <a href={`tel:${phone}`}>
                <Phone className="h-4 w-4" />
                {phone}
              </a>
            </Button>
          )}

          {email && (
            <Button
              variant="secondary"
              className="w-full justify-start gap-2"
              asChild
            >
              <a href={`mailto:${email}`}>
                <Mail className="h-4 w-4" />
                {email}
              </a>
            </Button>
          )}

          {website && (
            <Button
              variant="secondary"
              className="w-full justify-start gap-2"
              asChild
            >
              <a href={website} target="_blank" rel="noopener noreferrer">
                <Globe className="h-4 w-4" />
                Visit Website
              </a>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}