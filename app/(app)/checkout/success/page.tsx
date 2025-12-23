import type { Metadata } from "next";
import CheckoutSuccessPage from "@/views/CheckoutSuccess";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default function CheckoutSuccessRoute() {
  return <CheckoutSuccessPage />;
}

