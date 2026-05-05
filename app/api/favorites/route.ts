import { NextRequest, NextResponse } from "next/server";
import { getDb, MediaEntry } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limitParam = searchParams.get("limit");
    
    const db = getDb();
    
    let query = "SELECT * FROM media WHERE is_favorite = 1 ORDER BY rating DESC";
    
    if (limitParam) {
      query += ` LIMIT ${parseInt(limitParam, 10)}`;
    }

    const favorites = db.prepare(query).all() as MediaEntry[];

    return NextResponse.json(favorites);
  } catch (error) {
    console.error("Failed to fetch favorites:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
