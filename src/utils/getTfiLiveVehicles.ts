import GtfsRealtimeBindings from 'gtfs-realtime-bindings';

export async function getLiveTfiVehicles() {
  const url = 'https://api.nationaltransport.ie/gtfsr/v2/gtfsr';
  
  // 1. Fetch the binary protocol buffer
  const response = await fetch(url, {
    headers: {
      'Cache-Control': 'no-cache',
      'Ocp-Apim-Subscription-Key': "1e44806c9ade48789ba0e91a656c7207" // Your NTA portal key
    }
  });

  if (!response.ok) {
    throw new Error(`TFI API error: ${response.status}`);
  }

  // 2. Read the response as a raw ArrayBuffer
  const buffer = await response.arrayBuffer();

  // 3. Decode the binary data using the official bindings
  const feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(
    new Uint8Array(buffer)
  );

  // 4. Transform into a GeoJSON FeatureCollection for MapLibre
  const geojson = {
    type: 'FeatureCollection',
    features: feed.entity
      // Only grab entities that contain actual vehicle positions
      .filter(entity => entity.vehicle && entity.vehicle.position)
      .map(entity => {
        const vehicle = entity.vehicle;
        
        return {
          type: 'Feature',
          geometry: {
            type: 'Point',
            // GeoJSON requires [longitude, latitude] order
            coordinates: [
              vehicle?.position?.longitude, 
              vehicle?.position?.latitude
            ] 
          },
          properties: {
            id: vehicle?.vehicle?.id || entity.id,
            routeId: vehicle?.trip?.routeId,
            // Bearing is crucial so you can rotate the bus icon on the map!
            bearing: vehicle?.position?.bearing, 
            speed: vehicle?.position?.speed
          }
        };
      })
  };

  return geojson;
}