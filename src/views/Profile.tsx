import dynamic from "next/dynamic";
import TopBar from "@/components/Layout/TopBar";
import Header from "@/components/Layout/Header";
import Footer from "@/components/Layout/Footer";
import type { ProfileClientProps } from "@/components/Profile/ProfileClient";

const ProfileClient = dynamic<ProfileClientProps>(
  () => import("@/components/Profile/ProfileClient").then((mod) => mod.ProfileClient),
  { ssr: false }
);

type ProfileProps = ProfileClientProps;

const Profile = ({
  initialUser,
  initialProfile,
  initialSubscription,
  initialWidgetSubscription,
  initialPlanName,
  initialWidgetPlanName,
}: ProfileProps) => {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-background via-background to-muted/20">
      <TopBar />
      <Header />
      <ProfileClient
        initialUser={initialUser}
        initialProfile={initialProfile}
        initialSubscription={initialSubscription}
        initialWidgetSubscription={initialWidgetSubscription}
        initialPlanName={initialPlanName}
        initialWidgetPlanName={initialWidgetPlanName}
      />
      <Footer />
    </div>
  );
};

export default Profile;
