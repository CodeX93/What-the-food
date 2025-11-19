'use client';

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  Loader2,
  Calendar,
  Target,
  UtensilsCrossed,
  Activity,
  CheckCircle2,
  Clock,
  Flame,
  Apple,
  Dumbbell,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface MealPlan {
  overview: string;
  dailyCalorieTarget: number;
  dailyCalorieRationale: string;
  macroDistribution: {
    protein_g: number;
    carbohydrates_g: number;
    fat_g: number;
    fiber_g: number;
    rationale: string;
  };
  weeklyMealPlan: Array<{
    day: string;
    meals: Array<{
      type: string;
      name: string;
      foods: Array<{
        name: string;
        quantity: string;
        calories: number;
      }>;
      totalCalories: number;
      macros: {
        protein_g: number;
        carbohydrates_g: number;
        fat_g: number;
      };
    }>;
    note?: string;
  }>;
  exercisePlan: {
    types: string[];
    frequency: string;
    duration: string;
    intensity: string;
    specificExercises: string[];
    weeklySchedule: string;
  };
  actionItems: Array<{
    category: string;
    item: string;
    details: string;
  }>;
  progressTracking: {
    methods: string[];
    frequency: string;
    milestones: string[];
  };
  tips: string[];
}

interface SavedMealPlanRecord {
  id: string;
  title: string | null;
  goal: string | null;
  target_weight: number | null;
  timeframe_weeks: number | null;
  plan: MealPlan;
  created_at: string;
}

const formatPlanDate = (dateString: string) =>
  new Date(dateString).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

const safeArray = <T,>(value: T[] | undefined | null): T[] => (Array.isArray(value) ? value : []);
const safeText = (value: string | undefined | null, fallback = "Not specified") =>
  value && value.trim().length > 0 ? value : fallback;
const safeNumber = (value: number | undefined | null, fallback = 0) =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

export function MealPlannerClient() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [mealPlan, setMealPlan] = useState<MealPlan | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [savedPlans, setSavedPlans] = useState<SavedMealPlanRecord[]>([]);
  const [savedPlansLoading, setSavedPlansLoading] = useState(false);
  const [savingPlan, setSavingPlan] = useState(false);
  const [planTitle, setPlanTitle] = useState("");

  // Form state
  const [targetWeight, setTargetWeight] = useState<string>("");
  const [timeframeWeeks, setTimeframeWeeks] = useState<string>("");
  const [additionalNotes, setAdditionalNotes] = useState<string>("");
  const [dietaryRestrictions, setDietaryRestrictions] = useState<string[]>([]);
  const [mealFrequency, setMealFrequency] = useState<string>("3");
  const [exercisePlan, setExercisePlan] = useState<string>("");
  const [otherTodos, setOtherTodos] = useState<string[]>([]);
  const [currentTodo, setCurrentTodo] = useState<string>("");

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session?.user) {
          router.push("/auth");
          return;
        }

        setUserId(session.user.id);

        const { data: profileData, error } = await (supabase as any)
          .from("profiles")
          .select("*")
          .eq("id", session.user.id)
          .maybeSingle();

        if (error) throw error;
        setProfile(profileData);
      } catch (error) {
        console.error("Error loading profile:", error);
        toast({
          title: "Error",
          description: "Failed to load profile data.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    void loadProfile();
  }, [router, toast]);

  const addDietaryRestriction = () => {
    const input = document.getElementById("dietary-restriction") as HTMLInputElement;
    if (input?.value.trim()) {
      setDietaryRestrictions([...dietaryRestrictions, input.value.trim()]);
      input.value = "";
    }
  };

  const removeDietaryRestriction = (index: number) => {
    setDietaryRestrictions(dietaryRestrictions.filter((_, i) => i !== index));
  };

  const addTodo = () => {
    if (currentTodo.trim()) {
      setOtherTodos([...otherTodos, currentTodo.trim()]);
      setCurrentTodo("");
    }
  };

  const removeTodo = (index: number) => {
    setOtherTodos(otherTodos.filter((_, i) => i !== index));
  };

  const loadSavedPlans = useCallback(async () => {
    if (!userId) {
      setSavedPlans([]);
      return;
    }

    try {
      setSavedPlansLoading(true);
      const { data, error } = await (supabase as any)
        .from("meal_plans")
        .select("id,title,goal,target_weight,timeframe_weeks,plan,created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      const normalized = (data || []).map((item: any) => ({
        id: item.id,
        title: item.title,
        goal: item.goal,
        target_weight: item.target_weight,
        timeframe_weeks: item.timeframe_weeks,
        created_at: item.created_at,
        plan: item.plan as MealPlan,
      }));

      setSavedPlans(normalized);
    } catch (error) {
      console.error("Failed to load saved meal plans:", error);
      toast({
        title: "Error",
        description: "Could not load your saved meal plans.",
        variant: "destructive",
      });
    } finally {
      setSavedPlansLoading(false);
    }
  }, [toast, userId]);

  useEffect(() => {
    if (userId) {
      void loadSavedPlans();
    }
  }, [userId, loadSavedPlans]);

  useEffect(() => {
    if (mealPlan) {
      const defaultTitle = `Meal Plan - ${new Date().toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      })}`;
      setPlanTitle((prev) => prev || defaultTitle);
    } else {
      setPlanTitle("");
    }
  }, [mealPlan]);

  const generateMealPlan = async () => {
    if (!profile) {
      toast({
        title: "Profile Required",
        description: "Please complete your profile first.",
        variant: "destructive",
      });
      router.push("/profile");
      return;
    }

    if (!targetWeight || !timeframeWeeks) {
      toast({
        title: "Missing Information",
        description: "Please provide target weight and timeframe.",
        variant: "destructive",
      });
      return;
    }

    try {
      setGenerating(true);
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) {
        router.push("/auth");
        return;
      }

      const { data, error } = await supabase.functions.invoke("meal-planner", {
        body: {
          profile: {
            age: profile.age || null,
            gender: profile.gender || null,
            weight_kg: profile.weight_kg || null,
            height_cm: profile.height_cm || null,
            goal: profile.goal || null,
            activity_level: profile.activity_level || null,
          },
          goalDetails: {
            targetWeight: parseFloat(targetWeight),
            timeframeWeeks: parseInt(timeframeWeeks),
            additionalNotes: additionalNotes || undefined,
          },
          preferences: {
            dietaryRestrictions: dietaryRestrictions.length > 0 ? dietaryRestrictions : undefined,
            mealFrequency: parseInt(mealFrequency),
            exercisePlan: exercisePlan || undefined,
            otherTodos: otherTodos.length > 0 ? otherTodos : undefined,
          },
        },
      });

      if (error) throw error;
      if (!data?.ok) {
        throw new Error(data?.error || "Failed to generate meal plan");
      }

      setMealPlan(data.mealPlan);
      toast({
        title: "Meal Plan Generated!",
        description: "Your personalized meal plan is ready.",
      });
    } catch (error: any) {
      console.error("Meal plan generation error:", error);
      toast({
        title: "Generation Failed",
        description: error?.message || "Unable to generate meal plan. Please try again.",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  const handleSaveMealPlan = async () => {
    if (!mealPlan) {
      return;
    }

    if (!userId) {
      toast({
        title: "Sign in required",
        description: "Please sign in again to save this meal plan.",
        variant: "destructive",
      });
      router.push("/auth");
      return;
    }

    const titleToUse = planTitle.trim() || `Meal Plan - ${new Date().toLocaleDateString()}`;

    try {
      setSavingPlan(true);
      const { error } = await (supabase as any).from("meal_plans").insert({
        user_id: userId,
        title: titleToUse,
        goal: profile?.goal || null,
        target_weight: targetWeight ? parseFloat(targetWeight) : null,
        timeframe_weeks: timeframeWeeks ? parseInt(timeframeWeeks) : null,
        plan: mealPlan,
      });

      if (error) {
        throw error;
      }

      toast({
        title: "Meal plan saved",
        description: "You can revisit this plan anytime from your saved list.",
      });
      await loadSavedPlans();
    } catch (error) {
      console.error("Failed to save meal plan:", error);
      toast({
        title: "Save failed",
        description: "We couldn't save this plan. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSavingPlan(false);
    }
  };

  const handleLoadSavedPlan = (record: SavedMealPlanRecord) => {
    try {
      const loadedPlan = record.plan;
      setMealPlan(loadedPlan);
      setPlanTitle(record.title || `Saved Meal Plan - ${formatPlanDate(record.created_at)}`);
      setTargetWeight(record.target_weight ? record.target_weight.toString() : "");
      setTimeframeWeeks(record.timeframe_weeks ? record.timeframe_weeks.toString() : "");

      toast({
        title: "Meal plan loaded",
        description: record.title ? `Viewing ${record.title}.` : "Viewing saved meal plan.",
      });
    } catch (error) {
      console.error("Failed to load saved meal plan:", error);
      toast({
        title: "Load failed",
        description: "We couldn't open that meal plan. Please try again.",
        variant: "destructive",
      });
    }
  };

  const overviewText = safeText(mealPlan?.overview, "Overview was not provided for this plan.");
  const dailyCalorieTarget = safeNumber(mealPlan?.dailyCalorieTarget);
  const dailyCalorieRationale = safeText(
    mealPlan?.dailyCalorieRationale,
    "Calorie rationale was not provided."
  );
  const macroDistribution = mealPlan?.macroDistribution || {
    protein_g: 0,
    carbohydrates_g: 0,
    fat_g: 0,
    fiber_g: 0,
    rationale: "Macro distribution was not provided.",
  };
  const normalizedExercisePlan = mealPlan
    ? {
        types: safeArray(mealPlan.exercisePlan?.types),
        frequency: safeText(mealPlan.exercisePlan?.frequency),
        duration: safeText(mealPlan.exercisePlan?.duration),
        intensity: safeText(mealPlan.exercisePlan?.intensity),
        specificExercises: safeArray(mealPlan.exercisePlan?.specificExercises),
        weeklySchedule: safeText(mealPlan.exercisePlan?.weeklySchedule),
      }
    : null;
  const weeklyMealPlan = safeArray(mealPlan?.weeklyMealPlan);
  const actionItems = safeArray(mealPlan?.actionItems);
  const tips = safeArray(mealPlan?.tips);

  if (loading) {
    return (
      <main className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </main>
    );
  }

  return (
    <main className="flex-1">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" onClick={() => router.push("/dashboard")} className="px-2">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl md:text-4xl font-bold">Meal Planner</h1>
            <p className="text-muted-foreground">Get a personalized meal plan tailored to your goals</p>
          </div>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Saved Meal Plans</CardTitle>
            <CardDescription>Load any plan you&apos;ve saved previously.</CardDescription>
          </CardHeader>
          <CardContent>
            {savedPlansLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading saved plans...
              </div>
            ) : savedPlans.length > 0 ? (
              <div className="space-y-3">
                {savedPlans.map((plan) => (
                  <div
                    key={plan.id}
                    className="border rounded-lg p-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between"
                  >
                    <div>
                      <p className="font-medium">{plan.title || "Untitled meal plan"}</p>
                      <p className="text-xs text-muted-foreground">
                        Saved {formatPlanDate(plan.created_at)}
                        {plan.goal ? ` · Goal: ${plan.goal}` : ""}
                      </p>
                      <div className="text-xs text-muted-foreground flex flex-wrap gap-2 mt-1">
                        {plan.target_weight !== null && <span>Target: {plan.target_weight}kg</span>}
                        {plan.timeframe_weeks !== null && <span>Timeline: {plan.timeframe_weeks} weeks</span>}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleLoadSavedPlan(plan)}>
                        View plan
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No saved meal plans yet. Generate a plan and tap “Save Plan” to keep it here.
              </p>
            )}
          </CardContent>
        </Card>

        {!mealPlan ? (
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-primary" />
                  Goal Details
                </CardTitle>
                <CardDescription>Set your target and timeframe</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="target-weight">Target Weight (kg)</Label>
                  <Input
                    id="target-weight"
                    type="number"
                    value={targetWeight}
                    onChange={(e) => setTargetWeight(e.target.value)}
                    placeholder={profile?.weight_kg ? `Current: ${profile.weight_kg} kg` : "e.g., 70"}
                  />
                </div>
                <div>
                  <Label htmlFor="timeframe">Timeframe (weeks)</Label>
                  <Input
                    id="timeframe"
                    type="number"
                    value={timeframeWeeks}
                    onChange={(e) => setTimeframeWeeks(e.target.value)}
                    placeholder="e.g., 12"
                  />
                </div>
                <div>
                  <Label htmlFor="notes">Additional Notes</Label>
                  <Textarea
                    id="notes"
                    value={additionalNotes}
                    onChange={(e) => setAdditionalNotes(e.target.value)}
                    placeholder="Any specific requirements or preferences..."
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UtensilsCrossed className="h-5 w-5 text-primary" />
                  Preferences
                </CardTitle>
                <CardDescription>Customize your meal plan</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="meal-frequency">Meals per Day</Label>
                  <Select value={mealFrequency} onValueChange={setMealFrequency}>
                    <SelectTrigger id="meal-frequency">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="3">3 meals</SelectItem>
                      <SelectItem value="4">4 meals</SelectItem>
                      <SelectItem value="5">5 meals</SelectItem>
                      <SelectItem value="6">6 meals</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="dietary-restriction">Dietary Restrictions</Label>
                  <div className="flex gap-2">
                    <Input
                      id="dietary-restriction"
                      placeholder="e.g., Vegetarian, Gluten-free"
                      onKeyPress={(e) => e.key === "Enter" && addDietaryRestriction()}
                    />
                    <Button type="button" variant="outline" onClick={addDietaryRestriction}>
                      Add
                    </Button>
                  </div>
                  {dietaryRestrictions.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {dietaryRestrictions.map((restriction, idx) => (
                        <Badge key={idx} variant="secondary" className="cursor-pointer" onClick={() => removeDietaryRestriction(idx)}>
                          {restriction} ×
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <Label htmlFor="exercise-plan">Exercise Plan</Label>
                  <Textarea
                    id="exercise-plan"
                    value={exercisePlan}
                    onChange={(e) => setExercisePlan(e.target.value)}
                    placeholder="e.g., 30 min cardio 3x/week, strength training 2x/week"
                    rows={2}
                  />
                </div>
                <div>
                  <Label htmlFor="todo">Additional Todos</Label>
                  <div className="flex gap-2">
                    <Input
                      id="todo"
                      value={currentTodo}
                      onChange={(e) => setCurrentTodo(e.target.value)}
                      placeholder="e.g., Drink 2L water daily"
                      onKeyPress={(e) => e.key === "Enter" && addTodo()}
                    />
                    <Button type="button" variant="outline" onClick={addTodo}>
                      Add
                    </Button>
                  </div>
                  {otherTodos.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {otherTodos.map((todo, idx) => (
                        <Badge key={idx} variant="secondary" className="cursor-pointer" onClick={() => removeTodo(idx)}>
                          {todo} ×
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="space-y-6">
            <Card className="border-primary/20 bg-primary/5">
              <CardHeader>
                <CardTitle>Plan Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed">{overviewText}</p>
              </CardContent>
            </Card>

            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Flame className="h-5 w-5 text-primary" />
                    Daily Targets
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <div className="text-sm text-muted-foreground">Calories</div>
                    <div className="text-2xl font-bold">
                      {dailyCalorieTarget ? `${dailyCalorieTarget} kcal` : "Not specified"}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{dailyCalorieRationale}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3 pt-3 border-t">
                    <div>
                      <div className="text-xs text-muted-foreground">Protein</div>
                      <div className="font-semibold">{macroDistribution.protein_g}g</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Carbs</div>
                      <div className="font-semibold">{macroDistribution.carbohydrates_g}g</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Fat</div>
                      <div className="font-semibold">{macroDistribution.fat_g}g</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Fiber</div>
                      <div className="font-semibold">{macroDistribution.fiber_g}g</div>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">{macroDistribution.rationale}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Dumbbell className="h-5 w-5 text-primary" />
                    Exercise Plan
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <div className="text-sm font-medium mb-2">Types</div>
                    {normalizedExercisePlan?.types.length ? (
                      <div className="flex flex-wrap gap-2">
                        {normalizedExercisePlan.types.map((type, idx) => (
                          <Badge key={idx} variant="outline">
                            {type}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No exercise types provided.</p>
                    )}
                  </div>
                  <div>
                    <div className="text-sm font-medium">Frequency</div>
                    <div className="text-muted-foreground">
                      {normalizedExercisePlan?.frequency || "Not specified"}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium">Duration</div>
                    <div className="text-muted-foreground">
                      {normalizedExercisePlan?.duration || "Not specified"}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium">Intensity</div>
                    <div className="text-muted-foreground">
                      {normalizedExercisePlan?.intensity || "Not specified"}
                    </div>
                  </div>
                  {normalizedExercisePlan && normalizedExercisePlan.specificExercises.length > 0 && (
                    <div>
                      <div className="text-sm font-medium mb-2">Specific Exercises</div>
                      <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                        {normalizedExercisePlan.specificExercises.map((exercise, idx) => (
                          <li key={idx}>{exercise}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <div>
                    <div className="text-sm font-medium">Weekly Schedule</div>
                    <div className="text-muted-foreground text-sm">
                      {normalizedExercisePlan?.weeklySchedule || "Not specified"}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  Weekly Meal Plan
                </CardTitle>
              </CardHeader>
              <CardContent>
                {weeklyMealPlan.length > 0 ? (
                  <div className="space-y-6">
                    {weeklyMealPlan.map((dayPlan, dayIdx) => (
                      <div key={dayIdx} className="border rounded-lg p-4">
                        <h3 className="font-semibold text-lg mb-3">{dayPlan.day || `Day ${dayIdx + 1}`}</h3>
                        <div className="space-y-4">
                          {safeArray(dayPlan.meals).map((meal, mealIdx) => (
                            <div key={mealIdx} className="border-l-2 border-primary/30 pl-4">
                              <div className="flex items-center justify-between mb-2">
                                <span className="font-medium capitalize">{meal?.type || "Meal"}</span>
                                <span className="text-sm text-muted-foreground">
                                  {typeof meal?.totalCalories === "number" ? `${meal.totalCalories} kcal` : "—"}
                                </span>
                              </div>
                              <div className="text-sm font-medium mb-1">{meal?.name || "Details not provided"}</div>
                              <ul className="text-sm text-muted-foreground space-y-1 mb-2">
                                {safeArray(meal?.foods).map((food, foodIdx) => (
                                  <li key={foodIdx}>
                                    • {food?.name || "Food"} ({food?.quantity || "quantity not specified"}) -{" "}
                                    {typeof food?.calories === "number" ? `${food.calories} kcal` : "—"}
                                  </li>
                                ))}
                              </ul>
                              <div className="text-xs text-muted-foreground">
                                P: {meal?.macros?.protein_g ?? "—"}g | C: {meal?.macros?.carbohydrates_g ?? "—"}g | F:{" "}
                                {meal?.macros?.fat_g ?? "—"}g
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Weekly meal plan details were not provided.</p>
                )}
              </CardContent>
            </Card>

           

            <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Apple className="h-5 w-5 text-primary" />
                    Tips & Considerations
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {tips.length > 0 ? (
                    <ul className="list-disc list-inside text-sm text-muted-foreground space-y-2">
                      {tips.map((tip, idx) => (
                        <li key={idx}>{tip}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">No tips were provided for this plan.</p>
                  )}
                </CardContent>
              </Card>

            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="w-full md:max-w-sm">
                <Label htmlFor="plan-title" className="sr-only">
                  Plan title
                </Label>
                <Input
                  id="plan-title"
                  value={planTitle}
                  onChange={(event) => setPlanTitle(event.target.value)}
                  placeholder="Name this meal plan"
                />
              </div>
              <div className="flex flex-wrap gap-3">
                <Button onClick={() => setMealPlan(null)} variant="outline">
                  Create New Plan
                </Button>
                <Button onClick={generateMealPlan} disabled={generating}>
                  {generating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Regenerating...
                    </>
                  ) : (
                    "Regenerate Plan"
                  )}
                </Button>
                <Button onClick={handleSaveMealPlan} disabled={savingPlan}>
                  {savingPlan ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...
                    </>
                  ) : (
                    "Save Plan"
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}

        {!mealPlan && (
          <div className="mt-6">
            <Button
              onClick={generateMealPlan}
              disabled={generating || !targetWeight || !timeframeWeeks}
              size="lg"
              className="w-full md:w-auto"
            >
              {generating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generating Meal Plan...
                </>
              ) : (
                <>
                  <UtensilsCrossed className="h-4 w-4 mr-2" /> Generate Meal Plan
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    </main>
  );
}

