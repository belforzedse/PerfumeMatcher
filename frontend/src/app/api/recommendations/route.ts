import { NextResponse } from "next/server";

// Frontend API route removed; use backend Django endpoints directly.
export function GET() {
  return NextResponse.json(
    { error: "Use backend /api/recommend/ and /api/recommend/rerank/ directly" },
    { status: 410 }
  );
}

export function POST() {
  return NextResponse.json(
    { error: "Use backend /api/recommend/ and /api/recommend/rerank/ directly" },
    { status: 410 }
  );
}

