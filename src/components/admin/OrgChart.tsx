import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import {
  RefreshCw,
  Users,
  ChevronDown,
  ChevronRight,
  GripVertical,
  User,
  Crown,
  Shield,
  Building2,
  AlertCircle,
  Check,
  X,
  Edit,
  Trash2,
  MoreVertical
} from 'lucide-react';
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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { EditUserDialog } from './EditUserDialog';

interface OrgUser {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'internal' | 'external';
  avatar?: string;
  is_active?: boolean;
  reports_to?: string | null;
  directReportsCount: number;
  directReportIds: string[];
}

interface DragState {
  userId: string;
  userName: string;
}

interface DropConfirmation {
  userId: string;
  userName: string;
  newManagerId: string | null;
  newManagerName: string;
}

export const OrgChart: React.FC = () => {
  const [users, setUsers] = useState<OrgUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [rebuilding, setRebuilding] = useState(false);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [draggedUser, setDraggedUser] = useState<DragState | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const [dropConfirmation, setDropConfirmation] = useState<DropConfirmation | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<OrgUser | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState<OrgUser | null>(null);
  const { toast } = useToast();

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const { data: rawUsers, error } = await supabase
        .from('crm_users')
        .select('*')
        .order('name');

      if (error) throw error;

      const usersWithCounts: OrgUser[] = (rawUsers || []).map(user => {
        const directReportIds = (rawUsers || [])
          .filter(u => u.reports_to === user.id)
          .map(u => u.id);

        return {
          id: user.id,
          name: user.name || 'Unknown',
          email: user.email,
          role: user.role as 'admin' | 'internal' | 'external',
          avatar: user.avatar,
          is_active: user.is_active,
          reports_to: user.reports_to,
          directReportsCount: directReportIds.length,
          directReportIds
        };
      });

      setUsers(usersWithCounts);

      const expanded = new Set<string>();
      usersWithCounts.forEach((u: OrgUser) => {
        if (u.directReportsCount > 0) expanded.add(u.id);
      });
      setExpandedNodes(expanded);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const rebuildHierarchyTable = async () => {
    try {
      await supabase.from('user_hierarchy').delete().neq('id', '00000000-0000-0000-0000-000000000000');

      const hierarchyRecords: Array<{
        manager_id: string;
        subordinate_id: string;
        depth: number;
      }> = [];

      const findAllSubordinates = (managerId: string, depth: number) => {
        const directReports = users.filter(u => u.reports_to === managerId);
        directReports.forEach(subordinate => {
          hierarchyRecords.push({
            manager_id: managerId,
            subordinate_id: subordinate.id,
            depth
          });
          findAllSubordinates(subordinate.id, depth + 1);
        });
      };

      users.forEach(user => {
        if (user.directReportsCount > 0) {
          findAllSubordinates(user.id, 1);
        }
      });

      if (hierarchyRecords.length > 0) {
        const { error: insertError } = await supabase
          .from('user_hierarchy')
          .insert(hierarchyRecords);

        if (insertError) throw insertError;
      }

      return true;
    } catch (err) {
      throw err;
    }
  };

  const handleRebuildHierarchy = async () => {
    setRebuilding(true);
    try {
      await rebuildHierarchyTable();
      toast({ title: 'Success', description: 'Hierarchy table rebuilt successfully' });
      await fetchUsers();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setRebuilding(false);
    }
  };

  const handleUpdateManager = async (userId: string, newManagerId: string | null) => {
    try {
      if (newManagerId === userId) {
        throw new Error('Cannot assign user as their own manager');
      }

      const user = users.find(u => u.id === userId);
      if (!user) {
        throw new Error('User not found');
      }

      if (newManagerId) {
        const isSubordinate = (checkUserId: string, potentialSubordinateId: string): boolean => {
          const directReports = users.filter(u => u.reports_to === checkUserId);
          if (directReports.some(r => r.id === potentialSubordinateId)) return true;
          return directReports.some(r => isSubordinate(r.id, potentialSubordinateId));
        };

        if (isSubordinate(userId, newManagerId)) {
          throw new Error('Cannot create circular reporting relationship');
        }
      }

      const { error } = await supabase
        .from('crm_users')
        .update({ reports_to: newManagerId })
        .eq('id', userId);

      if (error) throw error;

      await rebuildHierarchyTable();

      toast({ title: 'Success', description: 'Manager updated successfully' });
      await fetchUsers();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const toggleExpand = (userId: string) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  };

  const handleDragStart = (e: React.DragEvent, user: OrgUser) => {
    setDraggedUser({ userId: user.id, userName: user.name });
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', user.id);
  };

  const handleDragOver = (e: React.DragEvent, targetId: string | null) => {
    e.preventDefault();
    if (draggedUser && draggedUser.userId !== targetId) {
      setDropTarget(targetId);
      e.dataTransfer.dropEffect = 'move';
    }
  };

  const handleDragLeave = () => {
    setDropTarget(null);
  };

  const handleDrop = (e: React.DragEvent, targetUser: OrgUser | null) => {
    e.preventDefault();
    if (!draggedUser) return;

    const targetId = targetUser?.id || null;
    const targetName = targetUser?.name || 'No Manager (Top Level)';

    if (targetId === draggedUser.userId) {
      setDraggedUser(null);
      setDropTarget(null);
      return;
    }

    setDropConfirmation({
      userId: draggedUser.userId,
      userName: draggedUser.userName,
      newManagerId: targetId,
      newManagerName: targetName
    });

    setDraggedUser(null);
    setDropTarget(null);
  };

  const handleDragEnd = () => {
    setDraggedUser(null);
    setDropTarget(null);
  };

  const confirmManagerChange = async () => {
    if (!dropConfirmation) return;
    await handleUpdateManager(dropConfirmation.userId, dropConfirmation.newManagerId);
    setDropConfirmation(null);
  };

  const handleEditUser = (user: OrgUser) => {
    setSelectedUser(user);
    setEditDialogOpen(true);
  };

  const deleteUser = async (user: OrgUser) => {
    try {
      const { error } = await supabase
        .from('crm_users')
        .delete()
        .eq('id', user.id);

      if (error) throw error;

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

  const topLevelUsers = users.filter(u => !u.reports_to);

  const getDirectReports = (managerId: string) => {
    return users.filter(u => u.reports_to === managerId);
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin': return <Crown className="w-3 h-3" />;
      case 'internal': return <Shield className="w-3 h-3" />;
      default: return <Building2 className="w-3 h-3" />;
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-700 border-red-200';
      case 'internal': return 'bg-orange-100 text-orange-700 border-orange-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const OrgNode: React.FC<{ user: OrgUser; depth: number }> = ({ user, depth }) => {
    const directReports = getDirectReports(user.id);
    const hasReports = directReports.length > 0;
    const isExpanded = expandedNodes.has(user.id);
    const isDragging = draggedUser?.userId === user.id;
    const isDropTarget = dropTarget === user.id;

    return (
      <div className="relative">
        {depth > 0 && (
          <div className="absolute left-6 -top-4 w-px h-4 bg-gray-300" />
        )}

        <div
          draggable
          onDragStart={(e) => handleDragStart(e, user)}
          onDragOver={(e) => handleDragOver(e, user.id)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, user)}
          onDragEnd={handleDragEnd}
          className={`
            relative flex items-center gap-3 p-3 rounded-lg border-2 transition-all cursor-grab active:cursor-grabbing
            ${isDragging ? 'opacity-50 border-dashed border-orange-400 bg-orange-50' : 'bg-white border-gray-200'}
            ${isDropTarget ? 'border-orange-500 bg-orange-50 shadow-lg scale-[1.02]' : ''}
            ${!user.is_active ? 'opacity-60' : ''}
            hover:shadow-md hover:border-orange-300
          `}
        >
          <GripVertical className="w-4 h-4 text-gray-400 flex-shrink-0" />

          {hasReports ? (
            <button
              onClick={() => toggleExpand(user.id)}
              className="p-1 hover:bg-gray-100 rounded transition-colors"
            >
              {isExpanded ? (
                <ChevronDown className="w-4 h-4 text-gray-600" />
              ) : (
                <ChevronRight className="w-4 h-4 text-gray-600" />
              )}
            </button>
          ) : (
            <div className="w-6" />
          )}

          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-semibold flex-shrink-0">
            {user.avatar ? (
              <img src={user.avatar} alt={user.name} className="w-full h-full rounded-full object-cover" />
            ) : (
              user.name.charAt(0).toUpperCase()
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-900 truncate">{user.name}</span>
              {!user.is_active && (
                <Badge variant="outline" className="text-xs bg-gray-100 text-gray-500">Inactive</Badge>
              )}
            </div>
            <p className="text-sm text-gray-500 truncate">{user.email}</p>
          </div>

          <Badge className={`flex items-center gap-1 ${getRoleBadgeColor(user.role)}`}>
            {getRoleIcon(user.role)}
            <span className="capitalize">{user.role}</span>
          </Badge>

          {hasReports && (
            <div className="flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">
              <Users className="w-3 h-3" />
              <span>{directReports.length}</span>
            </div>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 flex-shrink-0"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  handleEditUser(user);
                }}
                className="flex items-center gap-2"
              >
                <Edit className="w-4 h-4" />
                Edit User
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  setDeleteConfirmation(user);
                }}
                className="flex items-center gap-2 text-red-600"
              >
                <Trash2 className="w-4 h-4" />
                Delete User
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {hasReports && isExpanded && (
          <div className="ml-8 mt-2 space-y-2 relative">
            <div className="absolute left-6 top-0 bottom-4 w-px bg-gray-300" />

            {directReports.map((report) => (
              <div key={report.id} className="relative">
                <div className="absolute left-0 top-6 w-6 h-px bg-gray-300" />
                <div className="ml-6">
                  <OrgNode user={report} depth={depth + 1} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-6 h-6 animate-spin text-orange-500" />
        <span className="ml-2 text-gray-500">Loading organization chart...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Building2 className="w-5 h-5 text-orange-500" />
            Organization Chart
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            Drag and drop users to reassign their manager. Changes automatically update the hierarchy table.
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
            onClick={handleRebuildHierarchy}
            disabled={rebuilding}
            className="bg-orange-500 hover:bg-orange-600"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${rebuilding ? 'animate-spin' : ''}`} />
            Rebuild Hierarchy
          </Button>
        </div>
      </div>

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
            <div className="p-2 bg-orange-100 rounded-lg">
              <Crown className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{topLevelUsers.length}</p>
              <p className="text-xs text-gray-500">Top Level</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <User className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{users.filter(u => u.directReportsCount > 0).length}</p>
              <p className="text-xs text-gray-500">Managers</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Shield className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{users.filter(u => u.role === 'admin').length}</p>
              <p className="text-xs text-gray-500">Admins</p>
            </div>
          </div>
        </Card>
      </div>

      <div
        onDragOver={(e) => handleDragOver(e, null)}
        onDragLeave={handleDragLeave}
        onDrop={(e) => handleDrop(e, null)}
        className={`
          p-4 border-2 border-dashed rounded-lg transition-all
          ${dropTarget === null && draggedUser ? 'border-orange-500 bg-orange-50' : 'border-gray-300 bg-gray-50'}
        `}
      >
        <div className="flex items-center justify-center gap-2 text-gray-500">
          <AlertCircle className="w-4 h-4" />
          <span className="text-sm">Drop here to make user top-level (no manager)</span>
        </div>
      </div>

      <Card className="p-6">
        <div className="space-y-3">
          {topLevelUsers.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No users found. Add users to see the organization chart.</p>
            </div>
          ) : (
            topLevelUsers.map((user) => (
              <OrgNode key={user.id} user={user} depth={0} />
            ))
          )}
        </div>
      </Card>

      <EditUserDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onSuccess={fetchUsers}
        user={selectedUser}
        users={users}
      />

      <AlertDialog open={!!dropConfirmation} onOpenChange={() => setDropConfirmation(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Manager Change</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to change <strong>{dropConfirmation?.userName}</strong>'s manager to{' '}
              <strong>{dropConfirmation?.newManagerName}</strong>?
              <br /><br />
              This will update the reporting structure and rebuild the hierarchy table.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="flex items-center gap-2">
              <X className="w-4 h-4" />
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmManagerChange}
              className="bg-orange-500 hover:bg-orange-600 flex items-center gap-2"
            >
              <Check className="w-4 h-4" />
              Confirm Change
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
