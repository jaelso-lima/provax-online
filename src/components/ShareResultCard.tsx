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

      // Background gradient
      const grad = ctx.createLinearGradient(0, 0, W, H);
      grad.addColorStop(0, "#0f172a");
      grad.addColorStop(0.5, "#1e293b");
      grad.addColorStop(1, "#0f172a");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);

      // Decorative circles
      ctx.globalAlpha = 0.08;
      ctx.fillStyle = "#6366f1";
      ctx.beginPath(); ctx.arc(W * 0.8, H * 0.15, 300, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#22d3ee";
      ctx.beginPath(); ctx.arc(W * 0.2, H * 0.75, 250, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;

      // Logo text
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 72px system-ui, -apple-system, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("PROVAX", W / 2, 200);

      ctx.fillStyle = "#94a3b8";
      ctx.font = "28px system-ui, sans-serif";
      ctx.fillText("Plataforma de Preparação para Concursos", W / 2, 260);

      // Divider
      ctx.strokeStyle = "#334155";
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(W * 0.2, 320); ctx.lineTo(W * 0.8, 320); ctx.stroke();

      // User name
      if (userName) {
        ctx.fillStyle = "#e2e8f0";
        ctx.font = "36px system-ui, sans-serif";
        ctx.fillText(userName, W / 2, 420);
      }

      // Main title
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 48px system-ui, sans-serif";
      ctx.fillText("Meu resultado no simulado", W / 2, 520);

      // Subject/Area
      if (materia || area) {
        ctx.fillStyle = "#94a3b8";
        ctx.font = "32px system-ui, sans-serif";
        ctx.fillText(materia || area || "", W / 2, 580);
      }

      // Score circle
      const nivel = getNivel(pontuacao);
      const cx = W / 2;
      const cy = 820;
      const radius = 180;

      // Outer ring background
      ctx.strokeStyle = "#334155";
      ctx.lineWidth = 20;
      ctx.beginPath(); ctx.arc(cx, cy, radius, 0, Math.PI * 2); ctx.stroke();

      // Score ring
      ctx.strokeStyle = nivel.color;
      ctx.lineWidth = 20;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.arc(cx, cy, radius, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * pontuacao / 100));
      ctx.stroke();
      ctx.lineCap = "butt";

      // Score text
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 120px system-ui, sans-serif";
      ctx.fillText(`${pontuacao}%`, cx, cy + 30);

      // Level label
      ctx.fillStyle = nivel.color;
      ctx.font = "bold 40px system-ui, sans-serif";
      ctx.fillText(`${nivel.emoji} ${nivel.label}`, cx, cy + 100);

      // Stats cards
      const statsY = 1120;
      const cardW = 400;
      const cardH = 160;
      const gap = 40;

      // Acertos card
      ctx.fillStyle = "#1e3a2f";
      roundRect(ctx, cx - cardW - gap / 2, statsY, cardW, cardH, 20);
      ctx.fillStyle = "#22c55e";
      ctx.font = "bold 56px system-ui, sans-serif";
      ctx.fillText(`${acertos}`, cx - cardW / 2 - gap / 2, statsY + 75);
      ctx.fillStyle = "#86efac";
      ctx.font = "28px system-ui, sans-serif";
      ctx.fillText("Acertos", cx - cardW / 2 - gap / 2, statsY + 120);

      // Total card
      ctx.fillStyle = "#1e293b";
      roundRect(ctx, cx + gap / 2, statsY, cardW, cardH, 20);
      ctx.fillStyle = "#60a5fa";
      ctx.font = "bold 56px system-ui, sans-serif";
      ctx.fillText(`${total}`, cx + cardW / 2 + gap / 2, statsY + 75);
      ctx.fillStyle = "#93c5fd";
      ctx.font = "28px system-ui, sans-serif";
      ctx.fillText("Questões", cx + cardW / 2 + gap / 2, statsY + 120);

      // Challenge text
      ctx.fillStyle = "#f59e0b";
      ctx.font = "bold 38px system-ui, sans-serif";
      ctx.fillText("Desafie seus amigos:", W / 2, 1440);
      ctx.fillStyle = "#fbbf24";
      ctx.font = "36px system-ui, sans-serif";
      ctx.fillText("será que eles passariam? 🤔", W / 2, 1500);

      // CTA box
      ctx.fillStyle = "#6366f1";
      roundRect(ctx, W * 0.15, 1580, W * 0.7, 100, 50);
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 40px system-ui, sans-serif";
      ctx.fillText("Teste você também → provax-online.lovable.app", W / 2, 1645);

      // Footer
      ctx.fillStyle = "#475569";
      ctx.font = "24px system-ui, sans-serif";
      ctx.fillText("provax-online.lovable.app", W / 2, 1800);

      // Download
      const link = document.createElement("a");
      link.download = `provax-resultado-${pontuacao}pct.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();

      toast({ title: "Imagem baixada!", description: "Compartilhe nos seus stories!" });

      // Try native share if available
      if (navigator.share && navigator.canShare) {
        try {
          const blob = await new Promise<Blob>((resolve) => canvas.toBlob((b) => resolve(b!), "image/png"));
          const file = new File([blob], "provax-resultado.png", { type: "image/png" });
          if (navigator.canShare({ files: [file] })) {
            await navigator.share({
              title: "Meu resultado no ProvaX",
              text: `Fiz ${pontuacao}% no simulado do ProvaX! Teste você também 🔥`,
              files: [file],
            });
          }
        } catch { /* user cancelled share */ }
      }
    } catch (err) {
      toast({ title: "Erro ao gerar imagem", variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <>
      <canvas ref={canvasRef} className="hidden" />
      <div className="flex flex-col items-center gap-3 rounded-xl border-2 border-primary/20 bg-primary/5 p-6 text-center">
        <Share2 className="h-8 w-8 text-primary" />
        <p className="font-display text-lg font-bold">Compartilhe seu resultado!</p>
        <p className="text-sm text-muted-foreground max-w-sm">
          Desafie seus amigos: será que eles passariam? Compartilhe nos stories e marque o @provax 🔥
        </p>
        <Button onClick={generateImage} disabled={generating} className="gap-2">
          <Download className="h-4 w-4" />
          {generating ? "Gerando..." : "Baixar imagem para Stories"}
        </Button>
      </div>
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
