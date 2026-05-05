import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, isFavorite } = body;

    if (!id || typeof isFavorite !== 'boolean') {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const db = getDb();
    
    db.prepare(`
      UPDATE media 
      SET is_favorite = ?
      WHERE id = ?
    `).run(isFavorite ? 1 : 0, id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to toggle favorite:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
