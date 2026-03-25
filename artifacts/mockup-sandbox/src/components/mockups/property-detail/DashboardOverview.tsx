import React, { useState } from "react";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { 
  MapPin, 
  Calendar, 
  ClipboardList, 
  Plus, 
  Edit, 
  Trash2, 
  Search,
  Wind,
  Zap,
  Droplets,
  Settings,
  Wrench,
  Trees,
  Sparkles,
  Building2,
  Waves,
  HelpCircle,
  FileText,
  Map,
  DoorOpen,
  Filter
} from "lucide-react";

// Mock Data
const PROPERTY = {
  name: "Anderson Hall",
  type: "Building",
  address: "1200 College Ave, Campus East",
  lastWorkDate: "Jan 15, 2026",
  openTasks: 4
};

const SPACES = [
  { id: 1, name: "Room 101 - Lecture Hall", floor: "1st Floor", description: "Main lecture hall" },
  { id: 2, name: "Room 205 - Faculty Office", floor: "2nd Floor", description: "Dr. Smith's office" },
  { id: 3, name: "Room B1 - Mechanical Room", floor: "Basement", description: "Main building systems" },
  { id: 4, name: "Room 301 - Computer Lab", floor: "3rd Floor", description: "Student lab" },
  { id: 5, name: "Room 102 - Storage", floor: "1st Floor", description: "Janitorial storage" }
];

const EQUIPMENT = [
  { id: 1, name: "Carrier RTU-400", serial: "CR-2019-4401", condition: "Good", category: "HVAC", categoryIcon: Wind },
  { id: 2, name: "Trane Split System", serial: "TR-2020-8832", condition: "Fair", category: "HVAC", categoryIcon: Wind },
  { id: 3, name: "Main Distribution Panel", serial: "MDP-2015-001", condition: "Good", category: "Electrical", categoryIcon: Zap },
  { id: 4, name: "Emergency Generator", serial: "GEN-2018-550", condition: "Fair", category: "Electrical", categoryIcon: Zap },
  { id: 5, name: "Booster Pump Station", serial: "BP-2017-220", condition: "Good", category: "Plumbing", categoryIcon: Droplets },
  { id: 6, name: "Water Heater #3", serial: "WH-2021-003", condition: "Poor", category: "Plumbing", categoryIcon: Droplets },
  { id: 7, name: "Elevator #1", serial: "ELV-2016-A01", condition: "Good", category: "Mechanical", categoryIcon: Settings },
  { id: 8, name: "Industrial Dishwasher", serial: "DW-2022-100", condition: "Good", category: "Appliances", categoryIcon: Wrench },
  { id: 9, name: "Floor Scrubber", serial: "FS-2023-050", condition: "Good", category: "Janitorial", categoryIcon: Sparkles },
  { id: 10, name: "Fire Escape - North", serial: "FE-2010-N01", condition: "Fair", category: "Structural", categoryIcon: Building2 },
  { id: 11, name: "AED Station Lobby", serial: "AED-2024-L01", condition: "Good", category: "General", categoryIcon: HelpCircle },
  { id: 12, name: "Security Camera System", serial: "CAM-2023-SYS", condition: "Good", category: "General", categoryIcon: HelpCircle }
];

const TASKS = [
  { id: 1, title: "Fix leaking pipe Rm 205", status: "Completed", date: "Jan 10", statusColor: "bg-emerald-500" },
  { id: 2, title: "HVAC filter replacement", status: "In Progress", date: "Jan 18", statusColor: "bg-blue-500" },
  { id: 3, title: "Emergency exit light repair", status: "Open", date: "Jan 20", statusColor: "bg-amber-500" },
  { id: 4, title: "Annual fire extinguisher inspection", status: "Scheduled", date: "Feb 1", statusColor: "bg-gray-400" }
];

const RESOURCES = [
  "Building Floor Plans (PDF)",
  "HVAC Maintenance Manual",
  "Emergency Procedures Guide"
];

const EQUIPMENT_CATEGORIES = ["All", "HVAC", "Electrical", "Plumbing", "Mechanical", "Appliances", "Janitorial", "Structural", "General"];

export function DashboardOverview() {
  const [equipmentSearch, setEquipmentSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [spaceSearch, setSpaceSearch] = useState("");

  const filteredSpaces = SPACES.filter(s => 
    s.name.toLowerCase().includes(spaceSearch.toLowerCase()) ||
    s.description.toLowerCase().includes(spaceSearch.toLowerCase())
  );

  const filteredEquipment = EQUIPMENT.filter(e => {
    const matchesSearch = e.name.toLowerCase().includes(equipmentSearch.toLowerCase()) || 
                          e.serial.toLowerCase().includes(equipmentSearch.toLowerCase());
    const matchesCategory = selectedCategory === "All" || e.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const getConditionColor = (condition: string) => {
    if (condition === "Good") return "bg-emerald-500";
    if (condition === "Fair") return "bg-amber-500";
    return "bg-rose-500";
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-8">
        
        {/* Mobile-only Sidebar content (moved to top on mobile) */}
        <div className="w-full lg:hidden flex flex-col gap-6">
          <PropertyInfoCard />
          <QuickActionsCard />
        </div>

        {/* LEFT COLUMN: Main Content */}
        <div className="w-full lg:w-[65%] xl:w-[70%] flex flex-col gap-10">
          
          {/* SPACES SECTION */}
          <section className="scroll-mt-8 pb-8 border-b">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
              <div>
                <h2 className="text-2xl font-semibold tracking-tight">Spaces</h2>
                <p className="text-sm text-muted-foreground mt-1">Manage rooms and areas within this building.</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input 
                    placeholder="Search spaces..." 
                    value={spaceSearch}
                    onChange={(e) => setSpaceSearch(e.target.value)}
                    className="pl-9 w-full sm:w-[200px]"
                  />
                </div>
                <Button size="sm"><Plus className="w-4 h-4 mr-2"/> Add Space</Button>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              {filteredSpaces.map(space => (
                <div key={space.id} className="flex items-start sm:items-center justify-between p-4 rounded-xl border bg-card hover:bg-accent/10 transition-colors">
                  <div className="flex items-start sm:items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <DoorOpen className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium">{space.name}</h3>
                        <Badge variant="secondary" className="text-[10px]">{space.floor}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{space.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 mt-2 sm:mt-0">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
              {filteredSpaces.length === 0 && (
                <div className="p-8 text-center border border-dashed rounded-xl text-muted-foreground">
                  No spaces found.
                </div>
              )}
            </div>
          </section>

          {/* EQUIPMENT SECTION */}
          <section className="scroll-mt-8 pb-8 border-b">
            <div className="flex flex-col mb-6 gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-semibold tracking-tight">Equipment</h2>
                  <p className="text-sm text-muted-foreground mt-1">Assets and machinery located at this property.</p>
                </div>
                <Button size="sm"><Plus className="w-4 h-4 mr-2"/> Add Equipment</Button>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                <div className="relative w-full sm:max-w-xs">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input 
                    placeholder="Search equipment..." 
                    value={equipmentSearch}
                    onChange={(e) => setEquipmentSearch(e.target.value)}
                    className="pl-9 w-full"
                  />
                </div>
                <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0 w-full no-scrollbar">
                  <Filter className="w-4 h-4 text-muted-foreground shrink-0 hidden sm:block" />
                  {EQUIPMENT_CATEGORIES.map(cat => (
                    <Badge 
                      key={cat}
                      variant={selectedCategory === cat ? "default" : "outline"}
                      className="cursor-pointer shrink-0 whitespace-nowrap"
                      onClick={() => setSelectedCategory(cat)}
                    >
                      {cat}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredEquipment.map(item => {
                const Icon = item.categoryIcon;
                return (
                  <Card key={item.id} className="overflow-hidden group hover:shadow-md transition-all">
                    <CardContent className="p-0">
                      <div className="flex p-4 gap-4">
                        <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center shrink-0">
                          <Icon className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start mb-1">
                            <h3 className="font-semibold text-sm truncate pr-2">{item.name}</h3>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className="text-[10px] font-medium text-muted-foreground">{item.condition}</span>
                              <div className={`w-2.5 h-2.5 rounded-full ${getConditionColor(item.condition)}`} />
                            </div>
                          </div>
                          <div className="text-xs text-muted-foreground mb-3 font-mono bg-muted/50 inline-block px-1.5 py-0.5 rounded">
                            {item.serial}
                          </div>
                          <div className="flex items-center justify-between">
                            <Badge variant="outline" className="text-[10px] uppercase tracking-wider">{item.category}</Badge>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button variant="ghost" size="icon" className="h-6 w-6">
                                <Edit className="w-3.5 h-3.5" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive">
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
              {filteredEquipment.length === 0 && (
                <div className="col-span-1 md:col-span-2 p-8 text-center border border-dashed rounded-xl text-muted-foreground">
                  No equipment matched your filters.
                </div>
              )}
            </div>
          </section>

          {/* HISTORY SECTION */}
          <section className="scroll-mt-8 pb-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
              <div>
                <h2 className="text-2xl font-semibold tracking-tight">Work History</h2>
                <p className="text-sm text-muted-foreground mt-1">Recent and upcoming tasks for this property.</p>
              </div>
              <Button size="sm" variant="outline">View All</Button>
            </div>

            <div className="relative border-l-2 border-muted ml-3 pl-6 space-y-6">
              {TASKS.map(task => (
                <div key={task.id} className="relative">
                  <div className={`absolute -left-[31px] top-1 w-4 h-4 rounded-full border-2 border-background ${task.statusColor}`} />
                  <div className="bg-card border rounded-xl p-4 hover:shadow-sm transition-shadow">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 mb-2">
                      <h4 className="font-medium text-sm">{task.title}</h4>
                      <Badge variant="outline" className="shrink-0">{task.status}</Badge>
                    </div>
                    <div className="flex items-center text-xs text-muted-foreground gap-2">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{task.date}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

        </div>

        {/* RIGHT COLUMN: Sticky Sidebar */}
        <div className="hidden lg:flex w-[35%] xl:w-[30%] flex-col gap-6">
          <div className="sticky top-6 flex flex-col gap-6">
            <PropertyInfoCard />
            <QuickActionsCard />
            
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Map className="w-4 h-4" />
                  Location
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="w-full h-32 bg-muted rounded-md flex flex-col items-center justify-center gap-2 border border-dashed">
                  <MapPin className="w-6 h-6 text-muted-foreground opacity-50" />
                  <span className="text-xs text-muted-foreground font-medium">Map Preview</span>
                </div>
                <Button variant="link" size="sm" className="w-full mt-2 h-8 text-xs">
                  View Full Map
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Resources
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {RESOURCES.map((res, i) => (
                    <li key={i} className="flex items-start gap-3 p-2 rounded-md hover:bg-muted cursor-pointer transition-colors group">
                      <FileText className="w-4 h-4 text-muted-foreground mt-0.5 group-hover:text-primary transition-colors shrink-0" />
                      <span className="text-sm text-foreground/90 leading-tight group-hover:text-foreground transition-colors">{res}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>

      </div>
    </div>
  );
}

function PropertyInfoCard() {
  return (
    <Card className="shadow-sm">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight mb-2">{PROPERTY.name}</h1>
            <Badge variant="default" className="mb-4">{PROPERTY.type}</Badge>
            
            <div className="flex flex-col gap-2 text-sm text-muted-foreground">
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{PROPERTY.address}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 shrink-0" />
                <span>Last Work: {PROPERTY.lastWorkDate}</span>
              </div>
            </div>
          </div>
        </div>

        <Separator className="my-4" />

        <div className="grid grid-cols-3 gap-4 text-center divide-x">
          <div className="flex flex-col items-center">
            <span className="text-2xl font-bold">{EQUIPMENT.length}</span>
            <span className="text-[10px] uppercase text-muted-foreground tracking-wider font-semibold">Equipment</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-2xl font-bold">{SPACES.length}</span>
            <span className="text-[10px] uppercase text-muted-foreground tracking-wider font-semibold">Spaces</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-2xl font-bold text-amber-600">{PROPERTY.openTasks}</span>
            <span className="text-[10px] uppercase text-amber-600/80 tracking-wider font-semibold">Open Tasks</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function QuickActionsCard() {
  return (
    <Card className="shadow-sm border-primary/20 bg-primary/5">
      <CardHeader className="pb-3 pt-5 px-5">
        <CardTitle className="text-sm font-semibold uppercase tracking-wider text-primary/80">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent className="px-5 pb-5 grid grid-cols-2 gap-2">
        <Button size="sm" variant="default" className="w-full justify-start shadow-sm">
          <Plus className="w-4 h-4 mr-2" /> Create Task
        </Button>
        <Button size="sm" variant="outline" className="w-full justify-start bg-background hover:bg-background/80">
          <Plus className="w-4 h-4 mr-2" /> Add Space
        </Button>
        <Button size="sm" variant="outline" className="w-full justify-start bg-background hover:bg-background/80">
          <Plus className="w-4 h-4 mr-2" /> Add Equip
        </Button>
        <Button size="sm" variant="outline" className="w-full justify-start bg-background hover:bg-background/80">
          <Edit className="w-4 h-4 mr-2" /> Edit Prop
        </Button>
      </CardContent>
    </Card>
  );
}
