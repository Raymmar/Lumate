import * as React from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  MapPin,
  Phone,
  Globe,
  Mail,
  Link as LinkIcon
} from "lucide-react";
import { Location, UserCustomLink } from "@shared/schema";

export interface BusinessProfileProps {
  name: string;
  description?: string | null;
  address?: Location | null;
  phone?: string | null;
  email?: string | null;
  customLinks?: UserCustomLink[];
}

function generateGoogleMapsUrl(address: Location) {
  if (!address?.formatted_address) return '';
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address.formatted_address)}`;
}

export function BusinessProfile({
  name,
  description,
  address,
  phone,
  email,
  customLinks = []
}: BusinessProfileProps) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-semibold">{name}</h3>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}

        <div className="space-y-2">
          {address?.formatted_address && (
            <Button 
              variant="secondary"
              className="w-full h-auto p-4 justify-start"
              asChild
            >
              <a
                href={generateGoogleMapsUrl(address)}
                target="_blank"
                rel="noopener noreferrer"
              >
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 mt-1 flex-shrink-0" />
                  <div className="text-left">
                    <p className="text-sm text-muted-foreground">
                      {address.formatted_address}
                    </p>
                  </div>
                </div>
              </a>
            </Button>
          )}

          {customLinks.map((link, index) => (
            <Button
              key={index}
              variant="secondary"
              className="w-full justify-start gap-2"
              asChild
            >
              <a href={link.url} target="_blank" rel="noopener noreferrer">
                {link.icon ? (
                  <span className="h-4 w-4">{link.icon}</span>
                ) : (
                  <LinkIcon className="h-4 w-4" />
                )}
                {link.title}
              </a>
            </Button>
          ))}

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
        </div>
      </CardContent>
    </Card>
  );
}