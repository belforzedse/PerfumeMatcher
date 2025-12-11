import { NextResponse } from "next/server";

import { persistData } from "@/lib/data-store";

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

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: idString } = await params;
  const id = Number(idString);
  const body = await request.json();

  if (!id || Number.isNaN(id)) {
    return NextResponse.json({ error: "شناسه نامعتبر است" }, { status: 400 });
  }

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
  let found = false;

  try {
    await persistData((data) => {
      if (brandId && !data.brands.some((b) => b.id === brandId)) {
        throw new Error("برند یافت نشد");
      }
      if (collectionId && !data.collections.some((c) => c.id === collectionId)) {
        throw new Error("کالکشن یافت نشد");
      }
      const perfume = data.perfumes.find((p) => p.id === id);
      if (!perfume) {
        return data;
      }
      perfume.name_fa = nameFa;
      perfume.name_en = nameEn;
      perfume.brand = brandId;
      perfume.collection = collectionId;
      perfume.gender = body?.gender ?? undefined;
      perfume.season = body?.season ?? undefined;
      perfume.family = body?.family ?? undefined;
      perfume.character = body?.character ?? undefined;
      perfume.notes = notes;
    if (coverUrl) {
      perfume.cover = { url: coverUrl };
    }
      found = true;
      return data;
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "خطا در بروزرسانی عطر";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  if (!found) {
    return NextResponse.json({ error: "عطر یافت نشد" }, { status: 404 });
  }

  return NextResponse.json({ id, name_fa: nameFa, name_en: nameEn, brand: brandId, collection: collectionId });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: idString } = await params;
  const id = Number(idString);
  if (!id || Number.isNaN(id)) {
    return NextResponse.json({ error: "شناسه نامعتبر است" }, { status: 400 });
  }

  let removed = false;

  await persistData((data) => {
    const before = data.perfumes.length;
    data.perfumes = data.perfumes.filter((p) => p.id !== id);
    removed = data.perfumes.length !== before;
    return data;
  });

  if (!removed) {
    return NextResponse.json({ error: "عطر یافت نشد" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}

