export type AdminReportPeriod = {
  fromDate: string;
  toDate: string;
  timezone: string;
  startUtc: string;
  endUtcExclusive: string;
};

export type AdminReportFinanceTotals = {
  incomingCompletedUgx: number;
  outgoingCompletedUgx: number;
  netUgx: number;
  pendingOutgoingCount: number;
  pendingOutgoingUgx: number;
  byKindCompleted: Record<string, number>;
};

export type AdminReportFinanceDailyRow = {
  day: string;
  incomingCompletedUgx: number;
  outgoingCompletedUgx: number;
  incomingCompletedCount: number;
  outgoingCompletedCount: number;
};

export type AdminReportSignupsDailyRow = {
  day: string;
  newPassengers: number;
  newTransporters: number;
  newAdmins: number;
};

export type AdminReportUsers = {
  totalPassengers: number;
  totalTransporters: number;
  totalAdmins: number;
  newPassengersInPeriod: number;
  newTransportersInPeriod: number;
  newAdminsInPeriod: number;
  suspendedPassengers: number;
};

export type AdminReportTransporters = {
  pendingApproval: number;
  approved: number;
  rejected: number;
  newApprovedInPeriod: number;
};

export type AdminReportOperations = {
  routesTotal: number;
  routesActive: number;
  vehiclesTotal: number;
  departuresTotal: number;
};

export type AdminReportMarketing = {
  applicationsByStatus: Record<string, number>;
  applicationsTotal: number;
  bannersTotal: number;
  bannersActive: number;
};

export type AdminReportComparisonMetric = {
  current: number;
  previous: number;
  deltaPct: number | null;
};

export type AdminReportComparison = {
  incomingCompletedUgx: AdminReportComparisonMetric;
  outgoingCompletedUgx: AdminReportComparisonMetric;
  netUgx: AdminReportComparisonMetric;
  newUsersTotal: AdminReportComparisonMetric;
};

export type AdminReportResponse = {
  generatedAt: string;
  locale: string;
  currencyCode: 'UGX';
  period: AdminReportPeriod;
  definitions: Record<string, string>;
  finance: {
    totals: AdminReportFinanceTotals;
    daily: AdminReportFinanceDailyRow[];
  };
  signupsDaily: AdminReportSignupsDailyRow[];
  users: AdminReportUsers;
  transporters: AdminReportTransporters;
  operations: AdminReportOperations;
  marketing: AdminReportMarketing;
  comparison: AdminReportComparison | null;
};
