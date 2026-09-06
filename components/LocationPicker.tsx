"use client";

import { useEffect, useRef, useState } from "react";
import type { PublicConfig, SelectedLocation } from "@/lib/types";

declare global {
  interface Window {
    google?: any;
    __tcvGoogleMapsPromise?: Promise<void>;
  }
}

type Props = {
  config: PublicConfig | null;
  value?: SelectedLocation | null;
  onSelect: (location: SelectedLocation) => void;
  compact?: boolean;
};

const loadGoogleMaps = (): Promise<void> => {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.google?.maps?.places) return Promise.resolve();
  if (window.__tcvGoogleMapsPromise) return window.__tcvGoogleMapsPromise;
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY;
  if (!key) return Promise.reject(new Error("Google Maps browser key is not configured."));

  window.__tcvGoogleMapsPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&libraries=places&v=weekly`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Unable to load Google Maps."));
    document.head.appendChild(script);
  });
  return window.__tcvGoogleMapsPromise;
};

export const LocationPicker = ({ config, value, onSelect, compact = false }: Props) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<any>(null);
  const [mapsReady, setMapsReady] = useState(false);
  const [status, setStatus] = useState("");

  useEffect(() => {
    loadGoogleMaps()
      .then(() => setMapsReady(true))
      .catch(() => setStatus("Location autocomplete activates after the Google Maps key is added in Render."));
  }, []);

  useEffect(() => {
    if (!mapsReady || !inputRef.current || autocompleteRef.current || !window.google) return;
    const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, {
      componentRestrictions: { country: "gh" },
      fields: ["formatted_address", "geometry", "name"]
    });

    if (config?.serviceBounds) {
      const bounds = new window.google.maps.LatLngBounds(
        { lat: config.serviceBounds.minLat, lng: config.serviceBounds.minLng },
        { lat: config.serviceBounds.maxLat, lng: config.serviceBounds.maxLng }
      );
      autocomplete.setBounds(bounds);
    }

    autocomplete.addListener("place_changed", () => {
      const place = autocomplete.getPlace();
      const lat = place.geometry?.location?.lat?.();
      const lng = place.geometry?.location?.lng?.();
      if (typeof lat !== "number" || typeof lng !== "number") {
        setStatus("Choose a location from the suggestions so we can calculate delivery.");
        return;
      }
      const address = place.formatted_address || place.name || inputRef.current?.value || "Selected location";
      setStatus("");
      onSelect({ address, lat, lng });
    });

    autocompleteRef.current = autocomplete;
  }, [mapsReady, config, onSelect]);

  useEffect(() => {
    if (inputRef.current && value?.address) inputRef.current.value = value.address;
  }, [value]);

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      setStatus("Location access is not supported by this browser.");
      return;
    }
    setStatus("Finding your location…");
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        let address = "Current location";
        try {
          await loadGoogleMaps();
          if (window.google) {
            const geocoder = new window.google.maps.Geocoder();
            const result = await geocoder.geocode({ location: { lat, lng } });
            address = result.results?.[0]?.formatted_address || address;
          }
        } catch {
          // Coordinates are enough for the server-side delivery quote.
        }
        if (inputRef.current) inputRef.current.value = address;
        setStatus("");
        onSelect({ address, lat, lng });
      },
      () => setStatus("We could not access your current location. Search for the address instead."),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <div className={`location-picker ${compact ? "location-picker--compact" : ""}`}>
      <div className="location-field-wrap">
        <span className="location-pin" aria-hidden="true">⌖</span>
        <input
          ref={inputRef}
          className="location-input"
          placeholder="Search your Accra delivery location"
          autoComplete="off"
          aria-label="Delivery location"
        />
        <button className="location-current" type="button" onClick={useCurrentLocation}>
          Use my location
        </button>
      </div>
      {status ? <p className="form-note">{status}</p> : null}
    </div>
  );
};
