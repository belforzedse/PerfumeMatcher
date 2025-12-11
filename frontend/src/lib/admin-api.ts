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
  const response = await fetch(`${BACKEND_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "X-Admin-Key": ADMIN_KEY,
      ...(init?.headers || {}),
    },
    credentials: "include", // Include cookies for admin key
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const message = (errorData as { detail?: string; error?: string }).detail || 
                    (errorData as { error?: string }).error || 
                    response.statusText;
    throw new Error(message);
  }

  return response.json() as Promise<T>;
}

interface BrandAttributes {
  name?: string | null;
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
  gender?: string;
  season?: string;
  family?: string;
  character?: string;
  notes: PerfumeNotes;
  brand?: AdminBrand | null;
  collection?: AdminCollection | null;
  image?: string;
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
  gender?: string;
  season?: string;
  family?: string;
  character?: string;
  notes: PerfumeNotes;
  brand?: number;
  collection?: number;
  cover?: string;
}

const mapBrand = (brand: { id: number; name: string }): AdminBrand => ({
  id: brand.id,
  name: brand.name,
});

const mapCollection = (
  collection: { id: number; name: string; brand?: number },
  brands: AdminBrand[]
): AdminCollection => ({
  id: collection.id,
  name: collection.name,
  brand: collection.brand
    ? brands.find((b) => b.id === collection.brand) ?? null
    : null,
});

// Backend returns brand/collection as strings, not IDs
interface BackendPerfume {
  id: number;
  name_fa: string;
  name_en: string;
  name?: string;
  brand?: string;
  collection?: string;
  gender?: string;
  season?: string;
  family?: string;
  character?: string;
  notes?: PerfumeNotes;
  images?: string[];
  tags?: string[];
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

  return {
    id: perfume.id,
    name_fa: perfume.name_fa || perfume.name || "",
    name_en: perfume.name_en || perfume.name || "",
    gender: perfume.gender ? convertToPersian("gender", perfume.gender).join(", ") : undefined,
    season: perfume.season ? convertToPersian("season", perfume.season).join(", ") : undefined,
    family: perfume.family ? convertToPersian("family", perfume.family).join(", ") : undefined,
    character: perfume.character ? convertToPersian("character", perfume.character).join(", ") : undefined,
    notes: perfume.notes || {
      top: [],
      middle: [],
      base: [],
    },
    brand: brandObj,
    collection: collectionObj,
    image: perfume.images && perfume.images.length > 0 ? perfume.images[0] : undefined,
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

export const updateBrand = async (id: string, payload: CreateBrandPayload): Promise<AdminBrand> => {
  // Would need to update all perfumes with this brand name
  // For now, just return the updated brand object
  return {
    id: Number(id),
    name: payload.name,
  };
};

export const deleteBrand = async (id: string): Promise<void> => {
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
  
  const backendPayload: any = {
    name_fa: payload.name_fa,
    name_en: payload.name_en,
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
  
  const backendPayload: any = {
    name_fa: payload.name_fa,
    name_en: payload.name_en,
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
  
  const result = await request<BackendPerfume>(`/api/admin/perfumes/${id}/`, {
    method: "PUT",
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
  // For now, return a data URL or placeholder
  // In production, you'd want to upload to a storage service (S3, Cloudinary, etc.)
  // or implement a file upload endpoint in Django
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve({ id: 0, url: reader.result as string });
    };
    reader.onerror = () => {
      reject(new Error("آپلود فایل ناموفق بود."));
    };
    reader.readAsDataURL(file);
  });
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
