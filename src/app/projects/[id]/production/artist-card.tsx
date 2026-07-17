import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import type { ArtistRider } from "@/lib/types";
import { addArtistRider, deleteArtistRider, updateArtistRider } from "./artist-actions";

export function ArtistCard({
  projectId,
  artists,
}: {
  projectId: string;
  artists: ArtistRider[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Artiestenriders</CardTitle>
        <p className="text-sm text-muted-foreground">
          Per artiest: is de rider binnen, en komt er een eigen operator mee.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {artists.map((artist) => (
          <form
            key={artist.id}
            action={updateArtistRider.bind(null, projectId, artist.id)}
            className="grid grid-cols-2 gap-2 rounded-md border p-3 sm:grid-cols-4"
          >
            <div className="space-y-1">
              <Label htmlFor={`artist-${artist.id}`} className="text-xs">Artiest</Label>
              <Input
                id={`artist-${artist.id}`}
                name="artist_name"
                defaultValue={artist.artist_name}
                className="h-8 text-xs"
                required
              />
            </div>
            <div className="space-y-1 sm:col-span-3">
              <Label htmlFor={`notes-${artist.id}`} className="text-xs">Opmerkingen</Label>
              <Input
                id={`notes-${artist.id}`}
                name="notes"
                defaultValue={artist.notes}
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1 sm:col-span-4">
              <Label htmlFor={`link-${artist.id}`} className="text-xs">Link naar rider / techniek-tekst</Label>
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
                Rider ontvangen
              </label>
              <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  name="own_light_operator"
                  defaultChecked={artist.own_light_operator}
                  className="h-4 w-4"
                />
                Eigen licht operator mee
              </label>
              <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  name="own_audio_operator"
                  defaultChecked={artist.own_audio_operator}
                  className="h-4 w-4"
                />
                Eigen audio operator mee
              </label>
            </div>
            <div className="flex items-end gap-2 sm:col-span-4">
              <Button type="submit" size="sm" className="h-8 text-xs">
                Opslaan
              </Button>
              <Button
                type="submit"
                formAction={deleteArtistRider.bind(null, projectId, artist.id)}
                size="sm"
                variant="ghost"
                className="h-8 text-xs"
              >
                Verwijderen
              </Button>
            </div>
          </form>
        ))}

        <form
          action={addArtistRider.bind(null, projectId)}
          className="grid grid-cols-2 gap-2 border-t pt-4 sm:grid-cols-4"
        >
          <div className="space-y-1">
            <Label htmlFor="new-artist" className="text-xs">Artiest</Label>
            <Input id="new-artist" name="artist_name" className="h-8 text-xs" required />
          </div>
          <div className="space-y-1 sm:col-span-3">
            <Label htmlFor="new-notes" className="text-xs">Opmerkingen</Label>
            <Input id="new-notes" name="notes" className="h-8 text-xs" />
          </div>
          <div className="space-y-1 sm:col-span-4">
            <Label htmlFor="new-link" className="text-xs">Link naar rider / techniek-tekst</Label>
            <Textarea id="new-link" name="rider_link" rows={2} className="text-xs" />
          </div>
          <div className="flex flex-wrap items-center gap-4 sm:col-span-4">
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <input type="checkbox" name="rider_received" className="h-4 w-4" />
              Rider ontvangen
            </label>
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <input type="checkbox" name="own_light_operator" className="h-4 w-4" />
              Eigen licht operator mee
            </label>
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <input type="checkbox" name="own_audio_operator" className="h-4 w-4" />
              Eigen audio operator mee
            </label>
          </div>
          <div className="sm:col-span-4">
            <Button type="submit" size="sm" className="h-8 text-xs">
              Artiest toevoegen
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
