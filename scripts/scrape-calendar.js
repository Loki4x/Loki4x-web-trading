const { chromium } = require("playwright");
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function scrape() {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  await page.goto("https://www.investing.com/economic-calendar/", {
    waitUntil: "networkidle",
  });

  const events = await page.$$eval("tr.js-event-item", (rows) =>
    rows.map((row) => ({
      event_time: row.getAttribute("data-event-datetime"),
      country: row.querySelector(".flagCur")?.textContent?.trim() ?? "",
      event_name: row.querySelector(".event")?.textContent?.trim() ?? "",
      importance: row.querySelectorAll(".grayFullBullishIcon").length,
      actual: row.querySelector(".act")?.textContent?.trim() ?? "",
      forecast: row.querySelector(".fore")?.textContent?.trim() ?? "",
      previous: row.querySelector(".prev")?.textContent?.trim() ?? "",
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
