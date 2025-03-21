import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import fs from "fs";

puppeteer.use(StealthPlugin());

const COOKIE_PATH = "cookies.json";
const DATA_PATH = "data.json";
const OUTPUT_PATH = "data-new-list.json";
interface Reading {
  id: string;
  title: string;
  link: string;
  price: string;
  area: string;
  rooms: string;
  date: string;
  location: string;
}
interface Listing {
  ilanNo: string;
  ilanTarihi: string;
  emlakTipi: string;
  brutM2: string;
  netM2: string;
  odaSayisi: string;
  binaYasi: string;
  bulunduguKat: string;
  katSayisi: string;
  isitma: string;
  banyoSayisi: string;
  mutfak: string;
  balkon: string;
  asansor: string;
  otopark: string;
  esyali: string;
  kullanimDurumu: string;
  siteIcerisinde: string;
  siteAdi: string;
  aidat: string;
  krediyeUygun: string;
  tapuDurumu: string;
  kimden: string;
  takas: string;
}

const scrapePage = async (url: string): Promise<Listing | null> => {
  console.log(`🌐 Navigating to ${url}`);
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

  const page = await browser.newPage();
  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36"
  );

  if (fs.existsSync(COOKIE_PATH)) {
    const cookies = JSON.parse(fs.readFileSync(COOKIE_PATH, "utf-8"));
    await page.setCookie(...cookies);
  }

  await page.goto(url, { waitUntil: "networkidle2", timeout: 60000 });

  const data = await page.evaluate(() => {
    const getText = (selector: string) =>
      document.querySelector(selector)?.textContent?.trim() || "";
    return {
      ilanNo: getText("#classifiedId"),
      ilanTarihi: getText(".classifiedInfoList li:nth-child(2) span"),
      emlakTipi: getText(".classifiedInfoList li:nth-child(3) span"),
      brutM2: getText(".classifiedInfoList li:nth-child(4) span"),
      netM2: getText(".classifiedInfoList li:nth-child(5) span"),
      odaSayisi: getText(".classifiedInfoList li:nth-child(6) span"),
      binaYasi: getText(".classifiedInfoList li:nth-child(7) span"),
      bulunduguKat: getText(".classifiedInfoList li:nth-child(8) span"),
      katSayisi: getText(".classifiedInfoList li:nth-child(9) span"),
      isitma: getText(".classifiedInfoList li:nth-child(10) span"),
      banyoSayisi: getText(".classifiedInfoList li:nth-child(11) span"),
      mutfak: getText(".classifiedInfoList li:nth-child(12) span"),
      balkon: getText(".classifiedInfoList li:nth-child(13) span"),
      asansor: getText(".classifiedInfoList li:nth-child(14) span"),
      otopark: getText(".classifiedInfoList li:nth-child(15) span"),
      esyali: getText(".classifiedInfoList li:nth-child(16) span"),
      kullanimDurumu: getText(".classifiedInfoList li:nth-child(17) span"),
      siteIcerisinde: getText(".classifiedInfoList li:nth-child(18) span"),
      siteAdi: getText(".classifiedInfoList li:nth-child(19) span"),
      aidat: getText(".classifiedInfoList li:nth-child(20) span"),
      krediyeUygun: getText(".classifiedInfoList li:nth-child(21) span"),
      tapuDurumu: getText(".classifiedInfoList li:nth-child(22) span"),
      kimden: getText(".classifiedInfoList li:nth-child(23) span"),
      takas: getText(".classifiedInfoList li:nth-child(24) span"),
    };
  });

  await browser.close();
  return data;
};

const scrapeAllListings = async () => {
  if (!fs.existsSync(DATA_PATH)) {
    console.error("❌ data.json bulunamadı!");
    return;
  }

  const jsonData = JSON.parse(fs.readFileSync(DATA_PATH, "utf-8"));
  const urls: string[] = jsonData.map((item: Reading) => item.link);

  for (const url of urls) {
    const data = await scrapePage(url);
    if (data) {
      let listings: Listing[] = [];
      if (fs.existsSync(OUTPUT_PATH)) {
        listings = JSON.parse(fs.readFileSync(OUTPUT_PATH, "utf-8"));
      }
      listings.push(data);
      fs.writeFileSync(OUTPUT_PATH, JSON.stringify(listings, null, 2), "utf-8");
      console.log(`✅ ${url} kaydedildi!`);
    }
  }

  console.log("🎉 Scraping tamamlandı!");
};

scrapeAllListings().catch((error) => {
  console.error("❌ Scraping sırasında hata oluştu:", error);
  process.exit(1);
});
