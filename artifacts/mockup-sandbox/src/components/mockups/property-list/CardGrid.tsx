import { useState, useMemo } from 'react';
import { 
  Building2, 
  Trees, 
  Car, 
  Gamepad2, 
  Wrench, 
  Route, 
  HelpCircle, 
  Search, 
  Map as MapIcon, 
  Calendar, 
  MapPin, 
  Plus,
  LayoutGrid
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const MOCK_PROPERTIES = [
  { id: '1', name: 'Anderson Hall', address: '1200 College Ave', type: 'Building', lastWorkDate: 'Jan 15', equipmentCount: 12 },
  { id: '2', name: 'Science Building', address: '1300 Research Dr', type: 'Building', lastWorkDate: 'Jan 10', equipmentCount: 45 },
  { id: '3', name: 'Library', address: '900 Academic Way', type: 'Building', lastWorkDate: 'Jan 14', equipmentCount: 20 },
  { id: '4', name: 'Student Center', address: '500 Campus Blvd', type: 'Building', lastWorkDate: 'Dec 20', equipmentCount: 30 },
  { id: '5', name: 'Gymnasium', address: '800 Sports Lane', type: 'Building', lastWorkDate: 'Jan 05', equipmentCount: 18 },
  { id: '6', name: 'Main Quad', address: 'Central Campus', type: 'Lawn', lastWorkDate: 'Jan 12', equipmentCount: 2 },
  { id: '7', name: 'Memorial Garden', address: 'North Campus', type: 'Lawn', lastWorkDate: 'Nov 30', equipmentCount: 1 },
  { id: '8', name: 'Practice Fields', address: 'East Athletic Complex', type: 'Lawn', lastWorkDate: 'Oct 15', equipmentCount: 3 },
  { id: '9', name: 'Lot A - Faculty', address: 'West Campus', type: 'Parking', lastWorkDate: 'Sep 10', equipmentCount: 4 },
  { id: '10', name: 'Lot B - Student', address: 'South Campus', type: 'Parking', lastWorkDate: 'Aug 22', equipmentCount: 2 },
  { id: '11', name: 'Tennis Courts', address: 'Athletic Complex', type: 'Recreation', lastWorkDate: 'Jan 02', equipmentCount: 6 },
  { id: '12', name: 'Pool & Aquatic Center', address: 'Recreation Dr', type: 'Recreation', lastWorkDate: 'Jan 14', equipmentCount: 15 },
  { id: '13', name: 'Central Plant', address: '100 Service Rd', type: 'Utility', lastWorkDate: 'Jan 16', equipmentCount: 150 },
  { id: '14', name: 'Campus Loop Drive', address: 'Perimeter Road', type: 'Road', lastWorkDate: 'Dec 05', equipmentCount: 0 },
  { id: '15', name: 'Storage Facility', address: '200 Maintenance Way', type: 'Other', lastWorkDate: 'Nov 11', equipmentCount: 8 },
];

const TYPE_CONFIG: Record<string, { icon: typeof Building2, color: string }> = {
  Building: { icon: Building2, color: 'text-blue-500' },
  Lawn: { icon: Trees, color: 'text-green-500' },
  Parking: { icon: Car, color: 'text-slate-500' },
  Recreation: { icon: Gamepad2, color: 'text-orange-500' },
  Utility: { icon: Wrench, color: 'text-red-500' },
  Road: { icon: Route, color: 'text-stone-500' },
  Other: { icon: HelpCircle, color: 'text-purple-500' },
};

export const CardGrid = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilters, setActiveFilters] = useState<Set<string>>(new Set());
  const [isMapView, setIsMapView] = useState(false);

  const toggleFilter = (type: string) => {
    setActiveFilters(prev => {
      const next = new Set(prev);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  };

  const filteredProperties = useMemo(() => {
    return MOCK_PROPERTIES.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           p.address.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = activeFilters.size === 0 || activeFilters.has(p.type);
      return matchesSearch && matchesType;
    });
  }, [searchQuery, activeFilters]);

  return (
    <div className="min-h-screen bg-background p-4 lg:p-6 flex flex-col">
      {/* Top Bar */}
      <div className="flex flex-col gap-6 mb-6">
        {/* Header Row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">Properties</h1>
            <Badge variant="secondary" className="text-sm px-2.5 py-0.5 rounded-full">
              {filteredProperties.length}
            </Badge>
          </div>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Add Property
          </Button>
        </div>

        {/* Filter/Search Row */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex-1 w-full sm:w-auto flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            {/* Search */}
            <div className="relative w-full sm:max-w-[300px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Search properties..." 
                className="pl-9 w-full bg-background"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Type Filter Pills */}
            <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-2 sm:pb-0 hide-scrollbar">
              {Object.entries(TYPE_CONFIG).map(([type, config]) => {
                const Icon = config.icon;
                const isActive = activeFilters.has(type);
                return (
                  <Badge
                    key={type}
                    variant={isActive ? "default" : "outline"}
                    className="cursor-pointer whitespace-nowrap px-3 py-1.5 transition-all"
                    onClick={() => toggleFilter(type)}
                  >
                    <Icon className="w-3.5 h-3.5 mr-1.5" />
                    {type}
                  </Badge>
                );
              })}
            </div>
          </div>

          {/* View Toggle */}
          <Button 
            variant="outline" 
            className="w-full sm:w-auto shrink-0"
            onClick={() => setIsMapView(!isMapView)}
          >
            {isMapView ? (
              <>
                <LayoutGrid className="w-4 h-4 mr-2" />
                Grid View
              </>
            ) : (
              <>
                <MapIcon className="w-4 h-4 mr-2" />
                Map View
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Main Content */}
      {isMapView ? (
        // Map Placeholder
        <div className="flex-1 bg-muted rounded-xl border border-border flex items-center justify-center relative min-h-[600px] overflow-hidden">
          {/* Decorative map elements */}
          <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/grid-me.png')]"></div>
          
          {/* Simulated Property Boundaries */}
          <div className="absolute top-1/4 left-1/4 w-32 h-40 bg-blue-500/20 border-2 border-blue-500/50 rounded-sm flex items-center justify-center shadow-lg">
            <Building2 className="w-8 h-8 text-blue-500/70" />
          </div>
          <div className="absolute top-1/3 right-1/3 w-48 h-24 bg-green-500/20 border-2 border-green-500/50 rounded-sm flex items-center justify-center shadow-lg">
            <Trees className="w-8 h-8 text-green-500/70" />
          </div>
          <div className="absolute bottom-1/4 left-1/3 w-40 h-32 bg-slate-500/20 border-2 border-slate-500/50 rounded-sm flex items-center justify-center shadow-lg">
            <Car className="w-8 h-8 text-slate-500/70" />
          </div>

          <div className="z-10 flex flex-col items-center justify-center text-muted-foreground bg-background/80 backdrop-blur-sm p-6 rounded-xl border shadow-sm">
            <MapPin className="w-12 h-12 mb-3 text-primary/50" />
            <h3 className="text-lg font-semibold text-foreground">Interactive Map View</h3>
            <p className="text-sm text-center max-w-sm mt-2">
              Pan and zoom to view property boundaries, locations, and spatial relationships.
            </p>
          </div>
        </div>
      ) : (
        // Card Grid
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {filteredProperties.length > 0 ? (
            filteredProperties.map(property => {
              const TypeIcon = TYPE_CONFIG[property.type]?.icon || HelpCircle;
              
              return (
                <Card 
                  key={property.id} 
                  className="group overflow-hidden cursor-pointer hover:shadow-md transition-all hover:border-primary/30 flex flex-col"
                >
                  {/* Thumbnail Map Area */}
                  <div className="h-32 bg-muted relative flex items-center justify-center border-b">
                    <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
                    <MapPin className="w-8 h-8 text-muted-foreground/40 group-hover:scale-110 transition-transform duration-300" />
                    
                    {/* Badge Overlay */}
                    <div className="absolute top-3 right-3">
                      <Badge variant="secondary" className="bg-background/90 backdrop-blur-sm shadow-sm no-default-hover-elevate">
                        <TypeIcon className="w-3 h-3 mr-1.5" />
                        {property.type}
                      </Badge>
                    </div>
                  </div>

                  <CardContent className="p-4 flex flex-col flex-1">
                    <div className="mb-4">
                      <h3 className="font-semibold text-lg leading-tight group-hover:text-primary transition-colors line-clamp-1">
                        {property.name}
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1 flex items-start gap-1">
                        <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                        <span className="line-clamp-1">{property.address}</span>
                      </p>
                    </div>

                    <div className="mt-auto pt-4 border-t flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>Last work: {property.lastWorkDate}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Wrench className="w-3.5 h-3.5" />
                        <span>{property.equipmentCount} equipment</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          ) : (
            <div className="col-span-full flex flex-col items-center justify-center py-24 text-muted-foreground border-2 border-dashed rounded-xl bg-muted/30">
              <Search className="w-12 h-12 mb-4 text-muted-foreground/30" />
              <h3 className="text-lg font-medium text-foreground">No properties found</h3>
              <p className="text-sm mt-1">Adjust your filters or search query to see results.</p>
              <Button 
                variant="link" 
                className="mt-4"
                onClick={() => {
                  setSearchQuery('');
                  setActiveFilters(new Set());
                }}
              >
                Clear all filters
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CardGrid;
