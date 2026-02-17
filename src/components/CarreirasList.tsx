import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, GraduationCap } from "lucide-react";

interface Carreira {
  id: string;
  nome: string;
  descricao: string | null;
}

export default function CarreirasList() {
  const [carreiras, setCarreiras] = useState<Carreira[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCarreiras = async () => {
      const { data, error } = await supabase
        .from("carreiras")
        .select("*")
        .order("nome");

      if (error) {
        console.error("Erro ao buscar carreiras:", error);
      } else {
        setCarreiras(data ?? []);
      }
      setLoading(false);
    };

    fetchCarreiras();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (carreiras.length === 0) {
    return <p className="text-sm text-muted-foreground">Nenhuma carreira encontrada.</p>;
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {carreiras.map((c) => (
        <Card key={c.id} className="transition-shadow hover:shadow-md">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">{c.nome}</CardTitle>
            </div>
            <CardDescription>{c.descricao || "Sem descrição"}</CardDescription>
          </CardHeader>
        </Card>
      ))}
    </div>
  );
}
