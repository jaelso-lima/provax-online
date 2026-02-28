import { useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Save, Plus, Pencil, Trash2, ShoppingBag } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

interface ContentForm {
  id?: string;
  chave: string;
  valor: string;
  tipo: string;
}

const CONTENT_TYPES = ["text", "title", "description", "feature", "price", "cta"];

const SUGGESTED_KEYS = [
  { chave: "hero_title", tipo: "title", label: "Título do Hero" },
  { chave: "hero_subtitle", tipo: "description", label: "Subtítulo do Hero" },
  { chave: "hero_cta", tipo: "cta", label: "Texto do botão CTA" },
  { chave: "plan_free_features", tipo: "feature", label: "Features Plano Free" },
  { chave: "plan_start_price", tipo: "price", label: "Preço Plano Start" },
  { chave: "plan_start_features", tipo: "feature", label: "Features Plano Start" },
  { chave: "plan_pro_price", tipo: "price", label: "Preço Plano Pro" },
  { chave: "plan_pro_features", tipo: "feature", label: "Features Plano Pro" },
  { chave: "garantia_text", tipo: "text", label: "Texto de Garantia" },
  { chave: "contact_email", tipo: "text", label: "Email de Contato" },
  { chave: "contact_instagram", tipo: "text", label: "Instagram" },
];

export default function AdminCMS() {
  const { user } = useAuth();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<ContentForm>({ chave: "", valor: "", tipo: "text" });
  const queryClient = useQueryClient();

  const { data: contents, isLoading } = useQuery({
    queryKey: ["admin-site-content"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_content")
        .select("*")
        .order("chave");
      if (error) throw error;
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (content: ContentForm) => {
      if (content.id) {
        const { error } = await supabase.from("site_content").update({
          valor: content.valor,
          tipo: content.tipo,
          updated_at: new Date().toISOString(),
          updated_by: user!.id,
        }).eq("id", content.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("site_content").insert({
          chave: content.chave,
          valor: content.valor,
          tipo: content.tipo,
          updated_by: user!.id,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Conteúdo salvo");
      queryClient.invalidateQueries({ queryKey: ["admin-site-content"] });
      setDialogOpen(false);
    },
    onError: (e: any) => toast.error(e.message || "Erro ao salvar"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("site_content").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Conteúdo excluído");
      queryClient.invalidateQueries({ queryKey: ["admin-site-content"] });
    },
  });

  const openNew = (suggested?: { chave: string; tipo: string }) => {
    setForm({ chave: suggested?.chave || "", valor: "", tipo: suggested?.tipo || "text" });
    setDialogOpen(true);
  };

  const openEdit = (c: any) => {
    setForm({ id: c.id, chave: c.chave, valor: c.valor, tipo: c.tipo });
    setDialogOpen(true);
  };

  const existingKeys = new Set(contents?.map((c) => c.chave) ?? []);
  const missingSuggestions = SUGGESTED_KEYS.filter((s) => !existingKeys.has(s.chave));

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold font-['Space_Grotesk']">Gestão da Página de Venda</h1>
            <p className="text-muted-foreground text-sm">Edite textos, preços e benefícios exibidos na landing page</p>
          </div>
          <Button onClick={() => openNew()} className="gap-2">
            <Plus className="h-4 w-4" />
            Novo Conteúdo
          </Button>
        </div>

        {/* Suggested keys */}
        {missingSuggestions.length > 0 && (
          <Card className="border-dashed">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <ShoppingBag className="h-4 w-4" />
                Conteúdos sugeridos para configurar
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {missingSuggestions.map((s) => (
                  <Button key={s.chave} variant="outline" size="sm" className="gap-1 text-xs" onClick={() => openNew(s)}>
                    <Plus className="h-3 w-3" />
                    {s.label}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Content list */}
        <div className="space-y-3">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Carregando...</div>
          ) : contents?.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-8 text-center text-muted-foreground">
                Nenhum conteúdo configurado. Use os botões sugeridos acima para começar.
              </CardContent>
            </Card>
          ) : (
            contents?.map((c) => (
              <Card key={c.id}>
                <CardContent className="py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <code className="text-xs bg-muted px-2 py-0.5 rounded font-mono">{c.chave}</code>
                        <Badge variant="outline" className="text-xs">{c.tipo}</Badge>
                      </div>
                      <p className="mt-1 text-sm text-foreground line-clamp-2">{c.valor || "(vazio)"}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Atualizado: {new Date(c.updated_at).toLocaleString("pt-BR")}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(c)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Excluir conteúdo?</AlertDialogTitle>
                            <AlertDialogDescription>O conteúdo "{c.chave}" será removido permanentemente.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteMutation.mutate(c.id)}>Excluir</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{form.id ? "Editar Conteúdo" : "Novo Conteúdo"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Chave (identificador)</Label>
              <Input
                value={form.chave}
                onChange={(e) => setForm({ ...form, chave: e.target.value })}
                disabled={!!form.id}
                placeholder="ex: hero_title"
                className="font-mono text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CONTENT_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Conteúdo</Label>
              <Textarea
                value={form.valor}
                onChange={(e) => setForm({ ...form, valor: e.target.value })}
                rows={4}
                placeholder="Digite o conteúdo..."
              />
            </div>
            <Button
              className="w-full gap-2"
              onClick={() => saveMutation.mutate(form)}
              disabled={saveMutation.isPending || !form.chave || !form.valor}
            >
              <Save className="h-4 w-4" />
              {saveMutation.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
