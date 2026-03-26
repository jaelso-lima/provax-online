import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Lock, Sparkles } from "lucide-react";

interface UpgradePromptProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  featureName?: string;
}

export default function UpgradePrompt({
  open,
  onOpenChange,
  title = "Recurso Premium 🔒",
  description,
  featureName,
}: UpgradePromptProps) {
  const navigate = useNavigate();

  const defaultDesc = featureName
    ? `"${featureName}" está disponível nos planos pagos. Treine como quem já vai passar!`
    : "Esse recurso está disponível no plano Pro. Treine como quem já vai passar!";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm text-center">
        <DialogHeader className="items-center">
          <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <Lock className="h-7 w-7 text-primary" />
          </div>
          <DialogTitle className="font-display text-xl">{title}</DialogTitle>
          <DialogDescription className="text-sm">
            {description || defaultDesc}
          </DialogDescription>
        </DialogHeader>
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm text-foreground">
          <Sparkles className="inline h-4 w-4 mr-1 text-primary" />
          Alunos aprovados treinam todos os dias sem limite. Desbloqueie agora.
        </div>
        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button className="w-full gap-2" onClick={() => { onOpenChange(false); navigate("/planos"); }}>
            <Sparkles className="h-4 w-4" /> Desbloquear acesso
          </Button>
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            Agora não
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Inline lock badge for feature labels */
export function LockedFeatureBadge({
  label,
  description,
  onClick,
}: {
  label: string;
  description?: string;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-start gap-2 rounded-lg border border-muted p-3 text-left w-full hover:border-primary/30 hover:bg-primary/5 transition-colors group"
    >
      <Lock className="h-4 w-4 mt-0.5 text-muted-foreground group-hover:text-primary shrink-0" />
      <div>
        <span className="text-sm font-medium text-muted-foreground group-hover:text-foreground">
          🔒 {label}
        </span>
        {description && (
          <p className="text-xs text-muted-foreground/70 mt-0.5">{description}</p>
        )}
      </div>
    </button>
  );
}
