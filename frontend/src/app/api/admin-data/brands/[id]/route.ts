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

  if (!id || Number.isNaN(id)) {
    return NextResponse.json({ error: "شناسه نامعتبر است" }, { status: 400 });
  }

  if (!name) {
    return NextResponse.json({ error: "نام برند الزامی است" }, { status: 400 });
  }

  let found = false;

  await persistData((data) => {
    const brand = data.brands.find((item) => item.id === id);
    if (!brand) {
      return data;
    }
    brand.name = name;
    found = true;
    return data;
  });

  if (!found) {
    return NextResponse.json({ error: "برند یافت نشد" }, { status: 404 });
  }

  return NextResponse.json({ id, name });
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
    const before = data.brands.length;
    data.brands = data.brands.filter((item) => item.id !== id);
    // cascade collections and perfumes that reference this brand
    data.collections = data.collections.filter((c) => c.brand !== id);
    data.perfumes = data.perfumes.map((p) =>
      p.brand === id
        ? { ...p, brand: undefined, collection: undefined }
        : p
    );
    removed = data.brands.length !== before;
    return data;
  });

  if (!removed) {
    return NextResponse.json({ error: "برند یافت نشد" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}

