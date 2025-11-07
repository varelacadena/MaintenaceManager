import { useEffect, useRef } from "react";
import { MapContainer, TileLayer, FeatureGroup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-draw";
import "leaflet-draw/dist/leaflet.draw.css";
import type { Property } from "@shared/schema";

// Add custom CSS for tooltips
const style = document.createElement('style');
style.textContent = `
  .property-tooltip {
    background-color: rgba(0, 0, 0, 0.8) !important;
    border: none !important;
    color: white !important;
    font-weight: 500 !important;
    padding: 4px 8px !important;
    border-radius: 4px !important;
    font-size: 13px !important;
  }
  .property-tooltip::before {
    border-top-color: rgba(0, 0, 0, 0.8) !important;
  }
`;
document.head.appendChild(style);

interface PropertyMapProps {
  properties: Property[];
  onPropertySelect?: (property: Property) => void;
  onShapeCreated?: (coordinates: any, type: string) => void;
  onShapeEdited?: (propertyId: string, coordinates: any) => void;
  onPropertyDelete?: (propertyId: string) => void;
  selectedPropertyId?: string | null;
  editable?: boolean;
}

// @ts-ignore - Leaflet icon fix
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

const PropertyTypeColors: Record<string, string> = {
  building: "#3b82f6",
  lawn: "#22c55e",
  parking: "#6b7280",
  recreation: "#f59e0b",
  utility: "#8b5cf6",
  road: "#1f2937",
  other: "#64748b",
};

function PropertyLayers({
  properties,
  onPropertySelect,
  onPropertyDelete,
  selectedPropertyId,
}: {
  properties: Property[];
  onPropertySelect?: (property: Property) => void;
  onPropertyDelete?: (propertyId: string) => void;
  selectedPropertyId?: string | null;
}) {
  const map = useMap();

  useEffect(() => {
    const layers: L.Layer[] = [];

    properties.forEach((property) => {
      if (!property.coordinates) return;

      const coords = property.coordinates as any;
      const color = PropertyTypeColors[property.type] || PropertyTypeColors.other;
      const isSelected = property.id === selectedPropertyId;

      let layer: L.Layer | null = null;

      if (coords.type === "Point") {
        const [lng, lat] = coords.coordinates;
        layer = L.marker([lat, lng]);
      } else if (coords.type === "Circle") {
        const [lng, lat] = coords.coordinates;
        const radius = coords.radius || 100;
        layer = L.circle([lat, lng], {
          radius,
          color,
          weight: isSelected ? 3 : 2,
          fillOpacity: 0.3,
        });
      } else if (coords.type === "Polygon") {
        const coordsArray = coords.coordinates[0].map(([lng, lat]: [number, number]) => [
          lat,
          lng,
        ]);
        layer = L.polygon(coordsArray as L.LatLngExpression[], {
          color,
          weight: isSelected ? 3 : 2,
          fillOpacity: 0.3,
        });
      } else if (coords.type === "Rectangle") {
        const [[lng1, lat1], [lng2, lat2]] = coords.coordinates;
        layer = L.rectangle(
          [
            [lat1, lng1],
            [lat2, lng2],
          ],
          {
            color,
            weight: isSelected ? 3 : 2,
            fillOpacity: 0.3,
          }
        );
      }

      if (layer) {
        // Add tooltip with property name
        layer.bindTooltip(property.name, {
          permanent: false,
          direction: 'top',
          className: 'property-tooltip',
        });

        const popupContent = document.createElement('div');
        popupContent.innerHTML = `
          <div style="min-width: 200px;">
            <h3 style="font-weight: bold; margin-bottom: 8px;">${property.name}</h3>
            <p style="margin: 2px 0; font-size: 12px;"><strong>Type:</strong> ${property.type}</p>
            ${property.address ? `<p style="margin: 2px 0; font-size: 12px;"><strong>Address:</strong> ${property.address}</p>` : ""}
            ${property.lastWorkDate ? `<p style="margin: 2px 0; font-size: 12px;"><strong>Last Work:</strong> ${new Date(property.lastWorkDate).toLocaleDateString()}</p>` : ""}
          </div>
          ${onPropertyDelete ? `<button id="delete-property-${property.id}" style="margin-top: 8px; padding: 6px 12px; background-color: #ef4444; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px; width: 100%;">Delete Property</button>` : ""}
        `;

        // Add delete button click handler if delete function is provided
        if (onPropertyDelete) {
          const deleteBtn = popupContent.querySelector(`#delete-property-${property.id}`);
          if (deleteBtn) {
            deleteBtn.addEventListener('click', (e) => {
              e.stopPropagation();
              if (confirm(`Are you sure you want to delete "${property.name}"?`)) {
                onPropertyDelete(property.id);
                map.closePopup();
              }
            });
          }
        }

        layer.bindPopup(popupContent);

        if (onPropertySelect) {
          layer.on("click", () => {
            onPropertySelect(property);
          });
        }

        layer.addTo(map);
        layers.push(layer);

        if (isSelected) {
          if (coords.type !== "Point") {
            // @ts-ignore - layer might have getBounds
            const bounds = layer.getBounds && layer.getBounds();
            if (bounds) {
              map.fitBounds(bounds, { padding: [50, 50], maxZoom: 19 });
            }
          } else {
            // For point markers, zoom to maximum level
            const [lng, lat] = coords.coordinates;
            map.setView([lat, lng], 19);
          }
        }
      }
    });

    return () => {
      layers.forEach((layer) => map.removeLayer(layer));
    };
  }, [map, properties, onPropertySelect, selectedPropertyId]);

  return null;
}

function DrawingControl({
  editable,
  onShapeCreated,
}: {
  editable: boolean;
  onShapeCreated?: (geometry: any, type: string) => void;
}) {
  const map = useMap();
  const drawControlRef = useRef<any>(null);
  const featureGroupRef = useRef<L.FeatureGroup | null>(null);

  useEffect(() => {
    if (!editable) {
      return;
    }
    
    if (!onShapeCreated) {
      return;
    }

    // Create feature group for drawn items
    const drawnItems = new L.FeatureGroup();
    featureGroupRef.current = drawnItems;
    map.addLayer(drawnItems);

    // Initialize draw control
    // @ts-ignore - leaflet-draw types
    const drawControl = new L.Control.Draw({
      position: 'topright',
      draw: {
        polygon: {
          allowIntersection: false,
          drawError: {
            color: '#e1e676',
            message: '<strong>Error:</strong> Shape edges cannot cross!',
          },
          shapeOptions: {
            color: '#3b82f6',
          },
          showArea: false,
        },
        polyline: false,
        circle: {
          shapeOptions: {
            color: '#3b82f6',
          },
          showRadius: false,
        },
        rectangle: {
          shapeOptions: {
            color: '#3b82f6',
          },
          showArea: false,
        },
        marker: {
          icon: new L.Icon.Default(),
        },
        circlemarker: false,
      },
      edit: {
        featureGroup: drawnItems,
        edit: false,
        remove: false,
      },
    });

    drawControlRef.current = drawControl;
    map.addControl(drawControl);

    // Handle draw events
    const handleCreated = (e: any) => {
      try {
        const layer = e.layer;
        if (!layer) {
          console.error('No layer in draw event');
          return;
        }

        let coordinates: any = null;
        let shapeType = '';

        if (layer instanceof L.Marker) {
          const latlng = layer.getLatLng();
          coordinates = {
            type: 'Point',
            coordinates: [latlng.lng, latlng.lat],
          };
          shapeType = 'marker';
        } else if (layer instanceof L.Circle) {
          const latlng = layer.getLatLng();
          coordinates = {
            type: 'Circle',
            coordinates: [latlng.lng, latlng.lat],
            radius: layer.getRadius(),
          };
          shapeType = 'circle';
        } else if (layer instanceof L.Rectangle) {
          const bounds = layer.getBounds();
          coordinates = {
            type: 'Rectangle',
            coordinates: [
              [bounds.getSouthWest().lng, bounds.getSouthWest().lat],
              [bounds.getNorthEast().lng, bounds.getNorthEast().lat],
            ],
          };
          shapeType = 'rectangle';
        } else if (layer instanceof L.Polygon) {
          const latlngs = layer.getLatLngs()[0] as L.LatLng[];
          coordinates = {
            type: 'Polygon',
            coordinates: [latlngs.map((ll: L.LatLng) => [ll.lng, ll.lat])],
          };
          shapeType = 'polygon';
        }

        if (coordinates) {
          console.log('Shape created:', shapeType, coordinates);
          onShapeCreated(coordinates, shapeType);
        }
      } catch (error) {
        console.error('Error in handleCreated:', error);
      }
    };

    // @ts-ignore - leaflet-draw events
    map.on(L.Draw.Event.CREATED, handleCreated);

    return () => {
      // @ts-ignore - leaflet-draw events
      map.off(L.Draw.Event.CREATED, handleCreated);
      if (drawControlRef.current) {
        map.removeControl(drawControlRef.current);
      }
      if (featureGroupRef.current) {
        map.removeLayer(featureGroupRef.current);
      }
    };
  }, [map, editable, onShapeCreated]);

  return null;
}

export default function PropertyMap({
  properties,
  onPropertySelect,
  onShapeCreated,
  onPropertyDelete,
  selectedPropertyId,
  editable = false,
}: PropertyMapProps) {
  const defaultCenter: [number, number] = [38.33346473042104, -78.0992983903181];
  const defaultZoom = 16;

  const center =
    properties.length > 0 && properties[0].coordinates
      ? (() => {
          const coords = properties[0].coordinates as any;
          return coords.type === "Point"
            ? ([coords.coordinates[1], coords.coordinates[0]] as [number, number])
            : coords.type === "Circle"
            ? ([coords.coordinates[1], coords.coordinates[0]] as [number, number])
            : defaultCenter;
        })()
      : defaultCenter;

  return (
    <div className="w-full h-full" style={{ minHeight: "400px" }} data-testid="map-container">
      <MapContainer
        center={center}
        zoom={defaultZoom}
        style={{ width: "100%", height: "100%" }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.esri.com/">Esri</a>'
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          maxZoom={19}
        />
        <PropertyLayers
          properties={properties}
          onPropertySelect={onPropertySelect}
          onPropertyDelete={onPropertyDelete}
          selectedPropertyId={selectedPropertyId}
        />
        <DrawingControl editable={editable} onShapeCreated={onShapeCreated} />
      </MapContainer>
    </div>
  );
}