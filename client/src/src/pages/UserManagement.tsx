import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Shield, User, Trash2, ChevronUp, ChevronDown, Plus, ArrowLeft } from "lucide-react";
import { useState } from "react";
import { getLoginUrl } from "@/const";

export default function UserManagement() {
  const { user, loading } = useAuth();
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [actionType, setActionType] = useState<"promote" | "demote" | "delete" | "edit" | "add" | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [editForm, setEditForm] = useState({ name: "", email: "" });
  const [addForm, setAddForm] = useState({ name: "", email: "", role: "user" });

  // Fetch users
  const { data, isLoading, refetch } = trpc.users.listUsers.useQuery(undefined, {
    enabled: !!user && user.role === "admin",
  });

  // Mutations
  const promoteUser = trpc.users.promoteToAdmin.useMutation({
    onSuccess: () => {
      refetch();
      setSelectedUser(null);
      setActionType(null);
    },
  });

  const demoteUser = trpc.users.demoteToUser.useMutation({
    onSuccess: () => {
      refetch();
      setSelectedUser(null);
      setActionType(null);
    },
  });

  const deleteUserMutation = trpc.users.deleteUser.useMutation({
    onSuccess: () => {
      refetch();
      setSelectedUser(null);
      setActionType(null);
    },
  });

  const updateUserMutation = trpc.users.updateUser.useMutation({
    onSuccess: () => {
      refetch();
      setSelectedUser(null);
      setActionType(null);
      setEditForm({ name: "", email: "" });
    },
  });

  const createUserMutation = trpc.users.createUser.useMutation({
    onSuccess: () => {
      refetch();
      setActionType(null);
      setAddForm({ name: "", email: "", role: "user" });
    },
  });

  // Gate: must be logged in as admin
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="animate-spin w-6 h-6 text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
        <p className="text-muted-foreground text-sm">You must be signed in to view this page.</p>
        <Button asChild>
          <a href={getLoginUrl()}>Sign in</a>
        </Button>
      </div>
    );
  }

  if (user.role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground text-sm">Access denied — admin only.</p>
      </div>
    );
  }

  const users_list = data?.users ?? [];
  const sorted = [...users_list].sort((a, b) => {
    const ta = new Date(a.createdAt).getTime();
    const tb = new Date(b.createdAt).getTime();
    return sortDir === "desc" ? tb - ta : ta - tb;
  });

  const handlePromote = async () => {
    if (selectedUser) {
      await promoteUser.mutateAsync({ userId: selectedUser.id });
    }
  };

  const handleDemote = async () => {
    if (selectedUser) {
      await demoteUser.mutateAsync({ userId: selectedUser.id });
    }
  };

  const handleDelete = async () => {
    if (selectedUser) {
      await deleteUserMutation.mutateAsync({ userId: selectedUser.id });
    }
  };

  const handleUpdate = async () => {
    if (selectedUser && (editForm.name || editForm.email)) {
      await updateUserMutation.mutateAsync({
        userId: selectedUser.id,
        name: editForm.name || undefined,
        email: editForm.email || undefined,
      });
    }
  };

  const handleCreate = async () => {
    if (addForm.name && addForm.email) {
      await createUserMutation.mutateAsync({
        name: addForm.name,
        email: addForm.email,
        role: addForm.role as "user" | "admin",
      });
    }
  };

  const openEditDialog = (u: any) => {
    setSelectedUser(u);
    setEditForm({ name: u.name || "", email: u.email || "" });
    setActionType("edit");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              asChild
              className="gap-2 text-muted-foreground"
            >
              <a href="/admin">
                <ArrowLeft className="w-4 h-4" />
                Back
              </a>
            </Button>
            <Button
              variant="outline"
              size="sm"
              asChild
            >
              <a href="https://www.saffhire.com" target="_blank" rel="noopener noreferrer">
                Back to Website
              </a>
            </Button>
            <div className="h-5 w-px bg-border" />
            <span className="text-sm font-semibold text-foreground">User Management</span>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={() => setActionType("add")}
              className="gap-2"
            >
              <Plus className="w-4 h-4" />
              Add User
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isLoading}
            >
              Refresh
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          {[
            {
              label: "Total Users",
              value: users_list.length,
              color: "text-foreground",
            },
            {
              label: "Admins",
              value: users_list.filter((u) => u.role === "admin").length,
              color: "text-amber-600",
            },
          ].map((s) => (
            <div
              key={s.label}
              className="bg-card border border-border rounded-xl p-5"
            >
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                {s.label}
              </p>
              <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Users Table */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="animate-spin w-6 h-6 text-muted-foreground" />
            </div>
          ) : sorted.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <p className="text-sm">No users found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                      Name
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                      Email
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                      Role
                    </th>
                    <th
                      className="text-left px-4 py-3 font-medium text-muted-foreground cursor-pointer select-none hover:text-foreground transition-colors"
                      onClick={() => setSortDir((d) => (d === "desc" ? "asc" : "desc"))}
                    >
                      <span className="flex items-center gap-1">
                        Joined
                        {sortDir === "desc" ? (
                          <ChevronDown className="w-3 h-3" />
                        ) : (
                          <ChevronUp className="w-3 h-3" />
                        )}
                      </span>
                    </th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((u, i) => (
                    <tr
                      key={u.id}
                      className={`border-b border-border last:border-0 hover:bg-muted/20 transition-colors cursor-pointer ${
                        i % 2 === 0 ? "" : "bg-muted/10"
                      }`}
                      onClick={() => setSelectedUser(u)}
                    >
                      <td className="px-4 py-3 font-medium text-foreground">
                        {u.name || "—"}
                      </td>
                      <td className="px-4 py-3 text-foreground">
                        {u.email ? (
                          <a
                            href={`mailto:${u.email}`}
                            className="text-primary hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {u.email}
                          </a>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant="outline"
                          className={
                            u.role === "admin"
                              ? "bg-amber-50 text-amber-700 border-amber-200"
                              : "bg-slate-50 text-slate-700 border-slate-200"
                          }
                        >
                          {u.role === "admin" ? (
                            <Shield className="w-3 h-3 mr-1" />
                          ) : (
                            <User className="w-3 h-3 mr-1" />
                          )}
                          {u.role === "admin" ? "Admin" : "User"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditDialog(u);
                          }}
                        >
                          Edit
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Add User Dialog */}
      {actionType === "add" && (
        <Dialog open onOpenChange={() => setActionType(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New User</DialogTitle>
              <DialogDescription>
                Create a new user account with initial role assignment.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground">Name</label>
                <Input
                  placeholder="Full name"
                  value={addForm.name}
                  onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                  className="mt-1"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-foreground">Email</label>
                <Input
                  type="email"
                  placeholder="user@example.com"
                  value={addForm.email}
                  onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                  className="mt-1"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-foreground">Role</label>
                <Select value={addForm.role} onValueChange={(value) => setAddForm({ ...addForm, role: value })}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-3 justify-end pt-4">
                <Button variant="outline" onClick={() => setActionType(null)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleCreate}
                  disabled={createUserMutation.isPending || !addForm.name || !addForm.email}
                >
                  {createUserMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : null}
                  Create User
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Edit User Dialog */}
      {actionType === "edit" && selectedUser && (
        <Dialog open onOpenChange={() => setActionType(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit User</DialogTitle>
              <DialogDescription>
                Update user information and role.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground">Name</label>
                <Input
                  placeholder="Full name"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="mt-1"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-foreground">Email</label>
                <Input
                  type="email"
                  placeholder="user@example.com"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className="mt-1"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-foreground">Role</label>
                <div className="mt-1 p-2 bg-muted rounded border border-border">
                  <Badge
                    variant="outline"
                    className={
                      selectedUser.role === "admin"
                        ? "bg-amber-50 text-amber-700 border-amber-200"
                        : "bg-slate-50 text-slate-700 border-slate-200"
                    }
                  >
                    {selectedUser.role === "admin" ? (
                      <Shield className="w-3 h-3 mr-1" />
                    ) : (
                      <User className="w-3 h-3 mr-1" />
                    )}
                    {selectedUser.role === "admin" ? "Admin" : "User"}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Use the Manage button below to change role
                </p>
              </div>

              <div className="flex gap-3 justify-end pt-4">
                <Button variant="outline" onClick={() => setActionType(null)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleUpdate}
                  disabled={updateUserMutation.isPending || (!editForm.name && !editForm.email)}
                >
                  {updateUserMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : null}
                  Save Changes
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* User Management Dialog */}
      {actionType === null && selectedUser && (
        <Dialog open={!!selectedUser} onOpenChange={() => setSelectedUser(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Manage User</DialogTitle>
              <DialogDescription>
                {selectedUser.name || selectedUser.email || "User"}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Name</p>
                  <p className="font-medium">{selectedUser.name || "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Email</p>
                  <p className="font-medium">{selectedUser.email || "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Role</p>
                  <p className="font-medium capitalize">{selectedUser.role}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Joined</p>
                  <p className="font-medium">
                    {new Date(selectedUser.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div className="border-t border-border pt-4 space-y-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => openEditDialog(selectedUser)}
                >
                  Edit Information
                </Button>

                {selectedUser.id !== user?.id && (
                  <>
                    {selectedUser.role === "user" ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => setActionType("promote")}
                      >
                        <ChevronUp className="w-4 h-4 mr-2" />
                        Promote to Admin
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => setActionType("demote")}
                      >
                        <ChevronDown className="w-4 h-4 mr-2" />
                        Demote to User
                      </Button>
                    )}

                    <Button
                      variant="destructive"
                      size="sm"
                      className="w-full"
                      onClick={() => setActionType("delete")}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete User
                    </Button>
                  </>
                )}
                {selectedUser.id === user?.id && (
                  <p className="text-xs text-muted-foreground text-center py-2">
                    You cannot modify your own account
                  </p>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Confirm Dialogs */}
      {actionType === "promote" && selectedUser && (
        <AlertDialog open onOpenChange={() => setActionType(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Promote to Admin?</AlertDialogTitle>
              <AlertDialogDescription>
                {selectedUser.name || selectedUser.email} will be promoted to admin and can manage
                users and submissions.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="flex gap-3 justify-end">
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handlePromote}
                disabled={promoteUser.isPending}
              >
                {promoteUser.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : null}
                Promote
              </AlertDialogAction>
            </div>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {actionType === "demote" && selectedUser && (
        <AlertDialog open onOpenChange={() => setActionType(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Demote to User?</AlertDialogTitle>
              <AlertDialogDescription>
                {selectedUser.name || selectedUser.email} will be demoted and lose admin access.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="flex gap-3 justify-end">
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDemote}
                disabled={demoteUser.isPending}
              >
                {demoteUser.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : null}
                Demote
              </AlertDialogAction>
            </div>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {actionType === "delete" && selectedUser && (
        <AlertDialog open onOpenChange={() => setActionType(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete User?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete {selectedUser.name || selectedUser.email} and cannot
                be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="flex gap-3 justify-end">
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                disabled={deleteUserMutation.isPending}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleteUserMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : null}
                Delete
              </AlertDialogAction>
            </div>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
