export type Loan = {
  lender: string;
  principal: number;
  emi: number;
  months_left: number;
};

export type Customer = {
  name: string;
  owed: number;
  last_paid: string; // free text, e.g. "3 weeks ago, late"
  trend: "improving" | "stable" | "worsening";
};

export type BusinessProfile = {
  user_id: string;
  owner_name?: string;
  gender?: "male" | "female" | "other";
  business_type?: string;
  city?: string;
  turnover?: number;
  margin_pct?: number;
  cash_on_hand?: number;
  peak_season?: string;
  loans: Loan[];
  customers: Customer[];
  supplier_terms?: string;
  discount_policy?: string;
  main_challenge?: string;
  main_goal?: string;
  language_pref?: string;
  onboarding_done?: boolean;
  updated_at?: string;
};

export type MemoryHit = {
  id: number;
  text: string;
  kind: string;
  created_at: string;
  similarity: number;
};

export type ExtractedFacts = {
  snippet: string;
  profilePatch?: Partial<Pick<BusinessProfile,
    | "owner_name" | "gender" | "business_type" | "city"
    | "turnover" | "margin_pct" | "cash_on_hand" | "peak_season"
    | "supplier_terms" | "discount_policy" | "main_challenge" | "main_goal">>;
  customers?: Customer[];
};

export type Language = "hindi" | "english";
