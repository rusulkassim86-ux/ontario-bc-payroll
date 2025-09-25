import { useState, useEffect } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { 
  Plus, 
  Search, 
  Filter, 
  MoreVertical, 
  Edit, 
  UserX, 
  Shield,
  Users,
  Crown,
  Eye,
  Settings,
  AlertTriangle
} from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface UserProfile {
  id: string;
  user_id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  company_id: string;
  employee_id?: string;
  is_active: boolean;
  two_factor_enabled: boolean;
  last_login_at: string | null;
  created_at: string;
}

const roleHierarchy = {
  'org_admin': { level: 4, label: 'Organization Admin', color: 'bg-red-500', icon: Crown },
  'payroll_admin': { level: 3, label: 'Payroll Admin', color: 'bg-orange-500', icon: Shield },
  'manager': { level: 2, label: 'Manager', color: 'bg-blue-500', icon: Users },
  'employee': { level: 1, label: 'Employee', color: 'bg-green-500', icon: Eye }
};

export default function UserManagement() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const { profile } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('company_id', profile?.company_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error loading users:', error);
      toast({
        title: "Error",
        description: "Failed to load users",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateUserRole = async (userId: string, newRole: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId);

      if (error) throw error;

      // Log the role change
      await supabase.rpc('create_audit_log', {
        p_action: 'ROLE_CHANGE',
        p_entity_type: 'user',
        p_entity_id: userId,
        p_metadata: { 
          new_role: newRole,
          changed_by: profile?.user_id 
        }
      });

      await loadUsers();
      setEditDialogOpen(false);
      
      toast({
        title: "Success",
        description: "User role updated successfully",
      });
    } catch (error) {
      console.error('Error updating user role:', error);
      toast({
        title: "Error",
        description: "Failed to update user role",
        variant: "destructive",
      });
    }
  };

  const toggleUserStatus = async (userId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: !isActive })
        .eq('id', userId);

      if (error) throw error;

      // Log the status change
      await supabase.rpc('create_audit_log', {
        p_action: isActive ? 'USER_DEACTIVATED' : 'USER_ACTIVATED',
        p_entity_type: 'user',
        p_entity_id: userId,
        p_metadata: { 
          previous_status: isActive,
          changed_by: profile?.user_id 
        }
      });

      await loadUsers();
      
      toast({
        title: "Success",
        description: `User ${isActive ? 'deactivated' : 'activated'} successfully`,
      });
    } catch (error) {
      console.error('Error updating user status:', error);
      toast({
        title: "Error",
        description: "Failed to update user status",
        variant: "destructive",
      });
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (activeTab === "all") return matchesSearch;
    if (activeTab === "admins") return matchesSearch && ['org_admin', 'payroll_admin'].includes(user.role);
    if (activeTab === "managers") return matchesSearch && user.role === 'manager';
    if (activeTab === "employees") return matchesSearch && user.role === 'employee';
    if (activeTab === "inactive") return matchesSearch && !user.is_active;
    
    return matchesSearch;
  });

  const getUserStats = () => {
    const total = users.length;
    const admins = users.filter(u => ['org_admin', 'payroll_admin'].includes(u.role)).length;
    const managers = users.filter(u => u.role === 'manager').length;
    const employees = users.filter(u => u.role === 'employee').length;
    const inactive = users.filter(u => !u.is_active).length;
    const with2FA = users.filter(u => u.two_factor_enabled).length;

    return { total, admins, managers, employees, inactive, with2FA };
  };

  const stats = getUserStats();

  // Only org_admin can access this page
  if (profile?.role !== 'org_admin') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="p-8 text-center">
          <AlertTriangle className="w-16 h-16 text-warning mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Access Restricted</h2>
          <p className="text-muted-foreground">Only Organization Administrators can access user management.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader 
        title="User Management" 
        description="Manage user access and roles across your organization"
        action={
          <Button className="bg-gradient-primary">
            <Plus className="w-4 h-4 mr-2" />
            Invite User
          </Button>
        }
      />
      
      <div className="px-6 space-y-6">
        {/* User Stats */}
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          <Card className="shadow-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Users className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.total}</p>
                  <p className="text-sm text-muted-foreground">Total Users</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="shadow-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-500/10 rounded-lg">
                  <Crown className="w-4 h-4 text-red-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.admins}</p>
                  <p className="text-sm text-muted-foreground">Admins</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="shadow-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <Users className="w-4 h-4 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.managers}</p>
                  <p className="text-sm text-muted-foreground">Managers</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="shadow-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/10 rounded-lg">
                  <Eye className="w-4 h-4 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.employees}</p>
                  <p className="text-sm text-muted-foreground">Employees</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="shadow-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-warning/10 rounded-lg">
                  <UserX className="w-4 h-4 text-warning" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.inactive}</p>
                  <p className="text-sm text-muted-foreground">Inactive</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="shadow-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-success/10 rounded-lg">
                  <Shield className="w-4 h-4 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.with2FA}</p>
                  <p className="text-sm text-muted-foreground">2FA Enabled</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <Card className="shadow-card">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search users by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button variant="outline" className="md:w-auto">
                <Filter className="w-4 h-4 mr-2" />
                Filters
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* User Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="all">All Users</TabsTrigger>
            <TabsTrigger value="admins">Admins</TabsTrigger>
            <TabsTrigger value="managers">Managers</TabsTrigger>
            <TabsTrigger value="employees">Employees</TabsTrigger>
            <TabsTrigger value="inactive">Inactive</TabsTrigger>
          </TabsList>
          
          <TabsContent value={activeTab} className="space-y-4">
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle>User Directory</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>2FA</TableHead>
                      <TableHead>Last Login</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user) => {
                      const roleInfo = roleHierarchy[user.role];
                      const RoleIcon = roleInfo.icon;
                      
                      return (
                        <TableRow key={user.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar>
                                <AvatarFallback>
                                  {user.first_name[0]}{user.last_name[0]}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium">{user.first_name} {user.last_name}</p>
                                <p className="text-sm text-muted-foreground">{user.email}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="gap-1">
                              <RoleIcon className="w-3 h-3" />
                              {roleInfo.label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={user.is_active ? 'default' : 'secondary'}>
                              {user.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={user.two_factor_enabled ? 'default' : 'outline'}>
                              {user.two_factor_enabled ? 'Enabled' : 'Disabled'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {user.last_login_at 
                              ? new Date(user.last_login_at).toLocaleDateString()
                              : 'Never'
                            }
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreVertical className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem 
                                  onClick={() => {
                                    setSelectedUser(user);
                                    setEditDialogOpen(true);
                                  }}
                                >
                                  <Edit className="w-4 h-4 mr-2" />
                                  Edit Role
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => toggleUserStatus(user.id, user.is_active)}>
                                  <UserX className="w-4 h-4 mr-2" />
                                  {user.is_active ? 'Deactivate' : 'Activate'}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem>
                                  <Settings className="w-4 h-4 mr-2" />
                                  Reset Password
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Edit User Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit User Role</DialogTitle>
              <DialogDescription>
                Change the role and permissions for {selectedUser?.first_name} {selectedUser?.last_name}
              </DialogDescription>
            </DialogHeader>
            
            {selectedUser && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Select
                    value={selectedUser.role}
                    onValueChange={(value) => setSelectedUser({...selectedUser, role: value as any})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="employee">Employee</SelectItem>
                      <SelectItem value="manager">Manager</SelectItem>
                      <SelectItem value="payroll_admin">Payroll Admin</SelectItem>
                      <SelectItem value="org_admin">Organization Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch
                    id="active"
                    checked={selectedUser.is_active}
                    onCheckedChange={(checked) => 
                      setSelectedUser({...selectedUser, is_active: checked})
                    }
                  />
                  <Label htmlFor="active">Account Active</Label>
                </div>
              </div>
            )}
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={() => selectedUser && updateUserRole(selectedUser.id, selectedUser.role)}
              >
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}