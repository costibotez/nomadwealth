import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/auth";
import { getSetupState } from "@/lib/setup-state";

/**
 * Gate: every route is protected except /login, the login API, and static
 * assets. Unauthenticated requests are redirected to /login.
 *
 * SEAM: to move to NextAuth, replace the body with NextAuth's middleware.
 */
// Read-only share links are public at the edge: the token in the URL is the
// credential, and the /share/[token] route itself validates it against the DB
// (in Node) and gates which tabs render. No session cookie is ever issued for a
// share viewer. Because /share is public, a viewer COULD attempt to POST a
// Server Action from a share page — every mutating action therefore calls
// `requireSession()` (see lib/auth-actions.ts), so such a POST is rejected.
const PUBLIC_PATHS = [
  "/login",
  "/api/auth/login",
  "/api/cron",
  "/api/webhooks", // Stripe license-issuance webhook (vendor side)
  "/share",
];

// Routes reachable while the install is still unconfigured (the setup wizard
// and the APIs it drives). Everything else redirects to /setup until done.
const SETUP_PATHS = [
  "/setup",
  "/api/setup",
  "/api/license/activate",
  "/api/owner",
];

// Public marketing / metadata surfaces. Always reachable — before setup, after
// setup, logged in or out — so the sales page and SEO files are never gated.
const MARKETING_PATHS = [
  "/", // public landing (exact match only — see the check below)
  "/welcome",
  "/cockpit",
  "/demo", // public, fabricated-data walkthrough — see src/lib/demo-fixtures.ts
  "/security",
  "/feedback",
  "/changelog",
  "/legal",
  "/sitemap.xml",
  "/robots.txt",
  "/llms.txt",
  "/opengraph-image",
  "/manifest.webmanifest",
];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (
    MARKETING_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))
  ) {
    return NextResponse.next();
  }

  // ---- First-run setup guard ------------------------------------------------
  // Fast-path: a signed `nw_configured` cookie (set on setup completion) lets
  // warm requests skip the DB check. Otherwise consult the DB once and, if
  // configured, stamp the cookie onto the response so future requests are fast.
  const isSetupPath = SETUP_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + "/"),
  );
  let configured = req.cookies.get("nw_configured")?.value === "1";
  let stampCookie = false;
  if (!configured) {
    const state = await getSetupState();
    configured = state.configured;
    stampCookie = configured;
  }

  if (!configured) {
    // Unconfigured: force the wizard (allow only the setup surface + statics).
    if (isSetupPath) return NextResponse.next();
    return NextResponse.redirect(new URL("/setup", req.url));
  }

  // Configured: /setup is done — send stray visits to the dashboard.
  if (pathname === "/setup") {
    const res = NextResponse.redirect(new URL("/dashboard", req.url));
    if (stampCookie) res.cookies.set("nw_configured", "1", { path: "/" });
    return res;
  }

  const withConfigCookie = (res: NextResponse) => {
    if (stampCookie) res.cookies.set("nw_configured", "1", { path: "/" });
    return res;
  };

  // ---- Session gate ---------------------------------------------------------
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return withConfigCookie(NextResponse.next());
  }

  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    // Fail closed: if the secret is missing the app is misconfigured.
    return NextResponse.redirect(new URL("/login?error=config", req.url));
  }

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const session = await verifySession(token, secret);

  if (!session) {
    const url = new URL("/login", req.url);
    if (pathname !== "/") url.searchParams.set("from", pathname);
    return withConfigCookie(NextResponse.redirect(url));
  }

  return withConfigCookie(NextResponse.next());
}

export const config = {
  // Run on everything except Next internals and obvious static files.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
