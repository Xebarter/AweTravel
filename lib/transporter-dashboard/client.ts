export type TransporterDashboardMetrics = {
  routesActive: number;
  vehiclesOnline: number;
  departuresActive: number;
  weeklyRevenueMinor: number;
  currency: string;
};

async function readError(res: Response): Promise<string> {
  try {
    const j = (await res.json()) as { error?: string };
    return j.error ?? res.statusText;
  } catch {
    return res.statusText;
  }
}

export async function getTransporterDashboardMetrics(): Promise<TransporterDashboardMetrics> {
  const res = await fetch('/api/transporter/dashboard');
  if (!res.ok) throw new Error(await readError(res));
  return (await res.json()) as TransporterDashboardMetrics;
}

