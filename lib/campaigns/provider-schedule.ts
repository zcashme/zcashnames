export interface ProviderManagedScheduleState {
  managed: boolean;
  scheduledAt: string | null;
  acceptedCount: number;
  inFuture: boolean;
  pastDue: boolean;
  pendingCount: number;
  nextEligibleAt: string | null;
  cancelable: boolean;
}

function parseScheduledAt(value: string | null): number | null {
  if (!value) return null;
  const scheduledAt = new Date(value).getTime();
  return Number.isNaN(scheduledAt) ? null : scheduledAt;
}

export function getProviderManagedScheduleState(args: {
  hasDeliveryBatches: boolean;
  acceptedCount: number;
  scheduledAt: string | null;
  canceledAt?: string | null;
  now?: number;
}): ProviderManagedScheduleState {
  const managed = !args.hasDeliveryBatches && args.acceptedCount > 0;
  const now = args.now ?? Date.now();
  const scheduledMs = parseScheduledAt(args.scheduledAt);
  const inFuture = managed && scheduledMs !== null && scheduledMs > now;
  const pastDue = managed && scheduledMs !== null && scheduledMs <= now;

  return {
    managed,
    scheduledAt: args.scheduledAt,
    acceptedCount: args.acceptedCount,
    inFuture,
    pastDue,
    pendingCount: inFuture ? args.acceptedCount : 0,
    nextEligibleAt: inFuture ? args.scheduledAt : null,
    cancelable: inFuture && !args.canceledAt,
  };
}
