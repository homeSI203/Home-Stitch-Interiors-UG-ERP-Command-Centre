"use client";

import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { listRoles, createRole, disableRole } from "@/services/roles.service";
import {
  getAllPermissions,
  getRolePermissionIds,
  assignPermissionsToRole,
} from "@/services/permission.service";
import { logAudit } from "@/services/audit.service";
import { useAuth } from "@/hooks/use-auth";
import { getUserDisplayName } from "@/lib/auth-utils";
import type { Permission, Role } from "@/types";
import { Loader2, Plus } from "lucide-react";

export default function RoleManagementPage() {
  const { user: currentUser } = useAuth();
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [rolePermissions, setRolePermissions] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newRole, setNewRole] = useState({ id: "", name: "", description: "" });
  const [message, setMessage] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [roleList, permList] = await Promise.all([
        listRoles(),
        getAllPermissions(),
      ]);
      setRoles(roleList);
      setPermissions(permList.filter((p) => p.active));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openRole = async (role: Role) => {
    setSelectedRole(role);
    const perms = await getRolePermissionIds(role.id);
    setRolePermissions(perms);
    setMessage(null);
  };

  const togglePermission = (permId: string) => {
    setRolePermissions((prev) =>
      prev.includes(permId)
        ? prev.filter((p) => p !== permId)
        : [...prev, permId]
    );
  };

  const savePermissions = async () => {
    if (!selectedRole || !currentUser) return;
    setSaving(true);
    try {
      await assignPermissionsToRole(selectedRole.id, rolePermissions);
      await logAudit({
        userId: currentUser.uid,
        userName: getUserDisplayName(currentUser),
        action: "Permissions Updated",
        module: "Role Management",
        details: { roleId: selectedRole.id, permissions: rolePermissions },
      });
      setMessage(`Permissions updated for ${selectedRole.name}.`);
      setSelectedRole(null);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to save permissions.");
    } finally {
      setSaving(false);
    }
  };

  const handleCreateRole = async () => {
    if (!currentUser || !newRole.id || !newRole.name) return;
    setSaving(true);
    try {
      const slug = newRole.id.trim().replace(/\s+/g, "_");
      await createRole({
        id: slug,
        name: newRole.name,
        description: newRole.description,
        permissions: [],
      });
      await logAudit({
        userId: currentUser.uid,
        userName: getUserDisplayName(currentUser),
        action: "Role Created",
        module: "Role Management",
        details: { roleId: slug },
      });
      setShowCreate(false);
      setNewRole({ id: "", name: "", description: "" });
      await load();
      setMessage(`Role "${newRole.name}" created. Assign permissions to activate it.`);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to create role.");
    } finally {
      setSaving(false);
    }
  };

  const handleDisableRole = async (role: Role) => {
    if (role.isSystem || !currentUser) return;
    await disableRole(role.id);
    await logAudit({
      userId: currentUser.uid,
      userName: getUserDisplayName(currentUser),
      action: "Role Disabled",
      module: "Role Management",
      details: { roleId: role.id },
    });
    await load();
  };

  const groupedPermissions = permissions.reduce<Record<string, Permission[]>>(
    (acc, perm) => {
      if (!acc[perm.module]) acc[perm.module] = [];
      acc[perm.module].push(perm);
      return acc;
    },
    {}
  );

  return (
    <DashboardLayout
      title="Roles & Permissions"
      description="Create roles and assign permissions dynamically — no code changes required"
      requiredPermission="manage_roles"
    >
      <div className="space-y-6">
        {message && (
          <div className="rounded-lg border bg-muted/50 px-4 py-3 text-sm">{message}</div>
        )}

        <div className="flex justify-between items-center">
          <p className="text-sm text-muted-foreground">
            {roles.length} roles · {permissions.length} permissions
          </p>
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Role
          </Button>
        </div>

        {showCreate && (
          <Card>
            <CardHeader>
              <CardTitle>Create Role</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Role ID (slug)</Label>
                  <Input
                    placeholder="sales_supervisor"
                    value={newRole.id}
                    onChange={(e) => setNewRole({ ...newRole, id: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Display Name</Label>
                  <Input
                    placeholder="Sales Supervisor"
                    value={newRole.name}
                    onChange={(e) => setNewRole({ ...newRole, name: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  placeholder="Oversees sales team and approvals"
                  value={newRole.description}
                  onChange={(e) =>
                    setNewRole({ ...newRole, description: e.target.value })
                  }
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleCreateRole} disabled={saving}>
                  Create Role
                </Button>
                <Button variant="outline" onClick={() => setShowCreate(false)}>
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Roles</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Loader2 className="h-6 w-6 animate-spin mx-auto" />
              ) : (
                <div className="space-y-2">
                  {roles.map((role) => (
                    <div
                      key={role.id}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div>
                        <p className="font-medium">{role.name}</p>
                        <p className="text-xs text-muted-foreground">{role.id}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {role.isSystem && (
                          <Badge variant="outline" className="text-xs">
                            System
                          </Badge>
                        )}
                        <Badge variant={role.active ? "default" : "secondary"}>
                          {role.active ? "Active" : "Disabled"}
                        </Badge>
                        <Button size="sm" variant="outline" onClick={() => openRole(role)}>
                          Edit
                        </Button>
                        {!role.isSystem && role.active && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive"
                            onClick={() => handleDisableRole(role)}
                          >
                            Disable
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {selectedRole && (
            <Card>
              <CardHeader>
                <CardTitle>Permissions — {selectedRole.name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 max-h-[600px] overflow-y-auto">
                {Object.entries(groupedPermissions).map(([module, perms]) => (
                  <div key={module}>
                    <p className="font-medium text-sm capitalize mb-2">{module}</p>
                    <div className="space-y-2">
                      {perms.map((perm) => (
                        <label
                          key={perm.id}
                          className="flex items-center gap-2 text-sm cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={rolePermissions.includes(perm.id)}
                            onChange={() => togglePermission(perm.id)}
                          />
                          <span>{perm.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
                <Button onClick={savePermissions} disabled={saving}>
                  {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Save Permissions
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
