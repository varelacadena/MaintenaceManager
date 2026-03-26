import { useState } from "react";
import {
  Building2, Trees, Car, Gamepad2, Wrench, Route, HelpCircle,
  MapPin, Search, Plus, AlertTriangle, CheckCircle2, Clock,
  Calendar, Settings2, ChevronRight,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

type PropertyType = "building" | "lawn" | "parking" | "recreation" | "utility" | "road" | "other";
type PriorityLane = "overdue" | "recent" | "ontrack";

interface Property {
  id: string;
  name: string;
  address: string;
  type: PropertyType;
  lastWorkDate: string;
  equipmentCount: number;
  daysAgo: number;
}

const mockProperties: Property[] = [
  { id: "b1", name: "Anderson Hall", address: "1200 College Ave", type: "building", lastWorkDate: "Oct 24, 2023", equipmentCount: 45, daysAgo: 5 },
  { id: "b2", name: "Science Building", address: "1300 Research Dr", type: "building", lastWorkDate: "Oct 25, 2023", equipmentCount: 120, daysAgo: 4 },
  { id: "b3", name: "Library", address: "900 Academic Way", type: "building", lastWorkDate: "Oct 20, 2023", equipmentCount: 30, daysAgo: 9 },
  { id: "b4", name: "Student Center", address: "500 Campus Blvd", type: "building", lastWorkDate: "Oct 26, 2023", equipmentCount: 65, daysAgo: 3 },
  { id: "b5", name: "Gymnasium", address: "800 Sports Lane", type: "building", lastWorkDate: "Oct 22, 2023", equipmentCount: 40, daysAgo: 7 },
  { id: "l1", name: "Main Quad", address: "Central Campus", type: "lawn", lastWorkDate: "Oct 26, 2023", equipmentCount: 12, daysAgo: 3 },
  { id: "l2", name: "Memorial Garden", address: "North Campus", type: "lawn", lastWorkDate: "Oct 15, 2023", equipmentCount: 4, daysAgo: 14 },
  { id: "l3", name: "Practice Fields", address: "East Athletic Complex", type: "lawn", lastWorkDate: "Oct 21, 2023", equipmentCount: 18, daysAgo: 8 },
  { id: "p1", name: "Lot A - Faculty", address: "West Campus", type: "parking", lastWorkDate: "Sep 30, 2023", equipmentCount: 8, daysAgo: 29 },
  { id: "p2", name: "Lot B - Student", address: "South Campus", type: "parking", lastWorkDate: "Oct 10, 2023", equipmentCount: 15, daysAgo: 19 },
  { id: "r1", name: "Tennis Courts", address: "Athletic Complex", type: "recreation", lastWorkDate: "Oct 12, 2023", equipmentCount: 6, daysAgo: 17 },
  { id: "r2", name: "Pool & Aquatic Center", address: "Recreation Dr", type: "recreation", lastWorkDate: "Oct 25, 2023", equipmentCount: 15, daysAgo: 4 },
  { id: "u1", name: "Central Plant", address: "100 Service Rd", type: "utility", lastWorkDate: "Oct 27, 2023", equipmentCount: 85, daysAgo: 2 },
  { id: "rd1", name: "Campus Loop Drive", address: "Perimeter Road", type: "road", lastWorkDate: "Aug 15, 2023", equipmentCount: 32, daysAgo: 75 },
  { id: "o1", name: "Storage Facility", address: "200 Maintenance Way", type: "other", lastWorkDate: "Sep 05, 2023", equipmentCount: 5, daysAgo: 54 },
];

const typeConfig: Record<PropertyType, { icon: typeof Building2; label: string; colorClass: string; bgClass: string }> = {
  building: { icon: Building2, label: "Building", colorClass: "text-blue-500", bgClass: "bg-blue-500" },
  lawn: { icon: Trees, label: "Lawn", colorClass: "text-green-500", bgClass: "bg-green-500" },
  parking: { icon: Car, label: "Parking", colorClass: "text-slate-500", bgClass: "bg-slate-500" },
  recreation: { icon: Gamepad2, label: "Recreation", colorClass: "text-orange-500", bgClass: "bg-orange-500" },
  utility: { icon: Wrench, label: "Utility", colorClass: "text-yellow-600", bgClass: "bg-yellow-500" },
  road: { icon: Route, label: "Road", colorClass: "text-zinc-500", bgClass: "bg-zinc-500" },
  other: { icon: HelpCircle, label: "Other", colorClass: "text-purple-500", bgClass: "bg-purple-500" },
};

const laneConfig: Record<PriorityLane, { label: string; description: string; icon: typeof AlertTriangle; colorClass: string; bgClass: string; borderClass: string }> = {
  overdue: { label: "Needs Attention", description: "Last work > 21 days ago", icon: AlertTriangle, colorClass: "text-red-500", bgClass: "bg-red-500/10", borderClass: "border-red-500/20" },
  recent: { label: "Recently Serviced", description: "Last work 7-21 days ago", icon: Clock, colorClass: "text-amber-500", bgClass: "bg-amber-500/10", borderClass: "border-amber-500/20" },
  ontrack: { label: "On Track", description: "Last work < 7 days ago", icon: CheckCircle2, colorClass: "text-green-500", bgClass: "bg-green-500/10", borderClass: "border-green-500/20" },
};

function getLane(daysAgo: number): PriorityLane {
  if (daysAgo > 21) return "overdue";
  if (daysAgo > 7) return "recent";
  return "ontrack";
}

export function PriorityTimeline() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);

  const filtered = mockProperties.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.address.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const lanes: Record<PriorityLane, Property[]> = { overdue: [], recent: [], ontrack: [] };
  filtered.forEach((p) => lanes[getLane(p.daysAgo)].push(p));

  const laneOrder: PriorityLane[] = ["overdue", "recent", "ontrack"];

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      <div className="px-4 py-3 border-b flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold tracking-tight">Properties</h1>
          <Badge variant="secondary">{filtered.length}</Badge>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative w-56">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search..."
              className="pl-9 h-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button size="sm">
            <Plus className="w-4 h-4 mr-1.5" />
            Add Property
          </Button>
        </div>
      </div>

      <div className="px-4 py-2 flex items-center gap-6 border-b bg-muted/30 shrink-0">
        {laneOrder.map((lane) => {
          const cfg = laneConfig[lane];
          const Icon = cfg.icon;
          return (
            <div key={lane} className="flex items-center gap-2">
              <Icon className={`w-4 h-4 ${cfg.colorClass}`} />
              <span className="text-sm font-semibold">{cfg.label}</span>
              <Badge variant="secondary">{lanes[lane].length}</Badge>
            </div>
          );
        })}
      </div>

      <div className="flex-1 flex min-h-0">
        {laneOrder.map((lane) => {
          const cfg = laneConfig[lane];
          const Icon = cfg.icon;
          const properties = lanes[lane];
          return (
            <div key={lane} className="flex-1 flex flex-col border-r last:border-r-0">
              <div className={`px-3 py-2 flex items-center gap-2 border-b ${cfg.bgClass}`}>
                <Icon className={`w-4 h-4 ${cfg.colorClass}`} />
                <span className="text-sm font-semibold">{cfg.label}</span>
                <Badge variant="secondary" className="ml-auto">{properties.length}</Badge>
              </div>
              <ScrollArea className="flex-1">
                <div className="p-2 space-y-2">
                  {properties.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <CheckCircle2 className="w-8 h-8 mx-auto mb-2 opacity-20" />
                      <p className="text-sm">No properties in this category</p>
                    </div>
                  ) : (
                    properties.map((property) => {
                      const typeCfg = typeConfig[property.type];
                      const TypeIcon = typeCfg.icon;
                      const isSelected = selectedPropertyId === property.id;
                      return (
                        <Card
                          key={property.id}
                          className={`cursor-pointer hover-elevate ${
                            isSelected ? "ring-2 ring-primary border-primary" : ""
                          }`}
                          onClick={() => setSelectedPropertyId(property.id)}
                        >
                          <CardContent className="p-3">
                            <div className="flex items-start gap-2.5">
                              <div className={`p-1.5 rounded-md ${typeCfg.bgClass}/15 shrink-0 mt-0.5`}>
                                <TypeIcon className={`w-4 h-4 ${typeCfg.colorClass}`} />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <h4 className="text-sm font-semibold truncate">{property.name}</h4>
                                </div>
                                <p className="text-xs text-muted-foreground truncate mt-0.5">{property.address}</p>
                                <div className="flex items-center gap-3 mt-2">
                                  <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                                    <Calendar className="w-3 h-3" />
                                    {property.lastWorkDate}
                                  </span>
                                  <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                                    <Settings2 className="w-3 h-3" />
                                    {property.equipmentCount}
                                  </span>
                                  <Badge variant="outline" className="text-[10px] ml-auto shrink-0">
                                    {property.daysAgo}d ago
                                  </Badge>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })
                  )}
                </div>
              </ScrollArea>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default PriorityTimeline;
