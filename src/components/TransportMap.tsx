import { useEffect, useState } from "react";
import { Layer, Map, Source } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";

type VehicleProperties = {
  id?: string;
  routeId?: string;
  bearing?: number;
  speed?: number;
};

type VehicleFeature = {
  type: "Feature";
  geometry: {
    type: "Point";
    coordinates: [number, number];
  };
  properties: VehicleProperties | null;
};

type VehicleCollection = {
  type: "FeatureCollection";
  features: VehicleFeature[];
};

const isVehicleCollection = (value: unknown): value is VehicleCollection => {
  if (!value || typeof value !== "object") return false;

  const collection = value as {
    type?: unknown;
    features?: unknown;
  };

  return (
    collection.type === "FeatureCollection" &&
    Array.isArray(collection.features)
  );
};

const normalizeVehicleData = (value: unknown): VehicleCollection => {
  const collection = isVehicleCollection(value)
    ? value
    : value &&
        typeof value === "object" &&
        isVehicleCollection((value as { data?: unknown }).data)
      ? (value as { data: VehicleCollection }).data
      : null;

  if (!collection) {
    throw new Error("Backend response is not a GeoJSON FeatureCollection");
  }

  const features = collection.features.filter((feature) => {
    if (
      !feature ||
      typeof feature !== "object" ||
      (feature as { type?: unknown }).type !== "Feature"
    ) {
      return false;
    }

    const geometry = (feature as {
      geometry?: { type?: unknown; coordinates?: unknown };
    }).geometry;
    if (!geometry || geometry.type !== "Point") return false;

    const coordinates = geometry.coordinates;
    if (
      !Array.isArray(coordinates) ||
      coordinates.length < 2 ||
      typeof coordinates[0] !== "number" ||
      typeof coordinates[1] !== "number"
    ) {
      return false;
    }

    const longitude = coordinates[0];
    const latitude = coordinates[1];
    return (
      Number.isFinite(longitude) &&
      Number.isFinite(latitude) &&
      longitude >= -180 &&
      longitude <= 180 &&
      latitude >= -90 &&
      latitude <= 90
    );
  });

  return {
    type: "FeatureCollection",
    features: features as VehicleFeature[],
  };
};

// Define how the vehicles should look.
// Circles don't require external image sprites, making them bulletproof for raster maps.
// const vehicleLayer = {
//   id: "live-vehicles",
//   type: "circle",
//   source: "tfi-vehicles",
//   paint: {
//     "circle-radius": 100,
//     "circle-color": "#00cc66",
//     "circle-opacity": 0.95,
//     "circle-stroke-width": 2,
//     "circle-stroke-color": "#ffffff",
//   },
// } as const;

const vehicleLayer = {
  id: 'live-vehicles',
  type: 'circle',
  // IMPORTANT: Remove the `source: 'tfi-vehicles'` line here. 
  // react-map-gl injects it automatically when nested inside <Source>.
  paint: {
    'circle-radius': 15, // Made it huge
    'circle-color': '#ff0000', // Made it red
    'circle-stroke-width': 3,
    'circle-stroke-color': '#ffffff'
  }
};

const OSM_STYLE = {
  version: 8 as const,
  sources: {
    osm: {
      type: "raster" as const,
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution: "&copy; OpenStreetMap Contributors",
    },
  },
  layers: [
    {
      id: "osm",
      type: "raster" as const,
      source: "osm",
    },
  ],
};

export default function TransportMap() {
  const [vehicleData, setVehicleData] = useState<VehicleCollection | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchVehicles = async () => {
      try {
        const response = await fetch("http://localhost:3000/api/vehicles");
        if (!response.ok) {
          throw new Error(`Vehicle backend returned HTTP ${response.status}`);
        }

        const geojson = normalizeVehicleData(await response.json());
        console.log(geojson);
        setVehicleData(geojson);
        setError(null);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown vehicle error";
        console.error("Failed to fetch TFI data", error);
        setError(message);
      }
    };

    fetchVehicles();
    const interval = setInterval(fetchVehicles, 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ width: "100vw", height: "100vh" }}>
      <Map
        minZoom={6}
        initialViewState={{
          longitude: -6.2603, // Dublin center
          latitude: 53.3498,
          zoom: 8,
        }}
        maxBounds={[-11.5, 51.2, -5.0, 55.5]}
        mapStyle={OSM_STYLE}
      >
        {/* If we have data, draw the vehicles on the map */}
        {vehicleData && (
          <Source id="tfi-vehicles" type="geojson" data={vehicleData}>
            <Layer {...vehicleLayer} />
          </Source>
        )}
      </Map>
      {error && (
        <p
          style={{
            position: "absolute",
            top: 12,
            left: 12,
            zIndex: 1,
            margin: 0,
            padding: "8px 12px",
            color: "#8b0000",
            background: "#fff",
          }}
        >
          Unable to load vehicles: {error}
        </p>
      )}
      {vehicleData && vehicleData.features.length === 0 && !error && (
        <p
          style={{
            position: "absolute",
            top: 12,
            left: 12,
            zIndex: 1,
            margin: 0,
            padding: "8px 12px",
            background: "#fff",
          }}
        >
          No vehicle positions were returned.
        </p>
      )}
    </div>
  );
}