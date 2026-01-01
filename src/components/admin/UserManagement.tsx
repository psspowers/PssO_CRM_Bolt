import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { UserRole } from '@/types/crm';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { User, MoreVertical, Network, Users, RefreshCw, Briefcase, UserPlus, Trash2, Edit, UserX, UserCheck } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { Card } from '@/components/ui/card';
import { CreateUserDialog } from './CreateUserDialog';
import { EditUserDialog } from './EditUserDialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface CRMUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  is_active?: boolean;
  created_at?: string;
  reports_to?: string | null; // Read-only display - managed via OrgChart
}

export const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<CRMUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<CRMUser | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState<CRMUser | null>(null);
  const { profile } = useAuth();
  const { toast } = useToast();

  const fetchUsers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('crm_users')
      .select('*')
      .order('name', { ascending: true });
    
    if (error) {
      toast({ title: 'Error', description: 'Failed to fetch users', variant: 'destructive' });
    }
    if (data) setUsers(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Update user role
  const updateRole = async (userId: string, role: UserRole) => {
    const { error } = await supabase
      .from('crm_users')
      .update({ role })
      .eq('id', userId);

    if (!error) {
      setUsers(u => u.map(usr => usr.id === userId ? { ...usr, role } : usr));
      toast({ title: 'Role updated', description: `User role changed to ${role}` });
    } else {
      toast({ title: 'Error', description: 'Failed to update role', variant: 'destructive' });
    }
  };

  // Toggle user active status
  const toggleActive = async (userId: string, isActive: boolean) => {
    const { error } = await supabase
      .from('crm_users')
      .update({ is_active: isActive })
      .eq('id', userId);

    if (!error) {
      setUsers(u => u.map(user => user.id === userId ? { ...user, is_active: isActive } : user));
      toast({ title: isActive ? 'User activated' : 'User deactivated' });
    } else {
      toast({ title: 'Error', description: 'Failed to update user status', variant: 'destructive' });
    }
  };

  // Delete user
  const deleteUser = async (user: CRMUser) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      const { data, error } = await supabase.functions.invoke('delete-user', {
        body: { user_id: user.id },
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (error) throw error;
      if (data && !data.success) {
        throw new Error(data.error || 'Failed to delete user');
      }

      toast({
        title: 'User Deleted',
        description: `${user.name} has been removed from the system`
      });

      await fetchUsers();
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message || 'Failed to delete user',
        variant: 'destructive'
      });
    } finally {
      setDeleteConfirmation(null);
    }
  };

  // Handle edit user
  const handleEditUser = (user: CRMUser) => {
    setSelectedUser(user);
    setEditDialogOpen(true);
  };

  // Get manager name by ID (read-only display)
  const getManagerName = (managerId: string | null | undefined): string => {
    if (!managerId) return 'None (Top Level)';
    const manager = users.find(u => u.id === managerId);
    return manager?.name || 'Unknown';
  };

  // Count direct reports for a user (read-only display)
  const getDirectReportsCount = (userId: string): number => {
    return users.filter(u => u.reports_to === userId).length;
  };

  const roleColors: Record<UserRole, string> = {
    admin: 'bg-red-100 text-red-700 border-red-200',
    internal: 'bg-orange-100 text-orange-700 border-orange-200',
    external: 'bg-gray-100 text-gray-700 border-gray-200'
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-gray-500 flex items-center justify-center gap-2">
        <RefreshCw className="w-5 h-5 animate-spin" />
        Loading users...
      </div>
    );
  }

  // Calculate stats
  const activeUsers = users.filter(u => u.is_active !== false).length;
  const managersCount = users.filter(u => getDirectReportsCount(u.id) > 0).length;
  const topLevelCount = users.filter(u => !u.reports_to).length;

  return (
    <div className="space-y-6">
      {/* Header with actions */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Users className="w-5 h-5 text-orange-500" />
            User Management ({users.length})
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            Manage user roles and status. Use the <strong>Org Chart</strong> tab to manage reporting structure.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={fetchUsers}
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            onClick={() => setCreateDialogOpen(true)}
            className="bg-orange-500 hover:bg-orange-600"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Add User
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{users.length}</p>
              <p className="text-xs text-gray-500">Total Users</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <User className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{activeUsers}</p>
              <p className="text-xs text-gray-500">Active Users</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Briefcase className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{managersCount}</p>
              <p className="text-xs text-gray-500">Managers</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Network className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{topLevelCount}</p>
              <p className="text-xs text-gray-500">Top Level</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Info Banner - Points to Org Chart */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Network className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-blue-800">Managing the Organization Hierarchy</p>
            <p className="text-xs text-blue-600 mt-1">
              To change reporting relationships (who reports to whom), use the <strong>Org Chart</strong> tab above.
              Drag and drop users to reassign managers. Changes automatically update the hierarchy table used for RLS permissions.
            </p>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg border overflow-hidden">
        {/* Table Header */}
        <div className="bg-gray-50 border-b px-4 py-3 grid grid-cols-12 gap-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
          <div className="col-span-4">User</div>
          <div className="col-span-2">Role</div>
          <div className="col-span-3">Reports To</div>
          <div className="col-span-2">Direct Reports</div>
          <div className="col-span-1 text-right">Actions</div>
        </div>

        {/* Table Body */}
        <div className="divide-y">
          {users.map(user => {
            const directReports = getDirectReportsCount(user.id);
            const isInactive = user.is_active === false;
            
            return (
              <div 
                key={user.id} 
                className={`px-4 py-4 grid grid-cols-12 gap-4 items-center hover:bg-gray-50 transition-colors ${isInactive ? 'opacity-60 bg-gray-50' : ''}`}
              >
                {/* User Info */}
                <div className="col-span-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-semibold flex-shrink-0">
                    {user.avatar ? (
                      <img src={user.avatar} alt={user.name} className="w-10 h-10 rounded-full object-cover" />
                    ) : (
                      user.name.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-900 truncate">{user.name}</p>
                      {isInactive && (
                        <Badge variant="outline" className="text-xs bg-gray-100 text-gray-500">
                          Inactive
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 truncate">{user.email}</p>
                  </div>
                </div>

                {/* Role Select */}
                <div className="col-span-2">
                  <Select 
                    value={user.role} 
                    onValueChange={(v) => updateRole(user.id, v as UserRole)}
                  >
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">
                        <span className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-red-500" />
                          Admin
                        </span>
                      </SelectItem>
                      <SelectItem value="internal">
                        <span className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-orange-500" />
                          Internal
                        </span>
                      </SelectItem>
                      <SelectItem value="external">
                        <span className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-gray-500" />
                          External
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Reports To - READ ONLY (managed via OrgChart) */}
                <div className="col-span-3">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Briefcase className="w-4 h-4 text-gray-400" />
                    <span className="truncate">{getManagerName(user.reports_to)}</span>
                  </div>
                  <p className="text-[10px] text-gray-400 mt-0.5 ml-6">
                    Edit in Org Chart
                  </p>
                </div>

                {/* Direct Reports Count */}
                <div className="col-span-2">
                  {directReports > 0 ? (
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">
                        <Users className="w-3 h-3" />
                        <span>{directReports}</span>
                      </div>
                      <span className="text-xs text-gray-500">
                        {directReports === 1 ? 'report' : 'reports'}
                      </span>
                    </div>
                  ) : (
                    <span className="text-xs text-gray-400">No direct reports</span>
                  )}
                </div>

                {/* Actions */}
                <div className="col-span-1 flex items-center justify-end">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => handleEditUser(user)}
                        className="flex items-center gap-2"
                      >
                        <Edit className="w-4 h-4" />
                        Edit User
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => toggleActive(user.id, !(user.is_active ?? true))}
                        className="flex items-center gap-2"
                      >
                        {user.is_active !== false ? (
                          <>
                            <UserX className="w-4 h-4" />
                            Deactivate User
                          </>
                        ) : (
                          <>
                            <UserCheck className="w-4 h-4" />
                            Activate User
                          </>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => setDeleteConfirmation(user)}
                        className="flex items-center gap-2 text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete User
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer Note */}
      <div className="text-xs text-gray-500 text-center bg-gray-50 rounded-lg p-4">
        <p>
          <strong>Role changes</strong> are saved immediately.
          To change <strong>reporting relationships</strong>, use the <strong>Org Chart</strong> tab for drag-and-drop editing.
        </p>
        <p className="mt-1 text-gray-400">
          The org hierarchy determines data visibility through RLS policies (managers can see their team's deals).
        </p>
      </div>

      <CreateUserDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={fetchUsers}
        users={users}
      />

      <EditUserDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onSuccess={fetchUsers}
        user={selectedUser}
        users={users}
      />

      <AlertDialog open={!!deleteConfirmation} onOpenChange={() => setDeleteConfirmation(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deleteConfirmation?.name}</strong> ({deleteConfirmation?.email})?
              <br /><br />
              <span className="text-red-600 font-medium">
                This action cannot be undone. All data associated with this user will be permanently removed.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirmation && deleteUser(deleteConfirmation)}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
