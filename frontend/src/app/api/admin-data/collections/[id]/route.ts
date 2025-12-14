import { NextResponse } from "next/server";

import { loadData, persistData } from "@/lib/data-store";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: idString } = await params;
  const id = Number(idString);
  const body = await request.json();
  const name = (body?.name as string | undefined)?.trim();
  const brandIdRaw = body?.brandId ?? body?.brand;
  const brandId = brandIdRaw ? Number(brandIdRaw) : undefined;

  if (!id || Number.isNaN(id)) {
    return NextResponse.json({ error: "شناسه نامعتبر است" }, { status: 400 });
  }

  if (!name) {
    return NextResponse.json({ error: "نام کالکشن الزامی است" }, { status: 400 });
  }

  let found = false;

  try {
    await persistData((data) => {
      if (brandId && !data.brands.some((b) => b.id === brandId)) {
        throw new Error("برند یافت نشد");
      }
      const collection = data.collections.find((item) => item.id === id);
      if (!collection) {
        return data;
      }
      collection.name = name;
      collection.brand = brandId;
      // detach perfumes referencing if brand removed
      data.perfumes = data.perfumes.map((p) =>
        p.collection === id ? { ...p, collection: brandId ? id : undefined } : p
      );
      found = true;
      return data;
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "خطا در به‌روزرسانی کالکشن";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  if (!found) {
    return NextResponse.json({ error: "کالکشن یافت نشد" }, { status: 404 });
  }

  return NextResponse.json({ id, name, brand: brandId });
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
    const before = data.collections.length;
    data.collections = data.collections.filter((item) => item.id !== id);
    data.perfumes = data.perfumes.map((p) =>
      p.collection === id ? { ...p, collection: undefined } : p
    );
    removed = data.collections.length !== before;
    return data;
  });

  if (!removed) {
    return NextResponse.json({ error: "کالکشن یافت نشد" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}

