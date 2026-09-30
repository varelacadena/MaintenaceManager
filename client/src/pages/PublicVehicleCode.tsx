import { useState } from "react";
import { Car } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function PublicVehicleCode({ vehicleId }: { vehicleId: string }) {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  return (
    <div
      className="min-h-dvh overflow-x-hidden bg-background flex items-center justify-center px-4 py-6"
      style={{ paddingBottom: "calc(1.5rem + env(safe-area-inset-bottom, 0px))" }}
    >
      <form
        className="w-full max-w-sm min-w-0 space-y-4 rounded-lg border p-4 sm:p-6"
        onSubmit={async (event) => {
          event.preventDefault();
          setPending(true);
          setError("");
          try {
            const response = await fetch("/api/public/vehicle-code", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ vehicleId, code }),
            });
            const body = await response.json().catch(() => ({}));
            if (!response.ok || !body.token) {
              throw new Error(body.message || "That code does not match this vehicle");
            }
            window.location.assign(`/trip/${body.token}`);
          } catch (err) {
            setError(err instanceof Error ? err.message : "Could not check the code");
            setPending(false);
          }
        }}
      >
        <Car className="h-8 w-8" />
        <h1 className="text-xl font-semibold break-words">Vehicle check-in / check-out</h1>
        <p className="text-sm text-muted-foreground">
          Enter the trip code from the private link for this reservation.
        </p>
        <div className="space-y-2">
          <Label htmlFor="trip-code">Trip code</Label>
          <Input
            id="trip-code"
            value={code}
            onChange={(event) => setCode(event.target.value.toUpperCase())}
            className="h-12 w-full min-w-0 text-base sm:text-lg tracking-[0.2em] uppercase"
            autoComplete="off"
            data-testid="input-trip-code"
          />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="submit" className="w-full h-12 text-base" disabled={pending}>
          {pending ? "Checking..." : "Continue"}
        </Button>
      </form>
    </div>
  );
}
