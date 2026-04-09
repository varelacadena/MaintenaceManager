import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Edit,
  Trash2,
  DoorOpen,
  Search,
} from "lucide-react";
import type { PropertyDetailContext } from "./usePropertyDetail";

interface PropertySpacesTabProps {
  ctx: PropertyDetailContext;
}

export function PropertySpacesTab({ ctx }: PropertySpacesTabProps) {
  const {
    id,
    spaceSearch, setSpaceSearch,
    setEditingSpace, setIsSpaceDialogOpen,
    setSelectedSpaceId,
    spaceForm,
    canEdit,
    equipment,
    filteredSpaces,
    handleEditSpace, handleDeleteSpace,
  } = ctx;

  return (
    <>
      <div className="flex items-center gap-2 mb-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search spaces..."
            value={spaceSearch}
            onChange={(e) => setSpaceSearch(e.target.value)}
            className="pl-9"
            data-testid="input-search-spaces"
          />
        </div>
        {canEdit && (
          <Button
            size="sm"
            onClick={() => {
              setEditingSpace(null);
              spaceForm.reset({ propertyId: id || "", name: "", description: "", floor: "" });
              setIsSpaceDialogOpen(true);
            }}
            data-testid="button-add-space"
          >
            <Plus className="w-4 h-4 mr-1" />
            Add Space
          </Button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {filteredSpaces.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <DoorOpen className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">{spaceSearch ? "No spaces match your search" : "No spaces defined yet"}</p>
            {canEdit && !spaceSearch && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setEditingSpace(null);
                  spaceForm.reset({ propertyId: id || "" });
                  setIsSpaceDialogOpen(true);
                }}
                data-testid="button-add-first-space"
              >
                Add your first space
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-1">
            {filteredSpaces.map((space) => {
              const spaceEquipCount = equipment.filter(e => e.spaceId === space.id).length;
              return (
                <div
                  key={space.id}
                  className="flex items-center justify-between gap-2 p-2 rounded-md border hover-elevate cursor-pointer"
                  onClick={() => {
                    setSelectedSpaceId(space.id);
                  }}
                  data-testid={`card-space-${space.id}`}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <DoorOpen className="w-4 h-4 text-primary flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm truncate">{space.name}</span>
                        {space.floor && <Badge variant="outline">{space.floor}</Badge>}
                      </div>
                      {space.description && (
                        <p className="text-xs text-muted-foreground truncate">{space.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs text-muted-foreground whitespace-nowrap">{spaceEquipCount} items</span>
                    {canEdit && (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => { e.stopPropagation(); handleEditSpace(space); }}
                          data-testid={`button-edit-space-${space.id}`}
                        >
                          <Edit className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => { e.stopPropagation(); handleDeleteSpace(space.id); }}
                          data-testid={`button-delete-space-${space.id}`}
                        >
                          <Trash2 className="w-3 h-3 text-destructive" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
