import dynamic from "next/dynamic";
import TopBar from "@/components/Layout/TopBar";
import Header from "@/components/Layout/Header";
import Footer from "@/components/Layout/Footer";

const RecipeClient = dynamic(
  () => import("@/components/Recipe/RecipeClient").then((mod) => mod.RecipeClient),
  { ssr: false }
);

type RecipePageProps = {
  recipeId: string;
};

export default function RecipePage({ recipeId }: RecipePageProps) {
  return (
    <div className="flex flex-col min-h-screen">
      <TopBar />
      <Header />
      <main className="flex-1">
        <RecipeClient recipeId={recipeId} />
      </main>
      <Footer />
    </div>
  );
}
