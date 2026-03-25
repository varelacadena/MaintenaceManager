import React, { useState } from "react";
import { 
  Wrench, DoorOpen, ClipboardList, Calendar, MapPin, 
  Search, Plus, Map, Download, CheckCircle2, Circle, 
  Clock, Wind, Zap, Droplets, Settings, 
  Sparkles, Building2, LayoutGrid, HelpCircle, 
  MoreVertical, FileText
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Accordion, 
  AccordionContent, 
  AccordionItem, 
  AccordionTrigger 
} from "@/components/ui/accordion";

const SPACES = [
  { id: 1, name: "Room 101 - Lecture Hall", floor: "1st Floor" },
  { id: 2, name: "Room 102 - Storage", floor: "1st Floor" },
  { id: 3, name: "Room 205 - Faculty Office", floor: "2nd Floor" },
  { id: 4, name: "Room 301 - Computer Lab", floor: "3rd Floor" },
  { id: 5, name: "Room B1 - Mechanical Room", floor: "Basement" },
];

const EQUIPMENT_CATEGORIES = [
  { id: "hvac", name: "HVAC", icon: Wind },
  { id: "electrical", name: "Electrical", icon: Zap },
  { id: "plumbing", name: "Plumbing", icon: Droplets },
  { id: "mechanical", name: "Mechanical", icon: Settings },
  { id: "appliances", name: "Appliances", icon: HelpCircle },
  { id: "janitorial", name: "Janitorial", icon: Sparkles },
  { id: "structural", name: "Structural", icon: Building2 },
  { id: "general", name: "General", icon: LayoutGrid },
];

const EQUIPMENT = [
  { id: 1, category: "hvac", name: "Carrier RTU-400", serial: "CR-2019-4401", condition: "Good" },
  { id: 2, category: "hvac", name: "Trane Split System", serial: "TR-2020-8832", condition: "Fair" },
  { id: 3, category: "electrical", name: "Main Distribution Panel", serial: "MDP-2015-001", condition: "Good" },
  { id: 4, category: "electrical", name: "Emergency Generator", serial: "GEN-2018-550", condition: "Fair" },
  { id: 5, category: "plumbing", name: "Booster Pump Station", serial: "BP-2017-220", condition: "Good" },
  { id: 6, category: "plumbing", name: "Water Heater #3", serial: "WH-2021-003", condition: "Poor" },
  { id: 7, category: "mechanical", name: "Elevator #1", serial: "ELV-2016-A01", condition: "Good" },
  { id: 8, category: "appliances", name: "Industrial Dishwasher", serial: "DW-2022-100", condition: "Good" },
  { id: 9, category: "janitorial", name: "Floor Scrubber", serial: "FS-2023-050", condition: "Good" },
  { id: 10, category: "structural", name: "Fire Escape - North", serial: "FE-2010-N01", condition: "Fair" },
  { id: 11, category: "general", name: "AED Station Lobby", serial: "AED-2024-L01", condition: "Good" },
  { id: 12, category: "general", name: "Security Camera System", serial: "CAM-2023-SYS", condition: "Good" },
];

const TASKS = [
  { id: 1, name: "Annual fire extinguisher inspection", status: "Scheduled", date: "Feb 1" },
  { id: 2, name: "Emergency exit light repair", status: "Open", date: "Jan 20" },
  { id: 3, name: "HVAC filter replacement", status: "In Progress", date: "Jan 18" },
  { id: 4, name: "Fix leaking pipe Rm 205", status: "Completed", date: "Jan 10" },
];

const RESOURCES = [
  "Building Floor Plans (PDF)",
  "HVAC Maintenance Manual",
  "Emergency Procedures Guide"
];

const getConditionColor = (condition: string) => {
  switch (condition) {
    case "Good": return "bg-green-500";
    case "Fair": return "bg-yellow-500";
    case "Poor": return "bg-red-500";
    default: return "bg-gray-500";
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case "Completed": return <CheckCircle2 className="h-5 w-5 text-green-500 bg-background" />;
    case "In Progress": return <Clock className="h-5 w-5 text-blue-500 bg-background" />;
    case "Scheduled": return <Calendar className="h-5 w-5 text-purple-500 bg-background" />;
    default: return <Circle className="h-5 w-5 text-gray-400 bg-background" />;
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case "Completed": return "bg-green-100 text-green-800 border-green-200";
    case "In Progress": return "bg-blue-100 text-blue-800 border-blue-200";
    case "Scheduled": return "bg-purple-100 text-purple-800 border-purple-200";
    default: return "bg-gray-100 text-gray-800 border-gray-200";
  }
};

export function ContentSplit() {
  const [equipmentSearch, setEquipmentSearch] = useState("");

  // Group spaces by floor
  const spacesByFloor = SPACES.reduce((acc, space) => {
    if (!acc[space.floor]) acc[space.floor] = [];
    acc[space.floor].push(space);
    return acc;
  }, {} as Record<string, typeof SPACES>);

  // Order of floors
  const floorOrder = ["Basement", "1st Floor", "2nd Floor", "3rd Floor"];
  const sortedFloors = Object.keys(spacesByFloor).sort(
    (a, b) => floorOrder.indexOf(a) - floorOrder.indexOf(b)
  );

  const filteredEquipment = EQUIPMENT.filter(e => 
    e.name.toLowerCase().includes(equipmentSearch.toLowerCase()) ||
    e.serial.toLowerCase().includes(equipmentSearch.toLowerCase()) ||
    e.category.toLowerCase().includes(equipmentSearch.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background p-4 md:p-6 lg:h-screen lg:flex lg:flex-col lg:overflow-hidden">
      {/* Property Header */}
      <div className="mb-6 lg:flex-shrink-0">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-3xl font-bold tracking-tight text-foreground">Anderson Hall</h1>
              <Badge variant="secondary" className="bg-blue-100 text-blue-800 hover:bg-blue-100 border-transparent">
                Building
              </Badge>
            </div>
            <div className="flex items-center text-muted-foreground mt-2">
              <MapPin className="h-4 w-4 mr-1.5" />
              <span>1200 College Ave, Campus East</span>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline">Edit Property</Button>
            <Button>Create Task</Button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <Card className="shadow-sm border-slate-200">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="bg-orange-100 p-2.5 rounded-lg text-orange-600">
                <Wrench className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">12</p>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Equipment</p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="shadow-sm border-slate-200">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="bg-indigo-100 p-2.5 rounded-lg text-indigo-600">
                <DoorOpen className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">5</p>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Spaces</p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="shadow-sm border-slate-200">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="bg-red-100 p-2.5 rounded-lg text-red-600">
                <ClipboardList className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">4</p>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Open Tasks</p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="shadow-sm border-slate-200">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="bg-slate-100 p-2.5 rounded-lg text-slate-600">
                <Calendar className="h-5 w-5" />
              </div>
              <div>
                <p className="text-lg font-bold text-foreground">Jan 15</p>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Last Work</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Two-Column Layout */}
      <div className="flex flex-col lg:flex-row gap-6 lg:flex-1 lg:min-h-0">
        
        {/* LEFT COLUMN: Primary Assets */}
        <div className="w-full lg:w-[60%] flex flex-col gap-6 lg:overflow-y-auto pr-2 pb-6 scrollbar-hide">
          
          {/* Spaces Section */}
          <Card className="shadow-sm border-slate-200 overflow-hidden flex flex-col">
            <div className="p-5 border-b bg-slate-50/50 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-foreground flex items-center">
                  <DoorOpen className="h-5 w-5 mr-2 text-indigo-600" />
                  Spaces
                </h2>
                <p className="text-sm text-muted-foreground mt-1">Rooms and areas within this property.</p>
              </div>
              <Button size="sm" variant="outline" className="h-9">
                <Plus className="h-4 w-4 mr-2" /> Add Space
              </Button>
            </div>
            
            <div className="p-5 space-y-6">
              {sortedFloors.map((floor) => (
                <div key={floor} className="space-y-3">
                  <h3 className="text-sm font-semibold text-slate-900 border-b pb-2 flex items-center">
                    <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded text-xs mr-2">{spacesByFloor[floor].length}</span>
                    {floor}
                  </h3>
                  <div className="grid gap-2">
                    {spacesByFloor[floor].map((space) => (
                      <div key={space.id} className="flex items-center justify-between p-3 rounded-lg border border-slate-100 bg-white hover:border-indigo-100 hover:shadow-sm transition-all group">
                        <div className="flex items-center">
                          <div className="h-8 w-8 rounded-md bg-slate-50 flex items-center justify-center mr-3 border border-slate-100">
                            <DoorOpen className="h-4 w-4 text-slate-400" />
                          </div>
                          <div>
                            <p className="font-medium text-sm text-slate-900">{space.name}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-900">
                            <Wrench className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-indigo-600">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Equipment Section */}
          <Card className="shadow-sm border-slate-200">
            <div className="p-5 border-b bg-slate-50/50">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-foreground flex items-center">
                    <Wrench className="h-5 w-5 mr-2 text-orange-600" />
                    Equipment
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">Assets installed or stored at this property.</p>
                </div>
                <Button size="sm" className="h-9">
                  <Plus className="h-4 w-4 mr-2" /> Add Equipment
                </Button>
              </div>
              
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input 
                  placeholder="Search by name, serial, or category..." 
                  className="pl-9 bg-white border-slate-200"
                  value={equipmentSearch}
                  onChange={(e) => setEquipmentSearch(e.target.value)}
                />
              </div>
            </div>

            <div className="p-2">
              <Accordion type="multiple" defaultValue={["hvac", "electrical"]} className="w-full">
                {EQUIPMENT_CATEGORIES.map((cat) => {
                  const categoryItems = filteredEquipment.filter(e => e.category === cat.id);
                  if (categoryItems.length === 0) return null;
                  
                  const Icon = cat.icon;
                  
                  return (
                    <AccordionItem value={cat.id} key={cat.id} className="border-b-0 px-2 py-1">
                      <AccordionTrigger className="hover:no-underline hover:bg-slate-50 px-3 rounded-lg py-3 data-[state=open]:bg-slate-50">
                        <div className="flex items-center">
                          <div className="h-8 w-8 rounded-md bg-white border shadow-sm flex items-center justify-center mr-3">
                            <Icon className="h-4 w-4 text-slate-600" />
                          </div>
                          <span className="font-semibold text-slate-900">{cat.name}</span>
                          <Badge variant="secondary" className="ml-3 bg-white text-slate-500 border">
                            {categoryItems.length}
                          </Badge>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pt-2 pb-4 px-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {categoryItems.map(item => (
                            <div key={item.id} className="p-3 border rounded-lg bg-white shadow-sm flex flex-col hover:border-slate-300 transition-colors">
                              <div className="flex justify-between items-start mb-2">
                                <h4 className="font-medium text-sm text-slate-900 line-clamp-1">{item.name}</h4>
                                <Button variant="ghost" size="icon" className="h-6 w-6 -mt-1 -mr-1 text-slate-400">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </div>
                              <div className="text-xs text-slate-500 mb-3 font-mono bg-slate-50 p-1.5 rounded inline-block w-fit">
                                {item.serial}
                              </div>
                              <div className="mt-auto flex items-center gap-1.5">
                                <div className={`h-2 w-2 rounded-full ${getConditionColor(item.condition)}`} />
                                <span className="text-xs font-medium text-slate-600">{item.condition}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            </div>
          </Card>
        </div>

        {/* RIGHT COLUMN: Context & History */}
        <div className="w-full lg:w-[40%] flex flex-col gap-6 lg:overflow-y-auto pl-2 pb-6 scrollbar-hide">
          
          {/* History Timeline */}
          <Card className="shadow-sm border-slate-200">
            <div className="p-5 border-b bg-slate-50/50">
              <h2 className="text-lg font-semibold text-foreground flex items-center">
                <ClipboardList className="h-5 w-5 mr-2 text-red-600" />
                Work History
              </h2>
            </div>
            <CardContent className="p-5">
              <div className="relative border-l-2 border-slate-200 ml-3 pl-6 space-y-8 py-2">
                {TASKS.map((task, index) => (
                  <div key={task.id} className="relative">
                    {/* Timeline dot/icon */}
                    <div className="absolute -left-[35px] top-0">
                      {getStatusIcon(task.status)}
                    </div>
                    
                    <div className="bg-white border rounded-lg p-4 shadow-sm relative top-[-6px]">
                      <div className="flex justify-between items-start mb-2 gap-4">
                        <h4 className="font-medium text-sm text-slate-900">{task.name}</h4>
                        <span className="text-xs font-medium text-slate-500 whitespace-nowrap">{task.date}</span>
                      </div>
                      <Badge variant="outline" className={`${getStatusColor(task.status)} text-xs border`}>
                        {task.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
              <Button variant="ghost" className="w-full mt-4 text-slate-600">
                View All History
              </Button>
            </CardContent>
          </Card>

          {/* Location / Map */}
          <Card className="shadow-sm border-slate-200 overflow-hidden">
            <div className="p-5 border-b bg-slate-50/50">
              <h2 className="text-lg font-semibold text-foreground flex items-center">
                <Map className="h-5 w-5 mr-2 text-emerald-600" />
                Location
              </h2>
            </div>
            <div className="h-[200px] w-full bg-slate-800 relative flex items-center justify-center">
              {/* Map placeholder pattern */}
              <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(#475569 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
              <div className="z-10 flex flex-col items-center">
                <div className="bg-emerald-500 p-3 rounded-full mb-3 shadow-lg shadow-emerald-500/20">
                  <MapPin className="h-6 w-6 text-white" />
                </div>
                <Button variant="secondary" className="bg-white/10 hover:bg-white/20 text-white border-white/20 backdrop-blur-md">
                  View Interactive Map
                </Button>
              </div>
            </div>
          </Card>

          {/* Resources */}
          <Card className="shadow-sm border-slate-200">
            <div className="p-5 border-b bg-slate-50/50">
              <h2 className="text-lg font-semibold text-foreground flex items-center">
                <FileText className="h-5 w-5 mr-2 text-amber-600" />
                Resources
              </h2>
            </div>
            <div className="p-2">
              <div className="flex flex-col gap-1">
                {RESOURCES.map((resource, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 group cursor-pointer transition-colors">
                    <div className="flex items-center text-sm font-medium text-slate-700">
                      <FileText className="h-4 w-4 mr-3 text-slate-400" />
                      {resource}
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 group-hover:text-amber-600 group-hover:bg-amber-50">
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </Card>

        </div>
      </div>
    </div>
  );
}
