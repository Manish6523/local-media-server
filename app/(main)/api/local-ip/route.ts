import os from "os";
import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const interfaces = os.networkInterfaces();
  let localIP = "localhost";

  for (const name of Object.keys(interfaces)) {
    const ifaces = interfaces[name];
    if (!ifaces) continue;
    for (const iface of ifaces) {
      if (iface.family === "IPv4" && !iface.internal) {
        localIP = iface.address;
        break;
      }
    }
  }

  const requestUrl = new URL(request.url);
  const protocol = request.headers.get("x-forwarded-proto") || requestUrl.protocol.replace(":", "");
  const port = request.headers.get("x-forwarded-port") || requestUrl.port || process.env.PORT || "2886";
  const isDefaultPort = (protocol === "http" && port === "80") || (protocol === "https" && port === "443");
  const url = `${protocol}://${localIP}${isDefaultPort ? "" : `:${port}`}`;

  return Response.json({ ip: localIP, port, url });
}
