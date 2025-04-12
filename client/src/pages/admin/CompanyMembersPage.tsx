import { useState } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { CompanyMembersList } from "@/components/admin/CompanyMembersList";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LoaderCircle, ArrowLeft, UserPlus } from "lucide-react";
import { Link as RouterLink } from "wouter";

// Types
interface Company {
  id: number;
  name: string;
  description: string | null;
  logoUrl: string | null;
}

interface User {
  id: number;
  email: string;
  displayName: string | null;
  isVerified: boolean;
}

interface CompanyMember {
  id: number;
  companyId: number;
  userId: number;
  role: string;
  title: string | null;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
  user: {
    id: number;
    email: string;
    displayName: string | null;
    isVerified: boolean;
    person?: {
      id: number;
      apiId: string;
      userName: string | null;
      fullName: string | null;
      jobTitle: string | null;
      avatarUrl: string | null;
    } | null;
  };
}

export default function CompanyMembersPage() {
  const { id } = useParams<{ id: string }>();
  const companyId = parseInt(id);
  const { toast } = useToast();
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [selectedRole, setSelectedRole] = useState("member");

  // Fetch company details
  const { data: companyData, isLoading: isLoadingCompany } = useQuery<{ company: Company }>({
    queryKey: ['/api/companies', companyId],
    queryFn: async () => {
      const response = await fetch(`/api/companies/${companyId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch company details');
      }
      return response.json();
    },
  });

  // Fetch company members
  const { data: membersData, isLoading: isLoadingMembers } = useQuery<{ members: CompanyMember[] }>({
    queryKey: ['/api/companies/members', companyId],
    queryFn: async () => {
      const response = await fetch(`/api/companies/${companyId}/members`);
      if (!response.ok) {
        throw new Error('Failed to fetch company members');
      }
      return response.json();
    },
  });

  // Fetch all users for adding members
  const { data: usersData, isLoading: isLoadingUsers } = useQuery<{ users: User[], total: number }>({
    queryKey: ['/api/admin/members'],
    queryFn: async () => {
      const response = await fetch('/api/admin/members?limit=100');
      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }
      return response.json();
    },
  });

  // Add member mutation
  const addMemberMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: number, role: string }) => {
      return apiRequest(`/api/companies/members`, 'POST', {
        companyId,
        userId,
        role,
        isPublic: true
      });
    },
    onSuccess: () => {
      toast({
        title: 'Member added',
        description: 'The member has been added to the company',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/companies/members', companyId] });
      setSelectedUserId(null);
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to add member: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: 'destructive',
      });
    }
  });

  const handleAddMember = async () => {
    if (!selectedUserId) {
      toast({
        title: 'Select a user',
        description: 'Please select a user to add as a member',
        variant: 'destructive',
      });
      return;
    }

    await addMemberMutation.mutateAsync({
      userId: selectedUserId,
      role: selectedRole
    });
  };

  // Filter out users that are already members
  const availableUsers = usersData?.users.filter(user => 
    !membersData?.members.some(member => member.user.id === user.id)
  ) || [];

  const company = companyData?.company;
  const members = membersData?.members || [];

  return (
    <AdminLayout>
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <RouterLink to="/admin/companies">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </RouterLink>
            <h1 className="text-2xl font-bold">
              {isLoadingCompany ? (
                <Skeleton className="h-8 w-40" />
              ) : (
                `Manage ${company?.name || 'Company'} Members`
              )}
            </h1>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Add Company Member</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <label className="text-sm font-medium">
                  User
                </label>
                <Select 
                  value={selectedUserId?.toString() || ''} 
                  onValueChange={(value) => setSelectedUserId(parseInt(value))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a user" />
                  </SelectTrigger>
                  <SelectContent>
                    {isLoadingUsers ? (
                      <div className="p-2 flex items-center justify-center">
                        <LoaderCircle className="h-4 w-4 animate-spin" />
                      </div>
                    ) : availableUsers.length === 0 ? (
                      <div className="p-2 text-sm text-muted-foreground">
                        No available users
                      </div>
                    ) : (
                      availableUsers.map(user => (
                        <SelectItem key={user.id} value={user.id.toString()}>
                          {user.displayName || user.email}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="w-32">
                <label className="text-sm font-medium">
                  Role
                </label>
                <Select 
                  value={selectedRole} 
                  onValueChange={setSelectedRole}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="member">Member</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end">
                <Button 
                  onClick={handleAddMember}
                  disabled={addMemberMutation.isPending || !selectedUserId}
                >
                  {addMemberMutation.isPending ? (
                    <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <UserPlus className="mr-2 h-4 w-4" />
                  )}
                  Add Member
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Current Members</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingMembers ? (
              <div className="space-y-2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : members.length > 0 ? (
              <CompanyMembersList 
                members={members} 
                companyId={companyId} 
                onMembersChanged={() => {
                  queryClient.invalidateQueries({ queryKey: ['/api/companies/members', companyId] });
                }}
              />
            ) : (
              <div className="p-4 border rounded-md text-center text-muted-foreground">
                No members associated with this company
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}