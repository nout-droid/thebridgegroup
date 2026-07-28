import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import type { ArtistRider, CrewMember } from "@/lib/types";
import { addArtistRider, deleteArtistRider, updateArtistRider } from "./artist-actions";
import {
  addArtistCrewMember,
  deleteArtistCrewMember,
  updateArtistCrewMember,
} from "./artist-crew-actions";
import type { Translator } from "@/lib/server/translate";

export const ARTIST_CARD_LABELS = [
  "Artiestenriders",
  "Per artiest: is de rider binnen, en komt er een eigen operator mee.",
  "Eigen crew (naam, catering/hotel — komt automatisch in Crew & Accreditatie terecht)",
  "Naam",
  "Functie",
  "bv. Licht operator",
  "bv. Audio operator",
  "Catering",
  "Hotel",
  "Opslaan",
  "Verwijderen",
  "Toevoegen",
  "Artiest",
  "Opmerkingen",
  "Link naar rider / techniek-tekst",
  "Rider ontvangen",
  "Eigen licht operator mee",
  "Eigen audio operator mee",
  "Artiest toevoegen",
];

const identity: Translator = (text) => text;

function ArtistCrewSection({
  projectId,
  artistRiderId,
  members,
  t,
}: {
  projectId: string;
  artistRiderId: string;
  members: CrewMember[];
  t: Translator;
}) {
  return (
    <div className="space-y-2 rounded-md border border-dashed p-3 sm:col-span-4">
      <p className="text-xs font-medium text-muted-foreground">
        {t("Eigen crew (naam, catering/hotel — komt automatisch in Crew & Accreditatie terecht)")}
      </p>
      {members.map((member) => (
        <form
          key={member.id}
          action={updateArtistCrewMember.bind(null, projectId, member.id)}
          className="grid grid-cols-2 gap-2 rounded-md border p-2 sm:grid-cols-5"
        >
          <div className="space-y-1">
            <Label htmlFor={`ac-name-${member.id}`} className="text-xs">{t("Naam")}</Label>
            <Input
              id={`ac-name-${member.id}`}
              name="name"
              defaultValue={member.name}
              className="h-8 text-xs"
              required
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor={`ac-role-${member.id}`} className="text-xs">{t("Functie")}</Label>
            <Input
              id={`ac-role-${member.id}`}
              name="role"
              defaultValue={member.role}
              placeholder={t("bv. Licht operator")}
              className="h-8 text-xs"
            />
          </div>
          <div className="flex items-end gap-3">
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <input
                type="checkbox"
                name="needs_catering"
                defaultChecked={member.needs_catering}
                className="h-4 w-4"
              />
              {t("Catering")}
            </label>
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <input
                type="checkbox"
                name="needs_hotel"
                defaultChecked={member.needs_hotel}
                className="h-4 w-4"
              />
              {t("Hotel")}
            </label>
          </div>
          <div className="flex items-end gap-2 sm:col-span-2">
            <Button type="submit" size="sm" className="h-8 text-xs">
              {t("Opslaan")}
            </Button>
            <Button
              type="submit"
              formAction={deleteArtistCrewMember.bind(null, projectId, member.id)}
              size="sm"
              variant="ghost"
              className="h-8 text-xs"
            >
              {t("Verwijderen")}
            </Button>
          </div>
        </form>
      ))}

      <form
        action={addArtistCrewMember.bind(null, projectId, artistRiderId)}
        className="grid grid-cols-2 gap-2 sm:grid-cols-5"
      >
        <div className="space-y-1">
          <Label htmlFor={`new-ac-name-${artistRiderId}`} className="text-xs">{t("Naam")}</Label>
          <Input id={`new-ac-name-${artistRiderId}`} name="name" className="h-8 text-xs" required />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`new-ac-role-${artistRiderId}`} className="text-xs">{t("Functie")}</Label>
          <Input
            id={`new-ac-role-${artistRiderId}`}
            name="role"
            placeholder={t("bv. Audio operator")}
            className="h-8 text-xs"
          />
        </div>
        <div className="flex items-end gap-3">
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <input type="checkbox" name="needs_catering" className="h-4 w-4" />
            {t("Catering")}
          </label>
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <input type="checkbox" name="needs_hotel" className="h-4 w-4" />
            {t("Hotel")}
          </label>
        </div>
        <div className="flex items-end sm:col-span-2">
          <Button type="submit" size="sm" className="h-8 text-xs">
            {t("Toevoegen")}
          </Button>
        </div>
      </form>
    </div>
  );
}

export function ArtistCard({
  projectId,
  artists,
  crewMembers,
  t = identity,
}: {
  projectId: string;
  artists: ArtistRider[];
  crewMembers: CrewMember[];
  t?: Translator;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("Artiestenriders")}</CardTitle>
        <p className="text-sm text-muted-foreground">
          {t("Per artiest: is de rider binnen, en komt er een eigen operator mee.")}
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {artists.map((artist) => (
          <div key={artist.id} className="space-y-2">
          <form
            action={updateArtistRider.bind(null, projectId, artist.id)}
            className="grid grid-cols-2 gap-2 rounded-md border p-3 sm:grid-cols-4"
          >
            <div className="space-y-1">
              <Label htmlFor={`artist-${artist.id}`} className="text-xs">{t("Artiest")}</Label>
              <Input
                id={`artist-${artist.id}`}
                name="artist_name"
                defaultValue={artist.artist_name}
                className="h-8 text-xs"
                required
              />
            </div>
            <div className="space-y-1 sm:col-span-3">
              <Label htmlFor={`notes-${artist.id}`} className="text-xs">{t("Opmerkingen")}</Label>
              <Input
                id={`notes-${artist.id}`}
                name="notes"
                defaultValue={artist.notes}
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1 sm:col-span-4">
              <Label htmlFor={`link-${artist.id}`} className="text-xs">{t("Link naar rider / techniek-tekst")}</Label>
              <Textarea
                id={`link-${artist.id}`}
                name="rider_link"
                defaultValue={artist.rider_link}
                rows={2}
                className="text-xs"
              />
            </div>
            <div className="flex flex-wrap items-center gap-4 sm:col-span-4">
              <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  name="rider_received"
                  defaultChecked={artist.rider_received}
                  className="h-4 w-4"
                />
                {t("Rider ontvangen")}
              </label>
              <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  name="own_light_operator"
                  defaultChecked={artist.own_light_operator}
                  className="h-4 w-4"
                />
                {t("Eigen licht operator mee")}
              </label>
              <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  name="own_audio_operator"
                  defaultChecked={artist.own_audio_operator}
                  className="h-4 w-4"
                />
                {t("Eigen audio operator mee")}
              </label>
            </div>
            <div className="flex items-end gap-2 sm:col-span-4">
              <Button type="submit" size="sm" className="h-8 text-xs">
                {t("Opslaan")}
              </Button>
              <Button
                type="submit"
                formAction={deleteArtistRider.bind(null, projectId, artist.id)}
                size="sm"
                variant="ghost"
                className="h-8 text-xs"
              >
                {t("Verwijderen")}
              </Button>
            </div>
          </form>
          <ArtistCrewSection
            projectId={projectId}
            artistRiderId={artist.id}
            members={crewMembers.filter((m) => m.artist_rider_id === artist.id)}
            t={t}
          />
          </div>
        ))}

        <form
          action={addArtistRider.bind(null, projectId)}
          className="grid grid-cols-2 gap-2 border-t pt-4 sm:grid-cols-4"
        >
          <div className="space-y-1">
            <Label htmlFor="new-artist" className="text-xs">{t("Artiest")}</Label>
            <Input id="new-artist" name="artist_name" className="h-8 text-xs" required />
          </div>
          <div className="space-y-1 sm:col-span-3">
            <Label htmlFor="new-notes" className="text-xs">{t("Opmerkingen")}</Label>
            <Input id="new-notes" name="notes" className="h-8 text-xs" />
          </div>
          <div className="space-y-1 sm:col-span-4">
            <Label htmlFor="new-link" className="text-xs">{t("Link naar rider / techniek-tekst")}</Label>
            <Textarea id="new-link" name="rider_link" rows={2} className="text-xs" />
          </div>
          <div className="flex flex-wrap items-center gap-4 sm:col-span-4">
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <input type="checkbox" name="rider_received" className="h-4 w-4" />
              {t("Rider ontvangen")}
            </label>
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <input type="checkbox" name="own_light_operator" className="h-4 w-4" />
              {t("Eigen licht operator mee")}
            </label>
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <input type="checkbox" name="own_audio_operator" className="h-4 w-4" />
              {t("Eigen audio operator mee")}
            </label>
          </div>
          <div className="sm:col-span-4">
            <Button type="submit" size="sm" className="h-8 text-xs">
              {t("Artiest toevoegen")}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
