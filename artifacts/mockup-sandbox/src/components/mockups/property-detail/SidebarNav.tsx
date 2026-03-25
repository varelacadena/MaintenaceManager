import React, { useState } from "react";
import {
  Building2,
  Calendar,
  DoorOpen,
  Droplets,
  Edit,
  FileText,
  HelpCircle,
  Map as MapIcon,
  MapPin,
  Plus,
  QrCode,
  Search,
  Settings,
  Sparkles,
  Trash2,
  Trees,
  Waves,
  Wind,
  Wrench,
  Zap,
  BookOpen,
} from "lucide-react";
import { Badge } from "../../../ui/badge";
import { Button } from "../../../ui/button";
import { Input } from "../../../ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "../../../ui/card";
import { ScrollArea } from "../../../ui/scroll-area";

// --- Mock Data ---
const PROPERTY = {
  name: "Anderson Hall",
  type: "Building",
  address: "1200 College Ave, Campus East",
  lastWork: "Jan 15, 2026",
  openTasks: 4,
};

const SPACES = [
  "Room 101 - Lecture Hall (1st Floor)",
  "Room 205 - Faculty Office (2nd Floor)",
  "Room B1 - Mechanical Room (Basement)",
  "Room 301 - Computer Lab (3rd Floor)",
  "Room 102 - Storage (1st Floor)",
];

const EQUIPMENT = [
  { id: 1, name: "Carrier RTU-400", serial: "CR-2019-4401", condition: "Good", category: "HVAC" },
  { id: 2, name: "Trane Split System", serial: "TR-2020-8832", condition: "Fair", category: "HVAC" },
  { id: 3, name: "Main Distribution Panel", serial: "MDP-2015-001", condition: "Good", category: "Electrical" },
  { id: 4, name: "Emergency Generator", serial: "GEN-2018-550", condition: "Fair", category: "Electrical" },
  { id: 5, name: "Booster Pump Station", serial: "BP-2017-220", condition: "Good", category: "Plumbing" },
  { id: 6, name: "Water Heater #3", serial: "WH-2021-003", condition: "Poor", category: "Plumbing" },
  { id: 7, name: "Elevator #1", serial: "ELV-2016-A01", condition: "Good", category: "Mechanical" },
  { id: 8, name: "Industrial Dishwasher", serial: "DW-2022-100", condition: "Good", category: "Appliances" },
  { id: 9, name: "Floor Scrubber", serial: "FS-2023-050", condition: "Good", category: "Janitorial" },
  { id: 10, name: "Fire Escape - North", serial: "FE-2010-N01", condition: "Fair", category: "Structural" },
  { id: 11, name: "AED Station Lobby", serial: "AED-2024-L01", condition: "Good", category: "General" },
  { id: 12, name: "Security Camera System", serial: "CAM-2023-SYS", condition: "Good", category: "General" },
];

const HISTORY = [
  { id: 1, title: "Fix leaking pipe Rm 205", status: "Completed", date: "Jan 10" },
  { id: 2, title: "HVAC filter replacement", status: "In Progress", date: "Jan 18" },
  { id: 3, title: "Emergency exit light repair", status: "Open", date: "Jan 20" },
  { id: 4, title: "Annual fire extinguisher inspection", status: "Scheduled", date: "Feb 1" },
];

const RESOURCES = [
  "Building Floor Plans (PDF)",
  "HVAC Maintenance Manual",
  "Emergency Procedures Guide",
];

const CATEGORIES = [
  "All",
  "HVAC",
  "Electrical",
  "Plumbing",
  "Mechanical",
  "Appliances",
  "Grounds",
  "Janitorial",
  "Structural",
  "Water Treatment",
  "General"
];

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  HVAC: Wind,
  Electrical: Zap,
  Plumbing: Droplets,
  Mechanical: Settings,
  Appliances: Wrench,
  Grounds: Trees,
  Janitorial: Sparkles,
  Structural: Building2,
  "Water Treatment": Waves,
  General: HelpCircle,
};

type Section = "spaces" | "equipment" | "history" | "location" | "resources";

export function SidebarNav() {
  const [activeSection, setActiveSection] = useState<Section>("equipment");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  const filteredEquipment = EQUIPMENT.filter(
    (eq) =>
      (selectedCategory === "All" || eq.category === selectedCategory) &&
      (eq.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        eq.serial.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const renderContent = () => {
    switch (activeSection) {
      case "equipment":
        return (
          <div className="flex flex-col h-full">
            <div className="mb-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-semibold tracking-tight">Equipment List</h2>
                <Button>
                  <Plus className="w-4 h-4 mr-2" /> Add Equipment
                </Button>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name or serial..."
                    className="pl-9 bg-background"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <div className="flex overflow-x-auto gap-2 pb-2 sm:pb-0 hide-scrollbar">
                  {CATEGORIES.map((cat) => (
                    <Button
                      key={cat}
                      variant={selectedCategory === cat ? "secondary" : "outline"}
                      size="sm"
                      onClick={() => setSelectedCategory(cat)}
                      className="whitespace-nowrap"
                    >
                      {cat}
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            <ScrollArea className="flex-1 -mx-4 px-4 sm:mx-0 sm:px-0">
              <div className="space-y-3 pb-8">
                {filteredEquipment.length > 0 ? (
                  filteredEquipment.map((eq) => {
                    const Icon = CATEGORY_ICONS[eq.category] || HelpCircle;
                    return (
                      <div
                        key={eq.id}
                        className="group flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border bg-card hover:border-primary/50 transition-colors gap-4"
                      >
                        <div className="flex items-center gap-4">
                          <div className="p-2.5 rounded-lg bg-primary/10 text-primary shrink-0">
                            <Icon className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-semibold text-foreground">{eq.name}</h4>
                              <Badge
                                variant="outline"
                                className={
                                  eq.condition === "Good"
                                    ? "text-green-600 border-green-200 bg-green-50"
                                    : eq.condition === "Fair"
                                    ? "text-yellow-600 border-yellow-200 bg-yellow-50"
                                    : "text-red-600 border-red-200 bg-red-50"
                                }
                              >
                                {eq.condition}
                              </Badge>
                            </div>
                            <div className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
                              <span>{eq.category}</span>
                              <span className="w-1 h-1 rounded-full bg-border" />
                              <span className="font-mono text-xs">{eq.serial}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-auto sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="icon" title="View QR">
                            <QrCode className="w-4 h-4 text-muted-foreground" />
                          </Button>
                          <Button variant="ghost" size="icon" title="Edit">
                            <Edit className="w-4 h-4 text-muted-foreground" />
                          </Button>
                          <Button variant="ghost" size="icon" title="Delete" className="hover:text-destructive hover:bg-destructive/10">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <Wrench className="w-12 h-12 mx-auto mb-4 opacity-20" />
                    <p>No equipment found matching your criteria.</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        );

      case "spaces":
        return (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold tracking-tight">Spaces</h2>
              <Button>
                <Plus className="w-4 h-4 mr-2" /> Add Space
              </Button>
            </div>
            <div className="space-y-3">
              {SPACES.map((space, i) => (
                <div key={i} className="flex items-center justify-between p-4 rounded-xl border bg-card hover:border-primary/50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="p-2.5 rounded-lg bg-muted text-muted-foreground shrink-0">
                      <DoorOpen className="w-5 h-5" />
                    </div>
                    <span className="font-medium">{space}</span>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="icon">
                      <Edit className="w-4 h-4 text-muted-foreground" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case "history":
        return (
          <div>
            <h2 className="text-2xl font-semibold tracking-tight mb-6">Work History</h2>
            <div className="space-y-4 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border before:to-transparent">
              {HISTORY.map((task) => (
                <div key={task.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full border bg-background shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-sm z-10">
                    {task.status === "Completed" ? (
                      <div className="w-3 h-3 rounded-full bg-green-500" />
                    ) : task.status === "In Progress" ? (
                      <div className="w-3 h-3 rounded-full bg-blue-500" />
                    ) : task.status === "Scheduled" ? (
                      <div className="w-3 h-3 rounded-full bg-yellow-500" />
                    ) : (
                      <div className="w-3 h-3 rounded-full bg-gray-400" />
                    )}
                  </div>
                  <Card className="w-[calc(100%-3rem)] md:w-[calc(50%-2.5rem)] shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center justify-between">
                          <Badge variant="secondary" className="text-xs">{task.status}</Badge>
                          <span className="text-xs text-muted-foreground font-medium">{task.date}</span>
                        </div>
                        <h4 className="font-semibold text-sm mt-2">{task.title}</h4>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>
          </div>
        );

      case "location":
        return (
          <div className="h-full flex flex-col">
            <h2 className="text-2xl font-semibold tracking-tight mb-6">Location</h2>
            <div className="flex-1 rounded-xl border bg-muted/30 flex items-center justify-center min-h-[400px]">
              <div className="text-center text-muted-foreground">
                <MapIcon className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p>Interactive map placeholder for {PROPERTY.name}</p>
              </div>
            </div>
          </div>
        );

      case "resources":
        return (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold tracking-tight">Resources</h2>
              <Button>
                <Plus className="w-4 h-4 mr-2" /> Upload
              </Button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {RESOURCES.map((res, i) => (
                <Card key={i} className="hover:border-primary/50 transition-colors cursor-pointer group">
                  <CardContent className="p-6 flex flex-col items-center text-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center group-hover:scale-110 transition-transform">
                      {res.includes("PDF") ? <FileText className="w-6 h-6" /> : <BookOpen className="w-6 h-6" />}
                    </div>
                    <span className="font-medium text-sm">{res}</span>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        );
    }
  };

  const navItems = [
    { id: "spaces", label: "Spaces", icon: DoorOpen, show: PROPERTY.type === "Building" },
    { id: "equipment", label: "Equipment", icon: Wrench, show: true },
    { id: "history", label: "History", icon: Calendar, show: true },
    { id: "location", label: "Location", icon: MapIcon, show: true },
    { id: "resources", label: "Resources", icon: BookOpen, show: true },
  ];

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 lg:p-8 font-sans">
      <div className="max-w-7xl mx-auto h-[calc(100vh-2rem)] sm:h-[calc(100vh-3rem)] lg:h-[calc(100vh-4rem)] flex flex-col lg:flex-row gap-6 lg:gap-8">
        
        {/* LEFT SIDEBAR */}
        <div className="w-full lg:w-72 xl:w-80 flex flex-col gap-6 shrink-0 h-auto lg:h-full">
          {/* Header Card */}
          <div className="p-5 rounded-2xl bg-muted/30 border">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h1 className="text-xl font-bold text-foreground leading-tight">{PROPERTY.name}</h1>
                <div className="flex items-center gap-1.5 mt-1.5 text-sm text-muted-foreground">
                  <MapPin className="w-3.5 h-3.5" />
                  <span className="truncate">{PROPERTY.address}</span>
                </div>
              </div>
              <Badge className="bg-primary/10 text-primary hover:bg-primary/20 shadow-none border-0">
                {PROPERTY.type}
              </Badge>
            </div>
            
            <div className="grid grid-cols-3 gap-2 mt-6">
              <div className="bg-background rounded-lg p-2.5 text-center border shadow-sm">
                <div className="text-lg font-semibold">{EQUIPMENT.length}</div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Equip</div>
              </div>
              <div className="bg-background rounded-lg p-2.5 text-center border shadow-sm">
                <div className="text-lg font-semibold">{SPACES.length}</div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Spaces</div>
              </div>
              <div className="bg-background rounded-lg p-2.5 text-center border shadow-sm">
                <div className="text-lg font-semibold text-blue-600">{PROPERTY.openTasks}</div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Open</div>
              </div>
            </div>
          </div>

          {/* Navigation - horizontal on mobile, vertical on lg */}
          <div className="flex-1 flex flex-col min-h-0">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-2 hidden lg:block">
              Property Sections
            </h3>
            
            {/* Mobile Nav Scroll */}
            <div className="flex lg:flex-col overflow-x-auto lg:overflow-visible gap-1 pb-2 lg:pb-0 hide-scrollbar -mx-4 px-4 lg:mx-0 lg:px-0">
              {navItems.filter(item => item.show).map((item) => {
                const Icon = item.icon;
                const isActive = activeSection === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveSection(item.id as Section)}
                    className={`
                      flex items-center gap-3 px-4 lg:px-3 py-2.5 rounded-lg transition-all text-sm font-medium whitespace-nowrap lg:whitespace-normal shrink-0
                      ${isActive 
                        ? "bg-primary/10 text-primary lg:border-l-2 lg:border-l-primary lg:rounded-l-none lg:bg-gradient-to-r lg:from-primary/10 lg:to-transparent" 
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"}
                    `}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quick Actions (Hidden on mobile to save space, or placed at bottom) */}
          <div className="hidden lg:flex flex-col gap-2 mt-auto">
            <Button variant="outline" className="w-full justify-start text-muted-foreground hover:text-foreground">
              <Edit className="w-4 h-4 mr-2" /> Edit Property Details
            </Button>
          </div>
        </div>

        {/* RIGHT MAIN AREA */}
        <div className="flex-1 bg-background lg:bg-muted/10 rounded-2xl lg:border lg:p-6 xl:p-8 min-h-0 flex flex-col overflow-hidden">
          {renderContent()}
        </div>
      </div>
      
      {/* Global CSS for scrollbars to keep it clean */}
      <style>{`
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}
