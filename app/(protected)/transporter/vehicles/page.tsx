'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Truck, Plus, Edit, Trash2, Eye } from 'lucide-react';
import Link from 'next/link';

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState([
    {
      id: '1',
      registration: 'LG-2024-001',
      type: 'Bus',
      capacity: 50,
      status: 'active',
      lastMaintenance: '2024-04-15',
      mileage: 45200,
      acquisitionDate: '2022-01-10',
    },
    {
      id: '2',
      registration: 'LG-2024-002',
      type: 'Minibus',
      capacity: 20,
      status: 'active',
      lastMaintenance: '2024-05-01',
      mileage: 28500,
      acquisitionDate: '2023-06-15',
    },
    {
      id: '3',
      registration: 'LG-2023-005',
      type: 'Coach',
      capacity: 65,
      status: 'maintenance',
      lastMaintenance: '2024-05-10',
      mileage: 62100,
      acquisitionDate: '2021-03-20',
    },
  ]);

  const [searchTerm, setSearchTerm] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  const filteredVehicles = vehicles.filter(vehicle =>
    vehicle.registration.toLowerCase().includes(searchTerm.toLowerCase()) ||
    vehicle.type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDelete = (id: string) => {
    setVehicles(vehicles.filter(v => v.id !== id));
    setShowDeleteConfirm(null);
  };

  return (
    <div className="min-h-screen pb-12">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary to-primary-dark text-white py-8 px-6 md:px-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Fleet Management</h1>
            <p className="text-white/80 mt-1">Manage your vehicles and fleet</p>
          </div>
          <Link href="/transporter/vehicles/create">
            <Button className="bg-accent hover:bg-accent-dark gap-2">
              <Plus className="h-4 w-4" />
              Add Vehicle
            </Button>
          </Link>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 md:px-8 py-8">
        {/* Stats */}
        <div className="grid md:grid-cols-3 gap-4 mb-8">
          <Card className="border-border">
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground mb-1">Total Vehicles</p>
              <p className="text-3xl font-bold text-foreground">{vehicles.length}</p>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground mb-1">Active Vehicles</p>
              <p className="text-3xl font-bold text-success">{vehicles.filter(v => v.status === 'active').length}</p>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground mb-1">Total Capacity</p>
              <p className="text-3xl font-bold text-accent">{vehicles.reduce((sum, v) => sum + v.capacity, 0)}</p>
            </CardContent>
          </Card>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <Input
            placeholder="Search by registration number or vehicle type..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-secondary/30"
          />
        </div>

        {/* Vehicles Grid */}
        {filteredVehicles.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredVehicles.map((vehicle) => (
              <Card key={vehicle.id} className="border-border hover:shadow-md transition flex flex-col">
                <CardContent className="pt-6 flex-1 flex flex-col">
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-3 bg-primary/10 rounded-lg">
                      <Truck className="h-6 w-6 text-primary" />
                    </div>
                    <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                      vehicle.status === 'active'
                        ? 'bg-success/10 text-success'
                        : vehicle.status === 'maintenance'
                        ? 'bg-warning/10 text-warning'
                        : 'bg-destructive/10 text-destructive'
                    }`}>
                      {vehicle.status.charAt(0).toUpperCase() + vehicle.status.slice(1)}
                    </div>
                  </div>

                  <h3 className="font-semibold text-lg text-foreground mb-1">{vehicle.type}</h3>
                  <p className="text-sm text-muted-foreground mb-4 font-mono">{vehicle.registration}</p>

                  <div className="space-y-2 flex-1 text-sm mb-4">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Capacity</span>
                      <span className="font-medium text-foreground">{vehicle.capacity} seats</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Mileage</span>
                      <span className="font-medium text-foreground">{vehicle.mileage.toLocaleString()} km</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Last Service</span>
                      <span className="font-medium text-foreground">{vehicle.lastMaintenance}</span>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-4 border-t border-border">
                    <Link href={`/transporter/vehicles/${vehicle.id}`} className="flex-1">
                      <Button variant="outline" size="sm" className="w-full gap-2">
                        <Eye className="h-4 w-4" />
                        View
                      </Button>
                    </Link>
                    <Link href={`/transporter/vehicles/${vehicle.id}/edit`} className="flex-1">
                      <Button variant="outline" size="sm" className="w-full gap-2">
                        <Edit className="h-4 w-4" />
                        Edit
                      </Button>
                    </Link>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive hover:bg-destructive/10"
                      onClick={() => setShowDeleteConfirm(vehicle.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  {showDeleteConfirm === vehicle.id && (
                    <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                      <p className="text-xs text-destructive mb-2">Confirm deletion?</p>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowDeleteConfirm(null)}
                          className="flex-1"
                        >
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          className="flex-1 bg-destructive hover:bg-destructive/90"
                          onClick={() => handleDelete(vehicle.id)}
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
              <p className="text-lg text-muted-foreground mb-4">No vehicles found</p>
              <p className="text-sm text-muted-foreground mb-6">
                {searchTerm ? 'Try adjusting your search criteria' : 'Register your first vehicle to get started'}
              </p>
              <Link href="/transporter/vehicles/create">
                <Button className="bg-accent hover:bg-accent-dark gap-2">
                  <Plus className="h-4 w-4" />
                  Register Vehicle
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
