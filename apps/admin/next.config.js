// Security headers on every page: no MIME sniffing, no full URLs leaked to
// other sites, HTTPS remembered, plugins off, and the app can't be framed by
// another site (clickjacking).
const SECURITY_HEADERS = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Strict-Transport-Security", value: "max-age=31536000" },
  { key: "X-Permitted-Cross-Domain-Policies", value: "none" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'self'; base-uri 'self'; object-src 'none'" },
  { key: "Permissions-Policy", value: "microphone=(), geolocation=(), payment=(self \"https://checkout.razorpay.com\" \"https://api.razorpay.com\")" },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Internal workspace packages ship raw JSX/ESM source (no build step of
  // their own) — Next needs to compile them together with app code.
  transpilePackages: ["@shopcycle/ui"],
  // Next's build defaults to one worker process per detected CPU core —
  // fine on a dedicated box, but on shared hosting (Hostinger et al.) the
  // account's actual process quota is far smaller than the host machine's
  // real core count, so that default spawns more child processes than the
  // account is allowed and the build dies with `spawn ... EAGAIN`. Capped
  // low here since it costs nothing on a real dev machine either.
  experimental: { cpus: 2 },
  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },
};

module.exports = nextConfig;
