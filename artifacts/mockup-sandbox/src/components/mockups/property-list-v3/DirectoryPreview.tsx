import { useState } from "react";
import {
  Building2, Trees, Car, Gamepad2, Wrench, Route, HelpCircle,
  MapPin, Search, Plus, ChevronDown, ChevronRight,
  Calendar, Settings2, ExternalLink,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

type PropertyType = "building" | "lawn" | "parking" | "recreation" | "utility" | "road" | "other";

interface Property {
  id: string;
  name: string;
  address: string;
  type: PropertyType;
  lastWorkDate: string;
  equipmentCount: number;
}

const mockProperties: Property[] = [
  { id: "b1", name: "Anderson Hall", address: "1200 College Ave", type: "building", lastWorkDate: "Oct 24, 2023", equipmentCount: 45 },
  { id: "b2", name: "Science Building", address: "1300 Research Dr", type: "building", lastWorkDate: "Oct 25, 2023", equipmentCount: 120 },
  { id: "b3", name: "Library", address: "900 Academic Way", type: "building", lastWorkDate: "Oct 20, 2023", equipmentCount: 30 },
  { id: "b4", name: "Student Center", address: "500 Campus Blvd", type: "building", lastWorkDate: "Oct 26, 2023", equipmentCount: 65 },
  { id: "b5", name: "Gymnasium", address: "800 Sports Lane", type: "building", lastWorkDate: "Oct 22, 2023", equipmentCount: 40 },
  { id: "l1", name: "Main Quad", address: "Central Campus", type: "lawn", lastWorkDate: "Oct 26, 2023", equipmentCount: 12 },
  { id: "l2", name: "Memorial Garden", address: "North Campus", type: "lawn", lastWorkDate: "Oct 15, 2023", equipmentCount: 4 },
  { id: "l3", name: "Practice Fields", address: "East Athletic Complex", type: "lawn", lastWorkDate: "Oct 21, 2023", equipmentCount: 18 },
  { id: "p1", name: "Lot A - Faculty", address: "West Campus", type: "parking", lastWorkDate: "Sep 30, 2023", equipmentCount: 8 },
  { id: "p2", name: "Lot B - Student", address: "South Campus", type: "parking", lastWorkDate: "Oct 10, 2023", equipmentCount: 15 },
  { id: "r1", name: "Tennis Courts", address: "Athletic Complex", type: "recreation", lastWorkDate: "Oct 12, 2023", equipmentCount: 6 },
  { id: "r2", name: "Pool & Aquatic Center", address: "Recreation Dr", type: "recreation", lastWorkDate: "Oct 25, 2023", equipmentCount: 15 },
  { id: "u1", name: "Central Plant", address: "100 Service Rd", type: "utility", lastWorkDate: "Oct 27, 2023", equipmentCount: 85 },
  { id: "rd1", name: "Campus Loop Drive", address: "Perimeter Road", type: "road", lastWorkDate: "Aug 15, 2023", equipmentCount: 32 },
  { id: "o1", name: "Storage Facility", address: "200 Maintenance Way", type: "other", lastWorkDate: "Sep 05, 2023", equipmentCount: 5 },
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

const mapShapes = [
  { type: "building" as PropertyType, propertyId: "b1", top: "15%", left: "20%", width: "14%", height: "18%" },
  { type: "lawn" as PropertyType, propertyId: "l1", top: "30%", left: "30%", width: "18%", height: "22%" },
  { type: "parking" as PropertyType, propertyId: "p1", top: "55%", left: "65%", width: "20%", height: "14%" },
  { type: "recreation" as PropertyType, propertyId: "r1", top: "12%", left: "60%", width: "16%", height: "16%" },
  { type: "utility" as PropertyType, propertyId: "u1", top: "75%", left: "25%", width: "10%", height: "10%" },
];

const allTypes = Object.keys(typeConfig) as PropertyType[];

export function DirectoryPreview() {
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedPropertyId, setExpandedPropertyId] = useState<string | null>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  const filtered = mockProperties.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.address.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const grouped = allTypes.reduce((acc, type) => {
    acc[type] = filtered.filter((p) => p.type === type);
    return acc;
  }, {} as Record<string, Property[]>);

  const toggleGroup = (type: string) => {
    setCollapsedGroups((prev) => ({ ...prev, [type]: !prev[type] }));
  };

  const activeTypes = allTypes.filter((type) => grouped[type].length > 0);

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      <div className="px-6 py-3 border-b flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold tracking-tight">Property Directory</h1>
          <Badge variant="secondary">{filtered.length}</Badge>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search properties..."
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

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-6 py-4 space-y-3">
          {activeTypes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <MapPin className="w-10 h-10 mb-3 opacity-20" />
              <p className="font-medium">No properties found</p>
              <p className="text-sm mt-1">Try adjusting your search.</p>
            </div>
          ) : (
            activeTypes.map((type) => {
              const cfg = typeConfig[type];
              const Icon = cfg.icon;
              const properties = grouped[type];
              const isCollapsed = collapsedGroups[type];

              return (
                <Collapsible key={type} open={!isCollapsed} onOpenChange={() => toggleGroup(type)}>
                  <CollapsibleTrigger asChild>
                    <div className="flex items-center justify-between p-3 rounded-lg cursor-pointer hover-elevate bg-muted/40">
                      <div className="flex items-center gap-2.5">
                        <div className={`p-1.5 rounded-md ${cfg.bgClass}/15`}>
                          <Icon className={`w-4 h-4 ${cfg.colorClass}`} />
                        </div>
                        <span className="font-semibold text-sm">{cfg.label}</span>
                        <Badge variant="secondary">{properties.length}</Badge>
                      </div>
                      <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${!isCollapsed ? "rotate-180" : ""}`} />
                    </div>
                  </CollapsibleTrigger>

                  <CollapsibleContent className="mt-1 space-y-1">
                    {properties.map((property) => {
                      const isExpanded = expandedPropertyId === property.id;
                      return (
                        <div key={property.id}>
                          <div
                            onClick={() => setExpandedPropertyId(isExpanded ? null : property.id)}
                            className={`flex items-center gap-3 px-4 py-2.5 rounded-md cursor-pointer hover-elevate ${
                              isExpanded ? "bg-primary/5" : ""
                            }`}
                          >
                            <Icon className={`w-4 h-4 shrink-0 ${cfg.colorClass}`} />
                            <span className="text-sm font-medium flex-1 truncate">{property.name}</span>
                            <span className="text-xs text-muted-foreground truncate max-w-40">{property.address}</span>
                            <span className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                              <Settings2 className="w-3 h-3" />
                              {property.equipmentCount}
                            </span>
                            <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                          </div>

                          {isExpanded && (
                            <div className="ml-4 mr-2 mt-1 mb-2 animate-in slide-in-from-top-1 fade-in-20">
                              <Card>
                                <CardContent className="p-4">
                                  <div className="flex gap-4">
                                    <div className="w-48 h-32 bg-muted rounded-lg relative shrink-0 overflow-hidden">
                                      <div className="absolute inset-0 flex items-center justify-center">
                                        <MapPin className="w-8 h-8 text-muted-foreground/15" />
                                      </div>
                                      {mapShapes
                                        .filter((s) => s.propertyId === property.id)
                                        .map((shape, i) => (
                                          <div
                                            key={i}
                                            className={`absolute rounded-sm border-2 opacity-80 ring-2 ring-primary ring-offset-1 ${typeConfig[shape.type].bgClass}`}
                                            style={{ top: shape.top, left: shape.left, width: shape.width, height: shape.height }}
                                          />
                                        ))}
                                      {!mapShapes.find((s) => s.propertyId === property.id) && (
                                        <div className="absolute inset-0 flex items-center justify-center">
                                          <div className="w-4 h-4 bg-primary rounded-full ring-4 ring-primary/30" />
                                        </div>
                                      )}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                      <h3 className="font-semibold text-base">{property.name}</h3>
                                      <p className="text-sm text-muted-foreground mt-0.5 flex items-center gap-1.5">
                                        <MapPin className="w-3.5 h-3.5 shrink-0" />
                                        {property.address}
                                      </p>

                                      <div className="grid grid-cols-3 gap-3 mt-3">
                                        <div className="p-2 rounded-md bg-muted/50">
                                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Type</p>
                                          <p className="text-sm font-semibold mt-0.5 flex items-center gap-1.5">
                                            <Icon className={`w-3.5 h-3.5 ${cfg.colorClass}`} />
                                            {cfg.label.replace(/s$/, "")}
                                          </p>
                                        </div>
                                        <div className="p-2 rounded-md bg-muted/50">
                                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Last Work</p>
                                          <p className="text-sm font-semibold mt-0.5 flex items-center gap-1.5">
                                            <Calendar className="w-3.5 h-3.5" />
                                            {property.lastWorkDate}
                                          </p>
                                        </div>
                                        <div className="p-2 rounded-md bg-muted/50">
                                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Assets</p>
                                          <p className="text-sm font-semibold mt-0.5 flex items-center gap-1.5">
                                            <Settings2 className="w-3.5 h-3.5" />
                                            {property.equipmentCount}
                                          </p>
                                        </div>
                                      </div>

                                      <div className="mt-3 flex gap-2">
                                        <Button size="sm">
                                          <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                                          Full Details
                                        </Button>
                                        <Button size="sm" variant="outline">
                                          Create Work Order
                                        </Button>
                                      </div>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </CollapsibleContent>
                </Collapsible>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

export default DirectoryPreview;
