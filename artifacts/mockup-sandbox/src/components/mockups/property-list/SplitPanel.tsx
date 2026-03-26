import { useState } from 'react';
import { 
  Building2, Trees, Car, Gamepad2, Wrench, Route, HelpCircle, 
  LayoutGrid, Plus, Search, MapPin, ChevronLeft, Calendar, 
  LayoutDashboard, Activity
} from 'lucide-react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

type PropertyType = 'all' | 'building' | 'lawn' | 'parking' | 'recreation' | 'utility' | 'road' | 'other';

interface Property {
  id: string;
  name: string;
  address: string;
  type: PropertyType;
  lastWorkDate?: string;
  equipmentCount?: number;
  spacesCount?: number;
  recentTasks?: { id: string; title: string; status: string; date: string }[];
}

const mockProperties: Property[] = [
  { id: '1', name: 'Anderson Hall', address: '1200 College Ave', type: 'building', lastWorkDate: 'Oct 24, 2023', equipmentCount: 45, spacesCount: 120, recentTasks: [{ id: 't1', title: 'HVAC Filter Replacement', status: 'Completed', date: 'Oct 24' }, { id: 't2', title: 'Lighting Inspection', status: 'Pending', date: 'Nov 2' }] },
  { id: '2', name: 'Science Building', address: '1300 Research Dr', type: 'building', lastWorkDate: 'Oct 28, 2023', equipmentCount: 112, spacesCount: 85, recentTasks: [{ id: 't3', title: 'Fume Hood Maintenance', status: 'In Progress', date: 'Oct 28' }] },
  { id: '3', name: 'Library', address: '900 Academic Way', type: 'building', lastWorkDate: 'Sep 15, 2023', equipmentCount: 34, spacesCount: 200 },
  { id: '4', name: 'Student Center', address: '500 Campus Blvd', type: 'building', lastWorkDate: 'Oct 20, 2023', equipmentCount: 56, spacesCount: 65 },
  { id: '5', name: 'Gymnasium', address: '800 Sports Lane', type: 'building', lastWorkDate: 'Oct 10, 2023', equipmentCount: 28, spacesCount: 45 },
  
  { id: '6', name: 'Main Quad', address: 'Central Campus', type: 'lawn', lastWorkDate: 'Oct 29, 2023', equipmentCount: 12, recentTasks: [{ id: 't4', title: 'Mowing and Edging', status: 'Completed', date: 'Oct 29' }, { id: 't5', title: 'Sprinkler Repair', status: 'Scheduled', date: 'Nov 5' }] },
  { id: '7', name: 'Memorial Garden', address: 'North Campus', type: 'lawn', lastWorkDate: 'Oct 15, 2023', equipmentCount: 4 },
  { id: '8', name: 'Practice Fields', address: 'East Athletic Complex', type: 'lawn', lastWorkDate: 'Oct 22, 2023', equipmentCount: 18 },
  
  { id: '9', name: 'Lot A - Faculty', address: 'West Campus', type: 'parking', lastWorkDate: 'Aug 10, 2023', equipmentCount: 8, spacesCount: 350 },
  { id: '10', name: 'Lot B - Student', address: 'South Campus', type: 'parking', lastWorkDate: 'Sep 05, 2023', equipmentCount: 15, spacesCount: 800 },
  
  { id: '11', name: 'Tennis Courts', address: 'Athletic Complex', type: 'recreation', lastWorkDate: 'Jul 20, 2023', equipmentCount: 6 },
  { id: '12', name: 'Pool & Aquatic Center', address: 'Recreation Dr', type: 'recreation', lastWorkDate: 'Oct 25, 2023', equipmentCount: 42, recentTasks: [{ id: 't6', title: 'Chemical Balance Check', status: 'Completed', date: 'Oct 25' }] },
  
  { id: '13', name: 'Central Plant', address: '100 Service Rd', type: 'utility', lastWorkDate: 'Oct 30, 2023', equipmentCount: 215, recentTasks: [{ id: 't7', title: 'Generator Test', status: 'In Progress', date: 'Oct 30' }, { id: 't8', title: 'Chiller Maintenance', status: 'Scheduled', date: 'Nov 12' }] },
  
  { id: '14', name: 'Campus Loop Drive', address: 'Perimeter Road', type: 'road', lastWorkDate: 'Jun 15, 2023', equipmentCount: 32 },
  
  { id: '15', name: 'Storage Facility', address: '200 Maintenance Way', type: 'other', lastWorkDate: 'Jan 10, 2023', equipmentCount: 5 },
];

const typeIcons = {
  all: LayoutGrid,
  building: Building2,
  lawn: Trees,
  parking: Car,
  recreation: Gamepad2,
  utility: Wrench,
  road: Route,
  other: HelpCircle,
};

const typeLabels = {
  all: 'All Properties',
  building: 'Buildings',
  lawn: 'Lawns & Grounds',
  parking: 'Parking Lots',
  recreation: 'Recreation',
  utility: 'Utilities',
  road: 'Roads & Pathways',
  other: 'Other',
};

const statusColors = {
  'Completed': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  'In Progress': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  'Pending': 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  'Scheduled': 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
};

export const SplitPanel = () => {
  const [activeFilter, setActiveFilter] = useState<PropertyType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);

  const filteredProperties = mockProperties.filter(p => {
    const matchesFilter = activeFilter === 'all' || p.type === activeFilter;
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.address.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const selectedProperty = mockProperties.find(p => p.id === selectedPropertyId);
  const SelectedIcon = selectedProperty ? typeIcons[selectedProperty.type] : typeIcons.all;

  return (
    <div className="min-h-screen bg-background p-0 lg:p-6 flex flex-col">
      <div className="flex-1 flex flex-col lg:flex-row rounded-none lg:rounded-xl overflow-hidden border-0 lg:border shadow-none lg:shadow-sm bg-card h-[calc(100vh)] lg:h-[calc(100vh-3rem)]">
        
        {/* LEFT PANEL - Icon Sidebar */}
        <div className="flex-none lg:w-16 bg-muted/30 border-b lg:border-b-0 lg:border-r flex lg:flex-col items-center justify-between p-2 lg:py-4 overflow-x-auto lg:overflow-x-visible">
          <div className="flex lg:flex-col items-center gap-2 lg:gap-4 w-full">
            <TooltipProvider delayDuration={0}>
              {(Object.keys(typeIcons) as PropertyType[]).map((type) => {
                const Icon = typeIcons[type];
                const isActive = activeFilter === type;
                return (
                  <Tooltip key={type}>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setActiveFilter(type);
                          setSelectedPropertyId(null);
                        }}
                        className={`
                          relative flex-shrink-0 rounded-xl
                          ${isActive 
                            ? 'bg-primary/10 text-primary toggle-elevate toggle-elevated' 
                            : 'text-muted-foreground'
                          }
                        `}
                      >
                        {isActive && (
                          <div className="absolute lg:left-0 lg:top-1/2 lg:-translate-y-1/2 bottom-0 left-1/2 -translate-x-1/2 lg:translate-x-0 w-8 h-1 lg:w-1 lg:h-8 bg-primary rounded-full" />
                        )}
                        <Icon className="w-5 h-5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="hidden lg:block font-medium">
                      {typeLabels[type]}
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </TooltipProvider>
          </div>
          
          <TooltipProvider delayDuration={0}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="hidden lg:block mt-auto pt-4 border-t w-full text-center">
                  <Button size="icon" className="rounded-full shadow-sm mx-auto">
                    <Plus className="w-5 h-5" />
                  </Button>
                </div>
              </TooltipTrigger>
              <TooltipContent side="right" className="font-medium">
                Add Property
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* CENTER PANEL - List */}
        <div className={`
          flex-none lg:w-[380px] xl:w-[420px] bg-card border-r flex flex-col transition-all duration-300
          ${selectedPropertyId ? 'hidden lg:flex' : 'flex flex-1'}
        `}>
          <div className="p-4 border-b space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Search properties..." 
                className="pl-9 bg-muted/50 border-transparent focus-visible:bg-background"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm">{typeLabels[activeFilter]}</span>
                <Badge variant="secondary" className="rounded-full px-2 font-normal">
                  {filteredProperties.length}
                </Badge>
              </div>
              <Button variant="ghost" size="sm" className="h-8 text-xs lg:hidden">
                <Plus className="w-4 h-4 mr-1" /> Add
              </Button>
            </div>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-3 space-y-2">
              {filteredProperties.length > 0 ? (
                filteredProperties.map((property) => {
                  const Icon = typeIcons[property.type];
                  const isSelected = selectedPropertyId === property.id;
                  
                  return (
                    <div
                      key={property.id}
                      onClick={() => setSelectedPropertyId(property.id)}
                      className={`
                        p-3 rounded-lg cursor-pointer border text-left hover-elevate
                        ${isSelected 
                          ? 'border-primary bg-primary/5 shadow-sm ring-1 ring-primary/20' 
                          : 'border-transparent'
                        }
                      `}
                    >
                      <div className="flex gap-3">
                        <div className={`
                          mt-0.5 p-2 rounded-md h-fit
                          ${isSelected ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}
                        `}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className={`font-semibold text-sm truncate ${isSelected ? 'text-primary' : ''}`}>
                            {property.name}
                          </h4>
                          <p className="text-xs text-muted-foreground truncate mt-0.5 flex items-center gap-1">
                            <MapPin className="w-3 h-3 flex-shrink-0" />
                            {property.address}
                          </p>
                          
                          <div className="flex gap-3 mt-2">
                            {property.equipmentCount !== undefined && (
                              <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-medium">
                                <Activity className="w-3 h-3" />
                                <span>{property.equipmentCount} assets</span>
                              </div>
                            )}
                            {property.lastWorkDate && (
                              <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-medium">
                                <Calendar className="w-3 h-3" />
                                <span>{property.lastWorkDate}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })
              ) : (
                <div className="py-12 text-center text-muted-foreground flex flex-col items-center">
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
                    <Search className="w-5 h-5" />
                  </div>
                  <p className="text-sm font-medium">No properties found</p>
                  <p className="text-xs mt-1">Try adjusting your search or filters</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* RIGHT PANEL - Preview / Map */}
        <div className={`
          flex-1 flex flex-col bg-muted/10 relative overflow-hidden transition-all duration-300
          ${!selectedPropertyId ? 'hidden lg:flex' : 'flex'}
        `}>
          {selectedProperty ? (
            <div className="h-full flex flex-col animate-in fade-in slide-in-from-right-4 duration-300">
              {/* Mobile Back Header */}
              <div className="lg:hidden flex items-center gap-2 p-4 border-b bg-card">
                <Button variant="ghost" size="icon" onClick={() => setSelectedPropertyId(null)}>
                  <ChevronLeft className="w-5 h-5" />
                </Button>
                <span className="font-medium text-sm">Back to List</span>
              </div>

              <ScrollArea className="flex-1">
                <div className="p-4 lg:p-8 max-w-3xl mx-auto space-y-6">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline" className="bg-background capitalize flex gap-1.5 items-center px-2 py-0.5 text-xs font-medium">
                          <SelectedIcon className="w-3.5 h-3.5" />
                          {typeLabels[selectedProperty.type]}
                        </Badge>
                        <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                          Active
                        </Badge>
                      </div>
                      <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">{selectedProperty.name}</h1>
                      <p className="text-muted-foreground flex items-center gap-1.5 mt-2">
                        <MapPin className="w-4 h-4" />
                        {selectedProperty.address}
                      </p>
                    </div>
                    <div className="hidden sm:flex gap-2">
                      <Button variant="outline" size="sm">Edit</Button>
                      <Button size="sm">View Full Details</Button>
                    </div>
                  </div>

                  {/* Small Map Placeholder */}
                  <div className="w-full h-48 bg-muted rounded-xl border overflow-hidden relative group">
                    <div className="absolute inset-0 bg-[url('https://api.mapbox.com/styles/v1/mapbox/light-v11/static/-98.5795,39.8283,14/800x400?access_token=pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4M29nMTA2YjIyd284N3pnZDlxazIifQ.0tJ-ilA4P10N23KIR0h0QA')] bg-cover bg-center opacity-40 mix-blend-luminosity"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center animate-pulse">
                        <div className="w-4 h-4 bg-primary rounded-full shadow-lg ring-4 ring-primary/30"></div>
                      </div>
                    </div>
                    <div className="absolute bottom-3 right-3">
                      <Button variant="secondary" size="sm" className="shadow-md h-8 text-xs bg-background/90 backdrop-blur" onClick={() => setSelectedPropertyId(null)}>
                        <MapPin className="w-3.5 h-3.5 mr-1.5" /> Expand Map
                      </Button>
                    </div>
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <Card className="bg-card shadow-sm border-muted">
                      <CardContent className="p-4">
                        <div className="text-muted-foreground mb-1 flex items-center gap-1.5">
                          <Wrench className="w-4 h-4" />
                          <span className="text-xs font-medium uppercase tracking-wider">Equipment</span>
                        </div>
                        <p className="text-2xl font-semibold">{selectedProperty.equipmentCount || 0}</p>
                      </CardContent>
                    </Card>
                    
                    {selectedProperty.spacesCount && (
                      <Card className="bg-card shadow-sm border-muted">
                        <CardContent className="p-4">
                          <div className="text-muted-foreground mb-1 flex items-center gap-1.5">
                            <LayoutDashboard className="w-4 h-4" />
                            <span className="text-xs font-medium uppercase tracking-wider">Spaces</span>
                          </div>
                          <p className="text-2xl font-semibold">{selectedProperty.spacesCount}</p>
                        </CardContent>
                      </Card>
                    )}
                    
                    <Card className="bg-card shadow-sm border-muted">
                      <CardContent className="p-4">
                        <div className="text-muted-foreground mb-1 flex items-center gap-1.5">
                          <Calendar className="w-4 h-4" />
                          <span className="text-xs font-medium uppercase tracking-wider">Last Work</span>
                        </div>
                        <p className="text-lg font-medium tracking-tight mt-1">{selectedProperty.lastWorkDate || 'Never'}</p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Recent Activity */}
                  <div className="space-y-3">
                    <h3 className="font-semibold text-lg flex items-center gap-2">
                      <Activity className="w-5 h-5 text-muted-foreground" />
                      Recent Activity
                    </h3>
                    {selectedProperty.recentTasks && selectedProperty.recentTasks.length > 0 ? (
                      <div className="space-y-2">
                        {selectedProperty.recentTasks.map(task => (
                          <div key={task.id} className="flex items-center justify-between p-3 bg-card border rounded-lg hover:border-border transition-colors">
                            <div className="flex flex-col gap-1">
                              <span className="font-medium text-sm">{task.title}</span>
                              <span className="text-xs text-muted-foreground">{task.date}</span>
                            </div>
                            <Badge className={`${statusColors[task.status as keyof typeof statusColors]} border-0 shadow-none font-medium text-[10px] uppercase tracking-wide px-2 py-0.5`}>
                              {task.status}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-6 bg-card border border-dashed rounded-lg text-center text-muted-foreground text-sm">
                        No recent activity found for this property.
                      </div>
                    )}
                  </div>
                  
                  {/* Mobile Actions */}
                  <div className="sm:hidden pt-4 pb-8 flex flex-col gap-3">
                    <Button className="w-full">View Full Details</Button>
                    <Button variant="outline" className="w-full">Edit Property</Button>
                  </div>
                </div>
              </ScrollArea>
            </div>
          ) : (
            /* Full Map Default State */
            <div className="h-full w-full relative bg-muted flex items-center justify-center overflow-hidden">
              <div className="absolute inset-0 bg-[#e5e7eb] dark:bg-[#1f2937]">
                {/* Simulated Map Grid/Pattern */}
                <div className="w-full h-full opacity-10" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
                
                {/* Decorative Map Elements representing properties */}
                <div className="absolute top-1/4 left-1/4 w-32 h-24 bg-blue-500/20 border-2 border-blue-500/40 rounded shadow-sm rotate-2 hover:bg-blue-500/30 transition-colors cursor-pointer group flex items-center justify-center" onClick={() => setSelectedPropertyId('1')}>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-background/90 px-2 py-1 rounded text-xs font-medium shadow-sm backdrop-blur-sm">Anderson Hall</div>
                </div>
                
                <div className="absolute top-1/2 left-1/2 w-48 h-32 bg-green-500/20 border-2 border-green-500/40 rounded -rotate-3 hover:bg-green-500/30 transition-colors cursor-pointer group flex items-center justify-center" onClick={() => setSelectedPropertyId('6')}>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-background/90 px-2 py-1 rounded text-xs font-medium shadow-sm backdrop-blur-sm">Main Quad</div>
                </div>
                
                <div className="absolute bottom-1/4 right-1/3 w-64 h-40 bg-gray-500/20 border-2 border-gray-500/40 rounded rotate-1 hover:bg-gray-500/30 transition-colors cursor-pointer group flex items-center justify-center" onClick={() => setSelectedPropertyId('10')}>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-background/90 px-2 py-1 rounded text-xs font-medium shadow-sm backdrop-blur-sm">Lot B - Student</div>
                </div>

                <div className="absolute top-1/3 right-1/4 w-20 h-20 bg-orange-500/20 border-2 border-orange-500/40 rounded-full hover:bg-orange-500/30 transition-colors cursor-pointer group flex items-center justify-center" onClick={() => setSelectedPropertyId('11')}>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-background/90 px-2 py-1 rounded text-xs font-medium shadow-sm backdrop-blur-sm">Tennis Courts</div>
                </div>
              </div>
              
              <div className="relative z-10 flex flex-col items-center p-6 bg-background/80 backdrop-blur-md rounded-2xl shadow-lg border text-center max-w-sm">
                <div className="w-12 h-12 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-4">
                  <MapPin className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Select a property</h3>
                <p className="text-sm text-muted-foreground">
                  Click a property on the map or from the list to view its details and activity.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SplitPanel;
