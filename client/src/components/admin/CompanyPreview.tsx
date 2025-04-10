import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Company, User, Tag } from "@shared/schema";
import { format } from "date-fns";
import { PreviewSidebar } from "./PreviewSidebar";
import { useState } from "react";
import {
  Building2,
  Users,
  Globe,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  Calendar,
  Link2,
  Tag as TagIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";

interface CompanyPreviewProps {
  company: Company;
  onClose: () => void;
}

interface CompanyDetails extends Company {
  members: Array<{
    user: User;
    role: string;
    title?: string;
  }>;
  tags: Tag[];
}

export function CompanyPreview({ company, onClose }: CompanyPreviewProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(true);

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      onClose();
    }
  };

  const { data, isLoading } = useQuery<CompanyDetails>({
    queryKey: [`/api/admin/companies/${company.id}`],
    queryFn: async () => {
      const response = await fetch(`/api/admin/companies/${company.id}`);
      if (!response.ok) {
        throw new Error("Failed to fetch company details");
      }
      return response.json();
    },
  });

  if (isLoading) {
    return (
      <PreviewSidebar open={open} onOpenChange={handleOpenChange} title="Company Details">
        <div className="flex items-center justify-center h-full">
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <p className="mt-2 text-sm text-muted-foreground">Loading company details...</p>
          </div>
        </div>
      </PreviewSidebar>
    );
  }

  if (!data) {
    return (
      <PreviewSidebar open={open} onOpenChange={handleOpenChange} title="Company Details">
        <div className="flex items-center justify-center h-full">
          <p>Failed to load company details</p>
        </div>
      </PreviewSidebar>
    );
  }

  return (
    <PreviewSidebar open={open} onOpenChange={handleOpenChange} title={data.name}>
      <div className="space-y-6 p-1">
        {/* Company Header */}
        <div className="flex items-center gap-4">
          {data.logoUrl ? (
            <img
              src={data.logoUrl}
              alt={data.name}
              className="h-16 w-16 rounded-md object-cover border"
            />
          ) : (
            <div className="h-16 w-16 rounded-md bg-muted flex items-center justify-center">
              <Building2 className="h-8 w-8 text-muted-foreground" />
            </div>
          )}
          <div>
            <h2 className="text-xl font-semibold">{data.name}</h2>
            <p className="text-sm text-muted-foreground">{data.industry || "No industry specified"}</p>
          </div>
        </div>

        {/* Basic Info */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium">Basic Information</h3>
          
          <div className="grid grid-cols-2 gap-3">
            {data.website && (
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-muted-foreground" />
                <a
                  href={data.website.startsWith("http") ? data.website : `https://${data.website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline"
                >
                  {data.website.replace(/^https?:\/\/(www\.)?/, "")}
                </a>
              </div>
            )}
            
            {data.email && (
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <a href={`mailto:${data.email}`} className="text-sm hover:underline">
                  {data.email}
                </a>
              </div>
            )}
            
            {data.phoneNumber && (
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <a href={`tel:${data.phoneNumber}`} className="text-sm hover:underline">
                  {data.phoneNumber}
                </a>
              </div>
            )}
            
            {data.address && (
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{data.address}</span>
              </div>
            )}
            
            {data.size && (
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{data.size}</span>
              </div>
            )}
            
            {data.founded && (
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Founded {data.founded}</span>
              </div>
            )}
          </div>
        </div>

        {/* Description */}
        {data.description && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium">Description</h3>
            <p className="text-sm text-muted-foreground">{data.description}</p>
          </div>
        )}

        {/* Tags */}
        {data.tags && data.tags.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium">Tags</h3>
            <div className="flex flex-wrap gap-2">
              {data.tags.map((tag) => (
                <Badge key={tag.id} variant="outline" className="text-xs">
                  <TagIcon className="h-3 w-3 mr-1" />
                  {tag.text}
                </Badge>
              ))}
            </div>
          </div>
        )}

        <Separator />

        {/* Company Members */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">Company Members</h3>
            <Badge variant="outline">{data.members.length}</Badge>
          </div>
          
          {data.members.length === 0 ? (
            <p className="text-sm text-muted-foreground">No members associated with this company</p>
          ) : (
            <div className="space-y-3">
              {data.members.map((member) => (
                <div key={member.user.id} className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage
                      src={member.user.avatarUrl || undefined}
                      alt={member.user.displayName || member.user.email}
                    />
                    <AvatarFallback>
                      {(member.user.displayName || member.user.email).charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium">
                      {member.user.displayName || member.user.email}
                    </p>
                    <div className="flex items-center gap-2">
                      <p className="text-xs text-muted-foreground">
                        {member.title || "No title"}
                      </p>
                      <Badge variant="secondary" className="text-xs">
                        {member.role}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <Separator />

        {/* Profile Details */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium">Profile Information</h3>
          <div className="text-sm">
            <div className="flex items-center justify-between text-muted-foreground">
              <span>Created</span>
              <span>{format(new Date(data.createdAt), "MMM d, yyyy")}</span>
            </div>
            <div className="flex items-center justify-between text-muted-foreground mt-1">
              <span>Last Updated</span>
              <span>{format(new Date(data.updatedAt), "MMM d, yyyy")}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-2 mt-6">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button>
            Edit Company
          </Button>
        </div>
      </div>
    </PreviewSidebar>
  );
}