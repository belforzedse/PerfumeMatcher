// Translation mappings for form fields
const PersianToEnglishMappings = {
  gender: {
    "زنانه": "Female",
    "مردانه": "Male",
    "یونیسکس": "Unisex",
  },
  season: {
    "بهار": "Spring",
    "تابستان": "Summer",
    "پاییز": "Fall",
    "زمستان": "Winter",
    "چهارفصل": "All Seasons",
  },
  family: {
    "گلی": "Floral",
    "چوبی": "Woody",
    "شرقی": "Oriental",
    "مرکباتی": "Citrus",
    "آروماتیک": "Aromatic",
    "مشکدار": "Musky",
  },
  character: {
    "رسمی": "Formal",
    "روزمره": "Casual",
    "رمانتیک": "Romantic",
    "اسپرت": "Sport",
    "جذاب": "Attractive",
    "کلاسیک": "Classic",
  },
  strength: {
    "ملایم": "soft",
    "متوسط": "moderate",
    "قوی": "strong",
    "خیلی قوی": "very_strong",
  },
} as const;

// Create reverse mappings for displaying backend values
const EnglishToPersianMappings = {
  gender: Object.fromEntries(
    Object.entries(PersianToEnglishMappings.gender).map(([k, v]) => [v, k])
  ) as Record<string, string>,
  season: Object.fromEntries(
    Object.entries(PersianToEnglishMappings.season).map(([k, v]) => [v, k])
  ) as Record<string, string>,
  family: Object.fromEntries(
    Object.entries(PersianToEnglishMappings.family).map(([k, v]) => [v, k])
  ) as Record<string, string>,
  character: Object.fromEntries(
    Object.entries(PersianToEnglishMappings.character).map(([k, v]) => [v, k])
  ) as Record<string, string>,
  strength: Object.fromEntries(
    Object.entries(PersianToEnglishMappings.strength).map(([k, v]) => [v, k])
  ) as Record<string, string>,
} as const;

// Convert Persian values to English for API submission
export const convertToEnglish = (
  fieldName: keyof typeof PersianToEnglishMappings,
  persianValues: string[]
): string => {
  const mappings = PersianToEnglishMappings[fieldName];
  const englishValues = persianValues.map(
    (value) => mappings[value as keyof typeof mappings] || value
  );
  return englishValues.join(", ");
};

// Convert English values back to Persian for display
export const convertToPersian = (
  fieldName: keyof typeof EnglishToPersianMappings,
  englishString: string | null | undefined
): string[] => {
  if (!englishString) return [];
  const mappings = EnglishToPersianMappings[fieldName];
  return englishString
    .split(", ")
    .map((value) => mappings[value.trim()] || value.trim())
    .filter((value) => value.length > 0);
};

const BACKEND_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_BASE_URL || "http://localhost:8000";
const ADMIN_KEY = process.env.NEXT_PUBLIC_ADMIN_KEY || "admin-key"; // Should be set in .env

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  // Don't set Content-Type if it's FormData (browser will set it with boundary)
  const isFormData = init?.body instanceof FormData;
  const headers: Record<string, string> = {
    "X-Admin-Key": ADMIN_KEY,
    ...(init?.headers as Record<string, string> || {}),
  };
  
  // Only set Content-Type for non-FormData requests
  if (!isFormData) {
    headers["Content-Type"] = "application/json";
  }

  // Debug logging (always log in browser console for debugging)
  console.log("[Admin API] Request:", {
    url: `${BACKEND_BASE_URL}${path}`,
    hasAdminKey: !!ADMIN_KEY,
    adminKeyLength: ADMIN_KEY?.length || 0,
    adminKeyPrefix: ADMIN_KEY?.substring(0, 10) || "N/A",
    adminKeyEnd: ADMIN_KEY?.substring(ADMIN_KEY.length - 10) || "N/A",
  });

  const response = await fetch(`${BACKEND_BASE_URL}${path}`, {
    ...init,
    headers,
    credentials: "include", // Include cookies for admin key
  });

  if (!response.ok) {
    let errorMessage = response.statusText;
    try {
      const errorData = await response.json();
      errorMessage = (errorData as { detail?: string; error?: string }).detail || 
                     (errorData as { error?: string }).error || 
                     errorMessage;
    } catch {
      // If JSON parsing fails, try to get text
      try {
        const text = await response.text();
        if (text) errorMessage = text;
      } catch {
        // Keep default errorMessage
      }
    }
    throw new Error(errorMessage);
  }

  return response.json() as Promise<T>;
}


export interface AdminBrand {
  id: number;
  name: string;
}

export interface AdminCollection {
  id: number;
  name: string;
  brand?: AdminBrand | null;
}

export interface PerfumeNotes {
  top: string[];
  middle: string[];
  base: string[];
}

export interface AdminPerfume {
  id: number;
  name_fa: string;
  name_en: string;
  description?: string;
  gender?: string;
  season?: string; // legacy single season
  seasons?: string[]; // multiple seasons
  family?: string;
  character?: string;
  strength?: string; // with Persian labels
  intensity?: string;
  notes: PerfumeNotes;
  brand?: AdminBrand | null;
  collection?: AdminCollection | null;
  image?: string; // first image for backward compatibility
  images?: string[]; // full array
  tags?: string[];
  // Read-only fields
  occasions?: string[];
  main_accords?: string[];
  all_notes?: string[];
  created_at?: string;
  updated_at?: string;
}

export interface CreateBrandPayload {
  name: string;
}

export interface CreateCollectionPayload {
  name: string;
  brand?: number;
  brandId?: number;
}

export interface CreatePerfumePayload {
  name_fa: string;
  name_en: string;
  description?: string;
  gender?: string;
  season?: string; // legacy - populated from first seasons value
  seasons?: string[]; // multiple seasons (preferred)
  family?: string;
  character?: string;
  strength?: string; // English value
  intensity?: string;
  notes: PerfumeNotes;
  brand?: number;
  collection?: number;
  cover?: string; // single image URL for backward compatibility
  images?: string[]; // full array
  tags?: string[];
}


// Backend returns brand/collection as strings, not IDs
interface BackendPerfume {
  id: number;
  name_fa: string;
  name_en: string;
  name?: string;
  brand?: string;
  collection?: string;
  description?: string;
  gender?: string;
  season?: string; // legacy single season
  seasons?: string[]; // multiple seasons
  family?: string;
  character?: string;
  strength?: string; // English value
  intensity?: string;
  notes?: PerfumeNotes;
  images?: string[];
  tags?: string[];
  occasions?: string[];
  main_accords?: string[];
  all_notes?: string[];
  created_at?: string;
  updated_at?: string;
}

const mapPerfume = (
  perfume: BackendPerfume,
  brands: AdminBrand[],
  collections: AdminCollection[]
): AdminPerfume => {
  // Find brand by name (since backend stores as string)
  const brandObj = perfume.brand
    ? brands.find((b) => b.name === perfume.brand) ?? null
    : null;
  
  // Find collection by name
  const collectionObj = perfume.collection
    ? collections.find((c) => c.name === perfume.collection) ?? null
    : null;

  // Handle seasons: prefer seasons array, fallback to season string
  let seasons: string[] | undefined;
  if (perfume.seasons && Array.isArray(perfume.seasons) && perfume.seasons.length > 0) {
    // Convert English seasons to Persian
    seasons = perfume.seasons.map(s => convertToPersian("season", s).join(", "));
  } else if (perfume.season) {
    // Migrate legacy season to seasons array
    seasons = convertToPersian("season", perfume.season);
  }

  // Handle legacy season for backward compatibility
  const legacySeason = seasons && seasons.length > 0 ? seasons[0] : 
                       (perfume.season ? convertToPersian("season", perfume.season).join(", ") : undefined);

  return {
    id: perfume.id,
    name_fa: perfume.name_fa || perfume.name || "",
    name_en: perfume.name_en || perfume.name || "",
    description: perfume.description,
    gender: perfume.gender ? convertToPersian("gender", perfume.gender).join(", ") : undefined,
    season: legacySeason, // legacy single season
    seasons: seasons, // multiple seasons
    family: perfume.family ? convertToPersian("family", perfume.family).join(", ") : undefined,
    character: perfume.character ? convertToPersian("character", perfume.character).join(", ") : undefined,
    strength: perfume.strength ? convertToPersian("strength", perfume.strength).join(", ") : undefined,
    intensity: perfume.intensity,
    notes: perfume.notes || {
      top: [],
      middle: [],
      base: [],
    },
    brand: brandObj,
    collection: collectionObj,
    // Convert relative image URLs to absolute URLs
    image: perfume.images && perfume.images.length > 0 
      ? (() => {
          const url = perfume.images[0].trim();
          if (url.startsWith("http://") || url.startsWith("https://")) {
            return url;
          } else if (url.startsWith("/")) {
            return `${BACKEND_BASE_URL}${url}`;
          } else {
            return `${BACKEND_BASE_URL}/${url}`;
          }
        })()
      : undefined, // backward compatibility
    images: (perfume.images || []).map(url => {
      const trimmed = url.trim();
      if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
        return trimmed;
      } else if (trimmed.startsWith("/")) {
        return `${BACKEND_BASE_URL}${trimmed}`;
      } else {
        return `${BACKEND_BASE_URL}/${trimmed}`;
      }
    }),
    tags: perfume.tags || [],
    // Read-only fields
    occasions: perfume.occasions || [],
    main_accords: perfume.main_accords || [],
    all_notes: perfume.all_notes || [],
    created_at: perfume.created_at,
    updated_at: perfume.updated_at,
  };
};

// Extract unique brands and collections from perfumes since backend stores them as strings
export const fetchBrandsAdmin = async (): Promise<AdminBrand[]> => {
  const perfumes = await request<BackendPerfume[]>("/api/admin/perfumes/");
  const uniqueBrands = new Set<string>();
  
  perfumes.forEach((p) => {
    if (p.brand && p.brand.trim()) {
      uniqueBrands.add(p.brand.trim());
    }
  });
  
  return Array.from(uniqueBrands)
    .sort()
    .map((name, index) => ({
      id: index + 1, // Generate IDs since backend doesn't have brand IDs
      name,
    }));
};

export const fetchCollectionsAdmin = async (): Promise<AdminCollection[]> => {
  const [brands, perfumes] = await Promise.all([
    fetchBrandsAdmin(),
    request<BackendPerfume[]>("/api/admin/perfumes/"),
  ]);
  
  const uniqueCollections = new Map<string, string>(); // name -> brand name
  
  perfumes.forEach((p) => {
    if (p.collection && p.collection.trim()) {
      uniqueCollections.set(p.collection.trim(), p.brand || "");
    }
  });
  
  return Array.from(uniqueCollections.entries())
    .map(([name, brandName], index) => {
      const brand = brandName ? brands.find((b) => b.name === brandName) ?? null : null;
      return {
        id: index + 1, // Generate IDs
        name,
        brand,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
};

export const fetchPerfumesAdmin = async (): Promise<AdminPerfume[]> => {
  const [brands, collections, perfumes] = await Promise.all([
    fetchBrandsAdmin(),
    fetchCollectionsAdmin(),
    request<BackendPerfume[]>("/api/admin/perfumes/"),
  ]);
  return perfumes.map((p) => mapPerfume(p, brands, collections));
};

// Brands and collections are stored as strings in perfumes, so these are no-ops
// In the future, you might want to create Brand/Collection models in Django
export const createBrand = async (payload: CreateBrandPayload): Promise<AdminBrand> => {
  // Brand will be created when a perfume with that brand is created
  const brands = await fetchBrandsAdmin();
  const existing = brands.find((b) => b.name === payload.name);
  if (existing) return existing;
  
  return {
    id: brands.length + 1,
    name: payload.name,
  };
};

export const updateBrand = async (_id: string, payload: CreateBrandPayload): Promise<AdminBrand> => {
  // Would need to update all perfumes with this brand name
  // For now, just return the updated brand object
  return {
    id: Number(_id),
    name: payload.name,
  };
};

export const deleteBrand = async (_id: string): Promise<void> => {
  // Would need to remove brand from all perfumes
  // For now, this is a no-op
};

export const createCollection = async (
  payload: CreateCollectionPayload
): Promise<AdminCollection> => {
  // Collection will be created when a perfume with that collection is created
  const [brands, collections] = await Promise.all([
    fetchBrandsAdmin(),
    fetchCollectionsAdmin(),
  ]);
  
  const brand = payload.brand || payload.brandId
    ? brands.find((b) => b.id === (payload.brand || payload.brandId)) ?? null
    : null;
  
  return {
    id: collections.length + 1,
    name: payload.name,
    brand,
  };
};

export const createPerfume = async (
  payload: CreatePerfumePayload
): Promise<AdminPerfume> => {
  // Get brand/collection names from IDs
  const [brands, collections] = await Promise.all([fetchBrandsAdmin(), fetchCollectionsAdmin()]);
  const brandName = payload.brand ? brands.find((b) => b.id === payload.brand)?.name : undefined;
  const collectionName = payload.collection ? collections.find((c) => c.id === payload.collection)?.name : undefined;
  
  const backendPayload: Record<string, unknown> = {
    name_fa: payload.name_fa,
    name_en: payload.name_en,
    intensity: payload.intensity,
    gender: payload.gender,
    season: payload.season,
    family: payload.family,
    character: payload.character,
    notes_top: payload.notes.top,
    notes_middle: payload.notes.middle,
    notes_base: payload.notes.base,
    brand: brandName || "",
    collection: collectionName || "",
  };
  
  // Handle images if provided (cover is a URL string)
  if (payload.cover && typeof payload.cover === "string") {
    backendPayload.images = [payload.cover];
  }
  
  const result = await request<BackendPerfume>("/api/admin/perfumes/", {
    method: "POST",
    body: JSON.stringify(backendPayload),
  });

  return mapPerfume(result, brands, collections);
};

export type UpdatePerfumePayload = CreatePerfumePayload;

export const updatePerfume = async (
  id: string,
  payload: UpdatePerfumePayload
): Promise<AdminPerfume> => {
  // Get brand/collection names from IDs
  const [brands, collections] = await Promise.all([fetchBrandsAdmin(), fetchCollectionsAdmin()]);
  const brandName = payload.brand ? brands.find((b) => b.id === payload.brand)?.name : undefined;
  const collectionName = payload.collection ? collections.find((c) => c.id === payload.collection)?.name : undefined;
  
  // Build payload, only including defined values
  const backendPayload: Record<string, unknown> = {};
  
  if (payload.name_fa !== undefined) backendPayload.name_fa = payload.name_fa;
  if (payload.name_en !== undefined) backendPayload.name_en = payload.name_en;
  if (payload.description !== undefined) backendPayload.description = payload.description;
  
  // Convert gender: if it's a string, split and convert; if array, convert first value
  if (payload.gender !== undefined) {
    if (typeof payload.gender === "string") {
      // Handle comma-separated or single value
      const genderArray = payload.gender.split(",").map(g => g.trim()).filter(Boolean);
      if (genderArray.length > 0) {
        // Convert Persian to English and take first value
        const englishGender = convertToEnglish("gender", genderArray);
        backendPayload.gender = englishGender.split(", ")[0].toLowerCase(); // Take first and lowercase
      }
    } else if (Array.isArray(payload.gender) && (payload.gender as string[]).length > 0) {
      const englishGender = convertToEnglish("gender", payload.gender as string[]);
      backendPayload.gender = englishGender.split(", ")[0].toLowerCase();
    }
  }
  
  if (payload.season !== undefined) backendPayload.season = payload.season; // legacy single season
  if (payload.seasons !== undefined) backendPayload.seasons = payload.seasons; // multiple seasons array
  if (payload.family !== undefined) backendPayload.family = payload.family;
  if (payload.character !== undefined) backendPayload.character = payload.character;
  if (payload.strength !== undefined) backendPayload.strength = payload.strength;
  if (payload.intensity !== undefined) backendPayload.intensity = payload.intensity;
  
  // Notes - ensure they're arrays and skip validation for now (backend will handle)
  if (payload.notes) {
    backendPayload.notes_top = payload.notes.top || [];
    backendPayload.notes_middle = payload.notes.middle || [];
    backendPayload.notes_base = payload.notes.base || [];
  }
  
  if (payload.tags !== undefined) backendPayload.tags = payload.tags || [];
  if (brandName !== undefined) backendPayload.brand = brandName || "";
  if (collectionName !== undefined) backendPayload.collection = collectionName || "";
  
  // Handle images: prefer images array, fallback to cover for backward compatibility
  // Always include images field if provided (even if empty array) to ensure it's saved to database
  if (payload.images !== undefined) {
    backendPayload.images = payload.images.length > 0 ? payload.images : [];
  } else if (payload.cover !== undefined) {
    if (typeof payload.cover === "string" && payload.cover.length > 0) {
      backendPayload.images = [payload.cover];
    } else {
      backendPayload.images = [];
    }
  }
  
  // Use PATCH instead of PUT to allow partial updates
  const result = await request<BackendPerfume>(`/api/admin/perfumes/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(backendPayload),
  });

  return mapPerfume(result, brands, collections);
};

export const deletePerfume = async (id: string): Promise<void> => {
  await request(`/api/admin/perfumes/${id}/`, { method: "DELETE" });
};

export const updateCollection = async (
  id: string,
  payload: CreateCollectionPayload
): Promise<AdminCollection> => {
  // Collections are stored as strings in perfumes, so this would need to update all perfumes
  // For now, just return the updated collection object
  const brands = await fetchBrandsAdmin();
  const brand = payload.brand || payload.brandId
    ? brands.find((b) => b.id === (payload.brand || payload.brandId)) ?? null
    : null;
  
  return {
    id: Number(id),
    name: payload.name,
    brand,
  };
};

export const deleteCollection = async (id: string): Promise<void> => {
  // Would need to remove collection from all perfumes
  // For now, this is a no-op
};

export const uploadFile = async (file: File): Promise<{ id: number; url: string }> => {
  const formData = new FormData();
  formData.append("file", file);
  
  // Upload to backend Django endpoint
  const result = await request<{ id: number; url: string }>("/api/admin/upload/", {
    method: "POST",
    body: formData,
    // Don't set Content-Type - browser will set it with boundary for FormData
  });
  
  return result;
};

export interface AvailableNotesResponse {
  notes?: string[];
  [category: string]: string[] | undefined;
}

export const fetchAvailableNotes = async (byCategory = false): Promise<string[] | Record<string, string[]>> => {
  const url = byCategory 
    ? `${BACKEND_BASE_URL}/api/available-notes/?category=true`
    : `${BACKEND_BASE_URL}/api/available-notes/`;
  
  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch available notes");
  }

  const data = await response.json() as AvailableNotesResponse;
  
  if (byCategory) {
    return data as Record<string, string[]>;
  }
  
  return (data.notes || []) as string[];
};
