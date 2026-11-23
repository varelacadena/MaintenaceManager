import { useMemo, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { useSessionState } from "@/hooks/useSessionState";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { VENDOR_TRADES, vendorTradeLabel, type Vendor, type VendorTradeSlug } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Building2,
  ChevronRight,
  Mail,
  Pencil,
  Phone,
  Plus,
  Search,
  X,
} from "lucide-react";
import { DestructiveDeleteDialog } from "@/components/DestructiveDeleteDialog";
import { format } from "date-fns";

const UNCATEGORIZED_TRADE = "uncategorized";
const ALL_TRADES = "all";
const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ#".split("");

type VendorFormValues = {
  name: string;
  email: string;
  phoneNumber: string;
  address: string;
  contactPerson: string;
  notes: string;
  trades: VendorTradeSlug[];
};

const emptyVendorForm: VendorFormValues = {
  name: "",
  email: "",
  phoneNumber: "",
  address: "",
  contactPerson: "",
  notes: "",
  trades: [],
};

function toggleTrade(current: VendorTradeSlug[], slug: VendorTradeSlug): VendorTradeSlug[] {
  return current.includes(slug) ? current.filter((item) => item !== slug) : [...current, slug];
}

function knownTrades(trades: string[] | null | undefined): VendorTradeSlug[] {
  return (trades ?? []).filter((trade): trade is VendorTradeSlug =>
    VENDOR_TRADES.some((item) => item.slug === trade),
  );
}

function formatStamp(value: Date | string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return format(date, "MMM d, yyyy · h:mm a");
}

function vendorSearchText(vendor: Vendor): string {
  return [
    vendor.name,
    vendor.contactPerson,
    vendor.email,
    vendor.phoneNumber,
    vendor.address,
    vendor.notes,
    ...(vendor.trades ?? []).map((trade) => vendorTradeLabel(trade)),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function TradePicker({
  value,
  onChange,
  idPrefix,
}: {
  value: VendorTradeSlug[];
  onChange: (next: VendorTradeSlug[]) => void;
  idPrefix: string;
}) {
  return (
    <div className="grid grid-cols-1 min-[420px]:grid-cols-2 sm:grid-cols-3 gap-2">
        {VENDOR_TRADES.map((trade) => {
          const checked = value.includes(trade.slug);
          return (
            <label
              key={trade.slug}
              htmlFor={`${idPrefix}-trade-${trade.slug}`}
              className="flex min-w-0 items-start gap-2 rounded-md border border-border bg-background px-2.5 py-2 text-sm cursor-pointer"
            >
              <Checkbox
                id={`${idPrefix}-trade-${trade.slug}`}
                className="mt-0.5 shrink-0"
                checked={checked}
                onCheckedChange={() => onChange(toggleTrade(value, trade.slug))}
                data-testid={`${idPrefix}-trade-${trade.slug}`}
              />
              <span className="min-w-0 leading-snug break-words">{trade.label}</span>
            </label>
          );
        })}
    </div>
  );
}

function FormSection({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="space-y-3 rounded-lg border bg-muted/30 p-3 sm:p-4">
      <div className="min-w-0">
        <h3 className="text-sm font-semibold">{title}</h3>
        {hint ? <p className="text-xs text-muted-foreground mt-0.5">{hint}</p> : null}
      </div>
      {children}
    </section>
  );
}

function VendorFormFields({
  idPrefix,
  testIdPrefix,
  values,
  onChange,
}: {
  idPrefix: "new" | "edit";
  testIdPrefix: "new" | "edit";
  values: VendorFormValues;
  onChange: (patch: Partial<VendorFormValues>) => void;
}) {
  const ids = idPrefix === "edit"
    ? {
        name: "editName",
        email: "editEmail",
        phoneNumber: "editPhoneNumber",
        contactPerson: "editContactPerson",
        address: "editAddress",
        notes: "editNotes",
      }
    : {
        name: "name",
        email: "email",
        phoneNumber: "phoneNumber",
        contactPerson: "contactPerson",
        address: "address",
        notes: "notes",
      };

  return (
    <div className="space-y-4">
      <FormSection title="Company">
        <div className="space-y-2">
          <Label htmlFor={ids.name}>Vendor name{idPrefix === "new" ? " *" : ""}</Label>
          <Input
            id={ids.name}
            value={values.name}
            onChange={(e) => onChange({ name: e.target.value })}
            required={idPrefix === "new"}
            autoComplete="organization"
            data-testid={`input-${testIdPrefix}-vendor-name`}
          />
        </div>
      </FormSection>

      <FormSection title="Contact" hint="How to reach this vendor.">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor={ids.contactPerson}>Contact person</Label>
            <Input
              id={ids.contactPerson}
              value={values.contactPerson}
              onChange={(e) => onChange({ contactPerson: e.target.value })}
              autoComplete="name"
              data-testid={`input-${testIdPrefix}-vendor-contact`}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={ids.phoneNumber}>Phone</Label>
            <Input
              id={ids.phoneNumber}
              type="tel"
              value={values.phoneNumber}
              onChange={(e) => onChange({ phoneNumber: e.target.value })}
              autoComplete="tel"
              data-testid={`input-${testIdPrefix}-vendor-phone`}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor={ids.email}>Email</Label>
            <Input
              id={ids.email}
              type="email"
              value={values.email}
              onChange={(e) => onChange({ email: e.target.value })}
              autoComplete="email"
              data-testid={`input-${testIdPrefix}-vendor-email`}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor={ids.address}>Address</Label>
            <Textarea
              id={ids.address}
              value={values.address}
              onChange={(e) => onChange({ address: e.target.value })}
              rows={2}
              autoComplete="street-address"
              data-testid={`input-${testIdPrefix}-vendor-address`}
            />
          </div>
        </div>
      </FormSection>

      <FormSection title="Trades" hint="Select every type of work this vendor handles.">
        <TradePicker
          value={values.trades}
          onChange={(trades) => onChange({ trades })}
          idPrefix={idPrefix}
        />
      </FormSection>

      <FormSection title="Notes" hint="Account numbers, hours, preferences, or anything the team should see first.">
        <Textarea
          id={ids.notes}
          value={values.notes}
          onChange={(e) => onChange({ notes: e.target.value })}
          rows={4}
          placeholder="Add notes for this vendor"
          data-testid={`input-${testIdPrefix}-vendor-notes`}
        />
      </FormSection>
    </div>
  );
}

function TradeBadges({ vendor, limit }: { vendor: Vendor; limit?: number }) {
  const trades = vendor.trades ?? [];
  if (trades.length === 0) {
    return <span className="text-xs text-muted-foreground">No trade listed</span>;
  }
  const shown = limit == null ? trades : trades.slice(0, limit);
  const extra = limit == null ? 0 : Math.max(0, trades.length - shown.length);
  return (
    <div className="flex min-w-0 flex-wrap gap-1.5">
      {shown.map((trade) => (
        <Badge key={trade} variant="secondary" className="max-w-full whitespace-normal break-words text-left" data-testid={`badge-trade-${vendor.id}-${trade}`}>
          {vendorTradeLabel(trade)}
        </Badge>
      ))}
      {extra > 0 ? (
        <Badge variant="outline" className="shrink-0">+{extra}</Badge>
      ) : null}
    </div>
  );
}

function contactLetter(name: string): string {
  const char = name.trim().charAt(0).toUpperCase();
  return /[A-Z]/.test(char) ? char : "#";
}

function vendorInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
}

function ContactRow({ vendor, onOpen }: { vendor: Vendor; onOpen: (vendor: Vendor) => void }) {
  return (
    <div data-testid={`row-vendor-${vendor.id}`} className="min-w-0">
    <button
      type="button"
      data-testid={`button-view-${vendor.id}`}
      className="flex w-full min-w-0 items-center gap-3 px-3 py-1.5 text-left hover:bg-accent/60"
      onClick={() => onOpen(vendor)}
      aria-label={`View ${vendor.name}`}
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
        {vendorInitials(vendor.name)}
      </span>
      <span className="flex min-w-0 flex-1 items-center gap-2 border-b border-border/70 py-2">
        <span className="min-w-0 flex-1 truncate text-[15px]">{vendor.name}</span>
        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
      </span>
    </button>
    </div>
  );
}

function ContactCell({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0 border-t border-border/70 px-3 py-2.5 first:border-t-0">
      <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-0.5 min-w-0 text-sm break-words">{children}</div>
    </div>
  );
}

function QuickAction({
  label,
  icon: Icon,
  href,
  onClick,
  testId,
}: {
  label: string;
  icon: typeof Phone;
  href?: string;
  onClick?: () => void;
  testId?: string;
}) {
  const enabled = Boolean(href || onClick);
  const className = `flex min-w-0 flex-col items-center justify-center gap-1 rounded-xl bg-muted px-2 py-2.5 text-xs font-medium ${enabled ? "text-primary" : "text-muted-foreground"}`;
  const body = (
    <>
      <Icon className="h-5 w-5 shrink-0" />
      <span className="max-w-full truncate">{label}</span>
    </>
  );
  if (href) {
    return (
      <a href={href} className={className} data-testid={testId}>
        {body}
      </a>
    );
  }
  if (onClick) {
    return (
      <button type="button" className={className} onClick={onClick} data-testid={testId}>
        {body}
      </button>
    );
  }
  return (
    <div className={className} aria-disabled="true">
      {body}
    </div>
  );
}

export default function Vendors() {
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [vendorToDelete, setVendorToDelete] = useState<Vendor | null>(null);
  const [selectedTrade, setSelectedTrade] = useSessionState<string | null>("vendors-trade", null);
  const [search, setSearch] = useState("");
  const [jumpLetter, setJumpLetter] = useState<string | null>(null);
  const lastJump = useRef<string | null>(null);
  const [createForm, setCreateForm] = useState<VendorFormValues>(emptyVendorForm);
  const [editForm, setEditForm] = useState<VendorFormValues>(emptyVendorForm);

  const { data: vendors = [], isLoading } = useQuery<Vendor[]>({
    queryKey: ["/api/vendors"],
  });

  const createVendorMutation = useMutation({
    mutationFn: async (vendorData: {
      name: string;
      email?: string;
      phoneNumber?: string;
      address?: string;
      contactPerson?: string;
      notes?: string;
      trades?: VendorTradeSlug[];
    }) => {
      const response = await apiRequest("POST", "/api/vendors", vendorData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vendors"] });
      setIsCreateDialogOpen(false);
      setCreateForm(emptyVendorForm);
      toast({ title: "Vendor created successfully" });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to create vendor",
        description: error.message || "An error occurred",
        variant: "destructive",
      });
    },
  });

  const updateVendorMutation = useMutation({
    mutationFn: async ({ vendorId, vendorData }: { vendorId: string; vendorData: any }) => {
      const response = await apiRequest("PATCH", `/api/vendors/${vendorId}`, vendorData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vendors"] });
      setIsEditDialogOpen(false);
      toast({ title: "Vendor updated successfully" });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update vendor",
        description: error.message || "An error occurred",
        variant: "destructive",
      });
    },
  });

  const deleteVendorMutation = useMutation({
    mutationFn: async (vendorId: string) => {
      const response = await apiRequest("DELETE", `/api/vendors/${vendorId}`, {});
      return response.json();
    },
    onSuccess: () => {
      setVendorToDelete(null);
      queryClient.invalidateQueries({ queryKey: ["/api/vendors"] });
      toast({ title: "Vendor deleted successfully" });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to delete vendor",
        description: error.message || "An error occurred",
        variant: "destructive",
      });
    },
  });

  const handleCreateVendor = (e: React.FormEvent) => {
    e.preventDefault();
    createVendorMutation.mutate({
      name: createForm.name,
      email: createForm.email || undefined,
      phoneNumber: createForm.phoneNumber || undefined,
      address: createForm.address || undefined,
      contactPerson: createForm.contactPerson || undefined,
      notes: createForm.notes || undefined,
      trades: createForm.trades,
    });
  };

  const handleUpdateVendor = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedVendor) {
      updateVendorMutation.mutate({
        vendorId: selectedVendor.id,
        vendorData: {
          name: editForm.name,
          email: editForm.email,
          phoneNumber: editForm.phoneNumber,
          address: editForm.address,
          contactPerson: editForm.contactPerson,
          notes: editForm.notes,
          trades: editForm.trades,
        },
      });
    }
  };

  const openEditDialog = (vendor: Vendor) => {
    setSelectedVendor(vendor);
    setEditForm({
      name: vendor.name || "",
      email: vendor.email || "",
      phoneNumber: vendor.phoneNumber || "",
      address: vendor.address || "",
      contactPerson: vendor.contactPerson || "",
      notes: vendor.notes || "",
      trades: knownTrades(vendor.trades),
    });
    setIsEditDialogOpen(true);
  };

  const tradeCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const trade of VENDOR_TRADES) counts.set(trade.slug, 0);
    let uncategorized = 0;
    for (const vendor of vendors) {
      const trades = vendor.trades ?? [];
      if (trades.length === 0) uncategorized += 1;
      for (const slug of trades) counts.set(slug, (counts.get(slug) ?? 0) + 1);
    }
    return { counts, uncategorized };
  }, [vendors]);

  const query = search.trim().toLowerCase();

  const visibleVendors = useMemo(() => {
    return vendors
      .filter((vendor) => {
        if (!selectedTrade) return true;
        if (selectedTrade === UNCATEGORIZED_TRADE) return (vendor.trades ?? []).length === 0;
        return (vendor.trades ?? []).includes(selectedTrade);
      })
      .filter((vendor) => !query || vendorSearchText(vendor).includes(query))
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
  }, [vendors, selectedTrade, query]);

  const vendorGroups = useMemo(() => {
    const groups = new Map<string, Vendor[]>();
    for (const vendor of visibleVendors) {
      const letter = contactLetter(vendor.name);
      const bucket = groups.get(letter);
      if (bucket) bucket.push(vendor);
      else groups.set(letter, [vendor]);
    }
    return ALPHABET.filter((letter) => groups.has(letter)).map((letter) => ({
      letter,
      vendors: groups.get(letter) ?? [],
    }));
  }, [visibleVendors]);

  const presentLetters = useMemo(
    () => new Set(vendorGroups.map((group) => group.letter)),
    [vendorGroups],
  );

  const jumpToLetter = (letter: string) => {
    if (!presentLetters.has(letter) || lastJump.current === letter) return;
    lastJump.current = letter;
    setJumpLetter(letter);
    const anchor = document.getElementById(`vendor-letter-${letter}`);
    const scroller = anchor?.closest("main");
    if (anchor && scroller) {
      const top = anchor.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop;
      scroller.scrollTo({ top: Math.max(0, top) });
    }
    window.setTimeout(() => {
      if (lastJump.current === letter) {
        lastJump.current = null;
        setJumpLetter(null);
      }
    }, 700);
  };

  const scrubToLetter = (event: ReactPointerEvent<HTMLElement>) => {
    const hit = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLButtonElement>("[data-letter]");
    const letter = hit?.dataset.letter;
    if (letter) jumpToLetter(letter);
  };

  const selectedTradeLabel = selectedTrade === UNCATEGORIZED_TRADE
    ? "Uncategorized"
    : selectedTrade
      ? vendorTradeLabel(selectedTrade)
      : "All vendors";

  const openViewDialog = (vendor: Vendor) => {
    setSelectedVendor(vendor);
    setIsViewDialogOpen(true);
  };

  const openEditFromView = () => {
    if (!selectedVendor) return;
    const vendor = selectedVendor;
    setIsViewDialogOpen(false);
    openEditDialog(vendor);
  };

  if (isLoading) {
    return (
      <div className="space-y-3 p-3 md:p-0">
        <div className="h-16 rounded-lg bg-muted/50 animate-pulse" />
        <div className="overflow-hidden rounded-xl border">
          <div className="h-11 animate-pulse bg-muted/40" />
          <div className="h-11 animate-pulse bg-muted/30" />
          <div className="h-11 animate-pulse bg-muted/40" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-w-0 space-y-4 p-3 md:p-0">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl md:text-2xl font-semibold" data-testid="text-vendors-title">
            Vendors
          </h1>
          <p className="text-sm md:text-base text-muted-foreground">
            {vendors.length} {vendors.length === 1 ? "vendor" : "vendors"} on file
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto shrink-0" data-testid="button-create-vendor">
              <Plus />
              Add vendor
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader className="pr-8 text-left">
              <DialogTitle>Add vendor</DialogTitle>
              <DialogDescription>
                Company details, how to reach them, and notes the team should see.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateVendor} className="space-y-4">
              <VendorFormFields
                idPrefix="new"
                testIdPrefix="new"
                values={createForm}
                onChange={(patch) => setCreateForm((current) => ({ ...current, ...patch }))}
              />
              <DialogFooter className="gap-2 sm:gap-0">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full sm:w-auto"
                  onClick={() => setIsCreateDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="w-full sm:w-auto"
                  disabled={createVendorMutation.isPending}
                  data-testid="button-submit-create-vendor"
                >
                  {createVendorMutation.isPending ? "Creating..." : "Create vendor"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="min-w-0">
        <CardContent className="flex flex-col gap-3 p-3 sm:p-4">
          <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name, contact, phone, or notes"
                className="pl-9 pr-9"
                aria-label="Search vendors"
                data-testid="input-search-vendors"
              />
              {search ? (
                <button
                  type="button"
                  className="absolute right-1.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
                  onClick={() => setSearch("")}
                  aria-label="Clear search"
                >
                  <X className="h-4 w-4" />
                </button>
              ) : null}
            </div>
            <Select
              value={selectedTrade ?? ALL_TRADES}
              onValueChange={(value) => setSelectedTrade(value === ALL_TRADES ? null : value)}
            >
              <SelectTrigger className="w-full sm:w-64 shrink-0" data-testid="filter-trade" aria-label="Filter by trade">
                <SelectValue placeholder="All trades" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_TRADES} data-testid="filter-trade-all">
                  All trades ({vendors.length})
                </SelectItem>
                <SelectItem value={UNCATEGORIZED_TRADE} data-testid="filter-trade-uncategorized">
                  Uncategorized ({tradeCounts.uncategorized})
                </SelectItem>
                {VENDOR_TRADES.map((trade) => (
                  <SelectItem key={trade.slug} value={trade.slug} data-testid={`filter-trade-${trade.slug}`}>
                    {trade.label} ({tradeCounts.counts.get(trade.slug) ?? 0})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <p className="text-sm text-muted-foreground" data-testid="text-vendor-results">
            {selectedTradeLabel}
            {query ? ` matching “${search.trim()}”` : ""}
            {" · "}
            {visibleVendors.length} shown
          </p>
        </CardContent>
      </Card>

      {visibleVendors.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 px-4 py-12 text-center">
            <Building2 className="h-8 w-8 text-muted-foreground" />
            <p className="font-medium">
              {vendors.length === 0 ? "No vendors yet" : "No vendors match this view"}
            </p>
            <p className="max-w-sm text-sm text-muted-foreground">
              {vendors.length === 0
                ? "Add a vendor to keep contact details and notes in one place."
                : "Try another trade or clear the search."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="relative flex min-w-0 items-start gap-1">
          <div className="min-w-0 flex-1 rounded-xl border bg-card">
            {vendorGroups.map((group) => (
              <section key={group.letter} className="relative">
                <span id={`vendor-letter-${group.letter}`} className="absolute left-0 top-0 h-px w-px" />
                <h2
                  className="sticky top-0 z-10 bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground"
                >
                  {group.letter}
                </h2>
                {group.vendors.map((vendor) => (
                  <ContactRow key={vendor.id} vendor={vendor} onOpen={openViewDialog} />
                ))}
              </section>
            ))}
          </div>
          <nav
            aria-label="Letter index"
            className="sticky top-2 z-20 flex h-[min(32rem,calc(100dvh-7.5rem))] w-5 shrink-0 touch-none flex-col self-start py-0.5 text-[10px] font-semibold leading-none"
            onPointerDown={(event) => {
              event.currentTarget.setPointerCapture(event.pointerId);
              scrubToLetter(event);
            }}
            onPointerMove={(event) => {
              if (event.currentTarget.hasPointerCapture(event.pointerId)) scrubToLetter(event);
            }}
          >
            {ALPHABET.map((letter) => {
              const available = presentLetters.has(letter);
              return (
                <button
                  key={letter}
                  type="button"
                  data-letter={letter}
                  aria-disabled={!available}
                  className={`flex min-h-0 w-full flex-1 items-center justify-center rounded-sm ${available ? "text-primary" : "text-muted-foreground/35"}`}
                  aria-label={`Jump to ${letter}`}
                  onClick={() => jumpToLetter(letter)}
                >
                  {letter}
                </button>
              );
            })}
          </nav>
          {jumpLetter ? (
            <div className="pointer-events-none absolute left-1/2 top-16 z-30 flex h-16 w-16 -translate-x-1/2 items-center justify-center rounded-2xl bg-foreground/80 text-3xl font-semibold text-background">
              {jumpLetter}
            </div>
          ) : null}
        </div>
      )}

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader className="pr-8 text-left">
            <DialogTitle className="break-words">Edit vendor</DialogTitle>
            <DialogDescription className="break-words">
              Update information for {selectedVendor?.name}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateVendor} className="space-y-4">
            <VendorFormFields
              idPrefix="edit"
              testIdPrefix="edit"
              values={editForm}
              onChange={(patch) => setEditForm((current) => ({ ...current, ...patch }))}
            />
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                className="w-full sm:w-auto"
                onClick={() => setIsEditDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="w-full sm:w-auto"
                disabled={updateVendorMutation.isPending}
                data-testid="button-submit-edit-vendor"
              >
                {updateVendorMutation.isPending ? "Updating..." : "Save changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-md">
          {selectedVendor && (
            <div className="min-w-0 space-y-4">
              <DialogHeader className="px-6 text-center sm:text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-muted text-xl font-semibold">
                  {vendorInitials(selectedVendor.name)}
                </div>
                <DialogTitle className="break-words text-center text-xl leading-snug">{selectedVendor.name}</DialogTitle>
                <DialogDescription className="text-center">
                  {(selectedVendor.trades ?? []).length > 0
                    ? (selectedVendor.trades ?? []).map((trade) => vendorTradeLabel(trade)).join(", ")
                    : "Vendor"}
                </DialogDescription>
              </DialogHeader>

              <div className="grid grid-cols-3 gap-2">
                <QuickAction
                  label="call"
                  icon={Phone}
                  href={selectedVendor.phoneNumber?.trim() ? `tel:${selectedVendor.phoneNumber}` : undefined}
                />
                <QuickAction
                  label="mail"
                  icon={Mail}
                  href={selectedVendor.email?.trim() ? `mailto:${selectedVendor.email}` : undefined}
                />
                <QuickAction
                  label="edit"
                  icon={Pencil}
                  onClick={openEditFromView}
                  testId={`button-edit-${selectedVendor.id}`}
                />
              </div>

              <div className="overflow-hidden rounded-xl bg-muted/50">
                <ContactCell label="Phone">
                  {selectedVendor.phoneNumber?.trim() ? (
                    <a className="break-all text-primary" href={`tel:${selectedVendor.phoneNumber}`}>{selectedVendor.phoneNumber}</a>
                  ) : (
                    <span className="text-muted-foreground">No phone number</span>
                  )}
                </ContactCell>
                <ContactCell label="Email">
                  {selectedVendor.email?.trim() ? (
                    <a className="break-all text-primary" href={`mailto:${selectedVendor.email}`}>{selectedVendor.email}</a>
                  ) : (
                    <span className="text-muted-foreground">No email</span>
                  )}
                </ContactCell>
                <ContactCell label="Contact">
                  {selectedVendor.contactPerson?.trim() || <span className="text-muted-foreground">No contact person</span>}
                </ContactCell>
                <ContactCell label="Address">
                  {selectedVendor.address?.trim() ? (
                    <span className="whitespace-pre-wrap">{selectedVendor.address}</span>
                  ) : (
                    <span className="text-muted-foreground">No address</span>
                  )}
                </ContactCell>
              </div>

              <div className="overflow-hidden rounded-xl bg-muted/50">
                <ContactCell label="Trades">
                  {(selectedVendor.trades ?? []).length > 0 ? (
                    <TradeBadges vendor={selectedVendor} />
                  ) : (
                    <span className="text-muted-foreground">No trade listed</span>
                  )}
                </ContactCell>
              </div>

              <div className="overflow-hidden rounded-xl bg-muted/50">
                <ContactCell label="Notes">
                  {selectedVendor.notes?.trim() ? (
                    <p className="whitespace-pre-wrap leading-relaxed">{selectedVendor.notes}</p>
                  ) : (
                    <span className="text-muted-foreground">No notes</span>
                  )}
                </ContactCell>
              </div>

              <button
                type="button"
                className="w-full rounded-xl bg-muted/50 px-3 py-3 text-sm font-medium text-destructive"
                data-testid={`button-delete-${selectedVendor.id}`}
                onClick={() => setVendorToDelete(selectedVendor)}
              >
                Delete Vendor
              </button>

              <p className="text-center text-[11px] text-muted-foreground">
                Added {formatStamp(selectedVendor.createdAt)} · Updated {formatStamp(selectedVendor.updatedAt)}
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <DestructiveDeleteDialog
        open={!!vendorToDelete}
        onOpenChange={(open) => { if (!open) setVendorToDelete(null); }}
        entityLabel={vendorToDelete?.name ?? ""}
        entityType="vendor"
        requireConfirmationText={vendorToDelete?.name}
        onConfirm={() => vendorToDelete && deleteVendorMutation.mutate(vendorToDelete.id)}
        isPending={deleteVendorMutation.isPending}
      />
    </div>
  );
}
