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
  CardContent,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [updatingPermissions, setUpdatingPermissions] = useState<Set<string>>(new Set());

  const { data: roles, isLoading: rolesLoading } = useQuery<Role[]>({
    queryKey: ['/api/admin/roles']
  });

  const { data: permissions, isLoading: permissionsLoading } = useQuery<Permission[]>({
    queryKey: ['/api/admin/permissions']
  });

  const selectedRole = roles?.find(r => r.id.toString() === selectedRoleId);

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

      queryClient.setQueryData(['/api/admin/roles', roleId, 'permissions'], updatedPermissions);

      toast({
        title: "Success",
        description: `Permission ${hasPermission ? 'removed from' : 'added to'} role`,
      });
    } catch (error) {
      console.error('Failed to update role permission:', error);

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
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Roles & Permissions</h1>
      </div>

      <Card className="mt-4">
        <CardContent className="pt-6">
          <div className="mb-8">
            <label className="text-sm font-medium mb-2 block">Select Role</label>
            <Select
              value={selectedRoleId?.toString()}
              onValueChange={(value) => setSelectedRoleId(value)}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                {roles.map((role) => (
                  <SelectItem key={role.id} value={role.id.toString()}>
                    <div className="flex items-center">
                      <span>{role.name}</span>
                      {role.isSystem && (
                        <Badge variant="secondary" className="ml-2">System</Badge>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

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
            <p className="text-muted-foreground text-center py-4">
              Select a role to view and manage its permissions
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}