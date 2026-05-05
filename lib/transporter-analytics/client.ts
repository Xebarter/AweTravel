export type TransporterAnalytics = {
  weeklyRevenueBookings: { day: string; revenueMinor: number; bookings: number; currency: string }[];
  bookingsTrend: { day: string; bookings: number }[];
  recentActivity: {
    id: string;
    bookingCode: string;
    travelDate: string;
    routeCode: string;
    routeLabel: string;
    passengerName: string | null;
    seatCode: string;
    status: string;
    paymentStatus: string;
    amountMinor: number;
    currency: string;
    createdAt: string;
  }[];
};

async function readError(res: Response): Promise<string> {
  try {
    const j = (await res.json()) as { error?: string };
    return j.error ?? res.statusText;
  } catch {
    return res.statusText;
  }
}

export async function getTransporterAnalytics(): Promise<TransporterAnalytics> {
  const res = await fetch('/api/transporter/analytics');
  if (!res.ok) throw new Error(await readError(res));
  return (await res.json()) as TransporterAnalytics;
}

