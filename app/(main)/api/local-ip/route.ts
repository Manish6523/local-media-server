import os from "os";

export const dynamic = "force-dynamic";

export async function GET() {
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

  const url = `http://${localIP}:3000`;
  return Response.json({ ip: localIP, url });
}
