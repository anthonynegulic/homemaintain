import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Home maintenance",
    short_name: "Home",
    start_url: "/",
    display: "standalone",
    background_color: "#0C211A",
    theme_color: "#0C211A",
    icons: [
      { src: "/icon", sizes: "512x512", type: "image/png" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
