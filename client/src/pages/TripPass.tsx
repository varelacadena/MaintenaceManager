import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { parseApiError } from "@/lib/queryClient";

type Trip = {
  driverName: string | null;
  purpose: string;
  passengerCount: number;
  notes: string | null;
  startDate: string;
  endDate: string;
  status: string;
  advisoryAccepted: boolean;
  tripCode: string | null;
  vehicle: {
    make: string;
    model: string;
    year: number;
    vehicleId: string;
    licensePlate: string | null;
    color: string | null;
  } | null;
  keyPickup: { method: string | null; adminNotes: string | null; lockboxCode: string | null } | null;
  canCancel: boolean;
  canCheckout: boolean;
  canCheckIn: boolean;
};

const selectClass = "w-full min-w-0 h-12 text-base rounded-md border bg-background px-3";

const FUEL = [
  { value: "empty", label: "Empty" },
  { value: "1/4", label: "1/4" },
  { value: "1/2", label: "1/2" },
  { value: "3/4", label: "3/4" },
  { value: "full", label: "Full" },
];

function statusLabel(status: string) {
  if (status === "pending") return "Waiting for approval";
  if (status === "approved") return "Approved";
  if (status === "active") return "Out";
  if (status === "pending_review") return "Returned, waiting for review";
  if (status === "completed") return "Returned";
  if (status === "cancelled") return "Cancelled";
  return status;
}

export default function TripPass({ token }: { token: string }) {
  const queryClient = useQueryClient();
  const [mileage, setMileage] = useState("");
  const [fuelLevel, setFuelLevel] = useState("full");
  const [damageNotes, setDamageNotes] = useState("");
  const [signature, setSignature] = useState("");
  const [cleanliness, setCleanliness] = useState("clean");
  const [issues, setIssues] = useState("");
  const [error, setError] = useState("");

  const tripQuery = useQuery<Trip>({
    queryKey: ["/api/public/vehicle-trips", token],
    queryFn: async () => {
      const response = await fetch(`/api/public/vehicle-trips/${token}`);
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.message || "This link is no longer active");
      return body;
    },
  });

  const mutateTrip = useMutation({
    mutationFn: async ({ path, body }: { path: string; body?: unknown }) => {
      const response = await fetch(`/api/public/vehicle-trips/${token}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      });
      if (!response.ok) throw new Error(await parseApiError(response, "Something went wrong"));
      return response.json() as Promise<Trip>;
    },
    onSuccess: (trip) => {
      setError("");
      queryClient.setQueryData(["/api/public/vehicle-trips", token], trip);
    },
    onError: (err: Error) => setError(err.message),
  });

  if (tripQuery.isLoading) {
    return <div className="min-h-screen p-6 text-muted-foreground">Loading your trip...</div>;
  }
  if (tripQuery.error || !tripQuery.data) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <p className="text-lg font-medium">{(tripQuery.error as Error)?.message || "This link is no longer active"}</p>
      </div>
    );
  }

  const trip = tripQuery.data;
  const when = (value: string) => format(new Date(value), "EEE, MMM d 'at' h:mm a");

  return (
    <div className="min-h-dvh overflow-x-hidden bg-background">
      <div
        className="mx-auto w-full max-w-lg min-w-0 px-4 py-6 space-y-5"
        style={{ paddingBottom: "calc(1.5rem + env(safe-area-inset-bottom, 0px))" }}
        data-testid="trip-pass"
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-semibold break-words">{trip.driverName || "Vehicle request"}</h1>
            <p className="text-sm text-muted-foreground break-words">{trip.purpose}</p>
          </div>
          <span className="self-start text-sm font-medium rounded-full border px-3 py-1">{statusLabel(trip.status)}</span>
        </div>

        <div className="rounded-lg border p-4 space-y-2 text-sm">
          <p><span className="text-muted-foreground">Pickup </span>{when(trip.startDate)}</p>
          <p><span className="text-muted-foreground">Return </span>{when(trip.endDate)}</p>
          <p><span className="text-muted-foreground">Passengers </span>{trip.passengerCount}</p>
          {trip.notes && <p className="whitespace-pre-wrap">{trip.notes}</p>}
        </div>

        {!trip.vehicle && trip.status === "pending" && (
          <p className="text-sm text-muted-foreground">A vehicle will be assigned after the fleet office approves this request.</p>
        )}

        {trip.vehicle && (
          <div className="rounded-lg border p-4 space-y-1">
            <p className="font-medium">{trip.vehicle.year} {trip.vehicle.make} {trip.vehicle.model}</p>
            <p className="text-sm text-muted-foreground break-words">
              Fleet {trip.vehicle.vehicleId}
              {trip.vehicle.licensePlate ? ` · ${trip.vehicle.licensePlate}` : ""}
              {trip.vehicle.color ? ` · ${trip.vehicle.color}` : ""}
            </p>
          </div>
        )}

        {trip.status === "approved" && !trip.tripCode && (
          <p className="text-sm rounded-md border border-amber-400 bg-amber-50 dark:bg-amber-950/30 p-3">
            Checkout opens one hour before the pickup time. Come back to this link then. Scan the QR code on the vehicle and enter the trip code shown here.
          </p>
        )}

        {trip.tripCode && (
          <div className="rounded-lg border p-4 space-y-1 text-center" data-testid="trip-code">
            <p className="text-sm text-muted-foreground">Trip code</p>
            <p className="text-2xl sm:text-3xl font-semibold tracking-[0.18em] sm:tracking-[0.3em] break-all">{trip.tripCode}</p>
            <p className="text-sm text-muted-foreground">Scan the QR code on the vehicle and enter this code.</p>
          </div>
        )}

        {trip.canCheckout && !trip.advisoryAccepted && (
          <div className="space-y-3 rounded-lg border p-4">
            <p className="text-sm">I will drive safely, return the vehicle on time, and report any damage.</p>
            <Button className="w-full h-12 text-base" onClick={() => mutateTrip.mutate({ path: "/advisory" })} disabled={mutateTrip.isPending}>
              I agree
            </Button>
          </div>
        )}

        {trip.keyPickup && (
          <div className="rounded-lg border p-4 space-y-2 text-sm">
            <p className="font-medium">Key pickup</p>
            <p>{trip.keyPickup.method || "See the fleet office"}</p>
            {trip.keyPickup.adminNotes && <p className="whitespace-pre-wrap">{trip.keyPickup.adminNotes}</p>}
            {trip.keyPickup.lockboxCode && <p className="text-lg font-semibold">Lockbox code {trip.keyPickup.lockboxCode}</p>}
          </div>
        )}

        {trip.canCheckout && trip.advisoryAccepted && (
          <form
            className="space-y-3 rounded-lg border p-4"
            onSubmit={(event) => {
              event.preventDefault();
              mutateTrip.mutate({
                path: "/checkout",
                body: {
                  startMileage: Number(mileage),
                  fuelLevel,
                  cleanlinessConfirmed: true,
                  damageNotes,
                  signature,
                },
              });
            }}
          >
            <h2 className="font-medium">Check out</h2>
            <div className="space-y-2">
              <Label htmlFor="start-mileage">Starting mileage</Label>
              <Input id="start-mileage" type="number" value={mileage} onChange={(event) => setMileage(event.target.value)} required className="h-12 text-base w-full min-w-0" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fuel">Fuel</Label>
              <select id="fuel" value={fuelLevel} onChange={(event) => setFuelLevel(event.target.value)} className={selectClass}>
                {FUEL.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="damage">Damage notes</Label>
              <Textarea id="damage" value={damageNotes} onChange={(event) => setDamageNotes(event.target.value)} className="text-base" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="signature">Your name as signature</Label>
              <Input id="signature" value={signature} onChange={(event) => setSignature(event.target.value)} required className="h-12 text-base w-full min-w-0" />
            </div>
            <Button type="submit" className="w-full h-12 text-base" disabled={mutateTrip.isPending}>Check out</Button>
          </form>
        )}

        {trip.canCheckIn && (
          <form
            className="space-y-3 rounded-lg border p-4"
            onSubmit={(event) => {
              event.preventDefault();
              mutateTrip.mutate({
                path: "/checkin",
                body: {
                  endMileage: Number(mileage),
                  fuelLevel,
                  cleanlinessStatus: cleanliness,
                  issues,
                },
              });
            }}
          >
            <h2 className="font-medium">Check in</h2>
            <div className="space-y-2">
              <Label htmlFor="end-mileage">Ending mileage</Label>
              <Input id="end-mileage" type="number" value={mileage} onChange={(event) => setMileage(event.target.value)} required className="h-12 text-base w-full min-w-0" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="return-fuel">Fuel</Label>
              <select id="return-fuel" value={fuelLevel} onChange={(event) => setFuelLevel(event.target.value)} className={selectClass}>
                {FUEL.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="clean">Condition</Label>
              <select id="clean" value={cleanliness} onChange={(event) => setCleanliness(event.target.value)} className={selectClass}>
                <option value="clean">Clean</option>
                <option value="needs_cleaning">Needs cleaning</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="issues">Issues</Label>
              <Textarea id="issues" value={issues} onChange={(event) => setIssues(event.target.value)} className="text-base" />
            </div>
            <Button type="submit" className="w-full h-12 text-base" disabled={mutateTrip.isPending}>Check in</Button>
          </form>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}

        {trip.canCancel && (
          <Button
            variant="outline"
            className="w-full h-12 text-base"
            disabled={mutateTrip.isPending}
            onClick={() => mutateTrip.mutate({ path: "/cancel" })}
          >
            Cancel request
          </Button>
        )}
      </div>
    </div>
  );
}
