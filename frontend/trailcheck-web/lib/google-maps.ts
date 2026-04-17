type GoogleMapsLocationInput = {
  parkName: string;
  state?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  formattedLocation?: string | null;
};

function hasCoordinates(
  latitude?: number | null,
  longitude?: number | null,
): latitude is number {
  return typeof latitude === 'number' && typeof longitude === 'number';
}

function buildLocationLabel({
  parkName,
  state,
  formattedLocation,
}: Pick<GoogleMapsLocationInput, 'parkName' | 'state' | 'formattedLocation'>) {
  const locationBits = [formattedLocation ?? state ?? 'United States']
    .filter(Boolean)
    .join(', ');

  return `${parkName} National Park, ${locationBits}`;
}

function buildGoogleMapsQuery(input: GoogleMapsLocationInput) {
  if (hasCoordinates(input.latitude, input.longitude)) {
    return `${input.latitude},${input.longitude}`;
  }

  return buildLocationLabel(input);
}

export function buildGoogleMapsExternalUrl(input: GoogleMapsLocationInput) {
  const query = buildGoogleMapsQuery(input);
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

export function buildGoogleMapsEmbedUrl(input: GoogleMapsLocationInput) {
  const query = buildGoogleMapsQuery(input);
  return `https://www.google.com/maps?q=${encodeURIComponent(query)}&t=k&output=embed`;
}
