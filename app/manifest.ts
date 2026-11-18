import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "WestBrook Wall",
    short_name: "WestBrook",
    description: "WestBrook Hotel reception wall player",
    start_url: "/player",
    display: "fullscreen",
    display_override: ["fullscreen", "standalone"],
    orientation: "portrait-primary",
    background_color: "#121722",
    theme_color: "#121722",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
