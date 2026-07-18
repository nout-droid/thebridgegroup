"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { RundownChatMessage } from "@/lib/types";

function lastSeenKey(token: string) {
  return `rundown-chat-last-seen-${token}`;
}

export function RundownChat({
  token,
  stageId,
  messages,
  senderLabel,
  audioAlert,
  onSent,
  dark = false,
}: {
  token: string;
  stageId: string | null;
  messages: RundownChatMessage[];
  senderLabel: string;
  audioAlert: boolean;
  onSent: () => void;
  dark?: boolean;
}) {
  const [messageText, setMessageText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const lastSeenIdRef = useRef<string | null>(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    try {
      lastSeenIdRef.current = localStorage.getItem(lastSeenKey(token));
    } catch {
      // localStorage niet beschikbaar (bv. privacy-modus) — gewoon nooit als "gezien" onthouden.
    }
  }, [token]);

  useEffect(() => {
    if (!messages.length) return;

    if (!initializedRef.current) {
      initializedRef.current = true;
      if (!lastSeenIdRef.current) lastSeenIdRef.current = messages[0].id;
      return;
    }

    const latest = messages[0];
    if (latest.sender === senderLabel) {
      lastSeenIdRef.current = latest.id;
      try {
        localStorage.setItem(lastSeenKey(token), latest.id);
      } catch {
        // negeren
      }
      return;
    }

    const seenIndex = messages.findIndex((m) => m.id === lastSeenIdRef.current);
    setUnreadCount(seenIndex === -1 ? messages.length : seenIndex);
  }, [messages, senderLabel]);

  function markAllSeen() {
    if (!messages.length) return;
    lastSeenIdRef.current = messages[0].id;
    try {
      localStorage.setItem(lastSeenKey(token), messages[0].id);
    } catch {
      // negeren
    }
    setUnreadCount(0);
  }

  async function submitMessage() {
    if (!messageText.trim()) return;
    setSubmitting(true);
    const supabase = createClient();
    await supabase.rpc("add_rundown_chat_message", {
      p_token: token,
      p_stage_id: stageId,
      p_sender: senderLabel,
      p_message: messageText.trim(),
    });
    setMessageText("");
    setSubmitting(false);
    onSent();
  }

  const orderedMessages = [...messages].reverse();

  return (
    <div className="space-y-2">
      {audioAlert && unreadCount > 0 && (
        <button
          type="button"
          onClick={markAllSeen}
          className="fixed inset-x-0 top-0 z-50 flex animate-pulse items-center justify-center gap-2 bg-red-600 px-4 py-3 text-sm font-semibold text-white shadow-lg"
        >
          Nieuw bericht in de chat — tik om te bekijken
        </button>
      )}
      <Card className={dark ? "border-white/10 bg-white/5 text-white" : undefined}>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle className={cn("text-base", dark && "text-white")}>Chat</CardTitle>
            {!audioAlert && unreadCount > 0 && (
              <Badge variant="secondary">{unreadCount} nieuw</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3" onClick={markAllSeen}>
          <div className="flex items-end gap-2">
            <Input
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              placeholder="Typ een bericht…"
              className={cn(
                "h-9 flex-1 text-sm",
                dark && "border-white/20 bg-white/5 text-white placeholder:text-white/30"
              )}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  submitMessage();
                }
              }}
            />
            <Button size="sm" onClick={submitMessage} disabled={submitting || !messageText.trim()}>
              Versturen
            </Button>
          </div>
          <ul className="max-h-64 space-y-1.5 overflow-y-auto">
            {orderedMessages.map((m) => (
              <li key={m.id} className={cn("rounded-md border p-2 text-sm", dark && "border-white/10")}>
                <span className="font-medium">{m.sender}:</span> {m.message}
              </li>
            ))}
            {!orderedMessages.length && (
              <p className={cn("text-sm", dark ? "text-white/60" : "text-muted-foreground")}>
                Nog geen berichten.
              </p>
            )}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
