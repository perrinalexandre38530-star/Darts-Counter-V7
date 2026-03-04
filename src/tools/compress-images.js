import sharp from "sharp"
import fs from "fs"
import path from "path"

const srcDir = "./src/assets"
const outDir = "./src/assets-webp"

function walk(dir) {
  return fs.readdirSync(dir).flatMap(file => {
    const p = path.join(dir, file)
    return fs.statSync(p).isDirectory() ? walk(p) : p
  })
}

const files = walk(srcDir).filter(f => /\.(png|jpg|jpeg)$/i.test(f))

for (const file of files) {
  const rel = file.replace(srcDir, "")
  const out = path.join(outDir, rel).replace(/\.(png|jpg|jpeg)$/i, ".webp")

  fs.mkdirSync(path.dirname(out), { recursive: true })

  await sharp(file)
    .resize({ width: 800 }) // pour les tickers
    .webp({ quality: 75 })
    .toFile(out)

  console.log("✔", out)
}