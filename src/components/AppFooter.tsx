import { Mail, Instagram, MessageCircle } from "lucide-react";

export default function AppFooter() {
  return (
    <footer className="border-t px-4 py-4 text-center text-sm text-muted-foreground">
      <div className="flex flex-wrap items-center justify-center gap-4">
        <span>© 2026 ProvaX</span>
        <a href="mailto:provax.online@gmail.com" className="inline-flex items-center gap-1 hover:text-foreground transition-colors">
          <Mail className="h-3.5 w-3.5" /> Email
        </a>
        <a href="https://www.instagram.com/provax_online/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 hover:text-foreground transition-colors">
          <Instagram className="h-3.5 w-3.5" /> Instagram
        </a>
        <a href="https://chat.whatsapp.com/CaQMyka3CMU4QBUcl6WQxr" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 hover:text-foreground transition-colors text-green-600 dark:text-green-500">
          <MessageCircle className="h-3.5 w-3.5" /> Grupo WhatsApp
        </a>
      </div>
    </footer>
  );
}
