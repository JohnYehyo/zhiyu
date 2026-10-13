import { handleAuth } from "@/lib/server/auth-http";
import { readJson } from "@/lib/server/http";
import { parseRecovery } from "@/lib/auth/credentials";
import { requestPasswordRecovery } from "@/lib/auth/recovery";
import { getServerSupabase } from "@/lib/supabase/server";

export const runtime = "nodejs";
export async function POST(request: Request) {
  return handleAuth(request, async () => {
    const { email } = parseRecovery(await readJson(request));
    const client = await getServerSupabase();
    await requestPasswordRecovery(
      client.auth,
      email,
      `${new URL(request.url).origin}/auth/confirm`,
    );
    return { accepted: true };
  });
}
