"use client";

import React, { useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-draw/dist/leaflet.draw.css";

const DEFAULT_CENTER: [number, number] = [51.5074, -0.1278];
const DEFAULT_ZOOM = 13;

const createIcon = (color: string = "#ef4444") => {
  return L.divIcon({
    className: "custom-marker-icon",
    html: `<div style="background:${color};width:24px;height:32px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);display:flex;align-items:center;justify-content:center;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);"><span style="transform:rotate(45deg);font-size:12px;">📍</span></div>`,
    iconSize: [24, 32],
    iconAnchor: [12, 32],
    popupAnchor: [0, -32],
  });
};

const stadiumIcon = createIcon("#3b82f6");
const hotelIcon = createIcon("#f59e0b");
const foodIcon = createIcon("#10b981");

export interface MapMarker {
  lat: number;
  lng: number;
  name: string;
  type: "stadium" | "hotel" | "food" | "poi";
  address?: string;
  rating?: number;
  distance_miles?: number;
  phone?: string;
  website?: string;
  stars?: string | number;
  amenities?: string[];
}

interface InteractiveMapProps {
  center?: [number, number];
  zoom?: number;
  markers: MapMarker[];
  onMarkerClick?: (marker: MapMarker) => void;
  stadiumNames?: string[];
  loading?: boolean;
}

export const InteractiveMap: React.FC<InteractiveMapProps> = ({
  center = DEFAULT_CENTER,
  zoom = DEFAULT_ZOOM,
  markers = [],
  onMarkerClick,
  loading = false,
}) => {
  const mapRef = useRef<L.Map>(null);
  const [mapReady, setMapReady] = useState(false);

  const handleMapClick = (e: L.LeafletMouseEvent) => {
    if (onMarkerClick) {
      const clickedMarker = markers.find(
        (m) => Math.abs(m.lat - e.latlng.lat) < 0.01 && Math.abs(m.lng - e.latlng.lng) < 0.01
      );
      if (clickedMarker) {
        onMarkerClick(clickedMarker);
      }
    }
  };

  return (
    <div className="relative w-full h-full rounded-2xl overflow-hidden border border-zinc-800/80">
      {loading && (
        <div className="absolute top-4 left-4 z-[1000] bg-black/70 text-white px-4 py-2 rounded-lg text-sm font-mono">
          Loading map...
        </div>
      )}
      <MapContainer
        center={center}
        zoom={zoom}
        className="h-full w-full"
        zoomControl={true}
        whenReady={() => setMapReady(true)}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {markers.map((marker, idx) => {
          const icon =
            marker.type === "stadium"
              ? stadiumIcon
              : marker.type === "food"
              ? foodIcon
              : hotelIcon;
          return (
            <Marker
              key={idx}
              position={[marker.lat, marker.lng]}
              icon={icon}
              eventHandlers={{ click: () => onMarkerClick?.(marker) }}
            >
              <Popup>
                <div className="min-w-[200px] p-1">
                  <h3 className="font-bold text-sm text-zinc-900">{marker.name}</h3>
                  {marker.address && (
                    <p className="text-xs text-zinc-600 mt-1">{marker.address}</p>
                  )}
                  {marker.distance_miles !== undefined && (
                    <p className="text-xs text-zinc-500 mt-1">
                      📍 {marker.distance_miles} miles away
                    </p>
                  )}
                  {marker.rating && (
                    <p className="text-xs text-zinc-500 mt-1">
                      ⭐ {marker.rating}/5
                    </p>
                  )}
                  {marker.stars && (
                    <p className="text-xs text-zinc-500 mt-1">
                      {marker.stars} ★
                    </p>
                  )}
                  {marker.amenities && marker.amenities.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {marker.amenities.slice(0, 4).map((a, i) => (
                        <span
                          key={i}
                          className="text-[10px] bg-zinc-100 text-zinc-700 px-2 py-0.5 rounded-full"
                        >
                          {a}
                        </span>
                      ))}
                    </div>
                  )}
                  {marker.phone && (
                    <p className="text-xs text-zinc-500 mt-1">📞 {marker.phone}</p>
                  )}
                  {marker.website && (
                    <a
                      href={marker.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 underline mt-1 block"
                    >
                      Visit website
                    </a>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
};
