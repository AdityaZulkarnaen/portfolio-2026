import type { NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/proxy";

/** Admin gate, layer 1 of 3: refresh the Supabase session, send signed-out visitors to the login. */
export function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: ["/admin/:path*"],
};
