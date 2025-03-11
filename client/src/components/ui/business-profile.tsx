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
  featuredImageUrl?: string | null;
  tags?: string[] | null;
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
  customLinks = [],
  featuredImageUrl,
  tags = []
}: BusinessProfileProps) {
  return (
    <Card className="overflow-hidden rounded-xl">
      {featuredImageUrl && (
        <div className="relative h-[300px] w-full overflow-hidden rounded-t-xl">
          <img
            src={featuredImageUrl}
            alt={name}
            className="h-full w-full object-cover"
          />
        </div>
      )}

      <CardHeader className="pb-2">
        <h3 className="text-xl font-semibold">{name}</h3>
      </CardHeader>

      <CardContent className="space-y-4">
        {description && (
          <p className="text-muted-foreground">{description}</p>
        )}

        <div className="space-y-2">
          {address?.formatted_address && (
            <Button 
              variant="secondary"
              className="w-full h-auto p-4 justify-start rounded-lg"
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
                    <p className="text-sm">
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
              className="w-full justify-start gap-2 rounded-lg"
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
              className="w-full justify-start gap-2 rounded-lg"
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
              className="w-full justify-start gap-2 rounded-lg"
              asChild
            >
              <a href={`mailto:${email}`}>
                <Mail className="h-4 w-4" />
                {email}
              </a>
            </Button>
          )}
        </div>

        {tags && tags.length > 0 && (
          <div className="pt-4 border-t">
            <div className="flex flex-wrap gap-1">
              {tags.map((tag, index) => (
                <Badge key={index} variant="secondary" className="rounded-lg">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}