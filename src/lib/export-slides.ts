import puppeteer, { type Browser } from "puppeteer";
import { readFile } from "fs/promises";
import path from "path";
import sharp from "sharp";
import { wrapSlideHtml, extractFontFamilies } from "./slide-html";
import { getInlinedFontCSS } from "./fonts";
import type { Slide, AspectRatio } from "@/types/carousel";
import { DIMENSIONS } from "@/types/carousel";

let browser: Browser | null = null;
let exportCount = 0;
const MAX_EXPORTS_BEFORE_RESTART = 20;

async function launchBrowser(): Promise<Browser> {
  browser = await puppeteer.launch({
    headless: true,
    protocolTimeout: 120_000,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-gpu",
      "--disable-dev-shm-usage",
      "--no-zygote",
      "--single-process",
      "--disable-accelerated-2d-canvas",
      "--disable-extensions",
    ],
  });
  exportCount = 0;
  browser.on("disconnected", () => { browser = null; });
  return browser;
}

async function getBrowser(): Promise<Browser> {
  if (browser && exportCount >= MAX_EXPORTS_BEFORE_RESTART) {
    await browser.close().catch(() => {});
    browser = null;
  }
  if (!browser || !browser.isConnected()) {
    browser = await launchBrowser();
  }
  return browser;
}

async function inlineImages(html: string): Promise<string> {
  const uploadDir = path.resolve(process.cwd(), "public");
  const imgRegex = /(?:src=["']|url\(["']?)(\/uploads\/[^"'\s)]+)/g;
  const matches = [...html.matchAll(imgRegex)];

  let result = html;
  for (const match of matches) {
    const imgPath = match[1];
    try {
      const fullPath = path.join(uploadDir, imgPath);
      const buffer = await readFile(fullPath);
      const ext = path.extname(imgPath).toLowerCase();
      const mime =
        ext === ".png" ? "image/png" :
        ext === ".jpg" || ext === ".jpeg" ? "image/jpeg" :
        "image/webp";
      result = result.replace(imgPath, `data:${mime};base64,${buffer.toString("base64")}`);
    } catch {
      // Keep original path
    }
  }
  return result;
}

export async function exportSlide(
  slide: Slide,
  aspectRatio: AspectRatio
): Promise<Buffer> {
  const { width, height } = DIMENSIONS[aspectRatio];
  const fontFamilies = extractFontFamilies(slide.html);
  const inlinedFontCss = await getInlinedFontCSS(fontFamilies);
  const inlinedHtml = await inlineImages(slide.html);
  const fullHtml = wrapSlideHtml(inlinedHtml, aspectRatio, { inlineFontCss: inlinedFontCss });

  // Retry once if browser crashes mid-export
  for (let attempt = 0; attempt < 2; attempt++) {
    let page;
    try {
      const br = await getBrowser();
      page = await br.newPage();
      await page.setViewport({ width, height, deviceScaleFactor: 1 });
      await page.setContent(fullHtml, { waitUntil: "domcontentloaded", timeout: 15000 });
      await page.waitForFunction(
        () => document.fonts.ready.then(() => [...document.fonts].every((f) => f.status === "loaded")),
        { timeout: 8000 }
      ).catch(() => {});

      const screenshotBuffer = await page.screenshot({
        type: "png",
        clip: { x: 0, y: 0, width, height },
      });

      exportCount++;

      return await sharp(screenshotBuffer).toColorspace("srgb").png().toBuffer();
    } catch (err) {
      // Browser crashed — kill it and retry once
      if (attempt === 0) {
        await browser?.close().catch(() => {});
        browser = null;
        continue;
      }
      throw err;
    } finally {
      await page?.close().catch(() => {});
    }
  }

  throw new Error("Export failed after retry");
}

// Sequential export — one slide at a time to avoid OOM in Docker
export async function exportAllSlides(
  slides: Slide[],
  aspectRatio: AspectRatio,
  onProgress?: (current: number, total: number) => void
): Promise<{ name: string; buffer: Buffer }[]> {
  const results: { name: string; buffer: Buffer }[] = [];

  for (let i = 0; i < slides.length; i++) {
    const buffer = await exportSlide(slides[i], aspectRatio);
    onProgress?.(i + 1, slides.length);
    results.push({ name: `slide-${i + 1}.png`, buffer });
  }

  return results;
}
