import type { Metadata } from "next";
import AuthCallbackPage from "@/views/AuthCallback";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default function AuthCallbackRoute() {
  return <AuthCallbackPage />;
}

