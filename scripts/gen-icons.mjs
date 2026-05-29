import sharp from "sharp";

// Ícono "rounded" (esquinas redondeadas) para uso general / Apple.
const rounded = `
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#16225c"/>
      <stop offset="1" stop-color="#2b3aa1"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="112" fill="url(#g)"/>
  <circle cx="248" cy="236" r="118" fill="none" stroke="#ffffff" stroke-width="22"/>
  <line x1="248" y1="236" x2="248" y2="166" stroke="#ffffff" stroke-width="20" stroke-linecap="round"/>
  <line x1="248" y1="236" x2="300" y2="262" stroke="#ffffff" stroke-width="20" stroke-linecap="round"/>
  <circle cx="338" cy="322" r="60" fill="#55cd6c" stroke="#16225c" stroke-width="14"/>
  <path d="M312 322 l17 17 l32 -36" fill="none" stroke="#0f1840" stroke-width="17" stroke-linecap="round" stroke-linejoin="round"/>
  <text x="256" y="446" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="62" font-weight="800" fill="#ffffff" letter-spacing="6">ICB</text>
</svg>`;

// Versión "maskable": fondo a sangre completa (sin esquinas transparentes)
// y contenido dentro de la zona segura (~80%).
const maskable = `
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="g2" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#16225c"/>
      <stop offset="1" stop-color="#2b3aa1"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" fill="url(#g2)"/>
  <g transform="translate(256,256) scale(0.74) translate(-256,-256)">
    <circle cx="248" cy="236" r="118" fill="none" stroke="#ffffff" stroke-width="22"/>
    <line x1="248" y1="236" x2="248" y2="166" stroke="#ffffff" stroke-width="20" stroke-linecap="round"/>
    <line x1="248" y1="236" x2="300" y2="262" stroke="#ffffff" stroke-width="20" stroke-linecap="round"/>
    <circle cx="338" cy="322" r="60" fill="#55cd6c" stroke="#16225c" stroke-width="14"/>
    <path d="M312 322 l17 17 l32 -36" fill="none" stroke="#0f1840" stroke-width="17" stroke-linecap="round" stroke-linejoin="round"/>
    <text x="256" y="446" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="62" font-weight="800" fill="#ffffff" letter-spacing="6">ICB</text>
  </g>
</svg>`;

const r = Buffer.from(rounded);
const m = Buffer.from(maskable);

await Promise.all([
  sharp(r).resize(512, 512).png().toFile("public/icon-512.png"),
  sharp(r).resize(192, 192).png().toFile("public/icon-192.png"),
  sharp(m).resize(512, 512).png().toFile("public/icon-maskable-512.png"),
  // Apple: cuadrado opaco (iOS aplica su propia máscara redondeada).
  sharp(m).resize(180, 180).png().toFile("public/apple-touch-icon.png"),
]);

// Favicon (pestaña del navegador): logo de marca ICB sobre fondo blanco cuadrado.
const faviconBase = await sharp({
  create: { width: 512, height: 512, channels: 4, background: "#ffffff" },
})
  .composite([
    {
      input: await sharp("public/icb-logo.png")
        .resize(472, 472, {
          fit: "contain",
          background: { r: 255, g: 255, b: 255, alpha: 0 },
        })
        .toBuffer(),
      gravity: "center",
    },
  ])
  .png()
  .toBuffer();

await Promise.all([
  sharp(faviconBase).resize(192, 192).png().toFile("public/favicon-192.png"),
  sharp(faviconBase).resize(48, 48).png().toFile("public/favicon-48.png"),
  sharp(faviconBase).resize(32, 32).png().toFile("public/favicon-32.png"),
]);

console.log("Iconos generados ✔");
