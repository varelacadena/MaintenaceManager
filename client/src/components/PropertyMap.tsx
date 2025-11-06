import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-draw/dist/leaflet.draw.css";
import "leaflet-draw";
import type { Property } from "@shared/schema";

interface PropertyMapProps {
  properties: Property[];
  onPropertySelect?: (property: Property) => void;
  onShapeCreated?: (coordinates: any, type: string) => void;
  onShapeEdited?: (propertyId: string, coordinates: any) => void;
  onShapeDeleted?: (propertyId: string) => void;
  selectedPropertyId?: string | null;
  editable?: boolean;
  center?: [number, number];
  zoom?: number;
}

export default function PropertyMap({
  properties,
  onPropertySelect,
  onShapeCreated,
  onShapeEdited,
  onShapeDeleted,
  selectedPropertyId,
  editable = false,
  center = [40.7128, -74.0060],
  zoom = 15,
}: PropertyMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const layersRef = useRef<Map<string, L.Layer>>(new Map());
  const drawnItemsRef = useRef<L.FeatureGroup | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: center,
      zoom: zoom,
      zoomControl: true,
    });

    const satellite = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
      attribution: "Tiles &copy; Esri",
      maxZoom: 19,
    });

    const streets = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    });

    satellite.addTo(map);

    const baseMaps = {
      "Satellite": satellite,
      "Streets": streets,
    };

    L.control.layers(baseMaps).addTo(map);

    const drawnItems = new L.FeatureGroup();
    map.addLayer(drawnItems);
    drawnItemsRef.current = drawnItems;

    if (editable) {
      const drawControl = new L.Control.Draw({
        position: "topright",
        draw: {
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
          marker: {},
          polyline: false,
          circlemarker: false,
        },
        edit: {
          featureGroup: drawnItems,
          remove: true,
        },
      });

      map.addControl(drawControl);

      map.on(L.Draw.Event.CREATED, (event: any) => {
        const layer = event.layer;
        const type = event.layerType;
        
        drawnItems.addLayer(layer);

        let coordinates;
        if (type === "marker") {
          coordinates = {
            type: "Point",
            coordinates: [layer.getLatLng().lng, layer.getLatLng().lat],
          };
        } else if (type === "circle") {
          coordinates = {
            type: "Circle",
            coordinates: [layer.getLatLng().lng, layer.getLatLng().lat],
            radius: layer.getRadius(),
          };
        } else if (type === "polygon" || type === "rectangle") {
          const latlngs = layer.getLatLngs()[0];
          coordinates = {
            type: "Polygon",
            coordinates: [latlngs.map((ll: L.LatLng) => [ll.lng, ll.lat])],
          };
        }

        if (onShapeCreated && coordinates) {
          onShapeCreated(coordinates, type);
        }
      });

      map.on(L.Draw.Event.EDITED, (event: any) => {
        const layers = event.layers;
        layers.eachLayer((layer: any) => {
          const propertyId = layer.options.propertyId;
          if (!propertyId) return;

          let coordinates;
          if (layer instanceof L.Marker) {
            coordinates = {
              type: "Point",
              coordinates: [layer.getLatLng().lng, layer.getLatLng().lat],
            };
          } else if (layer instanceof L.Circle) {
            coordinates = {
              type: "Circle",
              coordinates: [layer.getLatLng().lng, layer.getLatLng().lat],
              radius: layer.getRadius(),
            };
          } else if (layer instanceof L.Polygon) {
            const latlngs = layer.getLatLngs()[0] as L.LatLng[];
            coordinates = {
              type: "Polygon",
              coordinates: [latlngs.map((ll: L.LatLng) => [ll.lng, ll.lat])],
            };
          }

          if (onShapeEdited && coordinates) {
            onShapeEdited(propertyId, coordinates);
          }
        });
      });

      map.on(L.Draw.Event.DELETED, (event: any) => {
        const layers = event.layers;
        layers.eachLayer((layer: any) => {
          const propertyId = layer.options.propertyId;
          if (propertyId && onShapeDeleted) {
            onShapeDeleted(propertyId);
          }
        });
      });
    }

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current || !drawnItemsRef.current) return;

    const drawnItems = drawnItemsRef.current;
    drawnItems.clearLayers();
    layersRef.current.clear();

    properties.forEach((property) => {
      const coords = property.coordinates as any;
      if (!coords) return;

      let layer: L.Layer | null = null;

      const isSelected = property.id === selectedPropertyId;
      const color = isSelected ? "#ef4444" : getColorForType(property.type);
      const weight = isSelected ? 3 : 2;
      const opacity = isSelected ? 1 : 0.7;

      if (coords.type === "Point") {
        const [lng, lat] = coords.coordinates;
        const icon = L.divIcon({
          className: "custom-map-marker",
          html: `<div style="background-color: ${color}; width: 24px; height: 24px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
          iconSize: [24, 24],
          iconAnchor: [12, 12],
        });
        layer = L.marker([lat, lng], { icon, propertyId: property.id } as any);
      } else if (coords.type === "Circle") {
        const [lng, lat] = coords.coordinates;
        layer = L.circle([lat, lng], {
          radius: coords.radius,
          color: color,
          fillColor: color,
          fillOpacity: opacity * 0.5,
          weight: weight,
          propertyId: property.id,
        } as any);
      } else if (coords.type === "Polygon") {
        const latlngs = coords.coordinates[0].map(([lng, lat]: number[]) => [lat, lng] as [number, number]);
        layer = L.polygon(latlngs, {
          color: color,
          fillColor: color,
          fillOpacity: opacity * 0.5,
          weight: weight,
          propertyId: property.id,
        } as any);
      }

      if (layer) {
        const openTasksCount = 0;

        layer.bindPopup(`
          <div style="min-width: 200px;">
            <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600;">${property.name}</h3>
            <div style="color: #666; font-size: 14px; margin-bottom: 8px;">
              <div><strong>Type:</strong> ${property.type}</div>
              ${property.address ? `<div><strong>Address:</strong> ${property.address}</div>` : ""}
              ${property.lastWorkDate ? `<div><strong>Last Work:</strong> ${new Date(property.lastWorkDate).toLocaleDateString()}</div>` : ""}
              <div><strong>Open Tasks:</strong> ${openTasksCount}</div>
            </div>
            <button 
              id="view-property-${property.id}" 
              style="background-color: #3b82f6; color: white; padding: 6px 12px; border: none; border-radius: 4px; cursor: pointer; width: 100%;"
            >
              View Details
            </button>
          </div>
        `);

        layer.on("popupopen", () => {
          const button = document.getElementById(`view-property-${property.id}`);
          if (button && onPropertySelect) {
            button.onclick = () => {
              onPropertySelect(property);
              mapRef.current?.closePopup();
            };
          }
        });

        layer.on("click", () => {
          if (onPropertySelect && !editable) {
            onPropertySelect(property);
          }
        });

        drawnItems.addLayer(layer);
        layersRef.current.set(property.id, layer);
      }
    });

    if (properties.length > 0 && selectedPropertyId) {
      const selectedLayer = layersRef.current.get(selectedPropertyId);
      if (selectedLayer) {
        const bounds = (selectedLayer as any).getBounds?.() || (selectedLayer as any).getLatLng?.();
        if (bounds) {
          if (bounds.lat !== undefined) {
            mapRef.current?.setView(bounds, 17);
          } else {
            mapRef.current?.fitBounds(bounds, { padding: [50, 50] });
          }
        }
      }
    } else if (properties.length > 0) {
      const bounds = drawnItems.getBounds();
      if (bounds.isValid()) {
        mapRef.current?.fitBounds(bounds, { padding: [50, 50] });
      }
    }
  }, [properties, selectedPropertyId, editable, onPropertySelect]);

  return (
    <div
      ref={mapContainerRef}
      style={{ width: "100%", height: "100%", minHeight: "500px" }}
      data-testid="property-map"
    />
  );
}

function getColorForType(type: string): string {
  const colors: Record<string, string> = {
    building: "#3b82f6",
    lawn: "#22c55e",
    parking: "#64748b",
    recreation: "#f59e0b",
    utility: "#8b5cf6",
    road: "#6b7280",
    other: "#94a3b8",
  };
  return colors[type] || colors.other;
}
