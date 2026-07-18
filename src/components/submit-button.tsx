"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Toont automatisch "Bezig..." + disabled zolang de omvattende <form> een
// submit aan het verwerken is. useFormStatus pakt de status van de
// dichtstbijzijnde ouder-<form> op — geen expliciete pending-state per
// actie nodig. Zonder dit voelde elke Server Action-knop (opslaan,
// toevoegen, uploaden) alsof-ie niks deed totdat de pagina ergens later
// vanzelf bijwerkte.
export function SubmitButton({
  children,
  pendingText = "Bezig…",
  className,
  ...props
}: React.ComponentProps<typeof Button> & { pendingText?: string }) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      disabled={pending}
      className={cn(pending && "opacity-70", className)}
      {...props}
    >
      {pending ? pendingText : children}
    </Button>
  );
}
