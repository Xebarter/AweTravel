'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { MapPin, Plus, Edit, Trash2, Eye } from 'lucide-react';
import Link from 'next/link';

export default function RoutesPage() {
  const [routes, setRoutes] = useState([
    {
      id: '1',
      code: 'LI-001',
      origin: 'Lagos',
      destination: 'Ibadan',
      distance: 125,
      duration: 180,
      type: 'bus',
      isActive: true,
      stops: 2,
    },
    {
      id: '2',
      code: 'AK-001',
      origin: 'Abuja',
      destination: 'Kaduna',
      distance: 190,
      duration: 240,
      type: 'bus',
      isActive: true,
      stops: 3,
    },
    {
      id: '3',
      code: 'LA-001',
      origin: 'Lagos',
      destination: 'Abeokuta',
      distance: 85,
      duration: 120,
      type: 'minibus',
      isActive: false,
      stops: 1,
    },
  ]);

  const [searchTerm, setSearchTerm] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  const filteredRoutes = routes.filter(route =>
    route.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    route.origin.toLowerCase().includes(searchTerm.toLowerCase()) ||
    route.destination.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDelete = (id: string) => {
    setRoutes(routes.filter(r => r.id !== id));
    setShowDeleteConfirm(null);
  };

  return (
    <div className="min-h-screen pb-12">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary to-primary-dark text-white py-8 px-6 md:px-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Manage Routes</h1>
            <p className="text-white/80 mt-1">Create and manage your transport routes</p>
          </div>
          <Link href="/transporter/routes/create">
            <Button className="bg-accent hover:bg-accent-dark gap-2">
              <Plus className="h-4 w-4" />
              Add Route
            </Button>
          </Link>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 md:px-8 py-8">
        {/* Search Bar */}
        <div className="mb-6">
          <Input
            placeholder="Search by route code, origin, or destination..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-secondary/30"
          />
        </div>

        {/* Routes List */}
        {filteredRoutes.length > 0 ? (
          <div className="space-y-4">
            {filteredRoutes.map((route) => (
              <Card key={route.id} className="border-border hover:shadow-md transition">
                <CardContent className="pt-6">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                    {/* Left - Route Info */}
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                          route.isActive
                            ? 'bg-success/10 text-success'
                            : 'bg-muted text-muted-foreground'
                        }`}>
                          {route.isActive ? 'Active' : 'Inactive'}
                        </div>
                        <p className="text-sm text-muted-foreground font-mono">{route.code}</p>
                      </div>

                      <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
                        <MapPin className="h-5 w-5 text-accent" />
                        {route.origin} → {route.destination}
                      </h3>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground mb-1">Distance</p>
                          <p className="font-medium text-foreground">{route.distance} km</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground mb-1">Duration</p>
                          <p className="font-medium text-foreground">{Math.floor(route.duration / 60)}h {route.duration % 60}m</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground mb-1">Type</p>
                          <p className="font-medium text-foreground capitalize">{route.type}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground mb-1">Stops</p>
                          <p className="font-medium text-foreground">{route.stops}</p>
                        </div>
                      </div>
                    </div>

                    {/* Right - Actions */}
                    <div className="flex flex-col gap-2">
                      <Link href={`/transporter/routes/${route.id}`}>
                        <Button variant="outline" size="sm" className="w-full gap-2">
                          <Eye className="h-4 w-4" />
                          View Details
                        </Button>
                      </Link>
                      <Link href={`/transporter/routes/${route.id}/edit`}>
                        <Button variant="outline" size="sm" className="w-full gap-2">
                          <Edit className="h-4 w-4" />
                          Edit
                        </Button>
                      </Link>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full gap-2 text-destructive hover:bg-destructive/10"
                        onClick={() => setShowDeleteConfirm(route.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </Button>
                    </div>
                  </div>

                  {/* Delete Confirmation */}
                  {showDeleteConfirm === route.id && (
                    <div className="mt-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                      <p className="text-sm text-destructive mb-3">
                        Are you sure you want to delete this route? This action cannot be undone.
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowDeleteConfirm(null)}
                        >
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          className="bg-destructive hover:bg-destructive/90"
                          onClick={() => handleDelete(route.id)}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="border-border">
            <CardContent className="pt-12 pb-12 text-center">
              <p className="text-lg text-muted-foreground mb-4">No routes found</p>
              <p className="text-sm text-muted-foreground mb-6">
                {searchTerm ? 'Try adjusting your search criteria' : 'Get started by creating your first route'}
              </p>
              <Link href="/transporter/routes/create">
                <Button className="bg-accent hover:bg-accent-dark gap-2">
                  <Plus className="h-4 w-4" />
                  Create First Route
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
