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
  Calendar
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
  consultationEnabled?: boolean;
  consultationUrl?: string;
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
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span>
                {address.street}, {address.city}, {address.state} {address.zip}
              </span>
            </div>
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
