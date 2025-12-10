import { NextResponse } from "next/server";

import { loadData, persistData } from "@/lib/data-store";

export async function GET() {
  const data = await loadData();
  const collections = data.collections.map((collection) => ({
    ...collection,
    brandName: data.brands.find((b) => b.id === collection.brand)?.name,
  }));
  return NextResponse.json(collections);
}

export async function POST(request: Request) {
  const body = await request.json();
  const name = (body?.name as string | undefined)?.trim();
  const brandIdRaw = body?.brandId ?? body?.brand;
  const brandId = brandIdRaw ? Number(brandIdRaw) : undefined;

  if (!name) {
    return NextResponse.json({ error: "نام کالکشن الزامی است" }, { status: 400 });
  }

  if (brandId !== undefined && Number.isNaN(brandId)) {
    return NextResponse.json({ error: "شناسه برند نامعتبر است" }, { status: 400 });
  }

  let createdId = 1;

  try {
    await persistData((data) => {
      if (brandId && !data.brands.some((b) => b.id === brandId)) {
        throw new Error("برند یافت نشد");
      }
      const nextId = (data.collections.reduce((max, item) => Math.max(max, item.id), 0) || 0) + 1;
      createdId = nextId;
      data.collections.push({ id: nextId, name, brand: brandId });
      return data;
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "خطا در ثبت کالکشن";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  return NextResponse.json({ id: createdId, name, brand: brandId }, { status: 201 });
}

