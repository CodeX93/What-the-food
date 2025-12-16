import AnalyticsPage from "@/views/Analytics";

// Force dynamic rendering for authenticated route
export const dynamic = 'force-dynamic';

export default function AnalyticsRoute() {
  return <AnalyticsPage />;
}

