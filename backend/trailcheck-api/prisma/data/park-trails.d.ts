export type SeedTrail = {
    name: string;
    slug: string;
    difficulty: 'EASY' | 'MODERATE' | 'HARD';
    lengthMiles: number;
};
export declare const parkTrails: Record<string, SeedTrail[]>;
