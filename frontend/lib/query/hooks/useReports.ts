// frontend/lib/query/hooks/useReports.ts
import { useQuery } from "@tanstack/react-query";
import { reportsApiClient, ReportsSummary } from "@/lib/api/reports";

export function useReportsSummary() {
  return useQuery<ReportsSummary>({
    queryKey: ["reports", "summary"],
    queryFn: () => reportsApiClient.getSummary(),
  });
}
