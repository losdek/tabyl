// Export PNG sizes of the Tabyl logo kit. Usage: node export_png.cjs kit
const sharp = require("sharp"), fs = require("fs"), path = require("path");
const kit = process.argv[2], out = path.join(kit, "png");
fs.mkdirSync(out, { recursive: true });
const jobs = [
  ["icon-small-light.svg", 16, "favicon-16.png"], ["icon-small-light.svg", 32, "favicon-32.png"],
  ["icon-medium-light.svg", 48, "favicon-48.png"], ["icon-light.svg", 180, "apple-touch-icon.png"],
  ["icon-light.svg", 192, "icon-192.png"], ["icon-light.svg", 512, "icon-512.png"],
  ["icon-dark.svg", 512, "icon-512-dark.png"], ["icon-maskable.svg", 512, "icon-maskable-512.png"],
  ["tabyl-wordmark.svg", 1200, "wordmark-1200.png"], ["tabyl-wordmark-on-dark.svg", 1200, "wordmark-on-dark-1200.png"],
];
(async () => {
  for (const [src, w, name] of jobs)
    await sharp(fs.readFileSync(path.join(kit, src)), { density: 600 }).resize(w).png().toFile(path.join(out, name));
  console.log(fs.readdirSync(out).join(" "));
})();
