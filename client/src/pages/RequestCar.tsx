import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Car, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { parseApiError } from "@/lib/queryClient";

type DriverMatch = {
  id: string;
  firstName: string;
  lastName: string;
  department: string | null;
};

const fieldClass = "h-11 text-base bg-background";

export default function RequestCar() {
  const [lastName, setLastName] = useState("");
  const [matches, setMatches] = useState<DriverMatch[] | null>(null);
  const [lookupError, setLookupError] = useState("");
  const [driverId, setDriverId] = useState("");
  const [purpose, setPurpose] = useState("");
  const [passengerCount, setPassengerCount] = useState("1");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [notes, setNotes] = useState("");
  const [website, setWebsite] = useState("");
  const [result, setResult] = useState<{ driverName: string; linkSent: boolean; hasEmail: boolean } | null>(null);

  const lookup = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/public/approved-drivers?lastName=${encodeURIComponent(lastName.trim())}`);
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.message || "Could not look up that name");
      return body as DriverMatch[];
    },
    onSuccess: (drivers) => {
      setLookupError("");
      setMatches(drivers);
      setDriverId(drivers.length === 1 ? drivers[0].id : "");
    },
    onError: (error: Error) => {
      setMatches(null);
      setLookupError(error.message);
    },
  });

  const submit = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/public/vehicle-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          driverId,
          purpose,
          passengerCount: Number(passengerCount),
          notes,
          startDate: new Date(startDate).toISOString(),
          endDate: new Date(endDate).toISOString(),
          website,
        }),
      });
      if (!response.ok) throw new Error(await parseApiError(response, "Could not submit the request"));
      return response.json() as Promise<{ driverName: string; linkSent: boolean; hasEmail: boolean }>;
    },
    onSuccess: (body) => setResult(body),
  });

  return (
    <div className="min-h-dvh overflow-x-hidden bg-background">
      <div
        className="mx-auto w-full max-w-lg min-w-0 px-4 py-6 space-y-6"
        style={{ paddingBottom: "calc(1.5rem + env(safe-area-inset-bottom, 0px))" }}
      >
        <div className="space-y-1">
          <a href="/" className="text-sm text-muted-foreground hover:text-foreground">Back</a>
          <h1 className="text-xl sm:text-2xl font-semibold flex items-center gap-2">
            <Car className="h-6 w-6" />
            Request a car
          </h1>
          <p className="text-sm text-muted-foreground">
            You need to be on the campus approved driver list. No account is required.
          </p>
        </div>

        {result ? (
          <div className="rounded-lg border p-5 space-y-3" data-testid="request-car-confirmation">
            <CheckCircle2 className="h-8 w-8 text-primary" />
            <h2 className="text-lg font-semibold">Request received for {result.driverName}</h2>
            <p className="text-sm text-muted-foreground">
              {result.linkSent
                ? "We sent a private link to the email on file. Open that link to follow this request, check the car out, and check it back in."
                : result.hasEmail
                  ? "The request was saved, but the link email did not send. Contact the fleet office and they can send it again."
                  : "The request was saved. This driver has no email on file, so the fleet office will follow up."}
            </p>
          </div>
        ) : (
          <form
            className="space-y-5"
            onSubmit={(event) => {
              event.preventDefault();
              if (!driverId) {
                lookup.mutate();
                return;
              }
              submit.mutate();
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="last-name">Last name</Label>
              <div className="flex min-w-0 gap-2">
                <Input
                  id="last-name"
                  value={lastName}
                  onChange={(event) => {
                    setLastName(event.target.value);
                    setMatches(null);
                    setDriverId("");
                  }}
                  className={`${fieldClass} min-w-0 flex-1`}
                  autoComplete="family-name"
                  data-testid="input-driver-last-name"
                />
                <Button type="button" variant="outline" className="h-11 shrink-0 px-4" onClick={() => lookup.mutate()} disabled={lookup.isPending}>
                  Find
                </Button>
              </div>
              {lookupError && <p className="text-sm text-destructive">{lookupError}</p>}
              {matches && matches.length === 0 && (
                <p className="text-sm text-muted-foreground" data-testid="text-no-driver-match">
                  That name is not on the approved driver list. Contact the fleet office.
                </p>
              )}
              {matches && matches.length > 0 && (
                <div className="space-y-2" data-testid="driver-matches">
                  {matches.map((driver) => (
                    <button
                      key={driver.id}
                      type="button"
                      onClick={() => setDriverId(driver.id)}
                      className={`w-full min-h-11 text-left rounded-md border px-3 py-3 break-words ${driverId === driver.id ? "border-primary bg-primary/5" : ""}`}
                    >
                      <span className="font-medium">{driver.firstName} {driver.lastName}</span>
                      {driver.department && <span className="block text-sm text-muted-foreground">{driver.department}</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="hidden" aria-hidden="true">
              <label htmlFor="website">Website</label>
              <input id="website" value={website} onChange={(event) => setWebsite(event.target.value)} tabIndex={-1} autoComplete="off" />
            </div>

            {driverId && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="purpose">Purpose</Label>
                  <Input id="purpose" value={purpose} onChange={(event) => setPurpose(event.target.value)} className={`${fieldClass} w-full min-w-0`} required data-testid="input-purpose" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="passengers">Passengers</Label>
                  <Input id="passengers" type="number" min={1} max={20} value={passengerCount} onChange={(event) => setPassengerCount(event.target.value)} className={`${fieldClass} w-full min-w-0`} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="start">Pickup</Label>
                  <Input id="start" type="datetime-local" value={startDate} onChange={(event) => setStartDate(event.target.value)} className={`${fieldClass} w-full min-w-0 max-w-full`} required data-testid="input-start" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end">Return</Label>
                  <Input id="end" type="datetime-local" value={endDate} onChange={(event) => setEndDate(event.target.value)} className={`${fieldClass} w-full min-w-0 max-w-full`} required data-testid="input-end" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea id="notes" value={notes} onChange={(event) => setNotes(event.target.value)} className="text-base" />
                </div>
              </div>
            )}

            {submit.error && <p className="text-sm text-destructive">{(submit.error as Error).message}</p>}

            <Button type="submit" className="w-full h-12 text-base" disabled={submit.isPending || lookup.isPending} data-testid="button-submit-car-request">
              {driverId ? (submit.isPending ? "Sending..." : "Submit request") : "Find driver"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
