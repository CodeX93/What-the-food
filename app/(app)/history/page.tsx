import type { Metadata } from "next";
import ScanHistoryPage from "@/views/ScanHistory";

// Force dynamic rendering for authenticated route
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default function HistoryRoute() {
  return <ScanHistoryPage />;
}

