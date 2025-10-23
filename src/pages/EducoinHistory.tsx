import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, Coins, ShoppingCart, Clock } from "lucide-react";
import { Sidebar } from "@/components/Sidebar";
import { BottomNav } from "@/components/BottomNav";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface EducoinTransaction {
  id: string;
  amount: number;
  educoins: number;
  payment_status: string;
  transaction_ref: string;
  created_at: string;
  completed_at: string | null;
}

export default function EducoinHistory() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [transactions, setTransactions] = useState<EducoinTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalSpent, setTotalSpent] = useState(0);
  const [totalPurchased, setTotalPurchased] = useState(0);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
      return;
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    const fetchTransactions = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from("educoin_transactions")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (error) throw error;

        setTransactions(data || []);

        // Calculate totals
        const completedTransactions = (data || []).filter(
          (t) => t.payment_status === "approved"
        );
        const spent = completedTransactions.reduce((sum, t) => sum + t.amount, 0);
        const purchased = completedTransactions.reduce((sum, t) => sum + t.educoins, 0);
        setTotalSpent(spent);
        setTotalPurchased(purchased);
      } catch (error) {
        console.error("Error fetching transactions:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTransactions();
  }, [user]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
    }).format(price);
  };

  const getStatusLabel = (status: string) => {
    const statusMap: Record<string, { label: string; color: string }> = {
      pending: { label: "Pendiente", color: "text-yellow-500" },
      approved: { label: "Aprobado", color: "text-green-500" },
      rejected: { label: "Rechazado", color: "text-red-500" },
      cancelled: { label: "Cancelado", color: "text-gray-500" },
    };
    return statusMap[status] || { label: status, color: "text-gray-500" };
  };

  if (authLoading) {
    return <div className="min-h-screen bg-background" />;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="flex">
        <Sidebar />
        <div className="flex-1 md:ml-64 pb-20 md:pb-0">
          <div className="container mx-auto px-4 py-8 max-w-4xl">
            <Button
              variant="ghost"
              onClick={() => navigate(-1)}
              className="mb-6"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver
            </Button>

            <div className="flex items-center gap-3 mb-6">
              <ShoppingCart className="h-8 w-8 text-primary" />
              <h1 className="text-3xl font-bold">Historial de Compras</h1>
            </div>

            <div className="grid md:grid-cols-2 gap-4 mb-6">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Coins className="h-4 w-4 text-primary" />
                    Total Comprado
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-primary">{totalPurchased} Educoins</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                    Total Gastado
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{formatPrice(totalSpent)}</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Transacciones</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Cargando transacciones...
                  </div>
                ) : transactions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Coins className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No hay transacciones aún</p>
                    <Button
                      onClick={() => navigate("/buy-educoins")}
                      className="mt-4"
                    >
                      Comprar Educoins
                    </Button>
                  </div>
                ) : (
                  <ScrollArea className="h-[500px] pr-4">
                    <div className="space-y-4">
                      {transactions.map((transaction) => {
                        const status = getStatusLabel(transaction.payment_status);
                        return (
                          <div
                            key={transaction.id}
                            className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                          >
                            <div className="flex items-start gap-3">
                              <div className="p-2 bg-primary/10 rounded-full">
                                <Coins className="h-5 w-5 text-primary" />
                              </div>
                              <div>
                                <p className="font-semibold">
                                  {transaction.educoins} Educoins
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {formatPrice(transaction.amount)}
                                </p>
                                <div className="flex items-center gap-2 mt-1">
                                  <Clock className="h-3 w-3 text-muted-foreground" />
                                  <p className="text-xs text-muted-foreground">
                                    {new Date(transaction.created_at).toLocaleDateString("es-CO", {
                                      year: "numeric",
                                      month: "short",
                                      day: "numeric",
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
                                  </p>
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className={`text-sm font-semibold ${status.color}`}>
                                {status.label}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {transaction.transaction_ref}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
