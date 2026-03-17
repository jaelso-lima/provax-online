import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Share2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface ShareResultCardProps {
  pontuacao: number;
  acertos: number;
  total: number;
  materia?: string;
  area?: string;
  userName?: string;
}

export default function ShareResultCard({ pontuacao, acertos, total, materia, area, userName }: ShareResultCardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [generating, setGenerating] = useState(false);

  const getNivel = (p: number) => {
    if (p >= 90) return { label: "Excelente", color: "#22c55e", emoji: "🏆" };
    if (p >= 70) return { label: "Muito Bom", color: "#3b82f6", emoji: "🔥" };
    if (p >= 50) return { label: "Bom", color: "#f59e0b", emoji: "💪" };
    return { label: "Em evolução", color: "#ef4444", emoji: "📚" };
  };

  const generateImage = async () => {
    setGenerating(true);
    try {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext("2d")!;
      const W = 1080;
      const H = 1920;
      canvas.width = W;
      canvas.height = H;

      // Background
      const grad = ctx.createLinearGradient(0, 0, W, H);
      grad.addColorStop(0, "#0f172a");
      grad.addColorStop(0.5, "#1e293b");
      grad.addColorStop(1, "#0f172a");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);

      // Subtle decorative elements
      ctx.globalAlpha = 0.06;
      ctx.fillStyle = "#6366f1";
      ctx.beginPath(); ctx.arc(W * 0.8, H * 0.15, 300, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#22d3ee";
      ctx.beginPath(); ctx.arc(W * 0.2, H * 0.75, 250, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;

      // Logo
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 72px system-ui, -apple-system, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("PROVAX", W / 2, 200);

      ctx.fillStyle = "#64748b";
      ctx.font = "28px system-ui, sans-serif";
      ctx.fillText("Preparação para Concursos", W / 2, 250);

      // User name
      if (userName) {
        ctx.fillStyle = "#e2e8f0";
        ctx.font = "36px system-ui, sans-serif";
        ctx.fillText(userName, W / 2, 420);
      }

      // Title
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 44px system-ui, sans-serif";
      ctx.fillText("Meu resultado no simulado", W / 2, 520);

      if (materia || area) {
        ctx.fillStyle = "#94a3b8";
        ctx.font = "32px system-ui, sans-serif";
        ctx.fillText(materia || area || "", W / 2, 575);
      }

      // Score circle
      const nivel = getNivel(pontuacao);
      const cx = W / 2;
      const cy = 800;
      const radius = 170;

      ctx.strokeStyle = "#1e293b";
      ctx.lineWidth = 18;
      ctx.beginPath(); ctx.arc(cx, cy, radius, 0, Math.PI * 2); ctx.stroke();

      ctx.strokeStyle = nivel.color;
      ctx.lineWidth = 18;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.arc(cx, cy, radius, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * pontuacao / 100));
      ctx.stroke();
      ctx.lineCap = "butt";

      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 110px system-ui, sans-serif";
      ctx.fillText(`${pontuacao}%`, cx, cy + 30);

      ctx.fillStyle = nivel.color;
      ctx.font = "bold 36px system-ui, sans-serif";
      ctx.fillText(`${nivel.emoji} ${nivel.label}`, cx, cy + 90);

      // Stats
      const statsY = 1080;
      const cardW = 380;
      const cardH = 140;
      const gap = 40;

      ctx.fillStyle = "#0f2918";
      roundRect(ctx, cx - cardW - gap / 2, statsY, cardW, cardH, 16);
      ctx.fillStyle = "#22c55e";
      ctx.font = "bold 52px system-ui, sans-serif";
      ctx.fillText(`${acertos}`, cx - cardW / 2 - gap / 2, statsY + 70);
      ctx.fillStyle = "#86efac";
      ctx.font = "26px system-ui, sans-serif";
      ctx.fillText("Acertos", cx - cardW / 2 - gap / 2, statsY + 112);

      ctx.fillStyle = "#0f1729";
      roundRect(ctx, cx + gap / 2, statsY, cardW, cardH, 16);
      ctx.fillStyle = "#60a5fa";
      ctx.font = "bold 52px system-ui, sans-serif";
      ctx.fillText(`${total}`, cx + cardW / 2 + gap / 2, statsY + 70);
      ctx.fillStyle = "#93c5fd";
      ctx.font = "26px system-ui, sans-serif";
      ctx.fillText("Questões", cx + cardW / 2 + gap / 2, statsY + 112);

      // CTA
      ctx.fillStyle = "#f59e0b";
      ctx.font = "bold 34px system-ui, sans-serif";
      ctx.fillText("Será que seus amigos passariam? 🤔", W / 2, 1400);

      ctx.fillStyle = "#6366f1";
      roundRect(ctx, W * 0.2, 1480, W * 0.6, 80, 40);
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 32px system-ui, sans-serif";
      ctx.fillText("Teste grátis → provax-online.lovable.app", W / 2, 1532);

      // Footer
      ctx.fillStyle = "#334155";
      ctx.font = "22px system-ui, sans-serif";
      ctx.fillText("provax-online.lovable.app", W / 2, 1780);

      // Download
      const link = document.createElement("a");
      link.download = `provax-resultado-${pontuacao}pct.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();

      toast({ title: "Imagem baixada! Compartilhe nos stories." });

      // Try native share
      if (navigator.share && navigator.canShare) {
        try {
          const blob = await new Promise<Blob>((resolve) => canvas.toBlob((b) => resolve(b!), "image/png"));
          const file = new File([blob], "provax-resultado.png", { type: "image/png" });
          if (navigator.canShare({ files: [file] })) {
            await navigator.share({
              title: "Meu resultado no ProvaX",
              text: `Fiz ${pontuacao}% no simulado do ProvaX!`,
              files: [file],
            });
          }
        } catch { /* user cancelled */ }
      }
    } catch {
      toast({ title: "Erro ao gerar imagem", variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <>
      <canvas ref={canvasRef} className="hidden" />
      <Card className="border-primary/10">
        <CardContent className="flex items-center justify-between py-3">
          <div className="flex items-center gap-2">
            <Share2 className="h-4 w-4 text-primary" />
            <p className="text-sm font-medium">Compartilhe nos stories</p>
          </div>
          <Button size="sm" variant="outline" onClick={generateImage} disabled={generating} className="gap-1.5">
            <Download className="h-3.5 w-3.5" />
            {generating ? "Gerando..." : "Baixar imagem"}
          </Button>
        </CardContent>
      </Card>
    </>
  );
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
  ctx.fill();
}
