"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

interface SearchHit {
  type: "customer" | "invoice";
  id: string;
  primary: string;
  secondary?: string;
  href: string;
}

export function GlobalSearch() {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [hits, setHits] = React.useState<SearchHit[]>([]);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  React.useEffect(() => {
    if (!open) return;
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setHits([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}`, {
          cache: "no-store",
        });
        if (!res.ok) throw new Error("search failed");
        const json = (await res.json()) as { hits: SearchHit[] };
        if (!cancelled) setHits(json.hits);
      } catch {
        if (!cancelled) setHits([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 150);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [open, query]);

  const customers = hits.filter((h) => h.type === "customer");
  const invoices = hits.filter((h) => h.type === "invoice");

  const handleSelect = (href: string) => {
    setOpen(false);
    setQuery("");
    router.push(href);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-9 w-full max-w-xs items-center gap-2 rounded-md border bg-background px-3 text-sm text-muted-foreground shadow-sm transition-colors hover:bg-accent sm:w-72"
      >
        <Search className="h-4 w-4" />
        <span className="flex-1 text-left">Search customers or invoices...</span>
        <kbd className="rounded border bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
          Ctrl K
        </kbd>
      </button>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          value={query}
          onValueChange={setQuery}
          placeholder="Search customers (name/no) or invoices..."
        />
        <CommandList>
          {!loading && query.trim().length >= 2 && hits.length === 0 ? (
            <CommandEmpty>No results.</CommandEmpty>
          ) : null}
          {loading ? <div className="px-3 py-2 text-xs text-muted-foreground">Searching...</div> : null}
          {customers.length > 0 ? (
            <CommandGroup heading="Customers">
              {customers.map((h) => (
                <CommandItem key={h.id} value={`${h.primary} ${h.secondary ?? ""}`} onSelect={() => handleSelect(h.href)}>
                  <div className="flex flex-col">
                    <span className="font-medium">{h.primary}</span>
                    {h.secondary ? <span className="text-xs text-muted-foreground">{h.secondary}</span> : null}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          ) : null}
          {invoices.length > 0 ? (
            <CommandGroup heading="Invoices">
              {invoices.map((h) => (
                <CommandItem key={h.id} value={`${h.primary} ${h.secondary ?? ""}`} onSelect={() => handleSelect(h.href)}>
                  <div className="flex flex-col">
                    <span className="font-medium">{h.primary}</span>
                    {h.secondary ? <span className="text-xs text-muted-foreground">{h.secondary}</span> : null}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          ) : null}
        </CommandList>
      </CommandDialog>
    </>
  );
}
