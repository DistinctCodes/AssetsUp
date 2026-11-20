// frontend/lib/query/hooks/useReports.ts
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  reportsApiClient,
  ReportsDateRange,
  ReportsSummary,
} from "@/lib/api/reports";

export function useReportsSummary(range?: ReportsDateRange) {
  return useQuery<ReportsSummary>({
    queryKey: ["reports", "summary", range?.from ?? null, range?.to ?? null],
    queryFn: () => reportsApiClient.getSummary(range),
    placeholderData: keepPreviousData,
  });
}
