import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DataTable } from "./DataTable";
import { format } from "date-fns";
import type { Company, InsertCompany } from "@shared/schema";
import { useState } from "react";
import { PreviewSidebar } from "./PreviewSidebar";
import { CompanyPreview } from "./CompanyPreview";
import { SearchInput } from "./SearchInput";
import { useDebounce } from "@/hooks/useDebounce";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { useToast } from "@/hooks/use-toast";
import { Building2, Users, Globe, Plus, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { apiRequest } from "@/lib/queryClient";

// Extended Company type that includes member count
interface CompanyWithMemberCount extends Company {
  memberCount: number;
}

interface CompaniesResponse {
  companies: CompanyWithMemberCount[];
  total: number;
}

// Industry options
const INDUSTRY_OPTIONS = [
  // Tech-focused industries
  "Software Development",
  "IT Services & Consulting",
  "Cybersecurity",
  "AI & Machine Learning",
  "Cloud Computing",
  "Data & Analytics",
  "Web Development",
  "Mobile Development",
  "Digital Marketing",
  "E-commerce",
  "EdTech",
  "FinTech",
  "HealthTech",
  "Telecommunications",
  
  // Other major industries
  "Healthcare",
  "Finance & Banking",
  "Education",
  "Manufacturing",
  "Retail",
  "Real Estate",
  "Construction",
  "Energy",
  "Transportation",
  "Hospitality & Tourism",
  "Media & Entertainment",
  "Legal Services",
  "Consulting",
  "Non-profit",
  "Other"
];

// Company size options
const COMPANY_SIZE_OPTIONS = [
  "1-5",
  "5-10",
  "11-50",
  "51-200",
  "201-500",
  "501-1000",
  "1001-5000",
  "5000+"
];

// Founded year options (current year down to 1900)
const FOUNDED_YEAR_OPTIONS = Array.from({ length: 126 }, (_, i) => (2025 - i).toString());

// Form validation schema
const createCompanySchema = z.object({
  name: z.string().min(1, "Company name is required"),
  description: z.string().optional(),
  website: z.string().optional(),
  logoUrl: z.string().optional(),
  address: z.string().optional(),
  phoneNumber: z.string().optional(),
  email: z.string().email("Invalid email").optional().or(z.string().length(0)),
  industry: z.string().optional(),
  size: z.string().optional(),
  founded: z.string().optional(),
  bio: z.string().optional(),
  isPhonePublic: z.boolean().default(false),
  isEmailPublic: z.boolean().default(false),
  tags: z.array(z.string()).optional(),
  selectedMember: z.string().min(1, "At least one member is required")
});

type CreateCompanyFormValues = z.infer<typeof createCompanySchema>;

export function CompaniesTable() {
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 500);
  const [page, setPage] = useState(1);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [isAddCompanyOpen, setIsAddCompanyOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const ITEMS_PER_PAGE = 10;

  const { data, isLoading, error } = useQuery<CompaniesResponse>({
    queryKey: ["/api/admin/companies", debouncedSearch, page],
    queryFn: async () => {
      const response = await fetch(
        `/api/admin/companies?search=${encodeURIComponent(
          debouncedSearch
        )}&page=${page}&limit=${ITEMS_PER_PAGE}`
      );
      if (!response.ok) {
        throw new Error("Failed to fetch companies");
      }
      return response.json();
    },
  });

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const totalPages = Math.ceil((data?.total || 0) / ITEMS_PER_PAGE);

  const columns = [
    {
      key: "name",
      header: "Name",
      cell: (row: CompanyWithMemberCount) => (
        <div className="flex items-center gap-2">
          {row.logoUrl ? (
            <img
              src={row.logoUrl}
              alt={row.name}
              className="h-6 w-6 rounded-full object-cover"
            />
          ) : (
            <Building2 className="h-5 w-5 text-muted-foreground" />
          )}
          {row.name}
        </div>
      ),
    },
    {
      key: "industry",
      header: "Industry",
      cell: (row: CompanyWithMemberCount) => (
        <div>
          {row.industry ? (
            <Badge variant="outline">{row.industry}</Badge>
          ) : (
            <span className="text-muted-foreground text-sm">—</span>
          )}
        </div>
      ),
    },
    {
      key: "website",
      header: "Website",
      cell: (row: CompanyWithMemberCount) => (
        <div className="flex items-center gap-1 text-sm">
          {row.website ? (
            <>
              <Globe className="h-3 w-3 text-muted-foreground" />
              <a
                href={row.website.startsWith("http") ? row.website : `https://${row.website}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline truncate max-w-[150px]"
              >
                {row.website.replace(/^https?:\/\/(www\.)?/, "")}
              </a>
            </>
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </div>
      ),
    },
    {
      key: "memberCount",
      header: "Members",
      cell: (row: CompanyWithMemberCount) => (
        <div className="flex items-center gap-1">
          <Users className="h-3 w-3 text-muted-foreground" />
          <span>{row.memberCount}</span>
        </div>
      ),
    },
    {
      key: "createdAt",
      header: "Created",
      cell: (row: CompanyWithMemberCount) => format(new Date(row.createdAt), "MMM d, yyyy"),
    },
  ];

  const actions = [
    {
      label: "View Details",
      onClick: (company: CompanyWithMemberCount) => {
        setSelectedCompany(company);
      },
    },
  ];

  if (error) {
    return <div>Error loading companies: {error.message}</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
        <div className="flex items-center">
          <h2 className="text-2xl font-semibold tracking-tight">Companies</h2>
          <div className="flex items-center ml-4">
            <Badge variant="outline">{data?.total || 0}</Badge>
          </div>
        </div>
        <div className="flex flex-col md:flex-row items-center gap-2">
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search companies..."
          />
          <Button variant="outline" size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Add Company
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <p className="mt-2 text-sm text-muted-foreground">Loading companies...</p>
          </div>
        </div>
      ) : (
        <>
          <DataTable
            data={data?.companies || []}
            columns={columns}
            actions={actions}
            onRowClick={(company) => setSelectedCompany(company)}
          />

          {totalPages > 1 && (
            <Pagination className="mt-4">
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      if (page > 1) handlePageChange(page - 1);
                    }}
                    className={page <= 1 ? "pointer-events-none opacity-50" : ""}
                  />
                </PaginationItem>
                <PaginationItem className="flex items-center text-sm">
                  <span>
                    Page {page} of {totalPages}
                  </span>
                </PaginationItem>
                <PaginationItem>
                  <PaginationNext
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      if (page < totalPages) handlePageChange(page + 1);
                    }}
                    className={
                      page >= totalPages ? "pointer-events-none opacity-50" : ""
                    }
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </>
      )}

      {selectedCompany && (
        <CompanyPreview
          company={selectedCompany}
          onClose={() => setSelectedCompany(null)}
        />
      )}
    </div>
  );
}