import sharp from "sharp";

const { data, info } = await sharp("public/images/studio-pen-photo.png").resize(1000, 420).removeAlpha().raw().toBuffer({ resolveWithObject: true });
const rgb = (x, y) => [...data.subarray((y * info.width + x) * info.channels, (y * info.width + x) * info.channels + 3)];
for (const x of [32, 55, 72, 80, 100, 130, 154, 160, 200, 500, 800, 855, 865, 880, 910, 925, 950]) {
  const values = [];
  for (const y of [160, 165, 168, 170, 172, 175, 180, 185, 195, 205, 215, 222, 225, 230, 235]) {
    const [r, g, b] = rgb(x, y);
    values.push(`${y}:${r}/${g}/${b}`);
  }
  console.log(x, values.join(" "));
}
