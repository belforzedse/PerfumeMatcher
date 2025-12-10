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

const BASE_URL = "/api/admin-data";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const message = (errorData as { error?: string }).error || response.statusText;
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

const mapPerfume = (
  perfume: {
    id: number;
    name_fa: string;
    name_en: string;
    gender?: string;
    season?: string;
    family?: string;
    character?: string;
    notes: PerfumeNotes;
    brand?: number;
    collection?: number;
    cover?: { url?: string };
  },
  brands: AdminBrand[],
  collections: AdminCollection[]
): AdminPerfume => ({
  id: perfume.id,
  name_fa: perfume.name_fa,
  name_en: perfume.name_en,
  gender: convertToPersian("gender", perfume.gender).join(", ") || undefined,
  season: convertToPersian("season", perfume.season).join(", ") || undefined,
  family: convertToPersian("family", perfume.family).join(", ") || undefined,
  character: convertToPersian("character", perfume.character).join(", ") || undefined,
  notes: {
    top: perfume.notes?.top ?? [],
    middle: perfume.notes?.middle ?? [],
    base: perfume.notes?.base ?? [],
  },
  brand: perfume.brand
    ? brands.find((b) => b.id === perfume.brand) ?? null
    : null,
  collection: perfume.collection
    ? collections.find((c) => c.id === perfume.collection) ?? null
    : null,
  image: perfume.cover?.url,
});

export const fetchBrandsAdmin = async (): Promise<AdminBrand[]> => {
  const brands = await request<Array<{ id: number; name: string }>>("/brands");
  return brands.map(mapBrand);
};

export const fetchCollectionsAdmin = async (): Promise<AdminCollection[]> => {
  const [brands, collections] = await Promise.all([
    fetchBrandsAdmin(),
    request<Array<{ id: number; name: string; brand?: number }>>("/collections"),
  ]);
  return collections.map((c) => mapCollection(c, brands));
};

export const fetchPerfumesAdmin = async (): Promise<AdminPerfume[]> => {
  const [brands, collections, perfumes] = await Promise.all([
    fetchBrandsAdmin(),
    fetchCollectionsAdmin(),
    request<
      Array<{
        id: number;
        name_fa: string;
        name_en: string;
        gender?: string;
        season?: string;
        family?: string;
        character?: string;
        notes: PerfumeNotes;
        brand?: number;
        collection?: number;
        cover?: { url?: string };
      }>
    >("/perfumes"),
  ]);
  return perfumes.map((p) => mapPerfume(p, brands, collections));
};

export const createBrand = async (payload: CreateBrandPayload): Promise<AdminBrand> => {
  const result = await request<{ id: number; name: string }>("/brands", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return mapBrand(result);
};

export const updateBrand = async (id: string, payload: CreateBrandPayload): Promise<AdminBrand> => {
  const result = await request<{ id: number; name: string }>(`/brands/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
  return mapBrand(result);
};

export const deleteBrand = async (id: string): Promise<void> => {
  await request(`/brands/${id}`, { method: "DELETE" });
};

export const createCollection = async (
  payload: CreateCollectionPayload
): Promise<AdminCollection> => {
  const result = await request<{ id: number; name: string; brand?: number }>("/collections", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  const brands = await fetchBrandsAdmin();
  return mapCollection(result, brands);
};

export const createPerfume = async (
  payload: CreatePerfumePayload
): Promise<AdminPerfume> => {
  const result = await request<
    {
      id: number;
      name_fa: string;
      name_en: string;
      brand?: number;
      collection?: number;
      gender?: string;
      season?: string;
      family?: string;
      character?: string;
      notes: PerfumeNotes;
      cover?: { url?: string };
    }
  >("/perfumes", {
    method: "POST",
    body: JSON.stringify({
      ...payload,
      cover: payload.cover,
    }),
  });

  const [brands, collections] = await Promise.all([fetchBrandsAdmin(), fetchCollectionsAdmin()]);
  return mapPerfume(result, brands, collections);
};

export type UpdatePerfumePayload = CreatePerfumePayload;

export const updatePerfume = async (
  id: string,
  payload: UpdatePerfumePayload
): Promise<AdminPerfume> => {
  const result = await request<
    {
      id: number;
      name_fa: string;
      name_en: string;
      brand?: number;
      collection?: number;
      gender?: string;
      season?: string;
      family?: string;
      character?: string;
      notes: PerfumeNotes;
      cover?: { url?: string };
    }
  >(`/perfumes/${id}`, {
    method: "PUT",
    body: JSON.stringify({
      ...payload,
      cover: payload.cover,
    }),
  });

  const [brands, collections] = await Promise.all([fetchBrandsAdmin(), fetchCollectionsAdmin()]);
  return mapPerfume(result, brands, collections);
};

export const deletePerfume = async (id: string): Promise<void> => {
  await request(`/perfumes/${id}`, { method: "DELETE" });
};

export const updateCollection = async (
  id: string,
  payload: CreateCollectionPayload
): Promise<AdminCollection> => {
  const result = await request<{ id: number; name: string; brand?: number }>(`/collections/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
  const brands = await fetchBrandsAdmin();
  return mapCollection(result, brands);
};

export const deleteCollection = async (id: string): Promise<void> => {
  await request(`/collections/${id}`, { method: "DELETE" });
};

export const uploadFile = async (file: File): Promise<{ id: number; url: string }> => {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${BASE_URL}/upload`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const message = (errorData as { error?: string }).error || "آپلود فایل ناموفق بود.";
    throw new Error(message);
  }

  const data = (await response.json()) as { url?: string };
  if (!data.url) {
    throw new Error("آدرس فایل دریافت نشد.");
  }

  return { id: 0, url: data.url };
};
