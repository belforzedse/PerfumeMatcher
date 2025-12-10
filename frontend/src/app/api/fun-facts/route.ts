import { NextResponse } from "next/server";
import { getFunFacts } from "@/lib/fun-facts";

export async function GET() {
  try {
    const data = await getFunFacts();
    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error("[FunFacts] Failed to load facts", error);
    return NextResponse.json({ facts: [], lastUpdated: 0 }, { status: 200 });
  }
}
