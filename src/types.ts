export type PrayerType = "SHACHARIT" | "MINCHA" | "ARVIT";
export interface Prayer {
  id: string;
  lat: number;
  lng: number;
  details: string;
  prayerType: PrayerType;
  createdAt: string;
  presentCount: number;
  comingCount: number;
  started: boolean;
  distanceKm?: number;
  interested?: boolean;
}

export interface OwnedPrayer extends Prayer {
  seekerToken: string;
}
