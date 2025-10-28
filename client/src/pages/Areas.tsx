import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { MapPin, Plus, Trash2, FolderTree, Pencil } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Area, Subdivision } from "@shared/schema";

export default function Areas() {
  const { toast } = useToast();
  const [selectedArea, setSelectedArea] = useState<Area | null>(null);
  const [isAddAreaOpen, setIsAddAreaOpen] = useState(false);
  const [isEditAreaOpen, setIsEditAreaOpen] = useState(false);
  const [isAddSubdivisionOpen, setIsAddSubdivisionOpen] = useState(false);
  const [newArea, setNewArea] = useState({ name: "", description: "" });
  const [editArea, setEditArea] = useState<Area | null>(null);
  const [newSubdivision, setNewSubdivision] = useState({ name: "" });

  const { data: areas = [], isLoading: areasLoading } = useQuery<Area[]>({
    queryKey: ["/api/areas"],
  });

  const { data: subdivisions = [] } = useQuery<Subdivision[]>({
    queryKey: ["/api/subdivisions", selectedArea?.id],
    enabled: !!selectedArea,
    queryFn: async () => {
      if (!selectedArea) return [];
      const response = await fetch(`/api/subdivisions/${selectedArea.id}`);
      if (!response.ok) throw new Error("Failed to fetch subdivisions");
      return response.json();
    },
  });

  const createAreaMutation = useMutation({
    mutationFn: async (data: { name: string; description: string }) => {
      return await apiRequest("POST", "/api/areas", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/areas"] });
      setIsAddAreaOpen(false);
      setNewArea({ name: "", description: "" });
      toast({ title: "Success", description: "Area created successfully." });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create area",
        variant: "destructive",
      });
    },
  });

  const updateAreaMutation = useMutation({
    mutationFn: async (data: { id: string; name: string; description: string }) => {
      return await apiRequest("PUT", `/api/areas/${data.id}`, { name: data.name, description: data.description });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/areas"] });
      setIsEditAreaOpen(false);
      setEditArea(null);
      toast({ title: "Success", description: "Area updated successfully." });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update area",
        variant: "destructive",
      });
    },
  });

  const createSubdivisionMutation = useMutation({
    mutationFn: async (data: { areaId: string; name: string }) => {
      return await apiRequest("POST", "/api/subdivisions", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subdivisions", selectedArea?.id] });
      setIsAddSubdivisionOpen(false);
      setNewSubdivision({ name: "" });
      toast({ title: "Success", description: "Subdivision created successfully." });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create subdivision",
        variant: "destructive",
      });
    },
  });

  const deleteAreaMutation = useMutation({
    mutationFn: async (areaId: string) => {
      return await apiRequest("DELETE", `/api/areas/${areaId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/areas"] });
      if (selectedArea) setSelectedArea(null);
      toast({ title: "Success", description: "Area deleted successfully." });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete area",
        variant: "destructive",
      });
    },
  });

  if (areasLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground">Loading areas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-semibold" data-testid="text-areas-title">
            Maintenance Areas
          </h1>
          <p className="text-muted-foreground">
            Organize maintenance by areas and subdivisions
          </p>
        </div>
        <Dialog open={isAddAreaOpen} onOpenChange={setIsAddAreaOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-area">
              <Plus className="w-4 h-4 mr-2" />
              Add Area
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Area</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Name</label>
                <Input
                  value={newArea.name}
                  onChange={(e) => setNewArea({ ...newArea, name: e.target.value })}
                  placeholder="e.g., Grounds & Landscaping"
                  data-testid="input-area-name"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Description</label>
                <Textarea
                  value={newArea.description}
                  onChange={(e) =>
                    setNewArea({ ...newArea, description: e.target.value })
                  }
                  placeholder="Brief description of this area"
                  data-testid="textarea-area-description"
                />
              </div>
              <Button
                onClick={() => createAreaMutation.mutate(newArea)}
                disabled={!newArea.name || createAreaMutation.isPending}
                className="w-full"
                data-testid="button-submit-area"
              >
                Create Area
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={isEditAreaOpen} onOpenChange={(open) => {
          setIsEditAreaOpen(open);
          if (!open) setEditArea(null);
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Area</DialogTitle>
            </DialogHeader>
            {editArea && (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Name</label>
                  <Input
                    value={editArea.name}
                    onChange={(e) => setEditArea({ ...editArea, name: e.target.value })}
                    placeholder="e.g., Grounds & Landscaping"
                    data-testid="input-edit-area-name"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Description</label>
                  <Textarea
                    value={editArea.description}
                    onChange={(e) => setEditArea({ ...editArea, description: e.target.value })}
                    placeholder="Brief description of this area"
                    data-testid="textarea-edit-area-description"
                  />
                </div>
                <Button
                  onClick={() => updateAreaMutation.mutate(editArea)}
                  disabled={!editArea.name || updateAreaMutation.isPending}
                  className="w-full"
                  data-testid="button-submit-edit-area"
                >
                  Update Area
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Areas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {areas.map((area) => (
                <div
                  key={area.id}
                  className={`p-3 rounded-lg border hover-elevate active-elevate-2 cursor-pointer ${
                    selectedArea?.id === area.id ? "bg-muted" : ""
                  }`}
                  onClick={() => setSelectedArea(area)}
                  data-testid={`area-${area.id}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium truncate">{area.name}</h3>
                      <p className="text-sm text-muted-foreground truncate">
                        {area.description}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditArea(area);
                          setIsEditAreaOpen(true);
                        }}
                        data-testid={`button-edit-area-${area.id}`}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteAreaMutation.mutate(area.id);
                        }}
                        data-testid={`button-delete-area-${area.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2">
              <FolderTree className="w-4 h-4" />
              {selectedArea ? selectedArea.name : "Select an area"}
            </CardTitle>
            {selectedArea && (
              <Dialog open={isAddSubdivisionOpen} onOpenChange={setIsAddSubdivisionOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" data-testid="button-add-subdivision">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Subdivision
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Subdivision to {selectedArea.name}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium">Name</label>
                      <Input
                        value={newSubdivision.name}
                        onChange={(e) =>
                          setNewSubdivision({ name: e.target.value })
                        }
                        placeholder="e.g., West Campus"
                        data-testid="input-subdivision-name"
                      />
                    </div>
                    <Button
                      onClick={() =>
                        createSubdivisionMutation.mutate({
                          areaId: selectedArea.id,
                          ...newSubdivision,
                        })
                      }
                      disabled={
                        !newSubdivision.name || createSubdivisionMutation.isPending
                      }
                      className="w-full"
                      data-testid="button-submit-subdivision"
                    >
                      Create Subdivision
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </CardHeader>
          <CardContent>
            {!selectedArea ? (
              <div className="text-center py-12 text-muted-foreground">
                Select an area to view and manage subdivisions
              </div>
            ) : subdivisions.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                No subdivisions yet. Add one to get started.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {subdivisions.map((subdivision) => (
                  <div
                    key={subdivision.id}
                    className="p-4 rounded-lg border"
                    data-testid={`subdivision-${subdivision.id}`}
                  >
                    <h3 className="font-medium">{subdivision.name}</h3>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
