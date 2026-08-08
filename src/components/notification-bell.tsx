"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  acknowledgeAllNotifications,
  acknowledgeNotification,
  getNotifications,
  getUnreadNotificationCount,
  type NotificationRow,
} from "@/app/notifications/actions";
import { ACTIVITY_CATEGORY_LABELS } from "@/lib/activity-labels";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export interface NotificationBellLabels {
  title: string;
  description: string;
  empty: string;
  markAllRead: string;
  ago: string;
}

function timeAgo(iso: string, ago: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(diffMs / 60000);
  if (minutes < 1) return `<1m ${ago}`;
  if (minutes < 60) return `${minutes}m ${ago}`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}u ${ago}`;
  const days = Math.round(hours / 24);
  return `${days}d ${ago}`;
}

export function NotificationBell({
  initialCount,
  labels,
}: {
  initialCount: number;
  labels: NotificationBellLabels;
}) {
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState(initialCount);
  const [items, setItems] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      getUnreadNotificationCount().then(setCount);
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    getNotifications().then((rows) => {
      setItems(rows);
      setLoading(false);
    });
  }, [open]);

  async function handleAcknowledge(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id));
    setCount((c) => Math.max(0, c - 1));
    await acknowledgeNotification(id);
  }

  async function handleMarkAllRead() {
    setItems([]);
    setCount(0);
    await acknowledgeAllNotifications();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={labels.title}
        className="relative flex h-9 w-9 items-center justify-center rounded-md text-white/70 transition-colors hover:bg-white/10 hover:text-white"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4.5 w-4.5">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5m6 0v1a3 3 0 1 1-6 0v-1m6 0H9"
          />
        </svg>
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground normal-case">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="top-[15%] max-w-md -translate-y-0 p-0 sm:max-w-md">
          <DialogTitle className="px-4 pt-4 text-base">{labels.title}</DialogTitle>
          <DialogDescription className="sr-only">{labels.description}</DialogDescription>
          <div className="max-h-[60vh] overflow-y-auto px-1 pb-2">
            {!loading && items.length === 0 && (
              <p className="px-3 py-6 text-center text-sm text-muted-foreground">{labels.empty}</p>
            )}
            {items.map((item) => (
              <div key={item.id} className="flex items-start gap-2 rounded-md px-3 py-2 hover:bg-muted">
                <Link href={`/projects/${item.projectId}`} onClick={() => setOpen(false)} className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-primary">
                    {item.projectName} · {ACTIVITY_CATEGORY_LABELS[item.category] ?? item.category}
                  </p>
                  <p className="truncate text-sm">
                    <strong>{item.actorLabel}</strong> — {item.description}
                  </p>
                  <p className="text-[11px] text-muted-foreground">{timeAgo(item.createdAt, labels.ago)}</p>
                </Link>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => handleAcknowledge(item.id)}
                  aria-label="OK"
                >
                  ✓
                </Button>
              </div>
            ))}
          </div>
          {items.length > 0 && (
            <div className="border-t p-2">
              <Button type="button" variant="outline" size="sm" className="w-full" onClick={handleMarkAllRead}>
                {labels.markAllRead}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
