import { createServerSupabaseClient } from "@/integrations/supabase/server";
import RecipePage from "@/views/Recipe";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function RecipeRoute({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createServerSupabaseClient();
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error || !session) {
    redirect("/auth");
  }

  return <RecipePage recipeId={params.id} />;
}
