import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Tsuzuru (綴る)",
    short_name: "Tsuzuru",
    description: "Weave your money story — お金の物語を綴ろう",
    start_url: "/",
    display: "standalone",
    background_color: "#F7F6F3",
    theme_color: "#2D5A3D",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
