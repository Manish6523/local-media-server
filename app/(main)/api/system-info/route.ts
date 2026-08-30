import { NextResponse } from "next/server";
import os from "os";
import { getDetectedGPU } from "@/lib/gpu-detect";
import pkg from "@/package.json";

export const dynamic = "force-dynamic";

export async function GET() {
  const gpu = getDetectedGPU();

  return NextResponse.json({
    platform: os.platform(),
    type: os.type(),
    release: os.release(),
    version: pkg.version || "0.1.0",
    gpu: {
      type: gpu.type,
      label: gpu.label,
      encoder: gpu.encoder,
    },
  });
}
