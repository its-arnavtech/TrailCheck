export type TrailSummary = {
  id: number;
  name: string;
  park?: {
    name: string;
    slug: string;
  } | null;
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

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001';

export async function getTrails(): Promise<TrailSummary[]> {
  const res = await fetch(`${API_BASE_URL}/trails`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to load trails');
  return res.json();
}

export async function getTrail(id: string): Promise<TrailDetail | null> {
  const response = await fetch(`${API_BASE_URL}/trails/${id}`, {
    cache: 'no-store',
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Failed to load trail ${id}`);
  return response.json();
}

export async function createReport(input: CreateReportInput) {
  const response = await fetch(`${API_BASE_URL}/reports`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!response.ok) throw new Error('Failed to submit report');
  return response.json();
}