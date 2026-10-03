// delete-account — deletes the signed-in member's own account.
//
// Corrects the version deployed when the project was scaffolded, which read
// `ctx.userClaims?.sub`. @supabase/server's UserClaims carries the subject as `id`
// (it maps `id: jwtClaims.sub`), so that read was always undefined and every caller
// got 401: account deletion could never succeed. The import is also pinned to a
// major version, because an unpinned `npm:` specifier resolves at deploy time.
//
// Contract:
//   POST /functions/v1/delete-account with the member's bearer token. No body.
//   There is no target-id parameter: the account deleted is always the caller's.
//   200 {"deleted": true} · 401 {"error": "Unauthorized"} · 405 · 500 {"error": "Account deletion failed"}
//   Every member table references auth.users ON DELETE CASCADE, so the row
//   delete removes the member's profile, progress, plans, requests and notifications.
//   withSupabase answers the CORS preflight itself.
//
// Deploy (principal): Dashboard → Edge Functions → delete-account → replace the
// source with this file, or `supabase functions deploy delete-account`. Keep
// "Verify JWT" off at the gateway — withSupabase({ auth: "user" }) does the check.
import { withSupabase } from "npm:@supabase/server@1";

export default {
  fetch: withSupabase({ auth: "user" }, async (req, ctx) => {
    if (req.method !== "POST") {
      return Response.json({ error: "Method not allowed" }, { status: 405 });
    }

    const userId = ctx.userClaims?.id;
    if (!userId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { error } = await ctx.supabaseAdmin.auth.admin.deleteUser(userId);
    if (error) {
      return Response.json({ error: "Account deletion failed" }, { status: 500 });
    }

    return Response.json({ deleted: true });
  }),
};
