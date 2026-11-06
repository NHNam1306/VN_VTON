export type GarmentCategory = 'tops' | 'outerwear' | 'bottoms' | 'shoes' | 'accessories';

export type Garment = {
  id: string;
  name: string;
  category: GarmentCategory;
  frontOriginalUrl: string;
  frontProcessedUrl: string;
  backOriginalUrl: string | null;
  backProcessedUrl: string | null;
  createdAt: string;
};

export type PersonImage = {
  id: 'current';
  imageUrl: string;
  width: number;
  height: number;
  warnings: string[];
  createdAt: string;
};

export type TryOnResult = { angle: 'front' | 'back'; imageUrl: string; createdAt: string };
export type CreditStatus = { remaining: number | null; limit: number; unlimited: boolean };

export type SocialPerson = { id: string; username: string; name: string; avatar: string };
export type SocialSnapshot = {
  me: SocialPerson & { inviteCode: string; birthDate: string | null };
  friends: SocialPerson[];
  incoming: { id: string; from: SocialPerson; createdAt: number }[];
  outgoing: { id: string; to: SocialPerson; createdAt: number }[];
  polls: unknown[];
  notifications: { id: string; text: string; read: boolean; createdAt: number }[];
};

export type Plan = {
  id: 'free' | 'plus' | 'pro' | 'max';
  name: string;
  description: string;
  monthlyPriceVnd: number;
  recommended: boolean;
  entitlements: { imageCredits: number; wardrobeItems: number; savedOutfits: number; selectedGarments: number };
  highlights: string[];
};

export type PlanSnapshot = {
  plans: Plan[];
  current: {
    planId: 'free' | 'plus' | 'pro' | 'max';
    planName: string;
    unlimited: boolean;
    entitlements: { imageCredits: number; wardrobeItems: number; savedOutfits: number; selectedGarments: number };
  };
};
