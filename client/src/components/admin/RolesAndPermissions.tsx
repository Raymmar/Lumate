import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Role, Permission } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";

export function RolesAndPermissions() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [isUpdating, setIsUpdating] = useState<{ roleId: number; permissionId: number } | null>(null);

  const { data: roles, isLoading: rolesLoading, error: rolesError } = useQuery<Role[]>({
    queryKey: ['/api/admin/roles']
  });

  const { data: permissions, isLoading: permissionsLoading, error: permissionsError } = useQuery<Permission[]>({
    queryKey: ['/api/admin/permissions']
  });

  const { data: rolePermissions, isLoading: rolePermissionsLoading } = useQuery<Permission[]>({
    queryKey: ['/api/admin/roles', selectedRole?.id, 'permissions'],
    enabled: !!selectedRole
  });

  const handlePermissionToggle = async (roleId: number, permissionId: number, hasPermission: boolean) => {
    try {
      setIsUpdating({ roleId, permissionId });

      // Optimistically update the UI
      const oldPermissions = queryClient.getQueryData<Permission[]>(['/api/admin/roles', roleId, 'permissions']) || [];
      if (hasPermission) {
        // Remove permission optimistically
        queryClient.setQueryData(['/api/admin/roles', roleId, 'permissions'], 
          oldPermissions.filter(p => p.id !== permissionId)
        );
      } else {
        // Add permission optimistically
        const permissionToAdd = permissions?.find(p => p.id === permissionId);
        if (permissionToAdd) {
          queryClient.setQueryData(['/api/admin/roles', roleId, 'permissions'], 
            [...oldPermissions, permissionToAdd]
          );
        }
      }

      const method = hasPermission ? 'DELETE' : 'POST';
      await apiRequest(
        `/api/admin/roles/${roleId}/permissions/${permissionId}`,
        method
      );

      // Invalidate to ensure consistency with server
      await queryClient.invalidateQueries({ 
        queryKey: ['/api/admin/roles', roleId, 'permissions'] 
      });

      toast({
        title: "Success",
        description: `Permission ${hasPermission ? 'removed from' : 'added to'} role`,
      });
    } catch (error) {
      console.error('Failed to update role permission:', error);

      // Revert optimistic update on error
      await queryClient.invalidateQueries({ 
        queryKey: ['/api/admin/roles', roleId, 'permissions'] 
      });

      toast({
        title: "Error",
        description: "Failed to update role permission",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(null);
    }
  };

  if (rolesLoading || permissionsLoading) {
    return <div>Loading...</div>;
  }

  if (rolesError || permissionsError) {
    return <div>Error loading roles and permissions</div>;
  }

  if (!roles || !permissions) {
    return <div>No roles or permissions found</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Roles & Permissions</CardTitle>
          <CardDescription>
            Manage system roles and their associated permissions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Roles List */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Roles</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Role</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>System</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {roles.map((role) => (
                    <TableRow 
                      key={role.id}
                      className={`cursor-pointer ${selectedRole?.id === role.id ? 'bg-muted' : ''}`}
                      onClick={() => setSelectedRole(role)}
                    >
                      <TableCell className="font-medium">{role.name}</TableCell>
                      <TableCell>{role.description}</TableCell>
                      <TableCell>
                        {role.isSystem && <Badge variant="secondary">System</Badge>}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Permissions List */}
            <div>
              <h3 className="text-lg font-semibold mb-4">
                Permissions {selectedRole && `for ${selectedRole.name}`}
              </h3>
              {selectedRole ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Permission</TableHead>
                      <TableHead>Resource</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Enabled</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {permissions.map((permission) => {
                      const hasPermission = rolePermissions?.some(
                        (p) => p.id === permission.id
                      );
                      const isToggling = isUpdating?.roleId === selectedRole.id && 
                                       isUpdating?.permissionId === permission.id;
                      return (
                        <TableRow key={permission.id}>
                          <TableCell className="font-medium">
                            {permission.name}
                          </TableCell>
                          <TableCell>{permission.resource}</TableCell>
                          <TableCell>{permission.action}</TableCell>
                          <TableCell>
                            <Switch
                              checked={hasPermission || false}
                              onCheckedChange={(checked) =>
                                handlePermissionToggle(
                                  selectedRole.id,
                                  permission.id,
                                  hasPermission || false
                                )
                              }
                              disabled={isToggling}
                              className={isToggling ? 'opacity-50' : ''}
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-muted-foreground">
                  Select a role to view and manage its permissions
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}