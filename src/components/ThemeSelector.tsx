import { useTheme } from "@/contexts/ThemeContext";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Palette } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const THEMES = [
  { id: "blue", label: "Azul", color: "hsl(245 60% 45%)" },
  { id: "black", label: "Preto", color: "hsl(0 0% 8%)" },
  { id: "pink", label: "Rosa", color: "hsl(330 65% 50%)" },
  { id: "green", label: "Verde", color: "hsl(152 60% 40%)" },
] as const;

export default function ThemeSelector() {
  const { colorTheme, setColorTheme } = useTheme();
  const { user } = useAuth();

  const handleSelect = async (themeId: string) => {
    setColorTheme(themeId);
    if (user) {
      await supabase.from("profiles").update({ tema_preferido: themeId }).eq("id", user.id);
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Escolher tema">
          <Palette className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-3" align="end">
        <p className="text-xs font-medium text-muted-foreground mb-2">Tema de cor</p>
        <div className="grid grid-cols-2 gap-2">
          {THEMES.map((t) => (
            <button
              key={t.id}
              onClick={() => handleSelect(t.id)}
              className={`flex items-center gap-2 rounded-lg border-2 px-3 py-2 text-xs font-medium transition-all ${
                colorTheme === t.id ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"
              }`}
            >
              <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: t.color }} />
              {t.label}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
