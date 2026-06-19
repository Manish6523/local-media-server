import { NextResponse } from "next/server";
import os from "os";
import { getDetectedGPU } from "@/lib/gpu-detect";

export const dynamic = "force-dynamic";

export async function GET() {
  const gpu = getDetectedGPU();

  return NextResponse.json({
    platform: os.platform(),
    type: os.type(),
    release: os.release(),
    gpu: {
      type: gpu.type,
      label: gpu.label,
      encoder: gpu.encoder,
    },
  });
}
