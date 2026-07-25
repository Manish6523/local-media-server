import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const username = process.env.TURN_USERNAME || "";
  const credential = process.env.TURN_CREDENTIAL || "";

  return NextResponse.json({
    iceServers: [
      { urls: "stun:stun.metered.ca:80" },
      {
        urls: "turn:standard.relay.metered.ca:80",
        username,
        credential,
      },
      {
        urls: "turn:standard.relay.metered.ca:80?transport=tcp",
        username,
        credential,
      },
      {
        urls: "turn:standard.relay.metered.ca:443",
        username,
        credential,
      },
      {
        urls: "turn:standard.relay.metered.ca:443?transport=tcp",
        username,
        credential,
      },
    ],
  });
}
