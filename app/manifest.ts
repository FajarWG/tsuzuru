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
        purpose: "maskable",
        sizes: "192x192",
        src: "/icon192_maskable.png",
        type: "image/png",
      },
      {
        purpose: "any",
        sizes: "192x192",
        src: "/icon192_rounded.png",
        type: "image/png",
      },
      {
        purpose: "maskable",
        sizes: "512x512",
        src: "/icon512_maskable.png",
        type: "image/png",
      },
      {
        purpose: "any",
        sizes: "512x512",
        src: "/icon512_rounded.png",
        type: "image/png",
      },
    ],
  };
}
