'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Shield, User, Trash2, Edit, Ban } from 'lucide-react';

export default function UsersPage() {
  const [users, setUsers] = useState([
    {
      id: '1',
      name: 'John Doe',
      email: 'john@example.com',
      role: 'Passenger',
      status: 'Active',
      joinDate: '2024-01-15',
      totalBookings: 5,
    },
    {
      id: '2',
      name: 'Jane Smith',
      email: 'jane@example.com',
      role: 'Transporter',
      status: 'Active',
      joinDate: '2024-02-10',
      totalTrips: 45,
    },
    {
      id: '3',
      name: 'Ahmed Hassan',
      email: 'ahmed@example.com',
      role: 'Passenger',
      status: 'Suspended',
      joinDate: '2024-03-01',
      totalBookings: 2,
    },
    {
      id: '4',
      name: 'Chioma Okafor',
      email: 'chioma@example.com',
      role: 'Transporter',
      status: 'Active',
      joinDate: '2024-03-20',
      totalTrips: 28,
    },
  ]);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<'All' | 'Passenger' | 'Transporter'>('All');

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === 'All' || user.role === filterRole;
    return matchesSearch && matchesRole;
  });

  const stats = {
    totalUsers: users.length,
    passengers: users.filter(u => u.role === 'Passenger').length,
    transporters: users.filter(u => u.role === 'Transporter').length,
    suspended: users.filter(u => u.status === 'Suspended').length,
  };

  return (
    <div className="min-h-screen pb-12">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary to-primary-dark text-white py-8 px-6 md:px-8">
        <h1 className="text-3xl font-bold">User Management</h1>
        <p className="text-white/80 mt-1">Manage all platform users and permissions</p>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 md:px-8 py-8">
        {/* Stats */}
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <Card className="border-border">
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground mb-1">Total Users</p>
              <p className="text-3xl font-bold text-foreground">{stats.totalUsers}</p>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground mb-1">Passengers</p>
              <p className="text-3xl font-bold text-accent">{stats.passengers}</p>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground mb-1">Transporters</p>
              <p className="text-3xl font-bold text-primary">{stats.transporters}</p>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground mb-1">Suspended</p>
              <p className="text-3xl font-bold text-destructive">{stats.suspended}</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="grid md:grid-cols-2 gap-4 mb-6">
          <Input
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-secondary/30"
          />
          <div className="flex gap-2">
            {(['All', 'Passenger', 'Transporter'] as const).map((role) => (
              <Button
                key={role}
                variant={filterRole === role ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterRole(role)}
                className={filterRole === role ? 'bg-accent hover:bg-accent-dark' : ''}
              >
                {role}
              </Button>
            ))}
          </div>
        </div>

        {/* Users Table */}
        {filteredUsers.length > 0 ? (
          <div className="space-y-3">
            {filteredUsers.map((user) => (
              <Card key={user.id} className="border-border hover:shadow-md transition">
                <CardContent className="pt-6">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                    {/* Left - User Info */}
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          <User className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-foreground">{user.name}</h3>
                          <p className="text-sm text-muted-foreground">{user.email}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mt-3">
                        <div>
                          <p className="text-muted-foreground mb-1">Role</p>
                          <p className="font-medium text-foreground capitalize">{user.role}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground mb-1">Status</p>
                          <div className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                            user.status === 'Active'
                              ? 'bg-success/10 text-success'
                              : 'bg-destructive/10 text-destructive'
                          }`}>
                            {user.status}
                          </div>
                        </div>
                        <div>
                          <p className="text-muted-foreground mb-1">Joined</p>
                          <p className="font-medium text-foreground">{user.joinDate}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground mb-1">
                            {user.role === 'Passenger' ? 'Bookings' : 'Trips'}
                          </p>
                          <p className="font-medium text-foreground">
                            {user.role === 'Passenger' ? user.totalBookings : user.totalTrips}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Right - Actions */}
                    <div className="flex flex-col gap-2">
                      <Button variant="outline" size="sm" className="gap-2">
                        <Edit className="h-4 w-4" />
                        Edit
                      </Button>
                      {user.status === 'Active' ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-2 text-warning hover:bg-warning/10"
                        >
                          <Ban className="h-4 w-4" />
                          Suspend
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-2 text-success hover:bg-success/10"
                        >
                          <Shield className="h-4 w-4" />
                          Restore
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2 text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="border-border">
            <CardContent className="pt-12 pb-12 text-center">
              <p className="text-lg text-muted-foreground mb-4">No users found</p>
              <p className="text-sm text-muted-foreground">
                Try adjusting your search or filter criteria
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
