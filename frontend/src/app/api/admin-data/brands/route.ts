import { NextResponse } from "next/server";

import { loadData, persistData } from "@/lib/data-store";

export async function GET() {
  const data = await loadData();
  return NextResponse.json(data.brands);
}

export async function POST(request: Request) {
  const body = await request.json();
  const name = (body?.name as string | undefined)?.trim();

  if (!name) {
    return NextResponse.json({ error: "نام برند الزامی است" }, { status: 400 });
  }

  let createdId = 1;

  await persistData((data) => {
    const nextId = (data.brands.reduce((max, item) => Math.max(max, item.id), 0) || 0) + 1;
    createdId = nextId;
    data.brands.push({ id: nextId, name });
    return data;
  });

  return NextResponse.json({ id: createdId, name }, { status: 201 });
}

