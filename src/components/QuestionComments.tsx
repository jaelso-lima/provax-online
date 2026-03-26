import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { usePlanConfig } from "@/hooks/usePlanConfig";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { MessageSquare, ThumbsUp, Send, Loader2, Reply, Trash2, Lock } from "lucide-react";

interface Comment {
  id: string;
  user_id: string;
  texto: string;
  tipo: string;
  resposta_id: string | null;
  likes: number;
  created_at: string;
  user_nome?: string;
  user_liked?: boolean;
  replies?: Comment[];
}

interface QuestionCommentsProps {
  questaoId: string;
}

export default function QuestionComments({ questaoId }: QuestionCommentsProps) {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");

  useEffect(() => {
    if (questaoId) loadComments();
  }, [questaoId]);

  const loadComments = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("comentarios")
      .select("*")
      .eq("questao_id", questaoId)
      .order("created_at", { ascending: true });

    if (data) {
      // Load user names
      const userIds = [...new Set(data.map((c: any) => c.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, nome")
        .in("id", userIds);
      const nameMap: Record<string, string> = {};
      profiles?.forEach((p: any) => { nameMap[p.id] = p.nome; });

      // Load user likes
      let userLikes: Set<string> = new Set();
      if (user) {
        const { data: likes } = await supabase
          .from("comentario_likes")
          .select("comentario_id")
          .eq("user_id", user.id)
          .in("comentario_id", data.map((c: any) => c.id));
        likes?.forEach((l: any) => userLikes.add(l.comentario_id));
      }

      // Organize into threads
      const all = data.map((c: any) => ({
        ...c,
        user_nome: nameMap[c.user_id] || "Usuário",
        user_liked: userLikes.has(c.id),
        replies: [] as Comment[],
      }));

      const topLevel: Comment[] = [];
      const replyMap: Record<string, Comment[]> = {};

      all.forEach((c: Comment) => {
        if (c.resposta_id) {
          if (!replyMap[c.resposta_id]) replyMap[c.resposta_id] = [];
          replyMap[c.resposta_id].push(c);
        } else {
          topLevel.push(c);
        }
      });

      topLevel.forEach(c => { c.replies = replyMap[c.id] || []; });
      setComments(topLevel);
    }
    setLoading(false);
  };

  const handleSubmit = async (parentId?: string) => {
    const text = parentId ? replyText : newComment;
    if (!text.trim() || !user) return;
    setSubmitting(true);

    const { error } = await supabase.from("comentarios").insert({
      questao_id: questaoId,
      user_id: user.id,
      texto: text.trim(),
      tipo: "usuario",
      resposta_id: parentId || null,
    });

    if (error) toast({ title: "Erro ao enviar comentário", variant: "destructive" });
    else {
      if (parentId) { setReplyText(""); setReplyTo(null); }
      else setNewComment("");
      loadComments();
    }
    setSubmitting(false);
  };

  const handleLike = async (commentId: string, alreadyLiked: boolean) => {
    if (!user) return;
    if (alreadyLiked) {
      await supabase.from("comentario_likes").delete().eq("comentario_id", commentId).eq("user_id", user.id);
    } else {
      await supabase.from("comentario_likes").insert({ comentario_id: commentId, user_id: user.id });
    }
    // Update likes count
    const { count } = await supabase.from("comentario_likes").select("id", { count: "exact", head: true }).eq("comentario_id", commentId);
    await supabase.from("comentarios").update({ likes: count || 0 }).eq("id", commentId);
    loadComments();
  };

  const handleDelete = async (commentId: string) => {
    await supabase.from("comentarios").delete().eq("id", commentId);
    loadComments();
    toast({ title: "Comentário removido" });
  };

  const professorComments = comments.filter(c => c.tipo === "professor");
  const userComments = comments.filter(c => c.tipo === "usuario");

  const renderComment = (c: Comment, isReply = false) => (
    <div key={c.id} className={`${isReply ? "ml-6 border-l-2 border-muted pl-3" : ""} py-2`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold">{c.user_nome}</span>
            {c.tipo === "professor" && <span className="text-[10px] bg-primary/10 text-primary rounded-full px-2 py-0.5">Professor</span>}
            <span className="text-[10px] text-muted-foreground">{new Date(c.created_at).toLocaleDateString("pt-BR")}</span>
          </div>
          <p className="text-sm text-foreground/90">{c.texto}</p>
          <div className="flex items-center gap-3 mt-1.5">
            <button
              onClick={() => handleLike(c.id, !!c.user_liked)}
              className={`flex items-center gap-1 text-xs transition-colors ${c.user_liked ? "text-primary font-medium" : "text-muted-foreground hover:text-primary"}`}
            >
              <ThumbsUp className="h-3 w-3" /> {c.likes > 0 && c.likes}
            </button>
            {!isReply && (
              <button
                onClick={() => { setReplyTo(replyTo === c.id ? null : c.id); setReplyText(""); }}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              >
                <Reply className="h-3 w-3" /> Responder
              </button>
            )}
            {user && c.user_id === user.id && (
              <button onClick={() => handleDelete(c.id)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive">
                <Trash2 className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Reply form */}
      {replyTo === c.id && (
        <div className="mt-2 ml-2 flex gap-2">
          <Textarea
            placeholder="Sua resposta..."
            value={replyText}
            onChange={e => setReplyText(e.target.value)}
            rows={2}
            className="text-sm"
          />
          <Button size="sm" onClick={() => handleSubmit(c.id)} disabled={submitting || !replyText.trim()}>
            <Send className="h-3 w-3" />
          </Button>
        </div>
      )}

      {/* Replies */}
      {c.replies && c.replies.length > 0 && (
        <div className="mt-1">
          {c.replies.map(r => renderComment(r, true))}
        </div>
      )}
    </div>
  );

  return (
    <div className="mt-4 rounded-lg border bg-card">
      <Tabs defaultValue="professor" className="w-full">
        <TabsList className="w-full rounded-none rounded-t-lg">
          <TabsTrigger value="professor" className="flex-1 gap-1">
            📖 Professor {professorComments.length > 0 && `(${professorComments.length})`}
          </TabsTrigger>
          <TabsTrigger value="comunidade" className="flex-1 gap-1">
            💬 Comunidade {userComments.length > 0 && `(${userComments.length})`}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="professor" className="p-4">
          {loading ? (
            <div className="flex justify-center py-4"><Loader2 className="h-4 w-4 animate-spin text-primary" /></div>
          ) : professorComments.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhum comentário do professor ainda.</p>
          ) : (
            <div className="divide-y">{professorComments.map(c => renderComment(c))}</div>
          )}
        </TabsContent>

        <TabsContent value="comunidade" className="p-4">
          {loading ? (
            <div className="flex justify-center py-4"><Loader2 className="h-4 w-4 animate-spin text-primary" /></div>
          ) : (
            <>
              {userComments.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-2">Seja o primeiro a comentar!</p>
              ) : (
                <div className="divide-y mb-3">{userComments.map(c => renderComment(c))}</div>
              )}

              {/* New comment form */}
              {user && (
                <div className="flex gap-2 pt-2 border-t">
                  <Textarea
                    placeholder="Escreva seu comentário..."
                    value={newComment}
                    onChange={e => setNewComment(e.target.value)}
                    rows={2}
                    className="text-sm"
                  />
                  <Button size="sm" className="self-end" onClick={() => handleSubmit()} disabled={submitting || !newComment.trim()}>
                    {submitting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                  </Button>
                </div>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
