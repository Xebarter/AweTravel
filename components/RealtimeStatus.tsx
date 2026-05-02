'use client';

import { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle, Clock, MapPin } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export interface StatusUpdate {
  id: string;
  status: 'pending' | 'confirmed' | 'in-transit' | 'completed' | 'cancelled';
  message: string;
  timestamp: Date;
  location?: string;
}

interface RealtimeStatusProps {
  bookingId: string;
  currentStatus: string;
  updates: StatusUpdate[];
  onStatusChange?: (status: string) => void;
}

export function RealtimeStatus({
  bookingId,
  currentStatus,
  updates,
  onStatusChange,
}: RealtimeStatusProps) {
  const [animatedUpdates, setAnimatedUpdates] = useState<StatusUpdate[]>([]);

  useEffect(() => {
    // Simulate real-time updates
    setAnimatedUpdates(updates);
  }, [updates]);

  const getStatusColor = (status: StatusUpdate['status']) => {
    switch (status) {
      case 'confirmed':
        return 'text-success';
      case 'in-transit':
        return 'text-info';
      case 'completed':
        return 'text-success';
      case 'cancelled':
        return 'text-destructive';
      default:
        return 'text-warning';
    }
  };

  const getStatusIcon = (status: StatusUpdate['status']) => {
    switch (status) {
      case 'confirmed':
      case 'completed':
        return <CheckCircle className="h-5 w-5" />;
      case 'in-transit':
        return <MapPin className="h-5 w-5" />;
      case 'pending':
        return <Clock className="h-5 w-5" />;
      case 'cancelled':
        return <AlertCircle className="h-5 w-5" />;
      default:
        return <Clock className="h-5 w-5" />;
    }
  };

  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle>Booking Status</CardTitle>
        <CardDescription>Real-time updates for booking {bookingId}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Current Status */}
          <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
            <p className="text-sm text-muted-foreground mb-1">Current Status</p>
            <p className="text-lg font-semibold text-foreground capitalize">{currentStatus}</p>
          </div>

          {/* Timeline */}
          <div className="space-y-4">
            <h4 className="font-medium text-foreground text-sm">Status Timeline</h4>
            <div className="relative space-y-4">
              {animatedUpdates.length > 0 ? (
                animatedUpdates.map((update, index) => (
                  <div
                    key={update.id}
                    className="flex gap-4 animate-in fade-in slide-in-from-left-4"
                  >
                    {/* Timeline Dot */}
                    <div className="flex flex-col items-center">
                      <div className={`p-2 rounded-full bg-background border-2 border-primary ${getStatusColor(update.status)}`}>
                        {getStatusIcon(update.status)}
                      </div>
                      {index < animatedUpdates.length - 1 && (
                        <div className="h-12 w-0.5 bg-border mt-2"></div>
                      )}
                    </div>

                    {/* Event Details */}
                    <div className="pt-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-foreground capitalize">
                          {update.status.replace('-', ' ')}
                        </p>
                        <span className="text-xs text-muted-foreground">
                          {update.timestamp.toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{update.message}</p>
                      {update.location && (
                        <p className="text-xs text-accent mt-1 flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {update.location}
                        </p>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No updates yet</p>
              )}
            </div>
          </div>

          {/* Auto-refresh Info */}
          <div className="p-3 bg-secondary/30 rounded-lg text-xs text-muted-foreground">
            Updates automatically refresh every 30 seconds. Last updated: {new Date().toLocaleTimeString()}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
