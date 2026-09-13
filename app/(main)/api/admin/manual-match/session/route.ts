import { isAdmin } from "@/lib/admin-session";
export function GET(request: Request) {
  return Response.json({ authorized: isAdmin(request) });
}
