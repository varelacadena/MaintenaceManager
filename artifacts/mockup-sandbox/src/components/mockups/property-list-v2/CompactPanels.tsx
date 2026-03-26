import { useState, useMemo } from "react";
import {
  Building2, Trees, Car, Gamepad2, Wrench, Route, HelpCircle,
  MapPin, Search, Plus, Calendar, Settings2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

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
  { type: "building" as PropertyType, propertyId: "b1", top: "10%", left: "15%", width: "16%", height: "22%" },
  { type: "building" as PropertyType, propertyId: "b2", top: "35%", left: "45%", width: "14%", height: "14%" },
  { type: "lawn" as PropertyType, propertyId: "l1", top: "25%", left: "25%", width: "20%", height: "25%" },
  { type: "parking" as PropertyType, propertyId: "p1", top: "50%", left: "60%", width: "22%", height: "16%" },
  { type: "recreation" as PropertyType, propertyId: "r1", top: "8%", left: "55%", width: "18%", height: "18%" },
  { type: "utility" as PropertyType, propertyId: "u1", top: "70%", left: "20%", width: "12%", height: "12%" },
  { type: "road" as PropertyType, propertyId: "rd1", top: "65%", left: "45%", width: "30%", height: "8%" },
];

const allTypes = Object.keys(typeConfig) as PropertyType[];

export function CompactPanels() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);

  const filteredProperties = useMemo(() => {
    return mockProperties.filter((p) => {
      const matchesSearch =
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.address.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFilter = activeFilters.length === 0 || activeFilters.includes(p.type);
      return matchesSearch && matchesFilter;
    });
  }, [searchQuery, activeFilters]);

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold tracking-tight">Properties</h1>
          <Badge variant="secondary">{filteredProperties.length} of {mockProperties.length}</Badge>
        </div>
        <Button size="sm">
          <Plus className="w-4 h-4 mr-1.5" />
          Add Property
        </Button>
      </div>

      <div className="h-[38%] flex border-b shrink-0">
        <div className="w-1/2 p-4 flex flex-col gap-3 border-r">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or address..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <ToggleGroup
            type="multiple"
            value={activeFilters}
            onValueChange={setActiveFilters}
            className="flex-wrap justify-start gap-1.5"
          >
            {allTypes.map((type) => {
              const cfg = typeConfig[type];
              const Icon = cfg.icon;
              const count = mockProperties.filter((p) => p.type === type).length;
              return (
                <ToggleGroupItem
                  key={type}
                  value={type}
                  aria-label={`Filter ${cfg.label}`}
                  className="border data-[state=on]:bg-primary data-[state=on]:text-primary-foreground rounded-full shrink-0 gap-1"
                >
                  <Icon className="w-3 h-3" />
                  <span className="text-xs">{cfg.label} ({count})</span>
                </ToggleGroupItem>
              );
            })}
          </ToggleGroup>

          <div className="grid grid-cols-4 gap-2 mt-auto">
            {allTypes.slice(0, 4).map((type) => {
              const cfg = typeConfig[type];
              const Icon = cfg.icon;
              const count = mockProperties.filter((p) => p.type === type).length;
              return (
                <div key={type} className="flex items-center gap-2 p-2 rounded-md bg-muted/50">
                  <Icon className={`w-4 h-4 ${cfg.colorClass}`} />
                  <div>
                    <span className="text-base font-bold leading-none">{count}</span>
                    <p className="text-[10px] text-muted-foreground leading-tight">{cfg.label}s</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="w-1/2 relative bg-muted/30 overflow-hidden">
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <MapPin className="w-16 h-16 text-muted-foreground/10" />
          </div>

          {mapShapes.map((shape, i) => {
            const isSelected = selectedPropertyId === shape.propertyId;
            return (
              <div
                key={i}
                onClick={() => setSelectedPropertyId(shape.propertyId)}
                className={`absolute rounded-sm border-2 cursor-pointer transition-all duration-200 ${typeConfig[shape.type].bgClass} ${
                  isSelected
                    ? "opacity-90 ring-2 ring-primary ring-offset-2 scale-105 z-10"
                    : "opacity-50 border-white/40"
                }`}
                style={{ top: shape.top, left: shape.left, width: shape.width, height: shape.height }}
              />
            );
          })}

          <div className="absolute bottom-2 left-2 z-10 bg-background/90 backdrop-blur p-1.5 rounded-md border shadow-sm">
            <div className="grid grid-cols-4 gap-x-2.5 gap-y-0.5">
              {allTypes.map((type) => (
                <div key={type} className="flex items-center gap-1">
                  <div className={`w-2 h-2 rounded-sm ${typeConfig[type].bgClass}`} />
                  <span className="text-[9px] font-medium">{typeConfig[type].label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {filteredProperties.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <MapPin className="w-10 h-10 mb-3 opacity-20" />
            <p className="font-medium">No properties found</p>
            <p className="text-sm mt-1">Try adjusting your search or filters.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {filteredProperties.map((property) => {
              const cfg = typeConfig[property.type];
              const Icon = cfg.icon;
              const isSelected = selectedPropertyId === property.id;
              return (
                <Card
                  key={property.id}
                  className={`cursor-pointer hover-elevate ${
                    isSelected
                      ? "ring-2 ring-primary border-primary shadow-md"
                      : ""
                  }`}
                  onClick={() => setSelectedPropertyId(property.id)}
                >
                  <CardContent className="p-3 flex flex-col gap-2">
                    <div className="flex items-start justify-between gap-1">
                      <div className={`p-1.5 rounded-md ${cfg.bgClass}/10`}>
                        <Icon className={`w-4 h-4 ${cfg.colorClass}`} />
                      </div>
                      <Badge variant="outline" className="text-[10px]">
                        {cfg.label}
                      </Badge>
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold leading-tight truncate">{property.name}</h3>
                      <p className="text-xs text-muted-foreground truncate mt-0.5 flex items-center gap-1">
                        <MapPin className="w-3 h-3 shrink-0" />
                        {property.address}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 text-[10px] text-muted-foreground mt-auto pt-1 border-t">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {property.lastWorkDate}
                      </span>
                      <span className="flex items-center gap-1">
                        <Settings2 className="w-3 h-3" />
                        {property.equipmentCount}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default CompactPanels;
