import type { Metadata } from "next";

export const dynamic = "force-dynamic";

import WidgetAdminPage from "@/views/WidgetAdmin";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default function WidgetAdminRoute() {
  return <WidgetAdminPage />;
}

