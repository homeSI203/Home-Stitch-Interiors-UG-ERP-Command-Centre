"use client";

import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { PermissionGate } from "@/components/auth/permission-gate";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  listUsers,
  assignRolesToUser,
  activateUser,
  deactivateUser,
} from "@/services/users.service";
import { listRoles } from "@/services/roles.service";
import { logAudit } from "@/services/audit.service";
import { useAuth } from "@/hooks/use-auth";
import { getUserDisplayName } from "@/lib/auth-utils";
import { resetPassword } from "@/services/auth.service";
import type { Role, UserProfile } from "@/types";
import { Loader2, Shield, UserCheck, UserX, UserPlus } from "lucide-react";
import Link from "next/link";

export default function UserManagementPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [userList, roleList] = await Promise.all([listUsers(), listRoles()]);
      setUsers(userList);
      setRoles(roleList.filter((r) => r.active));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openEditor = (user: UserProfile) => {
    setSelectedUser(user);
    setSelectedRoles(user.roles);
    setMessage(null);
  };

  const toggleRole = (roleId: string) => {
    setSelectedRoles((prev) =>
      prev.includes(roleId)
        ? prev.filter((r) => r !== roleId)
        : [...prev, roleId]
    );
  };

  const saveRoles = async () => {
    if (!selectedUser || !currentUser) return;
    setSaving(true);
    setMessage(null);
    try {
      await assignRolesToUser(selectedUser.uid, selectedRoles);
      await logAudit({
        userId: currentUser.uid,
        userName: getUserDisplayName(currentUser),
        action: "Role Assigned",
        module: "User Management",
        details: { targetUser: selectedUser.uid, roles: selectedRoles },
      });
      setMessage("Roles updated successfully.");
      await load();
      setSelectedUser(null);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to update roles.");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (user: UserProfile) => {
    if (!currentUser) return;
    if (user.active) {
      await deactivateUser(user.uid);
      await logAudit({
        userId: currentUser.uid,
        userName: getUserDisplayName(currentUser),
        action: "User Deactivated",
        module: "User Management",
        details: { targetUser: user.uid },
      });
    } else {
      await activateUser(user.uid);
      await logAudit({
        userId: currentUser.uid,
        userName: getUserDisplayName(currentUser),
        action: "User Activated",
        module: "User Management",
        details: { targetUser: user.uid },
      });
    }
    await load();
  };

  const handleResetPassword = async (email: string) => {
    await resetPassword(email);
    setMessage(`Password reset email sent to ${email}`);
  };

  return (
    <DashboardLayout
      title="User Management"
      description="Assign roles, manage access, and control user accounts"
      requiredPermission="manage_users"
    >
      <div className="space-y-6">
        <div className="flex justify-end">
          <Button asChild>
            <Link href="/register">
              <UserPlus className="h-4 w-4 mr-2" />
              Create user account
            </Link>
          </Button>
        </div>

        {message && (
          <div className="rounded-lg border bg-muted/50 px-4 py-3 text-sm">{message}</div>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Users</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="space-y-3">
                {users.map((user) => (
                  <div
                    key={user.uid}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border p-4"
                  >
                    <div>
                      <p className="font-medium">{getUserDisplayName(user)}</p>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {user.roles.map((role) => (
                          <Badge key={role} variant="outline" className="text-xs">
                            {role}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant={user.active ? "default" : "secondary"}>
                        {user.active ? "Active" : "Inactive"}
                      </Badge>
                      <PermissionGate permission="manage_users">
                        <Button size="sm" variant="outline" onClick={() => openEditor(user)}>
                          <Shield className="h-4 w-4 mr-1" />
                          Roles
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleResetPassword(user.email)}
                        >
                          Reset Password
                        </Button>
                        {user.uid !== currentUser?.uid && (
                          <Button
                            size="sm"
                            variant={user.active ? "destructive" : "default"}
                            onClick={() => toggleActive(user)}
                          >
                            {user.active ? (
                              <>
                                <UserX className="h-4 w-4 mr-1" /> Deactivate
                              </>
                            ) : (
                              <>
                                <UserCheck className="h-4 w-4 mr-1" /> Activate
                              </>
                            )}
                          </Button>
                        )}
                      </PermissionGate>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {selectedUser && (
          <Card>
            <CardHeader>
              <CardTitle>Edit Roles — {getUserDisplayName(selectedUser)}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Select one or more roles. Permissions from all roles are merged automatically.
              </p>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {roles.map((role) => (
                  <label
                    key={role.id}
                    className="flex items-start gap-3 rounded-lg border p-3 cursor-pointer hover:bg-muted/50"
                  >
                    <input
                      type="checkbox"
                      checked={selectedRoles.includes(role.id)}
                      onChange={() => toggleRole(role.id)}
                      className="mt-1"
                    />
                    <div>
                      <p className="font-medium text-sm">{role.name}</p>
                      <p className="text-xs text-muted-foreground">{role.description}</p>
                    </div>
                  </label>
                ))}
              </div>
              <div className="flex gap-2">
                <Button onClick={saveRoles} disabled={saving || selectedRoles.length === 0}>
                  {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Save Roles
                </Button>
                <Button variant="outline" onClick={() => setSelectedUser(null)}>
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
