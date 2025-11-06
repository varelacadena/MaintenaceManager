import { useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, FeatureGroup, Popup, useMap } from "react-leaflet";
import { DraftControl } from "react-leaflet-draft";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-draw/dist/leaflet.draw.css";
import type { Property } from "@shared/schema";

interface PropertyMapProps {
  properties: Property[];
  onPropertySelect?: (property: Property) => void;
  onShapeCreated?: (coordinates: any, type: string) => void;
  onShapeEdited?: (propertyId: string, coordinates: any) => void;
  onShapeDeleted?: (propertyId: string) => void;
  selectedPropertyId?: string | null;
  editable?: boolean;
}

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
  selectedPropertyId,
}: {
  properties: Property[];
  onPropertySelect?: (property: Property) => void;
  selectedPropertyId?: string | null;
}) {
  const map = useMap();

  useEffect(() => {
    const layers: L.Layer[] = [];

    properties.forEach((property) => {
      if (!property.coordinates) return;

      const color = PropertyTypeColors[property.type] || PropertyTypeColors.other;
      const isSelected = property.id === selectedPropertyId;

      let layer: L.Layer | null = null;

      if (property.coordinates.type === "Point") {
        const [lng, lat] = property.coordinates.coordinates;
        layer = L.marker([lat, lng]);
      } else if (property.coordinates.type === "Circle") {
        const [lng, lat] = property.coordinates.coordinates;
        const radius = property.coordinates.radius || 100;
        layer = L.circle([lat, lng], {
          radius,
          color,
          weight: isSelected ? 3 : 2,
          fillOpacity: 0.3,
        });
      } else if (property.coordinates.type === "Polygon") {
        const coords = property.coordinates.coordinates[0].map(([lng, lat]: [number, number]) => [
          lat,
          lng,
        ]);
        layer = L.polygon(coords as L.LatLngExpression[], {
          color,
          weight: isSelected ? 3 : 2,
          fillOpacity: 0.3,
        });
      } else if (property.coordinates.type === "Rectangle") {
        const [[lng1, lat1], [lng2, lat2]] = property.coordinates.coordinates;
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
        const popupContent = `
          <div>
            <h3 style="font-weight: bold; margin-bottom: 4px;">${property.name}</h3>
            <p style="margin: 2px 0; font-size: 12px;"><strong>Type:</strong> ${property.type}</p>
            ${property.address ? `<p style="margin: 2px 0; font-size: 12px;"><strong>Address:</strong> ${property.address}</p>` : ""}
            ${property.lastWorkDate ? `<p style="margin: 2px 0; font-size: 12px;"><strong>Last Work:</strong> ${new Date(property.lastWorkDate).toLocaleDateString()}</p>` : ""}
          </div>
        `;

        layer.bindPopup(popupContent);

        if (onPropertySelect) {
          layer.on("click", () => {
            onPropertySelect(property);
          });
        }

        layer.addTo(map);
        layers.push(layer);

        if (isSelected && property.coordinates.type !== "Point") {
          const bounds = layer.getBounds();
          if (bounds) {
            map.fitBounds(bounds, { padding: [50, 50] });
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
  onShapeCreated?: (coordinates: any, type: string) => void;
}) {
  const handleCreated = useRef((e: any) => {
    try {
      const layer = e.layer;
      if (!layer) {
        console.error("No layer in draw event");
        return;
      }

      let coordinates: any = null;
      let shapeType = "";

      if (layer instanceof L.Marker) {
        const latlng = layer.getLatLng();
        coordinates = {
          type: "Point",
          coordinates: [latlng.lng, latlng.lat],
        };
        shapeType = "marker";
      } else if (layer instanceof L.Circle) {
        const latlng = layer.getLatLng();
        coordinates = {
          type: "Circle",
          coordinates: [latlng.lng, latlng.lat],
          radius: layer.getRadius(),
        };
        shapeType = "circle";
      } else if (layer instanceof L.Rectangle) {
        const bounds = layer.getBounds();
        coordinates = {
          type: "Rectangle",
          coordinates: [
            [bounds.getSouthWest().lng, bounds.getSouthWest().lat],
            [bounds.getNorthEast().lng, bounds.getNorthEast().lat],
          ],
        };
        shapeType = "rectangle";
      } else if (layer instanceof L.Polygon) {
        const latlngs = layer.getLatLngs()[0] as L.LatLng[];
        coordinates = {
          type: "Polygon",
          coordinates: [latlngs.map((ll: L.LatLng) => [ll.lng, ll.lat])],
        };
        shapeType = "polygon";
      }

      if (coordinates && onShapeCreated) {
        onShapeCreated(coordinates, shapeType);
      }
    } catch (error) {
      console.error("Error in handleCreated:", error);
    }
  }).current;

  useEffect(() => {
    if (onShapeCreated) {
      handleCreated.onShapeCreated = onShapeCreated;
    }
  }, [onShapeCreated]);

  if (!editable || !onShapeCreated) return null;

  const drawOptions = useRef({
    polygon: {
      allowIntersection: false,
      showArea: true,
      shapeOptions: {
        color: "#3b82f6",
        weight: 2,
      },
    },
    rectangle: {
      shapeOptions: {
        color: "#3b82f6",
        weight: 2,
      },
    },
    circle: {
      shapeOptions: {
        color: "#3b82f6",
        weight: 2,
      },
    },
    marker: true,
    polyline: false,
    circlemarker: false,
  }).current;

  const editOptions = useRef({
    edit: false,
    remove: false,
  }).current;

  return (
    <FeatureGroup>
      <DraftControl
        position="topright"
        draw={drawOptions}
        edit={editOptions}
        onCreated={handleCreated}
      />
    </FeatureGroup>
  );
}

export default function PropertyMap({
  properties,
  onPropertySelect,
  onShapeCreated,
  selectedPropertyId,
  editable = false,
}: PropertyMapProps) {
  const defaultCenter: [number, number] = [38.33346473042104, -78.0992983903181];
  const defaultZoom = 14;

  const center =
    properties.length > 0 && properties[0].coordinates
      ? properties[0].coordinates.type === "Point"
        ? [properties[0].coordinates.coordinates[1], properties[0].coordinates.coordinates[0]] as [
            number,
            number,
          ]
        : properties[0].coordinates.type === "Circle"
          ? [properties[0].coordinates.coordinates[1], properties[0].coordinates.coordinates[0]] as [
              number,
              number,
            ]
          : defaultCenter
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
          selectedPropertyId={selectedPropertyId}
        />
        <DrawingControl editable={editable} onShapeCreated={onShapeCreated} />
      </MapContainer>
    </div>
  );
}
