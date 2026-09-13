const { chromium } = require("playwright");
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function scrape() {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  await page.goto("https://www.myfxbook.com/forex-economic-calendar", {
    waitUntil: "networkidle",
    timeout: 30000,
  });

  console.log("Judul halaman:", await page.title());
  await page.screenshot({ path: "debug-screenshot.png", fullPage: true });

  const events = await page.$$eval("tr.economicCalendarRow", (rows) =>
    rows.map((row) => ({
      event_time: row.getAttribute("data-event-datetime") ?? "",
      country: row.querySelector(".flag")?.getAttribute("title") ?? "",
      event_name: row.querySelector(".left")?.textContent?.trim() ?? "",
      importance: row.querySelectorAll(".volatility span.on").length,
      actual: row.querySelector(".actual")?.textContent?.trim() ?? "",
      forecast: row.querySelector(".consensus")?.textContent?.trim() ?? "",
      previous: row.querySelector(".previous")?.textContent?.trim() ?? "",
    }))
  );

  await browser.close();

  if (events.length > 0) {
    const { error } = await supabase.from("economic_calendar_events").insert(events);
    if (error) console.error("Gagal simpan ke Supabase:", error);
    else console.log(`Berhasil simpan ${events.length} event`);
  } else {
    console.log("Nggak ada data yang kescrape — kemungkinan selector perlu diupdate");
  }
}

scrape();
