import type { AdminAnalytics, AdminRepository } from './ports';

export type GetAnalyticsDependencies = { admin: AdminRepository };

export function getAdminAnalytics(
  fromDate: string,
  toDate: string,
  dependencies: GetAnalyticsDependencies,
): Promise<AdminAnalytics> {
  return dependencies.admin.getAnalytics(fromDate, toDate);
}
