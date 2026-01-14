import dynamic from "next/dynamic";
import type { DashboardClientProps } from "@/components/Dashboard/DashboardClient";
import TopBar from "@/components/Layout/TopBar";
import Header from "@/components/Layout/Header";
import Footer from "@/components/Layout/Footer";

const DashboardClient = dynamic<DashboardClientProps>(
  () => import("@/components/Dashboard/DashboardClient").then((mod) => mod.DashboardClient),
  { ssr: false }
);

type DashboardProps = DashboardClientProps;

const Dashboard = ({ 
  initialUser, 
  initialSubscription, 
  initialScans, 
  initialFullName,
  initialStreaks,
  initialAchievements,
}: DashboardProps) => {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-background to-muted/20">
      <TopBar />
      <Header />
      <DashboardClient
        initialUser={initialUser}
        initialSubscription={initialSubscription}
        initialScans={initialScans}
        initialFullName={initialFullName}
        initialStreaks={initialStreaks}
        initialAchievements={initialAchievements}
      />
      <Footer />
    </div>
  );
};

export default Dashboard;
