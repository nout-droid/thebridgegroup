"use client";

import Image from "next/image";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  CATEGORY_STATUS_LABELS,
  type IntakeChecklistPhoto,
  type SharedCategory,
  type SharedCo2,
  type SharedIntakeChecklist,
  type SharedMedia,
  type SharedProject,
  type SharedRider,
} from "@/lib/types";
import { computeCo2Total, FLIGHT_CO2_KG, KM_CO2_KG_PER_KM } from "@/lib/co2";
import { toEmbedUrl } from "@/lib/video-embed";
import { Footer } from "@/components/footer";
import { INTAKE_CHECKLIST_SECTIONS } from "@/lib/intake-checklist-sections";
import {
  deleteIntakeChecklistPhotoByClient,
  uploadIntakeChecklistPhotoByClient,
} from "./intake-photo-actions";

const POLL_INTERVAL_MS = 5000;

const STATIC_LABELS = [
  "Begroting per onderdeel",
  "Overige kosten",
  "Sfeerimpressie",
  "Onderdeel",
  "Leverancier",
  "Inkoopprijs",
  "Marge",
  "Prijs",
  "Status",
  "Materiaal-specificatie",
  "Totaalbudget",
  "Laden...",
  "Nog geen onderdelen.",
  "Deze begroting kon niet gevonden worden.",
  "Begroting",
  "Rider",
  "Rider downloaden",
  "Door The Bridge AV Group",
  "Jouw invoer",
  "Opslaan",
  "Opgeslagen",
  "Nog geen rider-onderdelen.",
  "Aanvraag checklist",
  "Bijlage toevoegen",
  "Bekijken",
  "Verwijderen",
  "Jouw reactie op de begroting",
  "Goedkeuren",
  "Aanpassing vragen",
  "Weigeren",
  "Licht toe wat er moet veranderen…",
  "Versturen",
  "Terug",
  "Reactie wijzigen",
  "Nog geen reactie",
  "Goedgekeurd",
  "Aanpassing gevraagd",
  "Geweigerd",
  "CO2",
  "CO2-indicatie",
  "Een indicatie van de CO2-uitstoot voor dit event, aan onze kant — vluchten, transport en door leveranciers opgegeven cijfers. Bedoeld als bewustwording, niet als exacte meting.",
  "Vluchten (crew)",
  "Transport",
  "Leveranciers (opgegeven)",
  `Vuistregels: ${FLIGHT_CO2_KG} kg per vlucht (gemiddelde retourvlucht, korte/middellange afstand), ${KM_CO2_KG_PER_KM} kg per km wegtransport.`,
  ...Object.values(CATEGORY_STATUS_LABELS),
];

const BUDGET_STATUS_LABELS: Record<string, string> = {
  pending: "Nog geen reactie",
  approved: "Goedgekeurd",
  changes_requested: "Aanpassing gevraagd",
  rejected: "Geweigerd",
};

type Translator = (text: string) => string;

function collectDynamicTexts(data: SharedProject, rider: SharedRider | null): string[] {
  const texts = new Set<string>();
  texts.add(data.project.name);
  if (data.project.client_name) texts.add(data.project.client_name);

  const addCategory = (category: SharedCategory) => {
    texts.add(category.name);
    if (category.supplier_name) texts.add(category.supplier_name);
    for (const item of category.line_items) texts.add(item.description);
  };

  data.project_wide_categories.forEach(addCategory);
  for (const stage of data.stages) {
    texts.add(stage.name);
    stage.categories.forEach(addCategory);
  }
  for (const media of data.media) {
    if (media.caption) texts.add(media.caption);
  }
  if (rider) {
    for (const section of rider.sections) {
      texts.add(section.title);
      if (!section.editable_by_client && section.content) texts.add(section.content);
      for (const item of section.items) texts.add(item.description);
    }
  }

  return Array.from(texts);
}

function MediaGallery({ media, t }: { media: SharedMedia[]; t: Translator }) {
  if (!media.length) return null;

  const photos = media.filter((m) => m.kind === "photo");
  const videos = media.filter((m) => m.kind === "video_link");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("Sfeerimpressie")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {photos.length > 0 && (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {photos.map((photo, index) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={index}
                src={photo.url}
                alt={photo.caption ? t(photo.caption) : "Render"}
                className="aspect-video w-full rounded-md object-cover"
              />
            ))}
          </div>
        )}
        {videos.map((video, index) => {
          const embedUrl = toEmbedUrl(video.url);
          const label = video.caption ? t(video.caption) : video.url;
          return embedUrl ? (
            <div key={index} className="aspect-video w-full overflow-hidden rounded-md">
              <iframe
                src={embedUrl}
                title={label}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="h-full w-full"
              />
            </div>
          ) : (
            <a
              key={index}
              href={video.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block text-sm text-primary underline"
            >
              {label}
            </a>
          );
        })}
      </CardContent>
    </Card>
  );
}

function CategoryTable({ categories, t }: { categories: SharedCategory[]; t: Translator }) {
  if (!categories.length) {
    return <p className="text-sm text-muted-foreground">{t("Nog geen onderdelen.")}</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t("Onderdeel")}</TableHead>
          <TableHead>{t("Leverancier")}</TableHead>
          <TableHead>{t("Inkoopprijs")}</TableHead>
          <TableHead>{t("Marge")}</TableHead>
          <TableHead>{t("Prijs")}</TableHead>
          <TableHead>{t("Status")}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {categories.map((category) => (
          <Fragment key={category.id}>
            <TableRow>
              <TableCell className="font-medium">{t(category.name)}</TableCell>
              <TableCell>{category.supplier_name ? t(category.supplier_name) : "—"}</TableCell>
              <TableCell>
                {category.cost_price != null ? `€ ${category.cost_price.toFixed(2)}` : "—"}
              </TableCell>
              <TableCell>
                {category.margin_type === "percentage"
                  ? `${category.margin_value}%`
                  : `€ ${category.margin_value.toFixed(2)}`}
              </TableCell>
              <TableCell>
                {category.client_price != null ? `€ ${category.client_price.toFixed(2)}` : "—"}
              </TableCell>
              <TableCell>
                <Badge variant="secondary">{t(CATEGORY_STATUS_LABELS[category.status])}</Badge>
              </TableCell>
            </TableRow>
            {category.line_items.length > 0 && (
              <TableRow>
                <TableCell colSpan={6} className="bg-muted/30">
                  <p className="mb-1 text-xs font-medium text-muted-foreground">
                    {t("Materiaal-specificatie")}
                  </p>
                  <ul className="space-y-0.5 text-xs text-muted-foreground">
                    {category.line_items.map((item, index) => (
                      <li key={index}>
                        {item.quantity}× {t(item.description)} — € {item.unit_price.toFixed(2)}
                        /stuk
                      </li>
                    ))}
                  </ul>
                </TableCell>
              </TableRow>
            )}
          </Fragment>
        ))}
      </TableBody>
    </Table>
  );
}

function categoryTotal(categories: SharedCategory[]) {
  return categories.reduce((sum, c) => sum + (c.client_price ?? 0), 0);
}

function EditableRiderSection({
  token,
  sectionId,
  title,
  content,
  items,
  t,
  onSaved,
}: {
  token: string;
  sectionId: string;
  title: string;
  content: string;
  items: { id: string; description: string }[];
  t: Translator;
  onSaved: (sectionId: string, content: string) => void;
}) {
  const [value, setValue] = useState(content);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save() {
    setSaving(true);
    setSaved(false);
    const supabase = createClient();
    const { data: ok } = await supabase.rpc("update_rider_section_by_client", {
      p_share_token: token,
      p_section_id: sectionId,
      p_content: value,
    });
    setSaving(false);
    if (ok) {
      setSaved(true);
      onSaved(sectionId, value);
    }
  }

  return (
    <div className="space-y-1 rounded-md border-2 border-primary p-3">
      <div className="flex items-center justify-between">
        <p className="font-medium">{t(title)}</p>
        <span className="text-xs font-medium text-primary">{t("Jouw invoer")}</span>
      </div>
      <Textarea
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setSaved(false);
        }}
        rows={3}
      />
      {items.length > 0 && (
        <ul className="list-disc space-y-0.5 pl-4 text-sm text-muted-foreground">
          {items.map((item) => (
            <li key={item.id}>{t(item.description)}</li>
          ))}
        </ul>
      )}
      <div className="flex items-center gap-2">
        <Button type="button" size="sm" onClick={save} disabled={saving}>
          {t("Opslaan")}
        </Button>
        {saved && <span className="text-xs text-muted-foreground">{t("Opgeslagen")}</span>}
      </div>
    </div>
  );
}

function RiderPanel({
  token,
  rider,
  t,
  onSectionSaved,
}: {
  token: string;
  rider: SharedRider;
  t: Translator;
  onSectionSaved: (sectionId: string, content: string) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base">{t("Rider")}</CardTitle>
          <a
            href={`/share/${token}/rider/pdf`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-primary underline"
          >
            {t("Rider downloaden")}
          </a>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {!rider.sections.length ? (
          <p className="text-sm text-muted-foreground">{t("Nog geen rider-onderdelen.")}</p>
        ) : (
          rider.sections.map((section) =>
            section.editable_by_client ? (
              <EditableRiderSection
                key={section.id}
                token={token}
                sectionId={section.id}
                title={section.title}
                content={section.content}
                items={section.items}
                t={t}
                onSaved={onSectionSaved}
              />
            ) : (
              <div key={section.id} className="space-y-1 rounded-md border p-3">
                <div className="flex items-center justify-between">
                  <p className="font-medium">{t(section.title)}</p>
                  <span className="text-xs text-muted-foreground">
                    {t("Door The Bridge AV Group")}
                  </span>
                </div>
                <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                  {section.content ? t(section.content) : "—"}
                </p>
                {section.items.length > 0 && (
                  <ul className="list-disc space-y-0.5 pl-4 text-sm text-muted-foreground">
                    {section.items.map((item) => (
                      <li key={item.id}>{t(item.description)}</li>
                    ))}
                  </ul>
                )}
              </div>
            )
          )
        )}
      </CardContent>
    </Card>
  );
}

function EditableChecklistSection({
  token,
  sectionKey,
  titleText,
  guidance,
  content,
  photos,
  t,
  onSaved,
  onPhotoUploaded,
  onPhotoDeleted,
}: {
  token: string;
  sectionKey: string;
  titleText: string;
  guidance: string[];
  content: string;
  photos: IntakeChecklistPhoto[];
  t: Translator;
  onSaved: (sectionKey: string, content: string) => void;
  onPhotoUploaded: (photo: IntakeChecklistPhoto) => void;
  onPhotoDeleted: (photoId: string) => void;
}) {
  const [value, setValue] = useState(content);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function save() {
    setSaving(true);
    setSaved(false);
    const supabase = createClient();
    const { data: ok } = await supabase.rpc("upsert_intake_checklist_answer_by_client", {
      p_share_token: token,
      p_section_key: sectionKey,
      p_content: value,
    });
    setSaving(false);
    if (ok) {
      setSaved(true);
      onSaved(sectionKey, value);
    }
  }

  async function uploadPhoto() {
    const file = fileInputRef.current?.files?.[0];
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.set("file", file);
    const result = await uploadIntakeChecklistPhotoByClient(token, sectionKey, formData);
    setUploading(false);
    if (result.photo) {
      onPhotoUploaded(result.photo);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function deletePhoto(photoId: string) {
    await deleteIntakeChecklistPhotoByClient(token, photoId);
    onPhotoDeleted(photoId);
  }

  return (
    <div className="space-y-1 rounded-md border p-3">
      <p className="font-medium">{titleText}</p>
      {guidance.length > 0 && (
        <ul className="list-disc space-y-0.5 pl-4 text-sm text-muted-foreground">
          {guidance.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      )}
      <Textarea
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setSaved(false);
        }}
        rows={3}
      />
      <div className="flex items-center gap-2">
        <Button type="button" size="sm" onClick={save} disabled={saving}>
          {t("Opslaan")}
        </Button>
        {saved && <span className="text-xs text-muted-foreground">{t("Opgeslagen")}</span>}
      </div>

      <div className="space-y-1.5 border-t pt-2">
        {photos.length > 0 && (
          <ul className="space-y-1">
            {photos.map((photo) => (
              <li key={photo.id} className="flex items-center justify-between gap-2 text-sm">
                <a
                  href={`/share/${token}/intake-photos/${photo.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline"
                >
                  {photo.original_filename}
                </a>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs"
                  onClick={() => deletePhoto(photo.id)}
                >
                  {t("Verwijderen")}
                </Button>
              </li>
            ))}
          </ul>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <Input
            ref={fileInputRef}
            type="file"
            accept="image/*,.pdf"
            className="h-8 max-w-xs text-xs"
          />
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="h-8 text-xs"
            onClick={uploadPhoto}
            disabled={uploading}
          >
            {t("Bijlage toevoegen")}
          </Button>
        </div>
      </div>
    </div>
  );
}

function ChecklistPanel({
  token,
  checklist,
  lang,
  t,
  onSectionSaved,
  onPhotoUploaded,
  onPhotoDeleted,
}: {
  token: string;
  checklist: SharedIntakeChecklist;
  lang: "nl" | "en";
  t: Translator;
  onSectionSaved: (sectionKey: string, content: string) => void;
  onPhotoUploaded: (photo: IntakeChecklistPhoto) => void;
  onPhotoDeleted: (photoId: string) => void;
}) {
  const answerByKey = new Map(checklist.answers.map((a) => [a.section_key, a]));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("Aanvraag checklist")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {INTAKE_CHECKLIST_SECTIONS.map((section) => {
          const answer = answerByKey.get(section.key);
          const sectionPhotos = checklist.photos.filter((p) => p.section_key === section.key);
          return (
            <EditableChecklistSection
              key={section.key}
              token={token}
              sectionKey={section.key}
              titleText={lang === "en" ? section.title_en : section.title_nl}
              guidance={lang === "en" ? section.guidance_en : section.guidance_nl}
              content={answer?.content ?? ""}
              photos={sectionPhotos}
              t={t}
              onSaved={onSectionSaved}
              onPhotoUploaded={onPhotoUploaded}
              onPhotoDeleted={onPhotoDeleted}
            />
          );
        })}
      </CardContent>
    </Card>
  );
}

function BudgetApprovalPanel({
  token,
  status,
  comment,
  t,
  onResponded,
}: {
  token: string;
  status: "pending" | "approved" | "changes_requested" | "rejected";
  comment: string | null;
  t: Translator;
  onResponded: (status: "approved" | "changes_requested" | "rejected", comment: string) => void;
}) {
  const [responding, setResponding] = useState(status === "pending");
  const [commentMode, setCommentMode] = useState<"changes_requested" | "rejected" | null>(null);
  const [commentText, setCommentText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function respond(newStatus: "approved" | "changes_requested" | "rejected", commentValue: string) {
    setSubmitting(true);
    const supabase = createClient();
    const { data: ok } = await supabase.rpc("respond_to_budget_by_client", {
      p_share_token: token,
      p_status: newStatus,
      p_comment: commentValue,
    });
    setSubmitting(false);
    if (ok) {
      onResponded(newStatus, commentValue);
      setResponding(false);
      setCommentMode(null);
      setCommentText("");
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("Jouw reactie op de begroting")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {!responding && status !== "pending" && (
          <div className="space-y-2">
            <div className="rounded-md border p-3 text-sm">
              <p className="font-medium">{t(BUDGET_STATUS_LABELS[status])}</p>
              {comment && <p className="mt-1 text-muted-foreground">{comment}</p>}
            </div>
            <Button type="button" size="sm" variant="ghost" onClick={() => setResponding(true)}>
              {t("Reactie wijzigen")}
            </Button>
          </div>
        )}

        {responding && commentMode === null && (
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" onClick={() => respond("approved", "")} disabled={submitting}>
              {t("Goedkeuren")}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setCommentMode("changes_requested")}
            >
              {t("Aanpassing vragen")}
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => setCommentMode("rejected")}>
              {t("Weigeren")}
            </Button>
          </div>
        )}

        {responding && commentMode !== null && (
          <div className="space-y-2">
            <Textarea
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder={t("Licht toe wat er moet veranderen…")}
              rows={3}
            />
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                onClick={() => respond(commentMode, commentText)}
                disabled={submitting}
              >
                {t("Versturen")}
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => setCommentMode(null)}>
                {t("Terug")}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Co2Panel({ co2, t }: { co2: SharedCo2; t: Translator }) {
  const total = computeCo2Total(co2.flight_count, co2.total_km, co2.quote_kg);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("CO2-indicatie")}</CardTitle>
        <p className="text-sm text-muted-foreground">
          {t(
            "Een indicatie van de CO2-uitstoot voor dit event, aan onze kant — vluchten, transport en door leveranciers opgegeven cijfers. Bedoeld als bewustwording, niet als exacte meting."
          )}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-3xl font-semibold text-primary">
          🌱 {Math.round(total.totalKg).toLocaleString("nl-NL")} kg
        </p>
        <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-muted-foreground">{t("Vluchten (crew)")}</dt>
            <dd className="font-medium">{Math.round(total.flightKg).toLocaleString("nl-NL")} kg</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">{t("Transport")}</dt>
            <dd className="font-medium">{Math.round(total.kmKg).toLocaleString("nl-NL")} kg</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">{t("Leveranciers (opgegeven)")}</dt>
            <dd className="font-medium">{Math.round(total.quoteKg).toLocaleString("nl-NL")} kg</dd>
          </div>
        </dl>
        <p className="text-xs text-muted-foreground">
          {t(`Vuistregels: ${FLIGHT_CO2_KG} kg per vlucht (gemiddelde retourvlucht, korte/middellange afstand), ${KM_CO2_KG_PER_KM} kg per km wegtransport.`)}
        </p>
      </CardContent>
    </Card>
  );
}

export function ShareView({ token }: { token: string }) {
  const [data, setData] = useState<SharedProject | null>(null);
  const [rider, setRider] = useState<SharedRider | null>(null);
  const [checklist, setChecklist] = useState<SharedIntakeChecklist | null>(null);
  const [co2, setCo2] = useState<SharedCo2 | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lang, setLang] = useState<"nl" | "en">("nl");
  const [cache, setCache] = useState<Map<string, string>>(new Map());
  const [translationError, setTranslationError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"budget" | "rider" | "checklist" | "co2">("budget");

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    async function load() {
      const { data, error } = await supabase.rpc("get_shared_project", { p_token: token });
      if (cancelled) return;
      if (error || !data?.project) {
        setError("Deze begroting kon niet gevonden worden.");
        return;
      }
      setError(null);
      const { data: riderData } = await supabase.rpc("get_shared_rider", {
        p_share_token: token,
      });
      if (!cancelled && riderData) setRider(riderData as SharedRider);
      const { data: checklistData } = await supabase.rpc("get_shared_intake_checklist", {
        p_share_token: token,
      });
      if (!cancelled && checklistData) setChecklist(checklistData as SharedIntakeChecklist);
      const { data: co2Data } = await supabase.rpc("get_shared_co2", { p_share_token: token });
      if (!cancelled && co2Data) setCo2(co2Data as SharedCo2);
      setData(data as SharedProject);
    }

    load();
    const interval = setInterval(load, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [token]);

  const allTexts = useMemo(() => {
    const dynamic = data ? collectDynamicTexts(data, rider) : [];
    return Array.from(new Set([...STATIC_LABELS, ...dynamic]));
  }, [data, rider]);

  useEffect(() => {
    if (lang !== "en") return;
    const missing = allTexts.filter((text) => !cache.has(text));
    if (!missing.length) return;

    let cancelled = false;
    fetch("/api/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ texts: missing }),
    })
      .then((res) => res.json())
      .then((result) => {
        if (cancelled) return;
        if (!result.translations) {
          setTranslationError(result.error ?? "Vertalen mislukt.");
          return;
        }
        setTranslationError(null);
        setCache((prev) => {
          const next = new Map(prev);
          missing.forEach((text: string, i: number) => next.set(text, result.translations[i] ?? text));
          return next;
        });
      })
      .catch(() => {
        if (!cancelled) setTranslationError("Vertalen mislukt.");
      });

    return () => {
      cancelled = true;
    };
  }, [lang, allTexts, cache]);

  const t: Translator = (text) => (lang === "en" ? cache.get(text) ?? text : text);

  if (error) {
    return <p className="p-6 text-sm text-muted-foreground">{error}</p>;
  }

  if (!data) {
    return <p className="p-6 text-sm text-muted-foreground">Laden...</p>;
  }

  const totalBudget =
    categoryTotal(data.project_wide_categories) +
    data.stages.reduce((sum, stage) => sum + categoryTotal(stage.categories), 0);

  return (
    <div>
      <header className="flex items-center justify-between gap-2 bg-black px-6 py-3 text-sm font-semibold uppercase tracking-wide text-primary">
        <div className="flex items-center gap-2">
          <Image src="/logo.png" alt="The Bridge AV Group" width={28} height={21} />
          The Bridge AV Group
        </div>
        <div className="flex gap-1 normal-case tracking-normal">
          <Button
            type="button"
            size="sm"
            variant={lang === "nl" ? "secondary" : "ghost"}
            className={lang === "nl" ? "" : "text-white/70 hover:bg-white/10 hover:text-white"}
            onClick={() => setLang("nl")}
          >
            NL
          </Button>
          <Button
            type="button"
            size="sm"
            variant={lang === "en" ? "secondary" : "ghost"}
            className={lang === "en" ? "" : "text-white/70 hover:bg-white/10 hover:text-white"}
            onClick={() => setLang("en")}
          >
            EN
          </Button>
        </div>
      </header>

      {translationError && lang === "en" && (
        <p className="bg-destructive/10 px-6 py-2 text-xs text-destructive">
          {translationError} (DEEPL_API_KEY controleren)
        </p>
      )}

      {data.project.background_image_url ? (
        <div
          className="flex min-h-56 items-end bg-cover bg-center"
          style={{ backgroundImage: `url(${data.project.background_image_url})` }}
        >
          <div className="w-full bg-gradient-to-t from-black/80 to-transparent px-6 py-8">
            <h1 className="text-3xl font-semibold text-white">{t(data.project.name)}</h1>
            <p className="text-white/80">
              {data.project.client_name ? t(data.project.client_name) : ""}
              {data.project.event_date ? ` · ${data.project.event_date}` : ""}
            </p>
          </div>
        </div>
      ) : null}

      <div className="mx-auto w-full max-w-4xl space-y-6 px-6 py-8">
        {!data.project.background_image_url && (
          <div>
            <h1 className="text-2xl font-semibold">{t(data.project.name)}</h1>
            <p className="text-muted-foreground">
              {data.project.client_name ? t(data.project.client_name) : ""}
              {data.project.event_date ? ` · ${data.project.event_date}` : ""}
            </p>
          </div>
        )}

        <div className="flex gap-1 border-b">
          <button
            type="button"
            onClick={() => setActiveTab("budget")}
            className={`px-3 py-2 text-sm font-medium ${
              activeTab === "budget"
                ? "border-b-2 border-primary text-foreground"
                : "text-muted-foreground"
            }`}
          >
            {t("Begroting")}
          </button>
          {rider && rider.sections.length > 0 && (
            <button
              type="button"
              onClick={() => setActiveTab("rider")}
              className={`px-3 py-2 text-sm font-medium ${
                activeTab === "rider"
                  ? "border-b-2 border-primary text-foreground"
                  : "text-muted-foreground"
              }`}
            >
              {t("Rider")}
            </button>
          )}
          <button
            type="button"
            onClick={() => setActiveTab("checklist")}
            className={`px-3 py-2 text-sm font-medium ${
              activeTab === "checklist"
                ? "border-b-2 border-primary text-foreground"
                : "text-muted-foreground"
            }`}
          >
            {t("Aanvraag checklist")}
          </button>
          {co2 && (
            <button
              type="button"
              onClick={() => setActiveTab("co2")}
              className={`px-3 py-2 text-sm font-medium ${
                activeTab === "co2"
                  ? "border-b-2 border-primary text-foreground"
                  : "text-muted-foreground"
              }`}
            >
              {t("CO2")}
            </button>
          )}
        </div>

        {activeTab === "rider" && rider && rider.sections.length > 0 ? (
          <RiderPanel
            token={token}
            rider={rider}
            t={t}
            onSectionSaved={(sectionId, content) =>
              setRider((prev) =>
                prev
                  ? {
                      ...prev,
                      sections: prev.sections.map((s) =>
                        s.id === sectionId ? { ...s, content } : s
                      ),
                    }
                  : prev
              )
            }
          />
        ) : activeTab === "checklist" && checklist ? (
          <ChecklistPanel
            token={token}
            checklist={checklist}
            lang={lang}
            t={t}
            onSectionSaved={(sectionKey, content) =>
              setChecklist((prev) =>
                prev
                  ? {
                      ...prev,
                      answers: prev.answers.some((a) => a.section_key === sectionKey)
                        ? prev.answers.map((a) =>
                            a.section_key === sectionKey
                              ? { ...a, content, updated_by: "client" as const }
                              : a
                          )
                        : [...prev.answers, { section_key: sectionKey, content, updated_by: "client" as const }],
                    }
                  : prev
              )
            }
            onPhotoUploaded={(photo) =>
              setChecklist((prev) => (prev ? { ...prev, photos: [...prev.photos, photo] } : prev))
            }
            onPhotoDeleted={(photoId) =>
              setChecklist((prev) =>
                prev
                  ? { ...prev, photos: prev.photos.filter((p) => p.id !== photoId) }
                  : prev
              )
            }
          />
        ) : activeTab === "co2" && co2 ? (
          <Co2Panel co2={co2} t={t} />
        ) : (
          <>
            <MediaGallery media={data.media} t={t} />

            {data.stages.map((stage) => (
              <Card key={stage.id}>
                <CardHeader>
                  <CardTitle className="text-base">{t(stage.name)}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CategoryTable categories={stage.categories} t={t} />
                </CardContent>
              </Card>
            ))}

            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  {t(data.stages.length ? "Overige kosten" : "Begroting per onderdeel")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CategoryTable categories={data.project_wide_categories} t={t} />
              </CardContent>
            </Card>

            <p className="text-lg">
              {t("Totaalbudget")}:{" "}
              <span className="font-semibold">€ {totalBudget.toFixed(2)}</span>
            </p>

            <BudgetApprovalPanel
              token={token}
              status={data.project.budget_approval_status}
              comment={data.project.budget_approval_comment}
              t={t}
              onResponded={(status, comment) =>
                setData((prev) =>
                  prev
                    ? {
                        ...prev,
                        project: {
                          ...prev.project,
                          budget_approval_status: status,
                          budget_approval_comment: comment,
                        },
                      }
                    : prev
                )
              }
            />
          </>
        )}
      </div>
      <Footer />
    </div>
  );
}
