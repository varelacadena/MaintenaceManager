import { useState, useMemo } from "react";
import {
  Building2, Trees, Car, Gamepad2, Wrench, Route, HelpCircle,
  MapPin, Search, Plus, ChevronRight, ArrowUpDown, PanelRightClose,
  PanelRightOpen, Calendar, Settings2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

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

type SortKey = "name" | "type" | "lastWorkDate" | "equipmentCount";

export function ListFirst() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<PropertyType | "all">("all");
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [mapCollapsed, setMapCollapsed] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortAsc, setSortAsc] = useState(true);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(true);
    }
  };

  const filteredProperties = useMemo(() => {
    let result = mockProperties.filter((p) => {
      const matchesSearch =
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.address.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesTab = activeTab === "all" || p.type === activeTab;
      return matchesSearch && matchesTab;
    });
    result.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "name") cmp = a.name.localeCompare(b.name);
      else if (sortKey === "type") cmp = a.type.localeCompare(b.type);
      else if (sortKey === "lastWorkDate") cmp = a.lastWorkDate.localeCompare(b.lastWorkDate);
      else if (sortKey === "equipmentCount") cmp = a.equipmentCount - b.equipmentCount;
      return sortAsc ? cmp : -cmp;
    });
    return result;
  }, [searchQuery, activeTab, sortKey, sortAsc]);

  const allTypes = Object.keys(typeConfig) as PropertyType[];

  const SortHeader = ({ label, field, className = "" }: { label: string; field: SortKey; className?: string }) => (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => toggleSort(field)}
      className={`h-auto py-0 px-0 text-xs font-semibold text-muted-foreground uppercase tracking-wider gap-1 ${className}`}
    >
      {label}
      <ArrowUpDown className={`w-3 h-3 ${sortKey === field ? "text-primary" : "opacity-40"}`} />
    </Button>
  );

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      <div className="flex-1 flex min-h-0">
        <div className={`flex flex-col ${mapCollapsed ? "flex-1" : "w-[65%]"} border-r transition-all duration-300`}>
          <div className="p-4 pb-0 flex flex-col gap-3 shrink-0">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-bold tracking-tight">Properties</h1>
                <Badge variant="secondary">{filteredProperties.length} of {mockProperties.length}</Badge>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm">
                  <Plus className="w-4 h-4 mr-1.5" />
                  Add Property
                </Button>
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => setMapCollapsed(!mapCollapsed)}
                >
                  {mapCollapsed ? <PanelRightOpen className="w-4 h-4" /> : <PanelRightClose className="w-4 h-4" />}
                </Button>
              </div>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or address..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as PropertyType | "all")}>
              <TabsList className="h-auto flex-wrap justify-start gap-1 bg-transparent p-0">
                <TabsTrigger value="all" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-md text-sm">
                  All ({mockProperties.length})
                </TabsTrigger>
                {allTypes.map((type) => {
                  const cfg = typeConfig[type];
                  const Icon = cfg.icon;
                  const count = mockProperties.filter((p) => p.type === type).length;
                  return (
                    <TabsTrigger
                      key={type}
                      value={type}
                      className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-md text-sm gap-1.5"
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {cfg.label} ({count})
                    </TabsTrigger>
                  );
                })}
              </TabsList>
            </Tabs>
          </div>

          <div className="px-4 pt-3 grid grid-cols-[2rem_1fr_1fr_7rem_5rem_2rem] gap-2 items-center border-b pb-2">
            <span />
            <SortHeader label="Name" field="name" />
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Address</span>
            <SortHeader label="Last Work" field="lastWorkDate" />
            <SortHeader label="Assets" field="equipmentCount" className="justify-end" />
            <span />
          </div>

          <div className="flex-1 overflow-y-auto">
            {filteredProperties.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <MapPin className="w-10 h-10 mb-3 opacity-20" />
                <p className="font-medium">No properties found</p>
                <p className="text-sm mt-1">Try adjusting your search or filters.</p>
              </div>
            ) : (
              <div className="divide-y">
                {filteredProperties.map((property) => {
                  const cfg = typeConfig[property.type];
                  const Icon = cfg.icon;
                  const isSelected = selectedPropertyId === property.id;
                  return (
                    <div
                      key={property.id}
                      onClick={() => setSelectedPropertyId(property.id)}
                      className={`grid grid-cols-[2rem_1fr_1fr_7rem_5rem_2rem] gap-2 items-center px-4 py-2.5 cursor-pointer hover-elevate ${
                        isSelected
                          ? "bg-primary/5 border-l-2 border-l-primary"
                          : ""
                      }`}
                    >
                      <div className={`flex items-center justify-center ${cfg.colorClass}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className="text-sm font-medium truncate">{property.name}</span>
                      <span className="text-sm text-muted-foreground truncate">{property.address}</span>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="w-3 h-3 shrink-0" />
                        <span className="truncate">{property.lastWorkDate}</span>
                      </div>
                      <div className="flex items-center justify-end gap-1 text-xs text-muted-foreground">
                        <Settings2 className="w-3 h-3 shrink-0" />
                        <span>{property.equipmentCount}</span>
                      </div>
                      <ChevronRight className={`w-4 h-4 ${isSelected ? "text-primary" : "text-muted-foreground/30"}`} />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {!mapCollapsed && (
          <div className="w-[35%] relative bg-muted/30 flex flex-col overflow-hidden">
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <MapPin className="w-20 h-20 text-muted-foreground/10" />
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

            <div className="absolute bottom-3 left-3 z-10 bg-background/90 backdrop-blur p-2 rounded-lg border shadow-sm">
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
        )}
      </div>
    </div>
  );
}

export default ListFirst;
