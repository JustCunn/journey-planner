import { useState, useEffect } from "react";
import { useRef } from "react";
import { LoadScript, Autocomplete } from "@react-google-maps/api";

const libraries = ["places"]; // Required for autocomplete

type Leg = {
  id: string;
  mode: string;
  aimedStartTime: string;
  aimedEndTime: string;
  distance: number;
  duration: number;
  line: {
    publicCode: string;
    name: string;
    id: string;
    presentation: {
      color: string;
    };
  };
  authority: {
    name: string;
    id: string;
  };
  fromPlace: {
    name: string;
    quay: {
      id: string;
    };
  };
  toPlace: {
    name: string;
    quay: {
      id: string;
    };
  };
};

type Trip = {
  distance: number;
  aimedStartTime: string;
  aimedEndTime: string;
  duration: number;
  legs: Leg[];
};

const PlanPage = () => {
  const [trips, setTrips] = useState<[]>([]);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    null
  );

  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  const handlePlaceChanged = () => {
    const place = autocompleteRef.current?.getPlace();
    if (place?.geometry?.location) {
      const lat = place.geometry.location.lat();
      const lng = place.geometry.location.lng();
      setCoords({ lat, lng });
    }
  };

  const handleClick = async () => {
    if (!coords) return;
    const res = await fetchRoutes(coords);

    setTrips(res?.data?.trip?.tripPatterns);
  };

  return (
    <div>
      <LoadScript
        googleMapsApiKey="AIzaSyAMr3aTdQeAG5PCac27cF_eThMVLd05Kiw"
        libraries={libraries}
      >
        <Autocomplete
          onLoad={(autocomplete) => (autocompleteRef.current = autocomplete)}
          onPlaceChanged={handlePlaceChanged}
          options={{ componentRestrictions: { country: "ie" } }}
        >
          <input
            type="text"
            placeholder="Search address"
            className="p-2 border rounded w-full"
          />
        </Autocomplete>
      </LoadScript>
      <input />
      <button onClick={handleClick}>Click Me</button>
      {trips &&
        trips.map((item, idx) => {
          return <Trip key={idx} trip={item as Trip} />;
        })}
    </div>
  );
};

const Trip = ({ trip }: { trip: Trip }) => {
  useEffect(() => {
    console.log(trip);
  });
  return (
    <div
      style={{
        backgroundColor: "blue",
        margin: "10px",
        color: "white",
      }}
    >
      <div>{trip?.distance}</div>
      <div>
        {new Date(trip?.aimedStartTime).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })}
      </div>
      <div>
        {new Date(trip?.aimedEndTime).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })}
      </div>
    </div>
  );
};

const fetchRoutes = async (coords: { lat: number; lng: number }) => {
  const url = "http://20.56.36.65:8080/otp/transmodel/v3";

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query: `query trip($dateTime: DateTime, $from: Location!,$to: Location!) {
        trip(
          dateTime: $dateTime
          from: $from
          to: $to
        ) {
          tripPatterns {
            aimedStartTime
            aimedEndTime
            duration
            distance
            legs {
              id
              mode
              aimedStartTime
              aimedEndTime
              distance
              duration
              fromPlace {
                name
                quay {
                  id
                }
              }
              toPlace {
                name
                quay {
                  id
                }
              }
              line {
                publicCode
                name
                id
                presentation {
                  colour
                }
              }
              authority {
                name
                id
              }
            }
          }
        }
      }`,
      variables: {
        from: {
          coordinates: {
            latitude: coords.lat,
            longitude: coords.lng,
          },
        },
        to: {
          coordinates: {
            latitude: 53.267723673050085,
            longitude: -6.198455060968001,
          },
        },
        dateTime: "2025-06-24T07:30:00+01:00",
      },
      operationName: "trip",
    }),
  });

  const result = await res.json();
  return result;
};

export default PlanPage;
