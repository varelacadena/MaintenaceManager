import { useState, useMemo } from "react";
import {
  Building2, Trees, Car, Gamepad2, Wrench, Route, HelpCircle,
  MapPin, Search, Plus, ChevronRight, ArrowUpDown,
  Calendar, Settings2, Map, X, MousePointerClick, ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
  { type: "recreation" as PropertyType, propertyId: "r1", top: "15%", left: "82%", width: "10%", height: "10%", name: "Tennis Courts" },
  { type: "recreation" as PropertyType, propertyId: "r2", top: "40%", left: "75%", width: "12%", height: "10%", name: "Pool" },
  { type: "utility" as PropertyType, propertyId: "u1", top: "80%", left: "15%", width: "8%", height: "8%", name: "Central Plant" },
  { type: "road" as PropertyType, propertyId: "rd1", top: "68%", left: "20%", width: "55%", height: "4%", name: "Campus Loop" },
  { type: "other" as PropertyType, propertyId: "o1", top: "82%", left: "70%", width: "9%", height: "8%", name: "Storage" },
];

const allTypes = Object.keys(typeConfig) as PropertyType[];

type SortKey = "name" | "type" | "lastWorkDate" | "equipmentCount";

export function ListFirstRefined() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<PropertyType | "all">("all");
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortAsc, setSortAsc] = useState(true);
  const [mapDialogOpen, setMapDialogOpen] = useState(false);
  const [creationMode, setCreationMode] = useState<PropertyType | null>(null);

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

  const handleOpenViewMap = () => {
    setCreationMode(null);
    setMapDialogOpen(true);
  };

  const handleAddPropertyType = (type: PropertyType) => {
    setCreationMode(type);
    setMapDialogOpen(true);
  };

  const handleMapDialogClose = (open: boolean) => {
    if (!open) {
      setMapDialogOpen(false);
      setCreationMode(null);
    }
  };

  const SortHeader = ({ label, field, className = "" }: { label: string; field: SortKey; className?: string }) => (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => toggleSort(field)}
      className={`h-auto py-0 px-0 text-xs font-semibold text-muted-foreground uppercase tracking-wider gap-1 ${className}`}
      data-testid={`button-sort-${field}`}
    >
      {label}
      <ArrowUpDown className={`w-3 h-3 ${sortKey === field ? "text-primary" : "opacity-40"}`} />
    </Button>
  );

  const creationCfg = creationMode ? typeConfig[creationMode] : null;

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      <div className="flex flex-col flex-1 min-h-0">
        <div className="p-4 pb-0 flex flex-col gap-3 shrink-0">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold tracking-tight">Properties</h1>
              <Badge variant="secondary">{filteredProperties.length} of {mockProperties.length}</Badge>
            </div>
            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" data-testid="button-add-property">
                    <Plus className="w-4 h-4 mr-1.5" />
                    Add Property
                    <ChevronDown className="w-3.5 h-3.5 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  {allTypes.map((type) => {
                    const cfg = typeConfig[type];
                    const Icon = cfg.icon;
                    return (
                      <DropdownMenuItem
                        key={type}
                        onClick={() => handleAddPropertyType(type)}
                        className="gap-2 cursor-pointer"
                        data-testid={`menu-add-${type}`}
                      >
                        <Icon className={`w-4 h-4 ${cfg.colorClass}`} />
                        <span>{cfg.label}</span>
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
              <Button
                variant="outline"
                size="sm"
                onClick={handleOpenViewMap}
                data-testid="button-show-map"
              >
                <Map className="w-4 h-4 mr-1.5" />
                Show Map
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
              data-testid="input-search"
            />
          </div>

          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as PropertyType | "all")}>
            <TabsList className="h-auto flex-wrap justify-start gap-1 bg-transparent p-0">
              <TabsTrigger value="all" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-md text-sm" data-testid="tab-type-all">
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
                    data-testid={`tab-type-${type}`}
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
                      isSelected ? "bg-primary/5" : ""
                    }`}
                    data-testid={`row-property-${property.id}`}
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

      <Dialog open={mapDialogOpen} onOpenChange={handleMapDialogClose}>
        <DialogContent className="max-w-4xl h-[80vh] flex flex-col p-0 gap-0">
          <DialogHeader className="px-6 py-4 border-b shrink-0">
            <div className="flex items-center justify-between gap-3">
              <DialogTitle className="flex items-center gap-2">
                {creationMode && creationCfg ? (
                  <>
                    {(() => { const CIcon = creationCfg.icon; return <CIcon className={`w-5 h-5 ${creationCfg.colorClass}`} />; })()}
                    <span>Add New {creationCfg.label}</span>
                  </>
                ) : (
                  <>
                    <Map className="w-5 h-5 text-muted-foreground" />
                    <span>Campus Map</span>
                  </>
                )}
              </DialogTitle>
            </div>
          </DialogHeader>

          {creationMode && creationCfg && (
            <div className={`mx-6 mt-4 flex items-center gap-2.5 px-3 py-2.5 rounded-lg border ${creationCfg.bgClass}/10`}>
              <MousePointerClick className={`w-4 h-4 shrink-0 ${creationCfg.colorClass}`} />
              <p className="text-sm">
                <span className="font-medium">Click on the map</span>
                <span className="text-muted-foreground"> to place your new </span>
                <Badge variant="outline" className="mx-0.5 align-middle">
                  {(() => { const CIcon = creationCfg.icon; return <CIcon className={`w-3 h-3 mr-1 ${creationCfg.colorClass}`} />; })()}
                  {creationCfg.label}
                </Badge>
              </p>
              <Button
                variant="ghost"
                size="icon"
                className="ml-auto shrink-0"
                onClick={() => setCreationMode(null)}
                data-testid="button-exit-creation-mode"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          )}

          <div className="flex-1 relative bg-muted/20 m-6 rounded-lg overflow-hidden border">
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <MapPin className="w-24 h-24 text-muted-foreground/5" />
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
                  data-testid={`shape-map-${shape.propertyId}`}
                >
                  <div className={`absolute -top-5 left-1/2 -translate-x-1/2 whitespace-nowrap text-[9px] font-semibold px-1.5 py-0.5 rounded bg-background/90 border shadow-sm transition-opacity ${
                    isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                  }`}>
                    {shape.name}
                  </div>
                </div>
              );
            })}

            {creationMode && (
              <div className="absolute inset-0 z-30 cursor-crosshair" />
            )}

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
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default ListFirstRefined;
