import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Eye, Users, ShoppingCart } from "lucide-react";

interface Promo {
  id: string;
  titulo: string;
  descricao: string;
  preco_promocional: number;
  preco_original: number;
  plano_destino: string;
  checkout_url: string | null;
  duracao_timer_minutos: number;
  data_inicio: string;
  data_fim: string;
  ativo: boolean;
  exibir_para: string;
  mostrar_apenas_uma_vez: boolean;
  created_at: string;
}

const emptyPromo = {
  titulo: "",
  descricao: "",
  preco_promocional: 0,
  preco_original: 0,
  plano_destino: "pro",
  checkout_url: "",
  duracao_timer_minutos: 30,
  data_inicio: new Date().toISOString().slice(0, 16),
  data_fim: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 16),
  ativo: false,
  exibir_para: "free",
  mostrar_apenas_uma_vez: true,
};

export default function AdminPromocoes() {
  const [promos, setPromos] = useState<Promo[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState(emptyPromo);
  const [saving, setSaving] = useState(false);
  const [stats, setStats] = useState<Record<string, { views: number; conversions: number }>>({});

  useEffect(() => { loadPromos(); }, []);

  const loadPromos = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("promocoes_popup")
      .select("*")
      .order("created_at", { ascending: false });
    setPromos((data as any[]) || []);

    // Load stats
    const { data: controls } = await supabase.from("user_popup_controle").select("popup_id, visualizado, convertido");
    const s: Record<string, { views: number; conversions: number }> = {};
    (controls || []).forEach((c: any) => {
      if (!s[c.popup_id]) s[c.popup_id] = { views: 0, conversions: 0 };
      if (c.visualizado) s[c.popup_id].views++;
      if (c.convertido) s[c.popup_id].conversions++;
    });
    setStats(s);
    setLoading(false);
  };

  const handleSave = async () => {
    if (!form.titulo.trim()) { toast({ title: "Título obrigatório", variant: "destructive" }); return; }
    setSaving(true);

    const payload = {
      titulo: form.titulo,
      descricao: form.descricao,
      preco_promocional: form.preco_promocional,
      preco_original: form.preco_original,
      plano_destino: form.plano_destino,
      checkout_url: form.checkout_url || null,
      duracao_timer_minutos: form.duracao_timer_minutos,
      data_inicio: new Date(form.data_inicio).toISOString(),
      data_fim: new Date(form.data_fim).toISOString(),
      ativo: form.ativo,
      exibir_para: form.exibir_para,
      mostrar_apenas_uma_vez: form.mostrar_apenas_uma_vez,
    };

    if (editing) {
      await supabase.from("promocoes_popup").update(payload).eq("id", editing);
      toast({ title: "Promoção atualizada" });
    } else {
      await supabase.from("promocoes_popup").insert(payload);
      toast({ title: "Promoção criada" });
    }

    setSaving(false);
    setShowForm(false);
    setEditing(null);
    setForm(emptyPromo);
    loadPromos();
  };

  const handleEdit = (p: Promo) => {
    setEditing(p.id);
    setForm({
      titulo: p.titulo,
      descricao: p.descricao,
      preco_promocional: p.preco_promocional,
      preco_original: p.preco_original,
      plano_destino: p.plano_destino,
      checkout_url: p.checkout_url || "",
      duracao_timer_minutos: p.duracao_timer_minutos,
      data_inicio: new Date(p.data_inicio).toISOString().slice(0, 16),
      data_fim: new Date(p.data_fim).toISOString().slice(0, 16),
      ativo: p.ativo,
      exibir_para: p.exibir_para,
      mostrar_apenas_uma_vez: p.mostrar_apenas_uma_vez,
    });
    setShowForm(true);
  };

  const handleToggle = async (id: string, ativo: boolean) => {
    await supabase.from("promocoes_popup").update({ ativo: !ativo }).eq("id", id);
    loadPromos();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir promoção?")) return;
    await supabase.from("promocoes_popup").delete().eq("id", id);
    toast({ title: "Promoção excluída" });
    loadPromos();
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Promoções</h1>
            <p className="text-sm text-muted-foreground">Gerencie popups promocionais com timer de escassez</p>
          </div>
          <Button onClick={() => { setEditing(null); setForm(emptyPromo); setShowForm(true); }} className="gap-2">
            <Plus className="h-4 w-4" /> Nova Promoção
          </Button>
        </div>

        {loading ? (
          <p className="text-muted-foreground text-sm">Carregando...</p>
        ) : promos.length === 0 ? (
          <Card><CardContent className="py-12 text-center text-muted-foreground">Nenhuma promoção cadastrada</CardContent></Card>
        ) : (
          <div className="grid gap-4">
            {promos.map(p => {
              const s = stats[p.id] || { views: 0, conversions: 0 };
              const isActive = p.ativo && new Date(p.data_fim) > new Date();
              return (
                <Card key={p.id} className={!isActive ? "opacity-60" : ""}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold">{p.titulo}</h3>
                          <Badge variant={isActive ? "default" : "secondary"}>{isActive ? "Ativo" : "Inativo"}</Badge>
                          <Badge variant="outline">{p.exibir_para}</Badge>
                          <Badge variant="outline">{p.plano_destino.toUpperCase()}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{p.descricao}</p>
                        <div className="flex gap-4 text-xs text-muted-foreground">
                          <span>De R$ {Number(p.preco_original).toFixed(2)} → R$ {Number(p.preco_promocional).toFixed(2)}</span>
                          <span>⏱️ {p.duracao_timer_minutos}min</span>
                          <span>{new Date(p.data_inicio).toLocaleDateString()} - {new Date(p.data_fim).toLocaleDateString()}</span>
                        </div>
                        <div className="flex gap-4 text-xs">
                          <span className="flex items-center gap-1"><Eye className="h-3 w-3" /> {s.views} visualizações</span>
                          <span className="flex items-center gap-1"><ShoppingCart className="h-3 w-3" /> {s.conversions} conversões</span>
                          {s.views > 0 && <span className="text-primary font-medium">{((s.conversions / s.views) * 100).toFixed(1)}% taxa</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch checked={p.ativo} onCheckedChange={() => handleToggle(p.id, p.ativo)} />
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(p)}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(p.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Form Dialog */}
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editing ? "Editar Promoção" : "Nova Promoção"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div><Label>Título *</Label><Input value={form.titulo} onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))} placeholder="🔥 Oferta Relâmpago" /></div>
              <div><Label>Descrição</Label><Textarea value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} placeholder="Texto persuasivo..." rows={3} /></div>
              
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Preço Original (R$)</Label><Input type="number" step="0.01" value={form.preco_original} onChange={e => setForm(f => ({ ...f, preco_original: parseFloat(e.target.value) || 0 }))} /></div>
                <div><Label>Preço Promocional (R$)</Label><Input type="number" step="0.01" value={form.preco_promocional} onChange={e => setForm(f => ({ ...f, preco_promocional: parseFloat(e.target.value) || 0 }))} /></div>
              </div>
              
              <div><Label>Plano Destino</Label>
                <Select value={form.plano_destino} onValueChange={v => setForm(f => ({ ...f, plano_destino: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="start">Premium (R$ 29,90)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div><Label>URL de Checkout (opcional)</Label><Input value={form.checkout_url} onChange={e => setForm(f => ({ ...f, checkout_url: e.target.value }))} placeholder="https://..." /></div>
              
              <div><Label>Duração do Timer (minutos)</Label><Input type="number" value={form.duracao_timer_minutos} onChange={e => setForm(f => ({ ...f, duracao_timer_minutos: parseInt(e.target.value) || 30 }))} /></div>
              
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Data Início</Label><Input type="datetime-local" value={form.data_inicio} onChange={e => setForm(f => ({ ...f, data_inicio: e.target.value }))} /></div>
                <div><Label>Data Fim</Label><Input type="datetime-local" value={form.data_fim} onChange={e => setForm(f => ({ ...f, data_fim: e.target.value }))} /></div>
              </div>

              <div><Label>Exibir Para</Label>
                <Select value={form.exibir_para} onValueChange={v => setForm(f => ({ ...f, exibir_para: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os usuários</SelectItem>
                    <SelectItem value="free">Apenas plano Free</SelectItem>
                    <SelectItem value="nao_assinantes">Não assinantes</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <Label>Mostrar apenas uma vez</Label>
                <Switch checked={form.mostrar_apenas_uma_vez} onCheckedChange={v => setForm(f => ({ ...f, mostrar_apenas_uma_vez: v }))} />
              </div>

              <div className="flex items-center justify-between">
                <Label>Ativo</Label>
                <Switch checked={form.ativo} onCheckedChange={v => setForm(f => ({ ...f, ativo: v }))} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
              <Button onClick={handleSave} disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
