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

// Define system-required permissions that cannot be removed
const REQUIRED_PERMISSIONS: Record<string, string[]> = {
  User: ['view_content', 'view_users'],
  Moderator: ['view_content', 'view_users', 'moderate_content', 'moderate_users'],
  Sponsor: ['view_content', 'view_users']
};

export function RolesAndPermissions() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [updatingPermissions, setUpdatingPermissions] = useState<Set<string>>(new Set());

  const { data: roles, isLoading: rolesLoading } = useQuery<Role[]>({
    queryKey: ['/api/admin/roles']
  });

  const { data: permissions, isLoading: permissionsLoading } = useQuery<Permission[]>({
    queryKey: ['/api/admin/permissions']
  });

  const { data: rolePermissions, isLoading: rolePermissionsLoading } = useQuery<Permission[]>({
    queryKey: ['/api/admin/roles', selectedRole?.id, 'permissions'],
    enabled: !!selectedRole
  });

  const isRequiredPermission = (roleName: string, permissionName: string) => {
    return REQUIRED_PERMISSIONS[roleName]?.includes(permissionName) || false;
  };

  const getPermissionKey = (roleId: number, permissionId: number) => `${roleId}-${permissionId}`;

  const handlePermissionToggle = async (roleId: number, permissionId: number, hasPermission: boolean) => {
    try {
      const role = roles?.find(r => r.id === roleId);
      const permission = permissions?.find(p => p.id === permissionId);

      if (!role || !permission) {
        console.error('Missing role or permission data:', { roleId, permissionId });
        return;
      }

      // Check if this is a required permission that can't be removed
      if (hasPermission && isRequiredPermission(role.name, permission.name)) {
        toast({
          title: "Cannot Remove Required Permission",
          description: `The ${permission.name} permission is required for the ${role.name} role.`,
          variant: "destructive",
        });
        return;
      }

      const permKey = getPermissionKey(roleId, permissionId);
      setUpdatingPermissions(prev => new Set(prev).add(permKey));

      const method = hasPermission ? 'DELETE' : 'POST';
      const oldPermissions = queryClient.getQueryData<Permission[]>(['/api/admin/roles', roleId, 'permissions']) || [];

      // Optimistically update the cache
      queryClient.setQueryData(
        ['/api/admin/roles', roleId, 'permissions'],
        hasPermission
          ? oldPermissions.filter(p => p.id !== permissionId)
          : [...oldPermissions, permission]
      );

      const updatedPermissions = await apiRequest<Permission[]>(
        `/api/admin/roles/${roleId}/permissions/${permissionId}`,
        method
      );

      // Update cache with actual server response
      queryClient.setQueryData(['/api/admin/roles', roleId, 'permissions'], updatedPermissions);

      toast({
        title: "Success",
        description: `Permission ${hasPermission ? 'removed from' : 'added to'} role`,
      });
    } catch (error) {
      console.error('Failed to update role permission:', error);

      // Revert the optimistic update
      queryClient.invalidateQueries({ 
        queryKey: ['/api/admin/roles', roleId, 'permissions'] 
      });

      toast({
        title: "Error",
        description: error instanceof Error 
          ? error.message 
          : "Failed to update role permission. Please try again.",
        variant: "destructive",
      });
    } finally {
      const permKey = getPermissionKey(roleId, permissionId);
      setUpdatingPermissions(prev => {
        const next = new Set(prev);
        next.delete(permKey);
        return next;
      });
    }
  };

  if (rolesLoading || permissionsLoading) {
    return <div>Loading...</div>;
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
                      onClick={() => {
                        console.log('Selected role:', role);
                        setSelectedRole(role);
                      }}
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
                      const isRequired = isRequiredPermission(selectedRole.name, permission.name);
                      const isUpdating = updatingPermissions.has(
                        getPermissionKey(selectedRole.id, permission.id)
                      );

                      return (
                        <TableRow key={permission.id}>
                          <TableCell className="font-medium">
                            {permission.name}
                            {isRequired && (
                              <Badge variant="secondary" className="ml-2">Required</Badge>
                            )}
                          </TableCell>
                          <TableCell>{permission.resource}</TableCell>
                          <TableCell>{permission.action}</TableCell>
                          <TableCell>
                            <Switch
                              checked={hasPermission || false}
                              onCheckedChange={() =>
                                handlePermissionToggle(
                                  selectedRole.id,
                                  permission.id,
                                  hasPermission || false
                                )
                              }
                              disabled={isUpdating || isRequired || rolePermissionsLoading}
                              className={isUpdating ? 'opacity-50' : ''}
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