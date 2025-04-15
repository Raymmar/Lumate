import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

// Define the Industry type based on database schema
interface Industry {
  id: number;
  name: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function IndustriesTable() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [newIndustry, setNewIndustry] = useState({
    name: "",
  });

  // Fetch all industries
  const { data: industries, isLoading } = useQuery({
    queryKey: ["/api/admin/industries"],
    queryFn: async () => {
      const response = await fetch("/api/admin/industries");
      const data = await response.json();
      return data.industries as Industry[];
    },
  });

  // Create new industry
  const createIndustryMutation = useMutation({
    mutationFn: async (data: { name: string }) => {
      const response = await fetch("/api/admin/industries", {
        method: "POST",
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/industries"] });
      toast({
        title: "Industry created",
        description: "The industry has been created successfully.",
      });
      setIsAddDialogOpen(false);
      setNewIndustry({ name: "" });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to create industry: ${error}`,
        variant: "destructive",
      });
    },
  });

  // Update industry
  const updateIndustryMutation = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: number;
      data: { name?: string; isActive?: boolean };
    }) => {
      const response = await fetch(`/api/admin/industries/${id}`, {
        method: "PATCH",
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/industries"] });
      toast({
        title: "Industry updated",
        description: "The industry has been updated successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to update industry: ${error}`,
        variant: "destructive",
      });
    },
  });

  // Handle creating a new industry
  const handleCreateIndustry = () => {
    createIndustryMutation.mutate({
      name: newIndustry.name,
    });
  };

  // Handle updating industry active status
  const handleToggleActive = (industry: Industry) => {
    updateIndustryMutation.mutate({
      id: industry.id,
      data: { isActive: !industry.isActive },
    });
  };

  // Filter industries based on search query
  const filteredIndustries = industries?.filter(
    (industry) =>
      industry.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Industries</h2>
        <Button onClick={() => setIsAddDialogOpen(true)}>Add Industry</Button>
      </div>

      <div className="mb-4">
        <Input
          placeholder="Search industries..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-md"
        />
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={2} className="text-center py-4">
                  Loading...
                </TableCell>
              </TableRow>
            ) : filteredIndustries && filteredIndustries.length > 0 ? (
              filteredIndustries.map((industry) => (
                <TableRow key={industry.id}>
                  <TableCell className="font-medium">{industry.name}</TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={industry.isActive}
                        onCheckedChange={() => handleToggleActive(industry)}
                      />
                      <span>{industry.isActive ? "Active" : "Inactive"}</span>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={2} className="text-center py-4">
                  No industries found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Add Industry Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Industry</DialogTitle>
            <DialogDescription>
              Create a new industry for companies to select
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Name
              </Label>
              <Input
                id="name"
                value={newIndustry.name}
                onChange={(e) =>
                  setNewIndustry({ ...newIndustry, name: e.target.value })
                }
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsAddDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleCreateIndustry}
              disabled={!newIndustry.name.trim() || createIndustryMutation.isPending}
            >
              {createIndustryMutation.isPending ? "Creating..." : "Create Industry"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}