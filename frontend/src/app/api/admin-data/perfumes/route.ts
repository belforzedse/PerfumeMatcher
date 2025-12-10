import { NextResponse } from "next/server";

import { loadData, persistData } from "@/lib/data-store";

const normaliseNotesArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return Array.from(
    new Set(
      value
        .map((item) => (typeof item === "string" ? item.trim() : ""))
        .filter((item) => item.length > 0)
    )
  );
};

const parseNotes = (notes: unknown) => ({
  top: normaliseNotesArray((notes as { top?: unknown })?.top),
  middle: normaliseNotesArray((notes as { middle?: unknown })?.middle),
  base: normaliseNotesArray((notes as { base?: unknown })?.base),
});

export async function GET() {
  const data = await loadData();
  const perfumes = data.perfumes.map((p) => ({
    ...p,
    brandName: p.brand ? data.brands.find((b) => b.id === p.brand)?.name : undefined,
    collectionName: p.collection
      ? data.collections.find((c) => c.id === p.collection)?.name
      : undefined,
  }));
  return NextResponse.json(perfumes);
}

export async function POST(request: Request) {
  const body = await request.json();
  const nameFa = (body?.name_fa as string | undefined)?.trim();
  const nameEn = (body?.name_en as string | undefined)?.trim();
  const brandIdRaw = body?.brand;
  const collectionIdRaw = body?.collection;
  const coverUrl = (body?.cover as string | undefined)?.trim();

  if (!nameFa || !nameEn) {
    return NextResponse.json({ error: "نام فارسی و انگلیسی الزامی است" }, { status: 400 });
  }

  const brandId = brandIdRaw ? Number(brandIdRaw) : undefined;
  const collectionId = collectionIdRaw ? Number(collectionIdRaw) : undefined;

  if (brandId !== undefined && Number.isNaN(brandId)) {
    return NextResponse.json({ error: "شناسه برند نامعتبر است" }, { status: 400 });
  }

  if (collectionId !== undefined && Number.isNaN(collectionId)) {
    return NextResponse.json({ error: "شناسه کالکشن نامعتبر است" }, { status: 400 });
  }

  const notes = parseNotes(body?.notes);

  let createdId = 1;

  try {
    await persistData((data) => {
      if (brandId && !data.brands.some((b) => b.id === brandId)) {
        throw new Error("برند یافت نشد");
      }
      if (collectionId && !data.collections.some((c) => c.id === collectionId)) {
        throw new Error("کالکشن یافت نشد");
      }
      const nextId = (data.perfumes.reduce((max, item) => Math.max(max, item.id), 0) || 0) + 1;
      createdId = nextId;
      data.perfumes.push({
        id: nextId,
        name_fa: nameFa,
        name_en: nameEn,
        brand: brandId,
        collection: collectionId,
        gender: body?.gender ?? undefined,
        season: body?.season ?? undefined,
        family: body?.family ?? undefined,
        character: body?.character ?? undefined,
        notes,
        cover: coverUrl ? { url: coverUrl } : undefined,
      });
      return data;
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "خطا در ثبت عطر";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  return NextResponse.json(
    { id: createdId, name_fa: nameFa, name_en: nameEn, brand: brandId, collection: collectionId },
    { status: 201 }
  );
}

