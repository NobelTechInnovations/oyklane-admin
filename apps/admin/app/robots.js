// The admin is private: keep every page out of search engines.
export default function robots() {
  return { rules: [{ userAgent: "*", disallow: "/" }] };
}
