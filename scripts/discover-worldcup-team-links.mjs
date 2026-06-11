import { writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright-core";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

const WORLD_CUP_URL =
  "https://www.thesportsdb.com/league/4429-fifa-world-cup";

const chromeUserDataDir =
  process.env.CHROME_USER_DATA_DIR ||
  path.resolve(process.cwd(), ".playwright-thesportsdb-profile");
const chromeExecutablePath =
  process.env.CHROME_EXECUTABLE_PATH ||
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const outputPath =
  process.env.OUTPUT_PATH ||
  path.resolve(process.cwd(), "worldcup-team-links.json");

async function getSessionState(page) {
  return page.evaluate(() => {
    const links = Array.from(document.querySelectorAll("a")).map((link) => ({
      text: link.textContent?.trim() || "",
      href: link.href || "",
    }));

    const hasLogin = links.some(
      (link) => /login/i.test(link.text) || /\/login/i.test(link.href)
    );
    const hasSignup = links.some(
      (link) => /signup|sign up/i.test(link.text) || /\/signup/i.test(link.href)
    );
    const hasLogout = links.some(
      (link) => /logout|log out/i.test(link.text) || /\/logout/i.test(link.href)
    );
    const hasAccount = links.some(
      (link) => /profile|account|dashboard/i.test(link.text + " " + link.href)
    );

    return {
      hasLogin,
      hasSignup,
      hasLogout,
      hasAccount,
      loggedIn: hasLogout || hasAccount || (!hasLogin && !hasSignup),
    };
  });
}

if (!chromeUserDataDir) {
  console.error(
    "Missing Chrome profile information. Set CHROME_USER_DATA_DIR."
  );
  console.error(
    'Example: CHROME_USER_DATA_DIR=".playwright-thesportsdb-profile"'
  );
  process.exit(1);
}

const context = await chromium.launchPersistentContext(chromeUserDataDir, {
  executablePath: chromeExecutablePath,
  headless: false,
  viewport: { width: 1440, height: 1000 },
});

try {
  const page = context.pages()[0] || (await context.newPage());

  await page.goto(WORLD_CUP_URL, {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });

  console.log(`Opened: ${WORLD_CUP_URL}`);
  let session = await getSessionState(page);

  if (!session.loggedIn) {
    console.log("TheSportsDB does not look logged in yet.");
    console.log("Log in in the browser window, then come back here.");

    const rl = createInterface({ input, output });
    await rl.question("Press Enter here after login is complete...");
    rl.close();

    await page.goto(WORLD_CUP_URL, {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });

    session = await getSessionState(page);
  }

  if (!session.loggedIn) {
    throw new Error(
      "Chrome profile does not appear logged in on TheSportsDB. I still see Login/Signup links."
    );
  }

  const teams = await page.evaluate(() => {
    function findTextY(pattern) {
      const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT
      );

      while (walker.nextNode()) {
        const text = walker.currentNode.textContent?.replace(/\s+/g, " ").trim();

        if (!text || !pattern.test(text)) {
          continue;
        }

        const element = walker.currentNode.parentElement;
        const rect = element?.getBoundingClientRect();

        if (rect && rect.height > 0) {
          return rect.top;
        }
      }

      return null;
    }

    const teamsStartY = findTextY(/^Teams$/i);
    const teamsEndY =
      findTextY(/^(Trophy Icon|Last 5 winners|Fanart|Banner)$/i) ??
      Number.POSITIVE_INFINITY;
    const seen = new Set();
    const teamLinks = Array.from(
      document.querySelectorAll('a[href*="/team/"]')
    ).filter((link) => {
      if (teamsStartY === null) {
        return true;
      }

      const rect = link.getBoundingClientRect();

      return rect.top >= teamsStartY && rect.top < teamsEndY;
    });

    return teamLinks
      .map((link) => {
        const url = new URL(link.href, window.location.href).toString();
        const name = link.textContent?.replace(/\s+/g, " ").trim() || "";

        return { name, url };
      })
      .filter((team) => team.name && team.url.includes("/team/"))
      .filter((team) => {
        const key = team.url;

        if (seen.has(key)) {
          return false;
        }

        seen.add(key);
        return true;
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  });

  await writeFile(outputPath, `${JSON.stringify(teams, null, 2)}\n`, "utf8");

  console.log(`Browser profile: ${chromeUserDataDir}`);
  console.log(`Logged in: ${session.loggedIn ? "yes" : "no"}`);
  console.log(`Team links found: ${teams.length}`);
  for (const team of teams) {
    console.log(`${team.name}: ${team.url}`);
  }
  console.log(`Saved: ${outputPath}`);
} finally {
  await context.close();
}
