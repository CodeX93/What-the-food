import ScanHistoryPage from "@/views/ScanHistory";

// Force dynamic rendering for authenticated route
export const dynamic = 'force-dynamic';

export default function HistoryRoute() {
  return <ScanHistoryPage />;
}

