import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Plus, Search, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertMobileEquipmentSchema, type InsertMobileEquipment, type MobileEquipment } from "@shared/schema";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import {
  MOBILE_EQUIPMENT_CATEGORIES,
  MOBILE_EQUIPMENT_STATUSES,
  categoryLabel,
  statusLabel,
} from "@/lib/mobileEquipmentConstants";
import { WorkLoadError } from "@/pages/Work/WorkLoadError";

const statusVariant: Record<string, "default" | "secondary" | "destructive"> = {
  available: "default",
  in_use: "secondary",
  needs_maintenance: "destructive",
  out_of_service: "destructive",
};

function buildListUrl(search: string, partNumber: string, category: string, status: string) {
  const params = new URLSearchParams();
  if (search.trim()) params.set("search", search.trim());
  if (partNumber.trim()) params.set("partNumber", partNumber.trim());
  if (category && category !== "all") params.set("category", category);
  if (status && status !== "all") params.set("status", status);
  const q = params.toString();
  return `/api/mobile-equipment${q ? `?${q}` : ""}`;
}

export default function MobileEquipmentPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const { toast } = useToast();
  const [searchInput, setSearchInput] = useState("");
  const [partNumberInput, setPartNumberInput] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [createOpen, setCreateOpen] = useState(false);

  const debouncedSearch = useDebouncedValue(searchInput);
  const debouncedPartNumber = useDebouncedValue(partNumberInput);
  const listUrl = buildListUrl(debouncedSearch, debouncedPartNumber, categoryFilter, statusFilter);

  const { data: items, isLoading, isError, error, refetch } = useQuery<MobileEquipment[]>({
    queryKey: [listUrl],
  });

  const form = useForm<InsertMobileEquipment>({
    resolver: zodResolver(insertMobileEquipmentSchema),
    defaultValues: {
      name: "",
      category: "other",
      status: "available",
      make: "",
      model: "",
      serialNumber: "",
      assetTag: "",
      notes: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertMobileEquipment) => {
      const res = await apiRequest("POST", "/api/mobile-equipment", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/mobile-equipment"] });
      toast({ title: "Equipment added" });
      setCreateOpen(false);
      form.reset();
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  return (
    <div className="space-y-4 p-4 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tools & Equipment</h1>
          <p className="text-sm text-muted-foreground">
            Portable assets — mowers, tractors, pumps, and more
          </p>
        </div>
        {isAdmin && (
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-mobile-equipment">
                <Plus className="h-4 w-4 mr-2" />
                Add Equipment
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add Equipment</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit((data) => createMutation.mutate(data))}
                  className="space-y-3"
                >
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="e.g. John Deere Z355E" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {MOBILE_EQUIPMENT_CATEGORIES.map((c) => (
                              <SelectItem key={c.value} value={c.value}>
                                {c.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <FormField
                      control={form.control}
                      name="make"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Make</FormLabel>
                          <FormControl>
                            <Input {...field} value={field.value ?? ""} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="model"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Model</FormLabel>
                          <FormControl>
                            <Input {...field} value={field.value ?? ""} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="assetTag"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Asset Tag</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value ?? ""} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <DialogFooter>
                    <Button type="submit" disabled={createMutation.isPending}>
                      Save
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search name, make, tag..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            data-testid="input-mobile-equipment-search"
          />
        </div>
        <Input
          className="sm:w-44"
          placeholder="Part number..."
          value={partNumberInput}
          onChange={(e) => setPartNumberInput(e.target.value)}
          data-testid="input-part-number-search"
        />
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="sm:w-40">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {MOBILE_EQUIPMENT_CATEGORIES.map((c) => (
              <SelectItem key={c.value} value={c.value}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="sm:w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {MOBILE_EQUIPMENT_STATUSES.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isError ? (
        <WorkLoadError
          title="Could not load equipment"
          message={error instanceof Error ? error.message : "Failed to load"}
          onRetry={() => refetch()}
        />
      ) : isLoading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : !items?.length ? (
        <Card>
          <CardContent className="flex flex-col items-center py-12">
            <Wrench className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="font-medium">No equipment found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {items.map((item) => (
            <Link key={item.id} href={`/tools-equipment/${item.id}`}>
              <Card className="hover-elevate cursor-pointer h-full" data-testid={`card-mobile-equipment-${item.id}`}>
                <CardHeader className="pb-2 p-3">
                  <div className="flex justify-between items-start gap-2">
                    <CardTitle className="text-base leading-tight">{item.name}</CardTitle>
                    <Badge variant={statusVariant[item.status] ?? "secondary"} className="text-xs shrink-0">
                      {statusLabel(item.status)}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {categoryLabel(item.category)}
                    {item.make || item.model
                      ? ` · ${[item.make, item.model].filter(Boolean).join(" ")}`
                      : ""}
                  </p>
                </CardHeader>
                {item.assetTag && (
                  <CardContent className="pt-0 p-3">
                    <p className="text-xs font-mono text-muted-foreground">Tag: {item.assetTag}</p>
                  </CardContent>
                )}
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
