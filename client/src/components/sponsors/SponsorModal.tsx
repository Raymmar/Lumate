import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Sponsor } from "@shared/schema";
import { SPONSOR_TIERS } from "./sponsorConfig";

interface SponsorModalProps {
  sponsor: Sponsor | null;
  onClose: () => void;
  year?: number;
}

export function SponsorModal({
  sponsor,
  onClose,
  year = new Date().getFullYear(),
}: SponsorModalProps) {
  const { toast } = useToast();
  const [name, setName] = useState(sponsor?.name || "");
  const [tier, setTier] = useState(sponsor?.tier || "Series A");
  const [logo, setLogo] = useState(sponsor?.logo || "");
  const [url, setUrl] = useState(sponsor?.url || "");
  const [sponsorYear, setSponsorYear] = useState(sponsor?.year || year);
  const [companyId, setCompanyId] = useState<number | null>(
    sponsor?.companyId || null,
  );
  const [companySearch, setCompanySearch] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);

  const { data: companiesData } = useQuery<{ companies: any[] }>({
    queryKey: ["/api/companies"],
  });

  const companies = companiesData?.companies || [];
  const filteredCompanies = companies.filter((c) =>
    c.name.toLowerCase().includes(companySearch.toLowerCase()),
  );

  useEffect(() => {
    if (sponsor?.companyId && companies.length > 0 && !companySearch) {
      const linkedCompany = companies.find((c) => c.id === sponsor.companyId);
      if (linkedCompany) {
        setCompanySearch(linkedCompany.name);
      }
    }
  }, [sponsor?.companyId, companies, companySearch]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const data = { name, tier, logo, url, year: sponsorYear, companyId };

      if (sponsor) {
        return apiRequest(`/api/sponsors/${sponsor.id}`, "PATCH", data);
      } else {
        return apiRequest("/api/sponsors", "POST", data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/sponsors?year=${sponsorYear}`] });
      if (sponsor && sponsor.year !== sponsorYear) {
        queryClient.invalidateQueries({ queryKey: [`/api/sponsors?year=${sponsor.year}`] });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/sponsors"] });
      toast({
        title: "Success",
        description: `Sponsor ${sponsor ? "updated" : "created"} successfully`,
      });
      onClose();
    },
    onError: () => {
      toast({
        title: "Error",
        description: `Failed to ${sponsor ? "update" : "create"} sponsor`,
        variant: "destructive",
      });
    },
  });

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/upload/file", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error("Upload failed:", errorData);
        throw new Error("Upload failed");
      }

      const data = await response.json();
      setLogo(data.url);

      toast({
        title: "Success",
        description: "Image uploaded successfully",
      });
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: "Error",
        description: "Failed to upload image",
        variant: "destructive",
      });
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name || !tier || !logo) {
      toast({
        title: "Validation Error",
        description: "Name, tier, and logo are required",
        variant: "destructive",
      });
      return;
    }

    saveMutation.mutate();
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto w-[calc(100vw-2rem)] sm:w-full">
        <DialogHeader>
          <DialogTitle>
            {sponsor ? "Edit Sponsor" : "Add New Sponsor"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="sponsor-name" className="text-sm font-medium">
              Name *
            </Label>
            <Input
              id="sponsor-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Sponsor name"
              data-testid="input-sponsor-name"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sponsor-tier" className="text-sm font-medium">
              Tier *
            </Label>
            <Select value={tier} onValueChange={setTier}>
              <SelectTrigger
                id="sponsor-tier"
                data-testid="select-sponsor-tier"
              >
                <SelectValue placeholder="Select a tier" />
              </SelectTrigger>
              <SelectContent>
                {SPONSOR_TIERS.map((t) => (
                  <SelectItem key={t.key} value={t.key}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="sponsor-logo" className="text-sm font-medium">
              Logo *
            </Label>
            <Input
              id="sponsor-logo"
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              data-testid="input-sponsor-logo"
              disabled={uploadingImage}
              className="cursor-pointer file:mr-4 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
            />
            {uploadingImage && (
              <p className="text-sm text-muted-foreground">Uploading...</p>
            )}
            {logo && (
              <div className="mt-2">
                <img
                  src={logo}
                  alt="Preview"
                  className="max-w-xs max-h-32 object-contain border border-border rounded-md bg-muted/30"
                />
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="sponsor-url" className="text-sm font-medium">
              URL
            </Label>
            <Input
              id="sponsor-url"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com"
              data-testid="input-sponsor-url"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sponsor-year" className="text-sm font-medium">
              Year
            </Label>
            <Input
              id="sponsor-year"
              type="number"
              value={sponsorYear}
              onChange={(e) => setSponsorYear(parseInt(e.target.value))}
              data-testid="input-sponsor-year"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="company-search" className="text-sm font-medium">
              Link to Company (Optional)
            </Label>
            <Input
              id="company-search"
              type="text"
              value={companySearch}
              onChange={(e) => setCompanySearch(e.target.value)}
              placeholder="Search companies..."
              data-testid="input-company-search"
            />
            {companySearch && filteredCompanies.length > 0 && (
              <div className="border border-border rounded-md max-h-40 overflow-y-auto bg-background">
                {filteredCompanies.map((company) => (
                  <div
                    key={company.id}
                    onClick={() => {
                      setCompanyId(company.id);
                      setCompanySearch(company.name);
                    }}
                    className="px-3 py-2 hover:bg-muted cursor-pointer transition-colors text-foreground"
                    data-testid={`company-option-${company.id}`}
                  >
                    {company.name}
                  </div>
                ))}
              </div>
            )}
            {companyId && (
              <p className="text-sm text-muted-foreground mt-1">
                Linked to: {companies.find((c) => c.id === companyId)?.name}
                <button
                  type="button"
                  onClick={() => {
                    setCompanyId(null);
                    setCompanySearch("");
                  }}
                  className="ml-2 text-destructive hover:underline"
                  data-testid="button-clear-company"
                >
                  Clear
                </button>
              </p>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              data-testid="button-cancel"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saveMutation.isPending || uploadingImage}
              data-testid="button-save-sponsor"
            >
              {saveMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
