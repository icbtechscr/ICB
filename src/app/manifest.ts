import type { MetadataRoute } from "next";

// Web App Manifest: permite "instalar" la página como app en el celular.
// start_url = /marcar para que el ícono abra directo el marcaje del colaborador.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ICB Marcaje",
    short_name: "ICB Marcaje",
    description:
      "Marcaje de horario para colaboradores de ICB Technologies.",
    start_url: "/marcar",
    scope: "/",
    display: "standalone",
    background_color: "#0f1840",
    theme_color: "#0f1840",
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
      {
        src: "/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
