import fs from "fs";
import path from "path";
import matter from "gray-matter";

const koDir = path.join(process.cwd(), "posts", "ko");
const enDir = path.join(process.cwd(), "posts", "en");
const outPath = path.join(process.cwd(), "src", "locales", "term-map.json");

const koToEn = {};
const enToKo = {};

if (fs.existsSync(koDir) && fs.existsSync(enDir)) {
  const koFiles = fs.readdirSync(koDir).filter((f) => f.endsWith(".md"));

  for (const file of koFiles) {
    const enPath = path.join(enDir, file);
    if (!fs.existsSync(enPath)) continue;

    const koData = matter(fs.readFileSync(path.join(koDir, file), "utf8")).data;
    const enData = matter(fs.readFileSync(enPath, "utf8")).data;

    // Map tags by position (same slug = same post = tags in same order)
    const koTags = koData.tags || [];
    const enTags = enData.tags || [];
    for (let i = 0; i < Math.min(koTags.length, enTags.length); i++) {
      if (koTags[i] !== enTags[i]) {
        koToEn[koTags[i]] = enTags[i];
        enToKo[enTags[i]] = koTags[i];
      }
    }

    // Map series
    if (koData.series && enData.series && koData.series !== enData.series) {
      koToEn[koData.series] = enData.series;
      enToKo[enData.series] = koData.series;
    }
  }
}

fs.writeFileSync(outPath, JSON.stringify({ koToEn, enToKo }, null, 2));
console.log(`Term map generated: ${Object.keys(koToEn).length} entries`);
