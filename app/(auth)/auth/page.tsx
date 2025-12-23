import type { Metadata } from "next";
import AuthPage from "@/views/Auth";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default function AuthRoute() {
  return <AuthPage />;
}

