import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect } from "react";
import { hasSessionSync } from "@/lib/auth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Wardizitto Recordings" },
      { name: "description", content: "Painel das gravações do Discord — minimalista, rápido, organizado." },
      { property: "og:title", content: "Wardizitto Recordings" },
      { property: "og:description", content: "Painel das gravações do Discord." },
    ],
  }),
  beforeLoad: () => {
    if (typeof window !== "undefined") {
      throw redirect({ to: hasSessionSync() ? "/dashboard" : "/login" });
    }
  },
  component: Index,
});

function Index() {
  useEffect(() => {
    window.location.href = hasSessionSync() ? "/dashboard" : "/login";
  }, []);
  return (
    <div className="grid min-h-screen place-items-center bg-background">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-brand" />
    </div>
  );
}
