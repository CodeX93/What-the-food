import dynamic from "next/dynamic";
import TopBar from "@/components/Layout/TopBar";
import Header from "@/components/Layout/Header";
import Footer from "@/components/Layout/Footer";

const SavedRecipesClient = dynamic(
  () => import("@/components/SavedRecipes/SavedRecipesClient").then((mod) => mod.SavedRecipesClient),
  { ssr: false }
);

type SavedRecipesProps = {
  initialSubscription?: any;
};

const SavedRecipes = ({ initialSubscription }: SavedRecipesProps) => {
  return (
    <div className="min-h-screen flex flex-col">
      <TopBar />
      <Header />
      <SavedRecipesClient initialSubscription={initialSubscription} />
      <Footer />
    </div>
  );
};

export default SavedRecipes;
