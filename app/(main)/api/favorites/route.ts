import { NextRequest, NextResponse } from "next/server";
import { getAllMedia, MediaEntry } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limitParam = searchParams.get("limit");
    
    const all = getAllMedia();
    const favorites = all.filter(m => m.is_favorite === 1);

    return NextResponse.json(favorites);
  } catch (error) {
    console.error("Failed to fetch favorites:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
