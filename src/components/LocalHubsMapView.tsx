import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  APILoadingStatus,
  APIProvider,
  AdvancedMarker,
  Map as GoogleMap,
  InfoWindow,
  Pin,
  useAdvancedMarkerRef,
  useApiLoadingStatus,
  useMap,
  useMapsLibrary,
} from '@vis.gl/react-google-maps';
import { Crosshair, ExternalLink, MapPin, Search, Star } from 'lucide-react';
import { AppView } from '../types/whop';

interface LocalHubsMapViewProps {
  onNavigate: (view: AppView) => void;
}

interface VenuePlace {
  id: string;
  displayName: string;
  formattedAddress: string;
  location: { lat: number; lng: number };
  rating?: number | null;
  userRatingCount?: number | null;
  googleMapsURI?: string | null;
}

const DEFAULT_CENTER = { lat: 40.7411, lng: -73.9897 };

const VENUE_QUERIES = [
  { id: 'coworking', label: 'Coworking Spaces', query: 'coworking space' },
  { id: 'studios', label: 'Podcast & Media Studios', query: 'recording podcast studio' },
  { id: 'cafes', label: 'Creator Cafes', query: 'coffee shop workspace' },
  { id: 'events', label: 'Meetup Venues', query: 'event conference space' },
];

function isQuotaError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return (
    msg.includes('OVER_QUERY_LIMIT') ||
    msg.includes('RESOURCE_EXHAUSTED') ||
    msg.includes('OverQuotaMapError') ||
    msg.includes('429')
  );
}

function VenueMarkerWithInfo({
  venue,
  selected,
  onSelect,
  onClose,
  onHostHere,
}: {
  venue: VenuePlace;
  selected: boolean;
  onSelect: () => void;
  onClose: () => void;
  onHostHere: () => void;
}) {
  const [markerRef, marker] = useAdvancedMarkerRef();

  return (
    <>
      <AdvancedMarker
        ref={markerRef}
        position={venue.location}
        onClick={onSelect}
        title={venue.displayName}
      >
        <Pin
          background={selected ? '#FA4616' : '#111111'}
          borderColor="#FFFFFF"
          glyphColor="#FFFFFF"
        />
      </AdvancedMarker>

      {selected && marker && (
        <InfoWindow anchor={marker} onCloseClick={onClose}>
          <div className="p-1 max-w-[240px] space-y-2">
            <div className="font-display text-sm font-bold text-[#111111]">
              {venue.displayName}
            </div>
            <p className="text-xs text-neutral-600 leading-snug">
              {venue.formattedAddress}
            </p>
            {typeof venue.rating === 'number' && (
              <div className="flex items-center gap-1 text-xs text-neutral-700 tabular-nums">
                <Star className="w-3 h-3 fill-[#FA4616] text-[#FA4616]" />
                <span className="font-semibold">{venue.rating.toFixed(1)}</span>
                {typeof venue.userRatingCount === 'number' && (
                  <span className="text-neutral-500">
                    ({venue.userRatingCount.toLocaleString('en-US')})
                  </span>
                )}
              </div>
            )}
            <div className="pt-1 flex items-center gap-2">
              <button
                type="button"
                onClick={onHostHere}
                className="px-2.5 py-1.5 text-[11px] font-semibold text-white bg-[#FA4616] hover:bg-[#e03a0c] rounded-md transition-colors"
              >
                Host Whop Meetup
              </button>
              {venue.googleMapsURI && (
                <a
                  href={venue.googleMapsURI}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-neutral-600 hover:text-[#111111]"
                >
                  Maps
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          </div>
        </InfoWindow>
      )}
    </>
  );
}

interface GooglePlaceLocation {
  lat: () => number;
  lng: () => number;
}

interface GooglePlaceResult {
  id?: string;
  displayName?: string | null;
  formattedAddress?: string | null;
  location?: GooglePlaceLocation | null;
  viewport?: unknown;
  rating?: number | null;
  userRatingCount?: number | null;
  googleMapsURI?: string | null;
  fetchFields: (opts: { fields: string[] }) => Promise<void>;
}

interface GoogleAutocompleteSuggestion {
  placePrediction?: {
    text: { text: string };
    toPlace: () => GooglePlaceResult;
  };
}

interface PlacesLibraryExtended {
  AutocompleteSessionToken: new () => unknown;
  AutocompleteSuggestion: {
    fetchAutocompleteSuggestions: (req: {
      input: string;
      sessionToken?: unknown;
    }) => Promise<{ suggestions?: GoogleAutocompleteSuggestion[] }>;
  };
  Place: {
    searchByText: (req: {
      textQuery: string;
      fields: string[];
      locationBias?: { center: { lat: number; lng: number }; radius: number };
      maxResultCount?: number;
    }) => Promise<{ places?: GooglePlaceResult[] }>;
  };
}

const HubsMapInner: React.FC<{ onNavigate: (view: AppView) => void }> = ({
  onNavigate,
}) => {
  const map = useMap();
  const placesLib = useMapsLibrary('places') as unknown as PlacesLibraryExtended | null;
  const apiStatus = useApiLoadingStatus();

  const [center, setCenter] = useState(DEFAULT_CENTER);
  const [searchInput, setSearchInput] = useState('');
  const [suggestions, setSuggestions] = useState<GoogleAutocompleteSuggestion[]>(
    []
  );
  const sessionTokenRef = useRef<unknown>(null);

  const [activeQueryId, setActiveQueryId] = useState<string>('coworking');
  const [venues, setVenues] = useState<VenuePlace[]>([]);
  const [selectedVenueId, setSelectedVenueId] = useState<string | null>(null);
  const [loadingVenues, setLoadingVenues] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);

  useEffect(() => {
    if (apiStatus === APILoadingStatus.AUTH_FAILURE) {
      window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
      setStatusError('Google Maps failed authentication or reached quota.');
    } else if (apiStatus === APILoadingStatus.FAILED) {
      setStatusError('Unable to load Google Maps Platform.');
    }
  }, [apiStatus]);

  // Modern Autocomplete using AutocompleteSuggestion + AutocompleteSessionToken
  useEffect(() => {
    if (!placesLib) return;
    const trimmed = searchInput.trim();
    if (!trimmed) {
      setSuggestions([]);
      return;
    }

    if (!sessionTokenRef.current) {
      sessionTokenRef.current = new placesLib.AutocompleteSessionToken();
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const res =
          await placesLib.AutocompleteSuggestion.fetchAutocompleteSuggestions({
            input: trimmed,
            sessionToken: sessionTokenRef.current ?? undefined,
          });
        if (!cancelled) {
          setSuggestions(res.suggestions || []);
        }
      } catch (err) {
        if (isQuotaError(err)) {
          window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
        }
        if (!cancelled) {
          setSuggestions([]);
        }
      }
    }, 220);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [placesLib, searchInput]);

  // Search nearby venues around current center using Places API (New) Place.searchByText
  const runVenueSearch = useCallback(
    async (queryText: string, targetCenter: { lat: number; lng: number }) => {
      if (!placesLib) return;
      setLoadingVenues(true);
      setStatusError(null);
      try {
        const { places } = await placesLib.Place.searchByText({
          textQuery: queryText,
          fields: [
            'id',
            'displayName',
            'formattedAddress',
            'location',
            'rating',
            'userRatingCount',
            'googleMapsURI',
          ],
          locationBias: {
            center: targetCenter,
            radius: 10000,
          },
          maxResultCount: 8,
        });

        const mapped: VenuePlace[] = (places || [])
          .filter((p) => Boolean(p.location))
          .map((p) => ({
            id: p.id || `${p.displayName}-${p.location!.lat()}`,
            displayName: p.displayName || 'Verified Location',
            formattedAddress: p.formattedAddress || '',
            location: {
              lat: p.location!.lat(),
              lng: p.location!.lng(),
            },
            rating: p.rating ?? null,
            userRatingCount: p.userRatingCount ?? null,
            googleMapsURI: p.googleMapsURI ?? null,
          }));

        setVenues(mapped);
        setSelectedVenueId(mapped[0]?.id ?? null);
      } catch (err) {
        if (isQuotaError(err)) {
          window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
        }
        setStatusError(
          'Unable to fetch nearby locations right now. Please try again.'
        );
      } finally {
        setLoadingVenues(false);
      }
    },
    [placesLib]
  );

  // Trigger initial search once places library loads
  useEffect(() => {
    if (!placesLib) return;
    const qObj =
      VENUE_QUERIES.find((q) => q.id === activeQueryId) || VENUE_QUERIES[0];
    void runVenueSearch(qObj.query, center);
  }, [placesLib, activeQueryId, center, runVenueSearch]);

  const handleSelectSuggestion = async (
    suggestion: GoogleAutocompleteSuggestion
  ) => {
    if (!placesLib || !suggestion.placePrediction) return;
    try {
      const place = suggestion.placePrediction.toPlace();
      await place.fetchFields({
        fields: [
          'id',
          'displayName',
          'formattedAddress',
          'location',
          'viewport',
        ],
      });

      if (place.location) {
        const nextLoc = {
          lat: place.location.lat(),
          lng: place.location.lng(),
        };
        setCenter(nextLoc);
        if (map) {
          if (place.viewport) {
            map.fitBounds(place.viewport as Parameters<typeof map.fitBounds>[0]);
          } else {
            map.panTo(nextLoc);
            map.setZoom(13);
          }
        }
      }

      setSearchInput(place.displayName || '');
      setSuggestions([]);
      sessionTokenRef.current = null;
    } catch (err) {
      if (isQuotaError(err)) {
        window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
      }
      setStatusError('Could not load selected place details.');
    }
  };

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      setStatusError('Geolocation is not supported in this browser.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const nextLoc = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };
        setCenter(nextLoc);
        if (map) {
          map.panTo(nextLoc);
          map.setZoom(13);
        }
      },
      () => {
        setStatusError('Location permission denied. Search any city above instead.');
      }
    );
  };

  return (
    <div className="space-y-6">
      {/* Search & Category Controls */}
      <div className="bg-white border border-neutral-200 rounded-2xl p-5 space-y-4">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search any city, neighborhood, or address via Google Places..."
              aria-label="Search location"
              className="w-full h-11 pl-10 pr-4 bg-[#FAFAFA] border border-neutral-200 rounded-xl text-sm text-[#111111] placeholder:text-neutral-400 focus:outline-none focus:border-[#111111]"
            />

            {suggestions.length > 0 && (
              <ul className="absolute left-0 right-0 mt-1.5 bg-white border border-neutral-200 rounded-xl shadow-lg z-30 divide-y divide-neutral-100 max-h-64 overflow-y-auto">
                {suggestions.map((s, idx) => (
                  <li key={idx}>
                    <button
                      type="button"
                      onClick={() => handleSelectSuggestion(s)}
                      className="w-full text-left px-4 py-2.5 text-sm text-neutral-800 hover:bg-neutral-50 flex items-center gap-2.5"
                    >
                      <MapPin className="w-4 h-4 text-[#FA4616] shrink-0" />
                      <span className="truncate">
                        {s.placePrediction?.text.text}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <button
            type="button"
            onClick={handleUseMyLocation}
            className="inline-flex items-center justify-center gap-2 px-4 h-11 text-sm font-medium text-[#111111] bg-neutral-100 hover:bg-neutral-200 rounded-xl transition-colors whitespace-nowrap shrink-0"
          >
            <Crosshair className="w-4 h-4" />
            Near Me
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {VENUE_QUERIES.map((vq) => {
            const active = activeQueryId === vq.id;
            return (
              <button
                key={vq.id}
                type="button"
                onClick={() => setActiveQueryId(vq.id)}
                className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                  active
                    ? 'bg-[#111111] text-white'
                    : 'bg-[#FAFAFA] text-neutral-700 border border-neutral-200 hover:border-neutral-400'
                }`}
              >
                {vq.label}
              </button>
            );
          })}
        </div>

        {statusError && (
          <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            {statusError}
          </p>
        )}
      </div>

      {/* Split Map + Live Places List */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-8 bg-white border border-neutral-200 rounded-2xl overflow-hidden">
          <div className="w-full h-[540px]">
            <GoogleMap
              mapId="DEMO_MAP_ID"
              defaultCenter={center}
              defaultZoom={13}
              gestureHandling="greedy"
              internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
              onClick={() => setSelectedVenueId(null)}
              style={{ width: '100%', height: '100%' }}
            >
              {venues.map((v) => (
                <VenueMarkerWithInfo
                  key={v.id}
                  venue={v}
                  selected={selectedVenueId === v.id}
                  onSelect={() => setSelectedVenueId(v.id)}
                  onClose={() => setSelectedVenueId(null)}
                  onHostHere={() => onNavigate({ name: 'studio', tab: 'create' })}
                />
              ))}
            </GoogleMap>
          </div>
        </div>

        <aside className="lg:col-span-4 bg-white border border-neutral-200 rounded-2xl p-4 h-[540px] flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
            <h2 className="font-display text-base font-bold text-[#111111]">
              Verified Venues
            </h2>
            <span className="text-xs text-neutral-500 tabular-nums">
              {loadingVenues ? 'Searching...' : `${venues.length} places`}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-neutral-100 mt-2">
            {loadingVenues ? (
              <div className="py-8 text-center text-xs text-neutral-500">
                Searching Google Maps Places...
              </div>
            ) : venues.length === 0 ? (
              <div className="py-8 text-center text-xs text-neutral-500">
                No venues found in this area. Try searching another city.
              </div>
            ) : (
              venues.map((v) => {
                const isSelected = selectedVenueId === v.id;
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => {
                      setSelectedVenueId(v.id);
                      if (map) {
                        map.panTo(v.location);
                        map.setZoom(14);
                      }
                    }}
                    className={`w-full text-left py-3.5 px-2.5 rounded-lg transition-colors ${
                      isSelected ? 'bg-[#FAFAFA]' : 'hover:bg-neutral-50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-sm font-semibold text-[#111111]">
                        {v.displayName}
                      </span>
                      {typeof v.rating === 'number' && (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-neutral-700 tabular-nums shrink-0">
                          <Star className="w-3 h-3 fill-[#FA4616] text-[#FA4616]" />
                          {v.rating.toFixed(1)}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-neutral-500 mt-1 line-clamp-2">
                      {v.formattedAddress}
                    </p>
                  </button>
                );
              })
            )}
          </div>
        </aside>
      </div>
    </div>
  );
};

export const LocalHubsMapView: React.FC<LocalHubsMapViewProps> = ({
  onNavigate,
}) => {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

  return (
    <div className="max-w-[1280px] mx-auto px-6 py-10 space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-[#FA4616] mb-1.5">
            Google Maps Platform · Places Discovery
          </p>
          <h1 className="font-display text-2xl lg:text-3xl font-bold text-[#111111]">
            Local Creator Hubs & Meetup Venues
          </h1>
          <p className="text-sm text-neutral-600 mt-1 max-w-2xl">
            Find coworking spaces, podcast studios, and meetup venues around any city to host in-person sessions for your Whop members.
          </p>
        </div>
      </div>

      {!apiKey ? (
        <div className="bg-white border border-neutral-200 rounded-2xl p-10 text-center space-y-3">
          <h2 className="font-display text-lg font-bold text-[#111111]">
            Google Maps API Key Required
          </h2>
          <p className="text-sm text-neutral-600 max-w-md mx-auto">
            Configure your Google Maps Platform key in the environment (`VITE_GOOGLE_MAPS_API_KEY`) or via the AI Studio Google Maps Settings Panel to load interactive maps and place search.
          </p>
        </div>
      ) : (
        <APIProvider apiKey={apiKey} language="en" region="US">
          <HubsMapInner onNavigate={onNavigate} />
        </APIProvider>
      )}
    </div>
  );
};
