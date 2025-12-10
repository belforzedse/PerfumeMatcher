import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  return NextResponse.json(
    { error: "Use backend /api/recommend/ directly" },
    { status: 400 }
  );
}

