'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Calendar, Plus, Edit, Trash2 } from 'lucide-react';
import Link from 'next/link';

export default function SchedulesPage() {
  const [schedules, setSchedules] = useState([
    {
      id: '1',
      route: 'Lagos - Ibadan',
      routeCode: 'LI-001',
      departureTime: '08:00 AM',
      arrivalTime: '11:00 AM',
      daysOfWeek: 'Mon, Tue, Wed, Thu, Fri, Sat, Sun',
      isActive: true,
      frequency: 'Daily',
    },
    {
      id: '2',
      route: 'Abuja - Kaduna',
      routeCode: 'AK-001',
      departureTime: '02:00 PM',
      arrivalTime: '06:00 PM',
      daysOfWeek: 'Mon, Tue, Wed, Thu, Fri',
      isActive: true,
      frequency: 'Weekdays',
    },
    {
      id: '3',
      route: 'Lagos - Abeokuta',
      routeCode: 'LA-001',
      departureTime: '06:00 AM',
      arrivalTime: '07:30 AM',
      daysOfWeek: 'Saturday, Sunday',
      isActive: false,
      frequency: 'Weekends',
    },
  ]);

  const [searchTerm, setSearchTerm] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  const filteredSchedules = schedules.filter(schedule =>
    schedule.route.toLowerCase().includes(searchTerm.toLowerCase()) ||
    schedule.routeCode.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDelete = (id: string) => {
    setSchedules(schedules.filter(s => s.id !== id));
    setShowDeleteConfirm(null);
  };

  return (
    <div className="min-h-screen pb-12">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary to-primary-dark text-white py-8 px-6 md:px-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Schedule Management</h1>
            <p className="text-white/80 mt-1">Manage trip schedules and frequencies</p>
          </div>
          <Link href="/transporter/schedules/create">
            <Button className="bg-accent hover:bg-accent-dark gap-2">
              <Plus className="h-4 w-4" />
              Add Schedule
            </Button>
          </Link>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 md:px-8 py-8">
        {/* Search Bar */}
        <div className="mb-6">
          <Input
            placeholder="Search by route name or code..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-secondary/30"
          />
        </div>

        {/* Schedules List */}
        {filteredSchedules.length > 0 ? (
          <div className="space-y-4">
            {filteredSchedules.map((schedule) => (
              <Card key={schedule.id} className="border-border hover:shadow-md transition">
                <CardContent className="pt-6">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                    {/* Left - Schedule Info */}
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                          schedule.isActive
                            ? 'bg-success/10 text-success'
                            : 'bg-muted text-muted-foreground'
                        }`}>
                          {schedule.isActive ? 'Active' : 'Inactive'}
                        </div>
                        <p className="text-sm text-muted-foreground font-mono">{schedule.routeCode}</p>
                        <span className="px-2 py-1 bg-primary/10 text-primary text-xs rounded font-medium">
                          {schedule.frequency}
                        </span>
                      </div>

                      <h3 className="text-lg font-semibold text-foreground mb-4">{schedule.route}</h3>

                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground mb-1">Departure</p>
                          <p className="font-medium text-foreground">{schedule.departureTime}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground mb-1">Arrival</p>
                          <p className="font-medium text-foreground">{schedule.arrivalTime}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground mb-1">Days</p>
                          <p className="font-medium text-foreground text-xs">{schedule.daysOfWeek}</p>
                        </div>
                      </div>
                    </div>

                    {/* Right - Actions */}
                    <div className="flex flex-col gap-2">
                      <Link href={`/transporter/schedules/${schedule.id}/edit`}>
                        <Button variant="outline" size="sm" className="w-full gap-2">
                          <Edit className="h-4 w-4" />
                          Edit
                        </Button>
                      </Link>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full gap-2 text-destructive hover:bg-destructive/10"
                        onClick={() => setShowDeleteConfirm(schedule.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </Button>
                    </div>
                  </div>

                  {/* Delete Confirmation */}
                  {showDeleteConfirm === schedule.id && (
                    <div className="mt-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                      <p className="text-sm text-destructive mb-3">
                        Are you sure you want to delete this schedule?
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
                          onClick={() => handleDelete(schedule.id)}
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
              <p className="text-lg text-muted-foreground mb-4">No schedules found</p>
              <p className="text-sm text-muted-foreground mb-6">
                {searchTerm ? 'Try adjusting your search criteria' : 'Create your first schedule to start operations'}
              </p>
              <Link href="/transporter/schedules/create">
                <Button className="bg-accent hover:bg-accent-dark gap-2">
                  <Plus className="h-4 w-4" />
                  Create Schedule
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
