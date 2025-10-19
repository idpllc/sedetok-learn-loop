import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const useEducoins = () => {
  const queryClient = useQueryClient();

  const { data: balance, isLoading } = useQuery({
    queryKey: ["educoin-balance"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No autenticado");

      const { data, error } = await supabase
        .from("profiles")
        .select("educoins")
        .eq("id", user.id)
        .single();

      if (error) throw error;
      return data.educoins || 0;
    },
  });

  const { data: transactions, isLoading: isLoadingTransactions } = useQuery({
    queryKey: ["educoin-transactions"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No autenticado");

      const { data, error } = await supabase
        .from("educoin_transactions")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const createTransaction = useMutation({
    mutationFn: async ({
      amount,
      educoins,
      transactionRef,
    }: {
      amount: number;
      educoins: number;
      transactionRef: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No autenticado");

      const { data, error } = await supabase
        .from("educoin_transactions")
        .insert({
          user_id: user.id,
          amount,
          educoins,
          transaction_ref: transactionRef,
          payment_status: "pending",
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["educoin-transactions"] });
    },
  });

  const deductEducoins = async (amount: number, reason: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("educoins")
        .eq("id", user.id)
        .single();

      if (!profile) return false;

      const currentBalance = profile.educoins || 0;
      
      if (currentBalance < amount) {
        toast.error("Educoins insuficientes", {
          description: `Necesitas ${amount} Educoins. Tienes ${currentBalance}.`,
        });
        return false;
      }

      const newBalance = currentBalance - amount;

      const { error } = await supabase
        .from("profiles")
        .update({ educoins: newBalance })
        .eq("id", user.id);

      if (error) throw error;

      toast.success(`-${amount} Educoins`, {
        description: reason,
        duration: 2000,
      });

      queryClient.invalidateQueries({ queryKey: ["educoin-balance"] });

      return true;
    } catch (error) {
      console.error("Error deduciendo Educoins:", error);
      return false;
    }
  };

  return {
    balance,
    isLoading,
    transactions,
    isLoadingTransactions,
    createTransaction,
    deductEducoins,
  };
};
