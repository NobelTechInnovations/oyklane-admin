// Merchant app: the dashboard installs on a phone or desktop as an app
// ("Add to Home screen" / "Install"), opening full screen on Orders.
export default function manifest() {
  return {
    name: "Oyklane Seller",
    short_name: "Oyklane",
    description: "Run your store: orders, products, customers and the point of sale.",
    start_url: "/admin",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#ffffff",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
  };
}
