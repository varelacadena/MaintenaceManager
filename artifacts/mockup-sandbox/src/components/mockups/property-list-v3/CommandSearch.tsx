import { useState, useMemo } from "react";
import {
  Building2, Trees, Car, Gamepad2, Wrench, Route, HelpCircle,
  MapPin, Search, Plus, Calendar, Settings2, ChevronRight,
  Command,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

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
  { type: "building" as PropertyType, propertyId: "b2", top: "40%", left: "50%", width: "12%", height: "12%" },
  { type: "lawn" as PropertyType, propertyId: "l1", top: "30%", left: "30%", width: "18%", height: "22%" },
  { type: "parking" as PropertyType, propertyId: "p1", top: "55%", left: "65%", width: "20%", height: "14%" },
  { type: "recreation" as PropertyType, propertyId: "r1", top: "12%", left: "60%", width: "16%", height: "16%" },
  { type: "utility" as PropertyType, propertyId: "u1", top: "75%", left: "25%", width: "10%", height: "10%" },
  { type: "road" as PropertyType, propertyId: "rd1", top: "70%", left: "50%", width: "25%", height: "6%" },
];

const allTypes = Object.keys(typeConfig) as PropertyType[];

export function CommandSearch() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);

  const hasQuery = searchQuery.trim().length > 0;

  const filteredProperties = useMemo(() => {
    if (!hasQuery) return mockProperties;
    return mockProperties.filter((p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.type.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery, hasQuery]);

  const selectedProperty = mockProperties.find((p) => p.id === selectedPropertyId);

  const groupedByType = useMemo(() => {
    const groups: Record<string, Property[]> = {};
    filteredProperties.forEach((p) => {
      if (!groups[p.type]) groups[p.type] = [];
      groups[p.type].push(p);
    });
    return groups;
  }, [filteredProperties]);

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      <div className="flex-1 flex flex-col items-center pt-8 px-4">
        <div className="w-full max-w-2xl flex flex-col items-center">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-primary/10">
              <Command className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Find a Property</h1>
              <p className="text-sm text-muted-foreground">Search by name, address, or type</p>
            </div>
            <Button size="sm" className="ml-auto">
              <Plus className="w-4 h-4 mr-1.5" />
              Add
            </Button>
          </div>

          <div className="relative w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              placeholder='Try "Anderson", "Science", "lawn", or "Athletic"...'
              className="pl-12 pr-4 h-12 text-base rounded-xl border-2 focus-visible:ring-2 focus-visible:ring-primary/20"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
            />
            {hasQuery && (
              <Badge variant="secondary" className="absolute right-3 top-1/2 -translate-y-1/2">
                {filteredProperties.length} results
              </Badge>
            )}
          </div>

          {!hasQuery && (
            <div className="flex flex-wrap gap-2 mt-4 justify-center">
              {allTypes.map((type) => {
                const cfg = typeConfig[type];
                const Icon = cfg.icon;
                const count = mockProperties.filter((p) => p.type === type).length;
                return (
                  <Button
                    key={type}
                    variant="outline"
                    size="sm"
                    onClick={() => setSearchQuery(cfg.label.toLowerCase())}
                    className="gap-1.5"
                  >
                    <Icon className={`w-3.5 h-3.5 ${cfg.colorClass}`} />
                    {cfg.label} ({count})
                  </Button>
                );
              })}
            </div>
          )}
        </div>

        <div className="w-full max-w-2xl mt-4 flex-1 overflow-y-auto">
          {filteredProperties.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Search className="w-10 h-10 mb-3 opacity-20" />
              <p className="font-medium">No properties match your search</p>
              <p className="text-sm mt-1">Try a different name, address, or type.</p>
            </div>
          ) : (
            <div className="space-y-4 pb-4">
              {allTypes.filter((type) => groupedByType[type]?.length).map((type) => {
                const cfg = typeConfig[type];
                const Icon = cfg.icon;
                const properties = groupedByType[type];
                return (
                  <div key={type}>
                    <div className="flex items-center gap-2 px-2 mb-1.5">
                      <Icon className={`w-3.5 h-3.5 ${cfg.colorClass}`} />
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{cfg.label}s</span>
                      <div className="flex-1 h-px bg-border" />
                    </div>
                    <div className="space-y-0.5">
                      {properties.map((property) => {
                        const isSelected = selectedPropertyId === property.id;
                        return (
                          <div
                            key={property.id}
                            onClick={() => setSelectedPropertyId(isSelected ? null : property.id)}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer hover-elevate ${
                              isSelected ? "bg-primary/5 ring-1 ring-primary/20" : ""
                            }`}
                          >
                            <div className="flex-1 min-w-0">
                              <span className="text-sm font-medium">{property.name}</span>
                              <span className="text-xs text-muted-foreground ml-2">{property.address}</span>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground shrink-0">
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {property.lastWorkDate}
                              </span>
                              <span className="flex items-center gap-1">
                                <Settings2 className="w-3 h-3" />
                                {property.equipmentCount}
                              </span>
                            </div>
                            <ChevronRight className={`w-4 h-4 ${isSelected ? "text-primary" : "text-muted-foreground/30"}`} />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {selectedProperty && (
        <div className="border-t bg-card">
          <div className="max-w-4xl mx-auto flex items-stretch">
            <div className="w-64 h-40 relative bg-muted/30 shrink-0 overflow-hidden">
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <MapPin className="w-10 h-10 text-muted-foreground/10" />
              </div>
              {mapShapes.map((shape, i) => {
                const isThis = shape.propertyId === selectedProperty.id;
                return (
                  <div
                    key={i}
                    className={`absolute rounded-sm border-2 ${typeConfig[shape.type].bgClass} ${
                      isThis
                        ? "opacity-90 ring-2 ring-primary ring-offset-1 z-10"
                        : "opacity-30 border-white/30"
                    }`}
                    style={{ top: shape.top, left: shape.left, width: shape.width, height: shape.height }}
                  />
                );
              })}
            </div>

            <div className="flex-1 p-4 flex items-center gap-4">
              <div className={`p-2.5 rounded-lg ${typeConfig[selectedProperty.type].bgClass}/15 shrink-0`}>
                {(() => { const Icon = typeConfig[selectedProperty.type].icon; return <Icon className={`w-6 h-6 ${typeConfig[selectedProperty.type].colorClass}`} />; })()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-base truncate">{selectedProperty.name}</h3>
                  <Badge variant="outline">{typeConfig[selectedProperty.type].label}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">{selectedProperty.address}</p>
                <div className="flex items-center gap-4 mt-1.5 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    Last: {selectedProperty.lastWorkDate}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Settings2 className="w-3.5 h-3.5" />
                    {selectedProperty.equipmentCount} assets
                  </span>
                </div>
              </div>
              <Button className="shrink-0">
                View Details
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CommandSearch;
