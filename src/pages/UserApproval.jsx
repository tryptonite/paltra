
import React, { useState, useEffect } from 'react';
import { User } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserCheck, UserX, Clock, CheckCircle2, Mail, Building, Users, Settings } from 'lucide-react';
import moment from 'moment';
import { useToast } from "@/components/ui/use-toast";

const DEPARTMENTS = ['P&S', 'AVD', '95', 'General'];
const ROLES = ['user', 'admin'];

const formatInEST = (dateString) => {
    const date = moment.utc(dateString).utcOffset(-4);
    return date.format('M/D/YY, h:mm A');
};

export default function UserApprovalPage() {
  const [currentUser, setCurrentUser] = useState(null);
  const [pendingUsers, setPendingUsers] = useState([]);
  const [approvedUsers, setApprovedUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [actionType, setActionType] = useState(null); // 'approve', 'reject', 'revoke', or 'update'
  const [editingUser, setEditingUser] = useState(null);
  const { toast } = useToast();

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const user = await User.me();
        setCurrentUser(user);
        
        if (user.role !== 'admin') {
          setIsLoading(false);
          return;
        }

        const allUsers = await User.list('-created_date');
        
        // Filter for pending users (is_approved is false, null, or undefined)
        const pending = allUsers.filter(u => !u.is_approved && u.id !== user.id);
        setPendingUsers(pending);
        
        // Filter for approved users (is_approved is explicitly true)
        const approved = allUsers.filter(u => u.is_approved === true && u.id !== user.id);
        setApprovedUsers(approved.slice(0, 20)); // Show last 20 approved users
        
      } catch (e) {
        console.error("Failed to load users", e);
      }
      setIsLoading(false);
    };
    loadData();
  }, []);

  const handleAction = (user, action) => {
    setSelectedUser(user);
    setActionType(action);
    if (action === 'update') {
      setEditingUser({
        ...user,
        department: user.department || 'General',
        role: user.role || 'user'
      });
    }
    setShowConfirm(true);
  };

  const confirmAction = async () => {
    if (!selectedUser || !actionType) return;
    
    setIsLoading(true);
    setShowConfirm(false);

    try {
      if (actionType === 'approve') {
        // Include all required fields when updating the user
        await User.update(selectedUser.id, { 
          is_approved: true,
          role: selectedUser.role || 'user',
          email: selectedUser.email,
          full_name: selectedUser.full_name || '',
          department: selectedUser.department || 'General',
          company: selectedUser.company || 'Legrand-FM'
        });
        toast({
          title: 'User Approved',
          description: `${selectedUser.full_name || selectedUser.email} has been granted access to the portal.`,
        });
      } else if (actionType === 'reject') {
        // For rejection, we could either delete the user or set a rejection flag
        // For now, we'll just remove them from the system
        await User.delete(selectedUser.id);
        toast({
          title: 'User Rejected',
          description: `${selectedUser.full_name || selectedUser.email} has been removed from the system.`,
          variant: 'destructive',
        });
      } else if (actionType === 'revoke') {
        // Revoke access by setting is_approved to false
        await User.update(selectedUser.id, {
          is_approved: false,
          department: selectedUser.department,
          role: selectedUser.role,
          email: selectedUser.email,
          full_name: selectedUser.full_name || '',
          company: selectedUser.company || 'Legrand-FM'
        });
        toast({
          title: 'Access Revoked',
          description: `${selectedUser.full_name || selectedUser.email}'s access to the portal has been revoked.`,
          variant: 'destructive',
        });
      } else if (actionType === 'update' && editingUser) {
        // Update user department and role
        await User.update(selectedUser.id, {
          department: editingUser.department,
          role: editingUser.role,
          email: selectedUser.email,
          full_name: selectedUser.full_name || '',
          company: selectedUser.company || 'Legrand-FM',
          is_approved: selectedUser.is_approved
        });
        toast({
          title: 'User Updated',
          description: `${selectedUser.full_name || selectedUser.email}'s department and role have been updated.`,
        });
      }
      
      // Reload data
      const allUsers = await User.list('-created_date');
      const pending = allUsers.filter(u => !u.is_approved && u.id !== currentUser.id);
      setPendingUsers(pending);
      const approved = allUsers.filter(u => u.is_approved === true && u.id !== currentUser.id);
      setApprovedUsers(approved.slice(0, 20));
      
    } catch (error) {
      console.error(`Failed to ${actionType} user`, error);
      toast({
        title: 'Error',
        description: `Failed to ${actionType} user. Please try again.`,
        variant: 'destructive',
      });
    }
    
    setSelectedUser(null);
    setActionType(null);
    setEditingUser(null);
    setIsLoading(false);
  };

  if (currentUser?.role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <UserX className="w-16 h-16 text-slate-400 mb-4" />
        <h2 className="text-xl font-semibold text-slate-600">Access Denied</h2>
        <p className="text-slate-500">You must be an administrator to access this page.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">User Approval</h1>
          <p className="text-slate-600">Manage user access to the portal</p>
        </div>
        <div className="flex items-center gap-4 text-sm text-slate-600">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            <span>{pendingUsers.length} pending</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>{approvedUsers.length} approved</span>
          </div>
        </div>
      </div>

      {/* Pending Users */}
      <Card className="border-yellow-200 bg-yellow-50/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-yellow-800">
            <Clock className="w-5 h-5" />
            Pending Approval ({pendingUsers.length})
          </CardTitle>
          <CardDescription className="text-yellow-700">
            Users waiting for administrator approval to access the portal
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading...</div>
          ) : pendingUsers.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              No users pending approval
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingUsers.map((user) => (
                    <TableRow key={user.id} className="bg-white/60">
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center text-sm font-medium">
                            {user.full_name ? user.full_name[0].toUpperCase() : user.email[0].toUpperCase()}
                          </div>
                          {user.full_name || 'New User'}
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-600">{user.email}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{user.department}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          className={user.role === 'admin' 
                            ? "bg-primary text-primary-foreground" 
                            : "bg-secondary text-secondary-foreground"
                          }
                        >
                          {user.role || 'user'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-slate-600">{user.company}</TableCell>
                      <TableCell className="text-slate-500 text-sm">
                        {formatInEST(user.created_date)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center gap-2 justify-end">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleAction(user, 'update')}
                            className="text-blue-600 border-blue-600 hover:bg-blue-50"
                          >
                            <Settings className="w-4 h-4 mr-1" />
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleAction(user, 'approve')}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <UserCheck className="w-4 h-4 mr-1" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleAction(user, 'reject')}
                          >
                            <UserX className="w-4 h-4 mr-1" />
                            Reject
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recently Approved Users */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-800">
            <CheckCircle2 className="w-5 h-5" />
            Recently Approved Users
          </CardTitle>
          <CardDescription>
            Last 20 users that have been approved for portal access
          </CardDescription>
        </CardHeader>
        <CardContent>
          {approvedUsers.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              No approved users yet
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {approvedUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-sm font-medium text-green-700">
                            {user.full_name ? user.full_name[0].toUpperCase() : user.email[0].toUpperCase()}
                          </div>
                          {user.full_name || 'User'}
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-600">{user.email}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{user.department}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          className={user.role === 'admin' 
                            ? "bg-primary text-primary-foreground" 
                            : "bg-secondary text-secondary-foreground"
                          }
                        >
                          {user.role || 'user'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-slate-600">{user.company}</TableCell>
                      <TableCell>
                        <Badge className="bg-green-100 text-green-800">Approved</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleAction(user, 'update')}
                          className="text-blue-600 border-blue-600 hover:bg-blue-50"
                        >
                          <Settings className="w-4 h-4 mr-1" />
                          Edit
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === 'approve' ? 'Approve User Access' : 
               actionType === 'reject' ? 'Reject User Access' :
               actionType === 'revoke' ? 'Revoke User Access' :
               'Update User Details'}
            </DialogTitle>
            <DialogDescription>
              {actionType === 'approve' 
                ? `Grant ${selectedUser?.full_name || selectedUser?.email} access to the portal?`
                : actionType === 'reject'
                ? `Remove ${selectedUser?.full_name || selectedUser?.email} from the system? This action cannot be undone.`
                : actionType === 'revoke'
                ? `Revoke ${selectedUser?.full_name || selectedUser?.email}'s access to the portal? They will no longer be able to log in.`
                : `Update department and role for ${selectedUser?.full_name || selectedUser?.email}?`
              }
            </DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="py-4 space-y-3">
              <div className="flex justify-between">
                <span className="font-medium">Name:</span>
                <span>{selectedUser.full_name || 'Not provided'}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Email:</span>
                <span>{selectedUser.email}</span>
              </div>
              {actionType === 'update' && editingUser ? (
                <>
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Department:</span>
                    <Select 
                      value={editingUser.department} 
                      onValueChange={(value) => setEditingUser({...editingUser, department: value})}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DEPARTMENTS.map(dept => (
                          <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Role:</span>
                    <Select 
                      value={editingUser.role} 
                      onValueChange={(value) => setEditingUser({...editingUser, role: value})}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ROLES.map(role => (
                          <SelectItem key={role} value={role}>
                            {role === 'admin' ? 'Administrator' : 'User'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="pt-4 border-t border-slate-200">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        setActionType('revoke');
                        setEditingUser(null);
                      }}
                      className="w-full"
                    >
                      <UserX className="w-4 h-4 mr-2" />
                      Revoke Access
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex justify-between">
                    <span className="font-medium">Department:</span>
                    <span>{selectedUser.department}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Role:</span>
                    <span>{selectedUser.role || 'user'}</span>
                  </div>
                </>
              )}
              <div className="flex justify-between">
                <span className="font-medium">Company:</span>
                <span>{selectedUser.company}</span>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirm(false)}>
              Cancel
            </Button>
            <Button 
              onClick={confirmAction}
              className={actionType === 'approve' ? 'bg-green-600 hover:bg-green-700' : actionType === 'update' ? 'bg-blue-600 hover:bg-blue-700' : ''}
              variant={actionType === 'reject' || actionType === 'revoke' ? 'destructive' : 'default'}
            >
              {actionType === 'approve' ? 'Approve User' : 
               actionType === 'reject' ? 'Reject User' :
               actionType === 'revoke' ? 'Revoke Access' :
               'Update User'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
