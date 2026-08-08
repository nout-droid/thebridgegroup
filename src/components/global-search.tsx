"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { globalSearch, type GlobalSearchResult } from "@/app/search/actions";

export interface GlobalSearchLabels {
  title: string;
  description: string;
  placeholder: string;
  noResults: string;
  typeToSearch: string;
  triggerLabel: string;
  typeLabels: Record<GlobalSearchResult["type"], string>;
}

export function GlobalSearch({ labels }: { labels: GlobalSearchLabels }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GlobalSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const requestId = useRef(0);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setResults([]);
      return;
    }
  }, [open]);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const currentId = ++requestId.current;
    const timeout = setTimeout(async () => {
      const found = await globalSearch(trimmed);
      if (requestId.current === currentId) {
        setResults(found);
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(timeout);
  }, [query]);

  function go(href: string) {
    setOpen(false);
    router.push(href);
  }

  const grouped = new Map<GlobalSearchResult["type"], GlobalSearchResult[]>();
  for (const r of results) {
    const list = grouped.get(r.type) ?? [];
    list.push(r);
    grouped.set(r.type, list);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={labels.triggerLabel}
        className="flex h-9 items-center gap-1.5 rounded-md px-2 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
          <circle cx="11" cy="11" r="7" />
          <path strokeLinecap="round" d="M21 21l-4.35-4.35" />
        </svg>
        <span className="hidden text-xs uppercase tracking-wide sm:inline">{labels.triggerLabel}</span>
        <kbd className="hidden rounded border border-white/20 px-1 text-[10px] font-normal normal-case text-white/50 sm:inline">
          ⌘K
        </kbd>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="top-[20%] max-w-lg -translate-y-0 p-0 sm:max-w-lg" showCloseButton={false}>
          <DialogTitle className="sr-only">{labels.title}</DialogTitle>
          <DialogDescription className="sr-only">{labels.description}</DialogDescription>
          <div className="p-3">
            <Input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={labels.placeholder}
              className="h-10"
            />
          </div>
          <div className="max-h-[60vh] overflow-y-auto border-t px-1 pb-2">
            {query.trim().length < 2 && (
              <p className="px-3 py-4 text-sm text-muted-foreground">{labels.typeToSearch}</p>
            )}
            {query.trim().length >= 2 && !loading && results.length === 0 && (
              <p className="px-3 py-4 text-sm text-muted-foreground">{labels.noResults}</p>
            )}
            {Array.from(grouped.entries()).map(([type, items]) => (
              <div key={type} className="py-2">
                <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {labels.typeLabels[type]}
                </p>
                {items.map((item) => (
                  <Link
                    key={`${item.type}-${item.id}`}
                    href={item.href}
                    onClick={(e) => {
                      e.preventDefault();
                      go(item.href);
                    }}
                    className="flex flex-col rounded-md px-3 py-2 text-sm hover:bg-muted"
                  >
                    <span className="font-medium">{item.title}</span>
                    {item.subtitle && <span className="text-xs text-muted-foreground">{item.subtitle}</span>}
                  </Link>
                ))}
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
