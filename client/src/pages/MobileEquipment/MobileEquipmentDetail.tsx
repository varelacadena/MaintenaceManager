import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import { ArrowLeft, Plus, QrCode, Trash2, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { canEditEquipment } from "@/lib/equipmentAccess";
import type { MobileEquipment, MobileEquipmentMaintenanceLogWithParts } from "@shared/schema";
import { categoryLabel, statusLabel } from "@/lib/mobileEquipmentConstants";
import { WorkLoadError } from "@/pages/Work/WorkLoadError";
import { exitTo } from "@/lib/navigation";
import { QrLabelDialog } from "@/components/QrLabelDialog";
import { getMobileEquipmentQrLabelLines } from "@/lib/mobileEquipmentQrLabel";
import { mobileEquipmentQrUrl } from "@/lib/mobileEquipmentLinks";

type PartRow = {
  partName: string;
  partNumber: string;
  quantity: string;
  vendor: string;
  notes: string;
};

const emptyPart = (): PartRow => ({
  partName: "",
  partNumber: "",
  quantity: "1",
  vendor: "",
  notes: "",
});

export default function MobileEquipmentDetail() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const canManage = canEditEquipment(user);
  const { toast } = useToast();

  const [maintType, setMaintType] = useState("");
  const [maintDescription, setMaintDescription] = useState("");
  const [maintPerformedBy, setMaintPerformedBy] = useState("");
  const [maintCost, setMaintCost] = useState("");
  const [maintHours, setMaintHours] = useState("");
  const [maintNotes, setMaintNotes] = useState("");
  const [parts, setParts] = useState<PartRow[]>([]);
  const [isQrOpen, setIsQrOpen] = useState(false);

  const { data: equipment, isLoading, isError, error, refetch } = useQuery<MobileEquipment>({
    queryKey: [`/api/mobile-equipment/${id}`],
    enabled: !!id,
  });

  const logsKey = [`/api/mobile-equipment/${id}/maintenance-logs`];
  const {
    data: logs,
    isLoading: logsLoading,
    isError: logsError,
    refetch: refetchLogs,
  } = useQuery<MobileEquipmentMaintenanceLogWithParts[]>({
    queryKey: logsKey,
    enabled: !!id,
  });

  const addLogMutation = useMutation({
    mutationFn: async () => {
      const body = {
        type: maintType,
        description: maintDescription,
        performedBy: maintPerformedBy || null,
        cost: parseFloat(maintCost) || 0,
        hoursOrMeterAtMaintenance: maintHours ? parseFloat(maintHours) : null,
        notes: maintNotes || null,
        parts: parts
          .filter((p) => p.partName.trim())
          .map((p) => ({
            partName: p.partName.trim(),
            partNumber: p.partNumber.trim() || null,
            quantity: parseInt(p.quantity, 10) || 1,
            vendor: p.vendor.trim() || null,
            notes: p.notes.trim() || null,
          })),
      };
      const res = await apiRequest("POST", `/api/mobile-equipment/${id}/maintenance-logs`, body);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: logsKey });
      queryClient.invalidateQueries({ queryKey: [`/api/mobile-equipment/${id}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/mobile-equipment"] });
      toast({ title: "Maintenance recorded" });
      setMaintType("");
      setMaintDescription("");
      setMaintPerformedBy("");
      setMaintCost("");
      setMaintHours("");
      setMaintNotes("");
      setParts([]);
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deleteLogMutation = useMutation({
    mutationFn: async (logId: string) => {
      await apiRequest("DELETE", `/api/mobile-equipment-maintenance-logs/${logId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: logsKey });
      toast({ title: "Log removed" });
    },
  });

  if (isLoading) {
    return <p className="p-4 text-muted-foreground">Loading...</p>;
  }

  if (isError || !equipment) {
    return (
      <div className="p-4">
        <WorkLoadError
          title="Equipment not found"
          message={error instanceof Error ? error.message : "Failed to load"}
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 max-w-3xl mx-auto">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => exitTo(setLocation, "/tools-equipment")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold truncate" data-testid="text-equipment-name">
            {equipment.name}
          </h1>
          <p className="text-sm text-muted-foreground">
            {categoryLabel(equipment.category)}
            {equipment.assetTag ? ` · ${equipment.assetTag}` : ""}
          </p>
        </div>
        <Badge variant="secondary">{statusLabel(equipment.status)}</Badge>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setIsQrOpen(true)}
          data-testid="button-qr-mobile-equipment-detail"
        >
          <QrCode className="h-4 w-4 mr-1.5" />
          QR Label
        </Button>
      </div>

      <QrLabelDialog
        open={isQrOpen}
        onOpenChange={setIsQrOpen}
        title="Tools & Equipment QR Code"
        qrValue={mobileEquipmentQrUrl(window.location.origin, equipment.id)}
        label={getMobileEquipmentQrLabelLines(equipment)}
        caption={equipment.name}
        scanHint="Scan to open this tool or equipment."
        testIdPrefix="mobile-equipment-detail-qr"
      />

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-3 mt-3">
          <Card>
            <CardHeader className="p-3 pb-2">
              <CardTitle className="text-base">Details</CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0 text-sm grid grid-cols-2 gap-x-4 gap-y-2">
              {(equipment.make || equipment.model) && (
                <div>
                  <p className="text-xs text-muted-foreground">Make / Model</p>
                  <p>{[equipment.make, equipment.model].filter(Boolean).join(" ")}</p>
                </div>
              )}
              {equipment.serialNumber && (
                <div>
                  <p className="text-xs text-muted-foreground">Serial</p>
                  <p className="font-mono text-xs">{equipment.serialNumber}</p>
                </div>
              )}
              {equipment.hoursOrMeter != null && (
                <div>
                  <p className="text-xs text-muted-foreground">Hours / Meter</p>
                  <p>{equipment.hoursOrMeter}</p>
                </div>
              )}
              {equipment.currentLocationNotes && (
                <div className="col-span-2">
                  <p className="text-xs text-muted-foreground">Location</p>
                  <p>{equipment.currentLocationNotes}</p>
                </div>
              )}
              {equipment.notes && (
                <div className="col-span-2">
                  <p className="text-xs text-muted-foreground">Notes</p>
                  <p className="whitespace-pre-wrap">{equipment.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="maintenance" className="space-y-3 mt-3">
          {logsError ? (
            <WorkLoadError
              title="Could not load maintenance history"
              message="Failed to load logs"
              onRetry={() => refetchLogs()}
            />
          ) : null}

          {canManage && (
            <Card>
              <CardHeader className="p-3 pb-2">
                <CardTitle className="text-base">Add Maintenance Record</CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-0 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Type</Label>
                    <Input
                      value={maintType}
                      onChange={(e) => setMaintType(e.target.value)}
                      placeholder="Oil change, blade sharpen..."
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Performed by</Label>
                    <Input
                      value={maintPerformedBy}
                      onChange={(e) => setMaintPerformedBy(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Cost</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={maintCost}
                      onChange={(e) => setMaintCost(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Hours / meter</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={maintHours}
                      onChange={(e) => setMaintHours(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Description</Label>
                  <Textarea
                    value={maintDescription}
                    onChange={(e) => setMaintDescription(e.target.value)}
                    className="min-h-[72px]"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Notes (optional)</Label>
                  <Textarea
                    value={maintNotes}
                    onChange={(e) => setMaintNotes(e.target.value)}
                    className="min-h-[56px]"
                  />
                </div>

                <div className="space-y-2 rounded-md border bg-muted/20 p-2.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-semibold">Parts used</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setParts((prev) => [...prev, emptyPart()])}
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" />
                      Add part
                    </Button>
                  </div>
                  {parts.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      Add parts with part numbers to find them again later.
                    </p>
                  ) : (
                    parts.map((part, idx) => (
                      <div
                        key={idx}
                        className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-2 rounded border bg-background"
                      >
                        <Input
                          placeholder="Part name *"
                          value={part.partName}
                          onChange={(e) => {
                            const next = [...parts];
                            next[idx] = { ...next[idx], partName: e.target.value };
                            setParts(next);
                          }}
                        />
                        <Input
                          placeholder="Part number"
                          value={part.partNumber}
                          className="font-mono"
                          onChange={(e) => {
                            const next = [...parts];
                            next[idx] = { ...next[idx], partNumber: e.target.value };
                            setParts(next);
                          }}
                        />
                        <Input
                          placeholder="Qty"
                          type="number"
                          value={part.quantity}
                          onChange={(e) => {
                            const next = [...parts];
                            next[idx] = { ...next[idx], quantity: e.target.value };
                            setParts(next);
                          }}
                        />
                        <Input
                          placeholder="Vendor / source"
                          value={part.vendor}
                          onChange={(e) => {
                            const next = [...parts];
                            next[idx] = { ...next[idx], vendor: e.target.value };
                            setParts(next);
                          }}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="sm:col-span-2 justify-start text-destructive"
                          onClick={() => setParts((prev) => prev.filter((_, i) => i !== idx))}
                        >
                          <Trash2 className="h-3.5 w-3.5 mr-1" />
                          Remove
                        </Button>
                      </div>
                    ))
                  )}
                </div>

                <Button
                  onClick={() => addLogMutation.mutate()}
                  disabled={
                    addLogMutation.isPending || !maintType.trim() || !maintDescription.trim()
                  }
                  data-testid="button-add-maintenance-log"
                >
                  <Wrench className="h-4 w-4 mr-2" />
                  Record Maintenance
                </Button>
              </CardContent>
            </Card>
          )}

          <div className="space-y-2">
            <h3 className="text-sm font-semibold">Maintenance History</h3>
            {logsLoading ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : !logs?.length ? (
              <Card>
                <CardContent className="py-8 text-center text-sm text-muted-foreground">
                  No maintenance records yet
                </CardContent>
              </Card>
            ) : (
              logs.map((log) => (
                <Card
                  key={log.id}
                  className="overflow-hidden border-border/80"
                  data-testid={`card-maintenance-log-${log.id}`}
                >
                  <CardHeader className="p-3 pb-1 bg-muted/25 border-b">
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <CardTitle className="text-sm">{log.type}</CardTitle>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(log.maintenanceDate), "PPP")}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {log.cost != null && log.cost > 0 && (
                          <Badge variant="secondary" className="text-xs">
                            ${log.cost.toFixed(2)}
                          </Badge>
                        )}
                        {canManage && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive"
                            onClick={() => deleteLogMutation.mutate(log.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-3 text-sm space-y-2">
                    <p className="whitespace-pre-wrap">{log.description}</p>
                    <div className="flex flex-wrap gap-x-3 text-xs text-muted-foreground">
                      {log.performedBy && <span>By: {log.performedBy}</span>}
                      {log.hoursOrMeterAtMaintenance != null && (
                        <span>Hours/meter: {log.hoursOrMeterAtMaintenance}</span>
                      )}
                    </div>
                    {log.parts.length > 0 && (
                      <div className="rounded-md border bg-muted/15 p-2 space-y-1.5">
                        <p className="text-xs font-semibold uppercase tracking-wide">Parts</p>
                        {log.parts.map((p) => (
                          <div
                            key={p.id}
                            className="flex flex-wrap gap-x-2 gap-y-0.5 text-xs border-b border-border/40 pb-1 last:border-0 last:pb-0"
                          >
                            <span className="font-medium">{p.partName}</span>
                            {p.partNumber && (
                              <span className="font-mono text-primary">#{p.partNumber}</span>
                            )}
                            {p.quantity != null && p.quantity > 1 && (
                              <span className="text-muted-foreground">×{p.quantity}</span>
                            )}
                            {p.vendor && (
                              <span className="text-muted-foreground">({p.vendor})</span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    {log.notes && (
                      <p className="text-xs italic text-muted-foreground">{log.notes}</p>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
