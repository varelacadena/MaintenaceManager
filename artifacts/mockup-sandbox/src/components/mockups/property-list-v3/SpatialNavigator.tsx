import { useState } from "react";
import {
  Building2, Trees, Car, Gamepad2, Wrench, Route, HelpCircle,
  MapPin, Search, Plus, ChevronRight, Calendar, Settings2,
  ZoomIn, ZoomOut, Locate,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

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
  { type: "building" as PropertyType, propertyId: "b1", top: "12%", left: "18%", width: "12%", height: "15%", name: "Anderson Hall" },
  { type: "building" as PropertyType, propertyId: "b2", top: "35%", left: "42%", width: "10%", height: "10%", name: "Science Bldg" },
  { type: "building" as PropertyType, propertyId: "b3", top: "18%", left: "55%", width: "11%", height: "12%", name: "Library" },
  { type: "building" as PropertyType, propertyId: "b4", top: "50%", left: "25%", width: "9%", height: "11%", name: "Student Ctr" },
  { type: "building" as PropertyType, propertyId: "b5", top: "8%", left: "72%", width: "10%", height: "13%", name: "Gymnasium" },
  { type: "lawn" as PropertyType, propertyId: "l1", top: "28%", left: "28%", width: "16%", height: "18%", name: "Main Quad" },
  { type: "lawn" as PropertyType, propertyId: "l2", top: "5%", left: "35%", width: "12%", height: "10%", name: "Memorial Garden" },
  { type: "lawn" as PropertyType, propertyId: "l3", top: "60%", left: "60%", width: "14%", height: "12%", name: "Practice Fields" },
  { type: "parking" as PropertyType, propertyId: "p1", top: "55%", left: "8%", width: "14%", height: "10%", name: "Lot A" },
  { type: "parking" as PropertyType, propertyId: "p2", top: "75%", left: "40%", width: "16%", height: "10%", name: "Lot B" },
  { type: "recreation" as PropertyType, propertyId: "r1", top: "15%", left: "82%", width: "10%", height: "10%", name: "Tennis" },
  { type: "recreation" as PropertyType, propertyId: "r2", top: "40%", left: "75%", width: "12%", height: "10%", name: "Pool" },
  { type: "utility" as PropertyType, propertyId: "u1", top: "80%", left: "15%", width: "8%", height: "8%", name: "Central Plant" },
  { type: "road" as PropertyType, propertyId: "rd1", top: "68%", left: "20%", width: "55%", height: "4%", name: "Campus Loop" },
  { type: "other" as PropertyType, propertyId: "o1", top: "82%", left: "70%", width: "9%", height: "8%", name: "Storage" },
];

const allTypes = Object.keys(typeConfig) as PropertyType[];

export function SpatialNavigator() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);

  const selectedProperty = mockProperties.find((p) => p.id === selectedPropertyId);

  const filteredListProperties = mockProperties.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.address.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="h-screen bg-background flex overflow-hidden">
      <div className="w-72 border-r flex flex-col shrink-0">
        <div className="p-3 border-b flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <h1 className="text-lg font-bold tracking-tight">Properties</h1>
            <Button size="icon" variant="outline">
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="Search..."
              className="pl-8 h-8 text-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-2 space-y-0.5">
            {filteredListProperties.map((property) => {
              const cfg = typeConfig[property.type];
              const Icon = cfg.icon;
              const isSelected = selectedPropertyId === property.id;
              return (
                <div
                  key={property.id}
                  onClick={() => setSelectedPropertyId(property.id)}
                  className={`flex items-center gap-2 px-2.5 py-2 rounded-md cursor-pointer hover-elevate ${
                    isSelected ? "bg-primary/10 border border-primary/20" : ""
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${cfg.colorClass}`} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{property.name}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{property.address}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>

        <div className="p-2 border-t">
          <div className="grid grid-cols-4 gap-1">
            {allTypes.slice(0, 4).map((type) => {
              const cfg = typeConfig[type];
              const Icon = cfg.icon;
              const count = mockProperties.filter((p) => p.type === type).length;
              return (
                <div key={type} className="flex flex-col items-center gap-0.5 py-1.5 rounded-md bg-muted/50">
                  <Icon className={`w-3.5 h-3.5 ${cfg.colorClass}`} />
                  <span className="text-xs font-bold">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex-1 relative bg-muted/20 overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <MapPin className="w-32 h-32 text-muted-foreground/5" />
        </div>

        {mapShapes.map((shape, i) => {
          const isSelected = selectedPropertyId === shape.propertyId;
          const cfg = typeConfig[shape.type];
          return (
            <div
              key={i}
              onClick={() => setSelectedPropertyId(shape.propertyId)}
              className={`absolute rounded-sm border-2 cursor-pointer transition-all duration-200 group ${cfg.bgClass} ${
                isSelected
                  ? "opacity-90 ring-2 ring-primary ring-offset-2 z-20 scale-105"
                  : "opacity-40 border-white/30"
              }`}
              style={{ top: shape.top, left: shape.left, width: shape.width, height: shape.height }}
            >
              <div className={`absolute -top-5 left-1/2 -translate-x-1/2 whitespace-nowrap text-[9px] font-semibold px-1.5 py-0.5 rounded bg-background/90 border shadow-sm transition-opacity ${
                isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
              }`}>
                {shape.name}
              </div>
            </div>
          );
        })}

        <div className="absolute top-3 right-3 z-20 flex flex-col gap-1">
          <Button size="icon" variant="secondary" className="shadow-md">
            <ZoomIn className="w-4 h-4" />
          </Button>
          <Button size="icon" variant="secondary" className="shadow-md">
            <ZoomOut className="w-4 h-4" />
          </Button>
          <Button size="icon" variant="secondary" className="shadow-md">
            <Locate className="w-4 h-4" />
          </Button>
        </div>

        {selectedProperty && (
          <div className="absolute bottom-4 left-4 right-4 z-20 bg-background/95 backdrop-blur border rounded-lg shadow-lg p-4 flex items-center gap-4">
            <div className={`p-2.5 rounded-lg ${typeConfig[selectedProperty.type].bgClass}/15`}>
              {(() => { const Icon = typeConfig[selectedProperty.type].icon; return <Icon className={`w-6 h-6 ${typeConfig[selectedProperty.type].colorClass}`} />; })()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold truncate">{selectedProperty.name}</h3>
                <Badge variant="outline" className="shrink-0">{typeConfig[selectedProperty.type].label}</Badge>
              </div>
              <p className="text-sm text-muted-foreground truncate">{selectedProperty.address}</p>
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground shrink-0">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                {selectedProperty.lastWorkDate}
              </span>
              <span className="flex items-center gap-1.5">
                <Settings2 className="w-3.5 h-3.5" />
                {selectedProperty.equipmentCount} assets
              </span>
            </div>
            <Button size="sm" className="shrink-0">
              View Details
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        )}

        <div className="absolute bottom-4 right-4 z-10 bg-background/90 backdrop-blur p-2 rounded-lg border shadow-sm">
          <div className="grid grid-cols-2 gap-x-3 gap-y-1">
            {allTypes.map((type) => (
              <div key={type} className="flex items-center gap-1.5">
                <div className={`w-2.5 h-2.5 rounded-sm ${typeConfig[type].bgClass}`} />
                <span className="text-[10px] font-medium">{typeConfig[type].label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default SpatialNavigator;
