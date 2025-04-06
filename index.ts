import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import fs from "fs";

puppeteer.use(StealthPlugin());

const PRICE_RANGES = [
  { min: 2250001, max: 2500000 },
  { min: 2500001, max: 2750000 },
  { min: 2750001, max: 3000000 },
  { min: 3000001, max: 3250000 },
  { min: 3250001, max: 3500000 },
  { min: 3500001, max: 3750000 },
  { min: 3750001, max: 4000000 },
  { min: 4000001, max: 4500000 },
  { min: 4500001, max: 5500000 },
  { min: 5500001, max: 8000000 },
  { min: 8000001, max: 9000000 },
  { min: 9000001, max: null },
];

const BASE_URL = (min: number | null, max: number | null) =>
  `https://www.sahibinden.com/satilik/konya?pagingSize=50${
    min ? `&price_min=${min}` : ""
  }${max ? `&price_max=${max}` : ""}`;

const NEXT_PAGE_URL = (
  min: number | null,
  max: number | null,
  offset: number
) =>
  `https://www.sahibinden.com/satilik/konya?pagingOffset=${offset}&pagingSize=50${
    min ? `&price_min=${min}` : ""
  }${max ? `&price_max=${max}` : ""}`;

const COOKIE_PATH = "cookies.json";

const scrapePage = async (url: string) => {
  console.log("🚀 Launching browser...");
  const browser = await puppeteer.launch({
    executablePath:
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    headless: false,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-blink-features=AutomationControlled",
    ],
  });

  console.log("📝 Creating new page...");
  const page = await browser.newPage();

  console.log("🌍 Setting up headers...");
  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36"
  );
  await page.setExtraHTTPHeaders({
    "Accept-Language": "tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7",
  });

  if (fs.existsSync(COOKIE_PATH)) {
    const cookies = JSON.parse(fs.readFileSync(COOKIE_PATH, "utf-8"));
    await page.setCookie(...cookies);
    console.log("🍪 Cookies loaded successfully!");
  } else {
    console.log("⚠️ No cookies found, site might require manual login.");
  }

  console.log(`🌐 Navigating to ${url}`);
  await page.goto(url, { waitUntil: "networkidle2", timeout: 60000 });

  const cookies = await page.cookies();
  fs.writeFileSync(COOKIE_PATH, JSON.stringify(cookies, null, 2));
  console.log("✅ Cookies saved!");

  console.log("🔍 Starting data extraction...");
  const listings = await page.evaluate(() => {
    const rows = document.querySelectorAll("#searchResultsTable tbody tr");
    const data: any[] = [];

    rows.forEach((row) => {
      const id = row.getAttribute("data-id") || "";
      const titleElement = row.querySelector(
        ".searchResultsTitleValue .classifiedTitle"
      );
      const title = titleElement ? titleElement.textContent?.trim() : "";
      const link = titleElement
        ? "https://www.sahibinden.com" + titleElement.getAttribute("href")
        : "";
      const priceElement = row.querySelector(".searchResultsPriceValue span");
      const price = priceElement ? priceElement.textContent?.trim() : "";
      const areaElement = row.querySelectorAll(
        ".searchResultsAttributeValue"
      )[0];
      const area = areaElement ? areaElement.textContent?.trim() : "";
      const roomsElement = row.querySelectorAll(
        ".searchResultsAttributeValue"
      )[1];
      const rooms = roomsElement ? roomsElement.textContent?.trim() : "";
      const dateElement = row.querySelector(".searchResultsDateValue span");
      const date = dateElement ? dateElement.textContent?.trim() : "";
      const locationElement = row.querySelector(".searchResultsLocationValue");
      const location = locationElement
        ? locationElement.textContent?.trim().replace(/\n/g, " ")
        : "";

      if (id && title) {
        data.push({ id, title, link, price, area, rooms, date, location });
      }
    });

    return data;
  });

  console.log(`✅ Extracted ${listings.length} listings from the page`);
  await browser.close();
  return listings;
};

const scrapeAllPages = async () => {
  let allListings: any[] = [];

  console.log("🚀 Starting scraping process...");
  for (const range of PRICE_RANGES) {
    let offset = 0;
    while (true) {
      const url =
        offset === 0
          ? BASE_URL(range.min, range.max)
          : NEXT_PAGE_URL(range.min, range.max, offset);
      console.log(`📄 Processing: ${url}`);

      const listings = await scrapePage(url);
      if (listings.length === 0) {
        console.warn("⚠️ No data found, moving to next price range.");
        break;
      }

      allListings = [...allListings, ...listings];
      fs.writeFileSync(
        "data.json",
        JSON.stringify(allListings, null, 2),
        "utf-8"
      );

      offset += 50;
      console.log("⏳ Waiting 2 seconds before next page...");
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }

  console.log(`🎉 Scraping completed! Total listings: ${allListings.length}`);
};

scrapeAllPages().catch((error) => {
  console.error("❌ Error during scraping:", error);
  process.exit(1);
});
