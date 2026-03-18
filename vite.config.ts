import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { componentTagger } from "lovable-tagger";

const FALLBACK_SUPABASE_URL = "https://shloysxkntqvwwjmhggn.supabase.co";
const FALLBACK_SUPABASE_PUBLISHABLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNobG95c3hrbnRxdnd3am1oZ2duIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEyODQ0NDIsImV4cCI6MjA4Njg2MDQ0Mn0.7sSGbDKAdmUutiVb1f3hcBpincmqSLB8-5iA-jvoeNE";
const FALLBACK_SUPABASE_PROJECT_ID = "shloysxkntqvwwjmhggn";

const unquote = (value: string | undefined, fallback: string) =>
  (value ?? fallback).replace(/^['"]|['"]$/g, "");

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  const supabaseUrl = unquote(env.VITE_SUPABASE_URL, FALLBACK_SUPABASE_URL);
  const supabasePublishableKey = unquote(
    env.VITE_SUPABASE_PUBLISHABLE_KEY,
    FALLBACK_SUPABASE_PUBLISHABLE_KEY,
  );
  const supabaseProjectId = unquote(env.VITE_SUPABASE_PROJECT_ID, FALLBACK_SUPABASE_PROJECT_ID);

  return {
    define: {
      "import.meta.env.VITE_SUPABASE_URL": JSON.stringify(supabaseUrl),
      "import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY": JSON.stringify(supabasePublishableKey),
      "import.meta.env.VITE_SUPABASE_PROJECT_ID": JSON.stringify(supabaseProjectId),
    },
    server: {
      host: "::",
      port: 8080,
      hmr: {
        overlay: false,
      },
    },
    plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
      dedupe: ["react", "react-dom", "react/jsx-runtime", "@tanstack/react-query"],
    },
    optimizeDeps: {
      include: ["react", "react-dom", "@tanstack/react-query"],
    },
  };
});
