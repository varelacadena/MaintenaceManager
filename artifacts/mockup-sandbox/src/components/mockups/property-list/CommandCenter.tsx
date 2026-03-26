import { useState } from "react";
import {
  Building2,
  Trees,
  Car,
  Gamepad2,
  Wrench,
  Route,
  HelpCircle,
  MapPin,
  Search,
  Plus,
  ChevronDown,
  ChevronRight,
  PenTool,
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
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ScrollArea } from "@/components/ui/scroll-area";

// --- Mock Data ---
type PropertyType =
  | "building"
  | "lawn"
  | "parking"
  | "recreation"
  | "utility"
  | "road"
  | "other";

interface Property {
  id: string;
  name: string;
  address: string;
  type: PropertyType;
  lastWorkDate?: string;
  equipmentCount?: number;
}

const mockProperties: Property[] = [
  // Buildings
  { id: "b1", name: "Anderson Hall", address: "1200 College Ave", type: "building", lastWorkDate: "Oct 24, 2023", equipmentCount: 45 },
  { id: "b2", name: "Science Building", address: "1300 Research Dr", type: "building", lastWorkDate: "Oct 25, 2023", equipmentCount: 120 },
  { id: "b3", name: "Library", address: "900 Academic Way", type: "building", lastWorkDate: "Oct 20, 2023", equipmentCount: 30 },
  { id: "b4", name: "Student Center", address: "500 Campus Blvd", type: "building", lastWorkDate: "Oct 26, 2023", equipmentCount: 65 },
  { id: "b5", name: "Gymnasium", address: "800 Sports Lane", type: "building", lastWorkDate: "Oct 22, 2023", equipmentCount: 40 },
  // Lawns
  { id: "l1", name: "Main Quad", address: "Central Campus", type: "lawn", lastWorkDate: "Oct 26, 2023" },
  { id: "l2", name: "Memorial Garden", address: "North Campus", type: "lawn", lastWorkDate: "Oct 15, 2023" },
  { id: "l3", name: "Practice Fields", address: "East Athletic Complex", type: "lawn", lastWorkDate: "Oct 21, 2023" },
  // Parking
  { id: "p1", name: "Lot A - Faculty", address: "West Campus", type: "parking", lastWorkDate: "Sep 30, 2023" },
  { id: "p2", name: "Lot B - Student", address: "South Campus", type: "parking", lastWorkDate: "Oct 10, 2023" },
  // Recreation
  { id: "r1", name: "Tennis Courts", address: "Athletic Complex", type: "recreation", lastWorkDate: "Oct 12, 2023" },
  { id: "r2", name: "Pool & Aquatic Center", address: "Recreation Dr", type: "recreation", lastWorkDate: "Oct 25, 2023", equipmentCount: 15 },
  // Utility
  { id: "u1", name: "Central Plant", address: "100 Service Rd", type: "utility", lastWorkDate: "Oct 27, 2023", equipmentCount: 85 },
  // Road
  { id: "rd1", name: "Campus Loop Drive", address: "Perimeter Road", type: "road", lastWorkDate: "Aug 15, 2023" },
  // Other
  { id: "o1", name: "Storage Facility", address: "200 Maintenance Way", type: "other", lastWorkDate: "Sep 05, 2023", equipmentCount: 5 },
];

const typeConfig: Record<
  PropertyType,
  { icon: typeof Building2; label: string; colorClass: string; bgClass: string }
> = {
  building: { icon: Building2, label: "Building", colorClass: "text-blue-500", bgClass: "bg-blue-500" },
  lawn: { icon: Trees, label: "Lawn", colorClass: "text-green-500", bgClass: "bg-green-500" },
  parking: { icon: Car, label: "Parking", colorClass: "text-slate-500", bgClass: "bg-slate-500" },
  recreation: { icon: Gamepad2, label: "Recreation", colorClass: "text-orange-500", bgClass: "bg-orange-500" },
  utility: { icon: Wrench, label: "Utility", colorClass: "text-yellow-600", bgClass: "bg-yellow-500" },
  road: { icon: Route, label: "Road", colorClass: "text-zinc-500", bgClass: "bg-zinc-500" },
  other: { icon: HelpCircle, label: "Other", colorClass: "text-purple-500", bgClass: "bg-purple-500" },
};

// Map shapes simulation
const mapShapes = [
  { type: "building", propertyId: "b1", top: "20%", left: "30%", width: "12%", height: "15%" },
  { type: "building", propertyId: "b2", top: "45%", left: "45%", width: "10%", height: "10%" },
  { type: "lawn", propertyId: "l1", top: "35%", left: "25%", width: "15%", height: "20%" },
  { type: "parking", propertyId: "p1", top: "60%", left: "70%", width: "18%", height: "12%" },
  { type: "recreation", propertyId: "r1", top: "15%", left: "60%", width: "14%", height: "14%" },
  { type: "utility", propertyId: "u1", top: "80%", left: "20%", width: "8%", height: "8%" },
];

export function CommandCenter() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

  const toggleSection = (type: string) => {
    setCollapsedSections((prev) => ({
      ...prev,
      [type]: !prev[type],
    }));
  };

  const filteredProperties = mockProperties.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.address.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = activeFilters.length === 0 || activeFilters.includes(p.type);
    return matchesSearch && matchesFilter;
  });

  const groupedProperties = filteredProperties.reduce((acc, property) => {
    if (!acc[property.type]) acc[property.type] = [];
    acc[property.type].push(property);
    return acc;
  }, {} as Record<string, Property[]>);

  // Get types in order of config
  const displayTypes = (Object.keys(typeConfig) as PropertyType[]).filter(
    (type) => groupedProperties[type] && groupedProperties[type].length > 0
  );

  return (
    <div className="min-h-screen bg-background p-4 lg:p-6 flex flex-col">
      <div className="flex-1 flex flex-col lg:flex-row gap-6 max-w-[1600px] mx-auto w-full">
        {/* LEFT COLUMN: Map Area (65%) */}
        <div className="flex-1 lg:w-[65%] min-h-[500px] lg:min-h-0 order-2 lg:order-1 relative rounded-xl border bg-muted/30 overflow-hidden shadow-inner flex flex-col">
          {/* Action Overlay */}
          <div className="absolute top-4 right-4 z-10">
            <Button className="shadow-lg font-semibold">
              <PenTool className="w-4 h-4 mr-2" />
              Draw to Add
            </Button>
          </div>

          {/* Map Content */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <MapPin className="w-24 h-24 text-muted-foreground/20" />
          </div>

          {/* Map Boundaries/Shapes */}
          {mapShapes.map((shape, i) => {
            const isSelected = selectedPropertyId === shape.propertyId;
            return (
              <div
                key={i}
                onClick={() => setSelectedPropertyId(shape.propertyId)}
                className={`absolute rounded-sm border-2 shadow-sm cursor-pointer transition-all duration-200 ${typeConfig[shape.type as PropertyType].bgClass} ${
                  isSelected
                    ? 'opacity-90 ring-2 ring-primary ring-offset-2 scale-105 z-10'
                    : 'opacity-60 border-white/50'
                }`}
                style={{
                  top: shape.top,
                  left: shape.left,
                  width: shape.width,
                  height: shape.height,
                }}
              />
            );
          })}

          {/* Map Legend */}
          <div className="absolute bottom-4 left-4 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 p-3 rounded-lg border shadow-sm flex flex-col gap-2 max-w-[200px]">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Map Legend</span>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              {(Object.keys(typeConfig) as PropertyType[]).map((type) => {
                const config = typeConfig[type];
                return (
                  <div key={type} className="flex items-center gap-1.5">
                    <div className={`w-3 h-3 rounded-sm ${config.bgClass}`} />
                    <span className="text-[10px] font-medium leading-none">{config.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Management Sidebar (35%) */}
        <div className="w-full lg:w-[35%] lg:min-w-[400px] lg:max-w-[480px] order-1 lg:order-2 flex flex-col gap-4 h-full lg:h-[calc(100vh-3rem)]">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight">Properties</h1>
              <Badge variant="secondary" className="text-sm font-medium">
                {mockProperties.length} Total
              </Badge>
            </div>
            <Button size="icon" variant="outline">
              <Plus className="w-4 h-4" />
            </Button>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-4 lg:grid-cols-7 gap-2">
            {(Object.keys(typeConfig) as PropertyType[]).map((type) => {
              const count = mockProperties.filter((p) => p.type === type).length;
              const Icon = typeConfig[type].icon;
              return (
                <Card key={type} className="bg-card">
                  <CardContent className="p-3 flex flex-col items-center justify-center text-center gap-1">
                    <Icon className={`w-5 h-5 ${typeConfig[type].colorClass}`} />
                    <span className="text-lg font-bold leading-none">{count}</span>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Search & Filter */}
          <div className="flex flex-col gap-3 shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search properties by name or address..."
                className="pl-9 bg-card"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <ScrollArea className="w-full whitespace-nowrap pb-2">
              <ToggleGroup 
                type="multiple" 
                value={activeFilters} 
                onValueChange={setActiveFilters}
                className="justify-start gap-2"
              >
                {(Object.keys(typeConfig) as PropertyType[]).map((type) => {
                  const Icon = typeConfig[type].icon;
                  return (
                    <ToggleGroupItem 
                      key={type} 
                      value={type} 
                      aria-label={`Toggle ${typeConfig[type].label}`}
                      className="border bg-card data-[state=on]:bg-primary data-[state=on]:text-primary-foreground h-9 px-3 rounded-full shrink-0"
                    >
                      <Icon className="w-4 h-4 mr-2" />
                      <span className="text-sm font-medium">{typeConfig[type].label}</span>
                    </ToggleGroupItem>
                  );
                })}
              </ToggleGroup>
            </ScrollArea>
          </div>

          {/* Property List */}
          <ScrollArea className="flex-1 -mx-2 px-2">
            <div className="flex flex-col gap-4 pb-4">
              {displayTypes.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground border rounded-lg border-dashed">
                  <MapPin className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p className="font-medium">No properties found</p>
                  <p className="text-sm mt-1">Try adjusting your filters or search query.</p>
                </div>
              ) : (
                displayTypes.map((type) => {
                  const properties = groupedProperties[type];
                  const Icon = typeConfig[type].icon;
                  const isCollapsed = collapsedSections[type];

                  return (
                    <Collapsible
                      key={type}
                      open={!isCollapsed}
                      onOpenChange={() => toggleSection(type)}
                      className="space-y-2"
                    >
                      <CollapsibleTrigger asChild>
                        <div className="flex items-center justify-between p-2 rounded-md cursor-pointer group hover-elevate">
                          <div className="flex items-center gap-2">
                            <div className={`p-1.5 rounded-md bg-background border ${typeConfig[type].colorClass}`}>
                              <Icon className="w-4 h-4" />
                            </div>
                            <span className="font-semibold text-sm">{typeConfig[type].label}s</span>
                            <Badge variant="secondary" className="ml-1 h-5 px-1.5">{properties.length}</Badge>
                          </div>
                          <ChevronDown
                            className={`w-4 h-4 text-muted-foreground transition-transform duration-200 group-hover:text-foreground ${
                              !isCollapsed ? "rotate-180" : ""
                            }`}
                          />
                        </div>
                      </CollapsibleTrigger>

                      <CollapsibleContent className="space-y-2 animate-in slide-in-from-top-1 fade-in-20">
                        {properties.map((property) => (
                          <Card 
                            key={property.id}
                            className={`cursor-pointer transition-all hover:shadow-md ${
                              selectedPropertyId === property.id 
                                ? "border-primary ring-1 ring-primary/20 bg-primary/5" 
                                : "hover:border-primary/50"
                            }`}
                            onClick={() => setSelectedPropertyId(property.id)}
                          >
                            <CardContent className="p-3 flex items-center justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <h4 className="font-semibold text-sm truncate">{property.name}</h4>
                                </div>
                                <p className="text-xs text-muted-foreground truncate">{property.address}</p>
                                
                                {(property.lastWorkDate || property.equipmentCount) && (
                                  <div className="flex items-center gap-3 mt-2">
                                    {property.lastWorkDate && (
                                      <span className="text-[10px] text-muted-foreground font-medium bg-muted px-1.5 py-0.5 rounded">
                                        Last work: {property.lastWorkDate}
                                      </span>
                                    )}
                                    {property.equipmentCount && (
                                      <span className="text-[10px] text-muted-foreground font-medium bg-muted px-1.5 py-0.5 rounded">
                                        {property.equipmentCount} assets
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                              <ChevronRight className={`w-4 h-4 shrink-0 transition-colors ${
                                selectedPropertyId === property.id ? "text-primary" : "text-muted-foreground/40"
                              }`} />
                            </CardContent>
                          </Card>
                        ))}
                      </CollapsibleContent>
                    </Collapsible>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}
