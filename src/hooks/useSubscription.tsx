import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface UserPlan {
  plan_id: string;
  code: "free" | "premium" | "ultra";
  name: string;
  monthly_educoins: number;
  max_notebooks: number | null;
  max_sources_per_notebook: number | null;
  voice_chat_access: boolean;
  read_aloud_access: boolean;
  premium_courses_access: boolean;
  status: string;
  current_period_end: string | null;
}

export const useSubscription = () => {
  const { user } = useAuth();
  const qc = useQueryClient();

  const plans = useQuery({
    queryKey: ["subscription-plans"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscription_plans" as any)
        .select("*")
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw error;
      return data as any[];
    },
  });

  const myPlan = useQuery({
    queryKey: ["my-plan", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<UserPlan | null> => {
      const { data, error } = await supabase.rpc("get_user_plan" as any, { p_user_id: user!.id });
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      return (row as UserPlan) || null;
    },
  });

  const mySubscription = useQuery({
    queryKey: ["my-subscription", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_subscriptions" as any)
        .select("*, subscription_plans(*)")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const subscribe = useMutation({
    mutationFn: async (payload: {
      plan_code: "premium" | "ultra";
      billing_cycle?: "monthly" | "yearly";
      discount_code?: string;
      payer_email?: string;
    }) => {
      const { data, error } = await supabase.functions.invoke("mp-create-checkout", { body: payload });
      if (error) {
        let message = error.message || "No se pudo iniciar el pago";
        const context = (error as any).context;
        if (context?.json) {
          try {
            const body = await context.json();
            message = body?.error || body?.message || message;
          } catch {}
        }
        throw new Error(message);
      }
      if (!data?.init_point) throw new Error(data?.error || "No se pudo iniciar el pago");
      return data as {
        success: boolean;
        preference_id: string;
        init_point: string;
        final_amount_cop: number;
        discount_amount_cop: number;
      };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-plan"] });
      qc.invalidateQueries({ queryKey: ["my-subscription"] });
    },
  });

  const validateDiscount = async (params: {
    code: string;
    plan_code: string;
    billing_cycle: "monthly" | "yearly";
    amount_cop: number;
  }) => {
    const { data, error } = await supabase.rpc("validate_discount_code" as any, {
      _code: params.code,
      _plan_code: params.plan_code,
      _billing_cycle: params.billing_cycle,
      _amount_cop: params.amount_cop,
    });
    if (error) throw error;
    return data as any;
  };

  const cancel = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("mp-cancel-subscription", { body: {} });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-subscription"] });
    },
  });

  return { plans, myPlan, mySubscription, subscribe, cancel, validateDiscount };
};
