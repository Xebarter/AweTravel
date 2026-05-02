'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Building2, Edit, Trash2, Shield, AlertCircle } from 'lucide-react';

export default function CompaniesPage() {
  const [companies, setCompanies] = useState([
    {
      id: '1',
      name: 'Premium Travel Ltd',
      registration: 'REG-2020-001',
      email: 'info@premiumtravel.com',
      phone: '+234 700 000 0001',
      status: 'Verified',
      vehicles: 12,
      routes: 8,
      totalTrips: 450,
    },
    {
      id: '2',
      name: 'Safe Journey Coaches',
      registration: 'REG-2021-002',
      email: 'info@safejourneycoaches.com',
      phone: '+234 700 000 0002',
      status: 'Verified',
      vehicles: 8,
      routes: 5,
      totalTrips: 280,
    },
    {
      id: '3',
      name: 'Quick Ride Express',
      registration: 'REG-2024-005',
      email: 'info@quickrideexpress.com',
      phone: '+234 700 000 0003',
      status: 'Pending',
      vehicles: 3,
      routes: 2,
      totalTrips: 45,
    },
  ]);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'All' | 'Verified' | 'Pending' | 'Suspended'>('All');

  const filteredCompanies = companies.filter(company => {
    const matchesSearch = company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      company.registration.toLowerCase().includes(searchTerm.toLowerCase()) ||
      company.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'All' || company.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    totalCompanies: companies.length,
    verified: companies.filter(c => c.status === 'Verified').length,
    pending: companies.filter(c => c.status === 'Pending').length,
    totalVehicles: companies.reduce((sum, c) => sum + c.vehicles, 0),
  };

  return (
    <div className="min-h-screen pb-12">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary to-primary-dark text-white py-8 px-6 md:px-8">
        <h1 className="text-3xl font-bold">Company Management</h1>
        <p className="text-white/80 mt-1">Oversee all transport companies and their operations</p>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 md:px-8 py-8">
        {/* Stats */}
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <Card className="border-border">
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground mb-1">Total Companies</p>
              <p className="text-3xl font-bold text-foreground">{stats.totalCompanies}</p>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground mb-1">Verified</p>
              <p className="text-3xl font-bold text-success">{stats.verified}</p>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground mb-1">Pending Verification</p>
              <p className="text-3xl font-bold text-warning">{stats.pending}</p>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground mb-1">Total Vehicles</p>
              <p className="text-3xl font-bold text-accent">{stats.totalVehicles}</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="grid md:grid-cols-2 gap-4 mb-6">
          <Input
            placeholder="Search by company name, registration, or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-secondary/30"
          />
          <div className="flex gap-2 flex-wrap">
            {(['All', 'Verified', 'Pending', 'Suspended'] as const).map((status) => (
              <Button
                key={status}
                variant={filterStatus === status ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterStatus(status)}
                className={filterStatus === status ? 'bg-accent hover:bg-accent-dark' : ''}
              >
                {status}
              </Button>
            ))}
          </div>
        </div>

        {/* Companies Grid */}
        {filteredCompanies.length > 0 ? (
          <div className="grid md:grid-cols-2 gap-6">
            {filteredCompanies.map((company) => (
              <Card key={company.id} className="border-border hover:shadow-md transition">
                <CardContent className="pt-6 flex flex-col h-full">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <Building2 className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-foreground text-lg">{company.name}</h3>
                        <p className="text-sm text-muted-foreground font-mono">{company.registration}</p>
                      </div>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                      company.status === 'Verified'
                        ? 'bg-success/10 text-success'
                        : company.status === 'Pending'
                        ? 'bg-warning/10 text-warning'
                        : 'bg-destructive/10 text-destructive'
                    }`}>
                      {company.status}
                    </div>
                  </div>

                  <div className="space-y-2 mb-6 flex-1">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground">Email:</span>
                      <span className="font-medium text-foreground">{company.email}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground">Phone:</span>
                      <span className="font-medium text-foreground">{company.phone}</span>
                    </div>

                    <div className="grid grid-cols-3 gap-3 pt-3 border-t border-border">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Vehicles</p>
                        <p className="font-bold text-lg text-primary">{company.vehicles}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Routes</p>
                        <p className="font-bold text-lg text-accent">{company.routes}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Trips</p>
                        <p className="font-bold text-lg text-foreground">{company.totalTrips}</p>
                      </div>
                    </div>
                  </div>

                  {company.status === 'Pending' && (
                    <div className="p-3 bg-warning/10 border border-warning/20 rounded-lg mb-4 flex gap-2 items-start">
                      <AlertCircle className="h-4 w-4 text-warning flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-warning">Awaiting verification approval</p>
                    </div>
                  )}

                  <div className="flex gap-2 pt-4 border-t border-border">
                    {company.status === 'Pending' ? (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 gap-2 text-success hover:bg-success/10"
                        >
                          <Shield className="h-4 w-4" />
                          Verify
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 gap-2 text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-4 w-4" />
                          Reject
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 gap-2"
                        >
                          <Edit className="h-4 w-4" />
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="border-border">
            <CardContent className="pt-12 pb-12 text-center">
              <p className="text-lg text-muted-foreground mb-4">No companies found</p>
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
