import type { Metadata } from "next";
import FoodResultsPage from "@/views/FoodResults";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default function FoodResultsRoute() {
  return <FoodResultsPage />;
}

