import { clearStoredSession } from './auth';

export type TrailSummary = {
  id: number;
  name: string;
  park?: {
    name: string;
    slug: string;
  } | null;
};

export type ParkSummary = {
  name: string;
  state: string;
  slug: string;
  trails: TrailSummary[];
};

export type TrailReport = {
  id: number;
  note: string | null;
  surfaceCondition: string;
  conditionRating: number;
  reporterName?: string | null;
  createdAt?: string;
};

export type Hazard = {
  id: number;
  type: string;
  severity: string;
  title: string;
  description?: string | null;
  isActive: boolean;
  reportedAt: string;
};

export type NpsAlert = {
  id: string;
  title: string;
  description: string;
  category: string;
  url: string;
  parkCode: string;
};

export type WeatherPeriod = {
  name: string;
  temperature: number;
  temperatureUnit: string;
  windSpeed: string;
  shortForecast: string;
  detailedForecast: string;
  icon: string;
};

export type ParkWeather = {
  parkSlug: string;
  forecast: WeatherPeriod[];
};

export type ParkConditionHazard = {
  id: string;
  title: string;
  severity: 'low' | 'moderate' | 'high';
  source: 'nps' | 'nws' | 'combined';
  summary: string;
  evidence: string[];
  tags: string[];
};

export type LocalStructuredHazard = {
  type: string;
  severity: 'LOW' | 'MODERATE' | 'HIGH' | 'EXTREME';
  reason: string;
};

export type LocalStructuredAlert = {
  title: string;
  category: string;
  impact: string;
};

export type LocalStructuredOutput = {
  riskLevel: 'LOW' | 'MODERATE' | 'HIGH' | 'EXTREME';
  hazards: LocalStructuredHazard[];
  alerts: LocalStructuredAlert[];
  notification: string;
  recommendedAction: string;
};

export type ParkDigest = {
  parkSlug: string;
  shortSummary: string;
  notification: string;
  generationSource: 'local' | 'gemini' | 'fallback';
  generationError: string | null;
  structuredOutput?: LocalStructuredOutput | null;
  hazards: ParkConditionHazard[];
  alerts: NpsAlert[];
  weather: ParkWeather | null;
};

export type TrailDetail = TrailSummary & {
  difficulty?: string | null;
  status?: string;
  lengthMiles?: number | null;
  description?: string | null;
  reports?: TrailReport[];
  hazards?: Hazard[];
  npsAlerts?: NpsAlert[];
  weather?: ParkWeather | null;
};

export type CreateReportInput = {
  trailId: number;
  conditionRating: number;
  surfaceCondition: string;
  note?: string;
  reporterName?: string;
};

export type SigninInput = {
  email: string;
  password: string;
};

export type SignupInput = SigninInput & {
  gender: 'MALE' | 'FEMALE' | 'OTHER';
  age: number;
};

export type AuthenticatedUser = {
  id: number;
  email: string;
};

export type AuthResponse = {
  access_token: string;
  user: AuthenticatedUser;
};

export type ParkPreference = {
  parkId: number;
  parkSlug: string;
  parkName: string;
  parkState: string;
  isFavorite: boolean;
  wantsToGo: boolean;
};

export type UpdateParkPreferenceInput = {
  isFavorite: boolean;
  wantsToGo: boolean;
};

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001';

function getStoredAuthToken() {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.localStorage.getItem('trailcheck.auth.token');
}

function buildHeaders(
  headers?: HeadersInit,
  options?: { json?: boolean; auth?: boolean },
) {
  const nextHeaders = new Headers(headers);

  if (options?.json) {
    nextHeaders.set('Content-Type', 'application/json');
  }

  if (options?.auth) {
    const token = getStoredAuthToken();
    if (token) {
      nextHeaders.set('Authorization', `Bearer ${token}`);
    }
  }

  return nextHeaders;
}

async function parseError(response: Response, fallbackMessage: string) {
  if (response.status === 401) {
    clearStoredSession();
    return 'Your session has expired. Please sign in again.';
  }

  try {
    const data = (await response.json()) as { message?: string | string[] };
    if (Array.isArray(data.message)) {
      return data.message.join(', ');
    }
    return data.message ?? fallbackMessage;
  } catch {
    return fallbackMessage;
  }
}

export async function getTrails(): Promise<TrailSummary[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/trails`, { cache: 'no-store' });
    if (!res.ok) throw new Error('Failed to load trails');
    return res.json();
  } catch (error) {
    console.warn('Unable to load trails from API.', error);
    return [];
  }
}

export async function getParks(): Promise<ParkSummary[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/parks`, { cache: 'no-store' });
    if (!res.ok) throw new Error('Failed to load parks');
    return res.json();
  } catch (error) {
    console.warn('Unable to load parks from API.', error);
    return [];
  }
}

export async function getPark(slug: string): Promise<ParkSummary | null> {
  const parks = await getParks();
  return parks.find((park) => park.slug === slug) ?? null;
}

export async function getParkDigest(slug: string): Promise<ParkDigest> {
  const response = await fetch(`${API_BASE_URL}/ai/parks/${slug}/digest`, {
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(await parseError(response, 'Failed to load park conditions.'));
  }

  return response.json();
}

export async function getTrail(id: string): Promise<TrailDetail | null> {
  const response = await fetch(`${API_BASE_URL}/trails/${id}`, {
    cache: 'no-store',
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Failed to load trail ${id}`);
  return response.json();
}

export async function signup(input: SignupInput): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE_URL}/auth/signup`, {
    method: 'POST',
    headers: buildHeaders(undefined, { json: true }),
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error(await parseError(response, 'Failed to create account.'));
  }

  return response.json();
}

export async function signin(input: SigninInput): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE_URL}/auth/signin`, {
    method: 'POST',
    headers: buildHeaders(undefined, { json: true }),
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error(await parseError(response, 'Failed to sign in.'));
  }

  return response.json();
}

export async function getCurrentUser(token?: string): Promise<AuthenticatedUser> {
  const response = await fetch(`${API_BASE_URL}/auth/me`, {
    headers: buildHeaders(
      token ? { Authorization: `Bearer ${token}` } : undefined,
      { auth: !token },
    ),
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(await parseError(response, 'Failed to load profile.'));
  }

  return response.json();
}

export async function createReport(input: CreateReportInput) {
  const response = await fetch(`${API_BASE_URL}/reports`, {
    method: 'POST',
    headers: buildHeaders(undefined, { json: true, auth: true }),
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error(await parseError(response, 'Failed to submit report.'));
  }

  return response.json();
}

export async function getMyParkPreferences(): Promise<ParkPreference[]> {
  const response = await fetch(`${API_BASE_URL}/parks/preferences/me`, {
    headers: buildHeaders(undefined, { auth: true }),
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(await parseError(response, 'Failed to load saved parks.'));
  }

  return response.json();
}

export async function getParkPreference(slug: string): Promise<ParkPreference> {
  const response = await fetch(`${API_BASE_URL}/parks/${slug}/preferences`, {
    headers: buildHeaders(undefined, { auth: true }),
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(await parseError(response, 'Failed to load park preference.'));
  }

  return response.json();
}

export async function updateParkPreference(
  slug: string,
  input: UpdateParkPreferenceInput,
): Promise<ParkPreference> {
  const response = await fetch(`${API_BASE_URL}/parks/${slug}/preferences`, {
    method: 'PUT',
    headers: buildHeaders(undefined, { json: true, auth: true }),
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error(await parseError(response, 'Failed to update park preference.'));
  }

  return response.json();
}
