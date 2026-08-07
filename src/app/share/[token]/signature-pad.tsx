"use client";

import { useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { submitProjectSignature } from "./signature-actions";
import type { Translator } from "@/hooks/use-translator";

export function SignaturePad({
  token,
  signatureUrl,
  signedBy,
  signedAt,
  t,
  onSigned,
}: {
  token: string;
  signatureUrl: string | null;
  signedBy: string | null;
  signedAt: string | null;
  t: Translator;
  onSigned: (url: string, signedBy: string, signedAt: string) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const hasStrokeRef = useRef(false);
  const [name, setName] = useState(signedBy ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resigning, setResigning] = useState(false);

  function pointerPos(e: React.PointerEvent<HTMLCanvasElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function startDraw(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    drawingRef.current = true;
    hasStrokeRef.current = true;
    const { x, y } = pointerPos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  }

  function draw(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const { x, y } = pointerPos(e);
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#000";
    ctx.lineTo(x, y);
    ctx.stroke();
  }

  function endDraw() {
    drawingRef.current = false;
  }

  function clearCanvas() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx?.clearRect(0, 0, canvas.width, canvas.height);
    hasStrokeRef.current = false;
  }

  async function submit() {
    const canvas = canvasRef.current;
    if (!canvas || !hasStrokeRef.current) {
      setError(t("Teken eerst je handtekening."));
      return;
    }
    if (!name.trim()) {
      setError(t("Vul je naam in."));
      return;
    }
    setSubmitting(true);
    setError(null);

    canvas.toBlob(async (blob) => {
      if (!blob) {
        setSubmitting(false);
        return;
      }
      const formData = new FormData();
      formData.set("signature", blob, "signature.png");
      formData.set("signed_by", name.trim());
      const result = await submitProjectSignature(token, formData);
      setSubmitting(false);
      if (result.error) {
        setError(result.error);
        return;
      }
      if (result.url && result.signedBy && result.signedAt) {
        onSigned(result.url, result.signedBy, result.signedAt);
        setResigning(false);
      }
    }, "image/png");
  }

  if (signatureUrl && !resigning) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("Digitale handtekening")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={signatureUrl} alt={t("Handtekening")} className="h-24 rounded-md border bg-white" />
          <p className="text-xs text-muted-foreground">
            {t("Ondertekend door")} {signedBy}
            {signedAt && ` · ${new Date(signedAt).toLocaleString("nl-NL")}`}
          </p>
          <Button type="button" size="sm" variant="outline" onClick={() => setResigning(true)}>
            {t("Opnieuw ondertekenen")}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("Digitale handtekening")}</CardTitle>
        <p className="text-sm text-muted-foreground">
          {t("Verschijnt automatisch op de offerte/factuur-PDF zodra de organisator die downloadt.")}
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <canvas
          ref={canvasRef}
          width={400}
          height={150}
          className="w-full touch-none rounded-md border bg-white"
          onPointerDown={startDraw}
          onPointerMove={draw}
          onPointerUp={endDraw}
          onPointerLeave={endDraw}
        />
        <div className="flex flex-wrap items-center gap-2">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("Jouw naam")}
            className="max-w-56"
          />
          <Button type="button" size="sm" variant="ghost" onClick={clearCanvas}>
            {t("Wissen")}
          </Button>
          <Button type="button" size="sm" onClick={submit} disabled={submitting}>
            {t("Ondertekenen")}
          </Button>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </CardContent>
    </Card>
  );
}
