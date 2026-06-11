import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { chromium } from "playwright-core";

const linksPath =
  process.env.LINKS_PATH ||
  path.resolve(process.cwd(), "worldcup-team-links.json");
const outputPath =
  process.env.OUTPUT_PATH || path.resolve(process.cwd(), "worldcup.json");
const chromeUserDataDir =
  process.env.CHROME_USER_DATA_DIR ||
  path.resolve(process.cwd(), ".playwright-thesportsdb-profile");
const chromeExecutablePath =
  process.env.CHROME_EXECUTABLE_PATH ||
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

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

function withThumbView(url) {
  const pageUrl = new URL(url);
  pageUrl.searchParams.set("view", "1");
  return pageUrl.toString();
}

async function waitForManualLogin(page, url) {
  let session = await getSessionState(page);

  if (session.loggedIn) {
    return session;
  }

  console.log("TheSportsDB does not look logged in yet.");
  console.log("Log in in the browser window, then come back here.");

  const rl = createInterface({ input, output });
  await rl.question("Press Enter here after login is complete...");
  rl.close();

  await page.goto(url, {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });

  session = await getSessionState(page);

  if (!session.loggedIn) {
    throw new Error(
      "TheSportsDB still does not appear logged in. I still see Login/Signup links."
    );
  }

  return session;
}

async function loadPage(page, url) {
  await page.goto(url, {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => {});
}

async function triggerLazyImages(page) {
  await page.evaluate(async () => {
    await new Promise((resolve) => {
      let scrolled = 0;
      const step = Math.max(window.innerHeight * 0.75, 500);
      const timer = window.setInterval(() => {
        window.scrollBy(0, step);
        scrolled += step;

        if (scrolled >= document.body.scrollHeight - window.innerHeight) {
          window.clearInterval(timer);
          window.setTimeout(resolve, 350);
        }
      }, 80);
    });

    window.scrollTo(0, 0);
  });
}

async function scrapeTeam(page, teamLink) {
  const url = withThumbView(teamLink.url);

  await loadPage(page, url);
  await triggerLazyImages(page);

  return page.evaluate((fallbackName) => {
    function absoluteUrl(value) {
      if (!value) {
        return null;
      }

      try {
        return new URL(value, window.location.href).toString();
      } catch {
        return null;
      }
    }

    function imageUrl(img) {
      return (
        absoluteUrl(img.currentSrc) ||
        absoluteUrl(img.getAttribute("src")) ||
        absoluteUrl(img.getAttribute("data-src")) ||
        absoluteUrl(img.getAttribute("data-original")) ||
        absoluteUrl(img.getAttribute("data-lazy-src"))
      );
    }

    function unique(values) {
      return Array.from(new Set(values.filter(Boolean)));
    }

    function firstImageContaining(pathPart) {
      return (
        Array.from(document.querySelectorAll("img"))
          .map(imageUrl)
          .find((src) => src?.includes(pathPart)) || ""
      );
    }

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
          return rect.top + window.scrollY;
        }
      }

      return null;
    }

    function elementY(selector) {
      const element = document.querySelector(selector);
      const rect = element?.getBoundingClientRect();

      return rect && rect.height >= 0 ? rect.top + window.scrollY : null;
    }

    function slugToName(href) {
      const pathname = absoluteUrl(href);

      if (!pathname) {
        return "";
      }

      const slug = pathname
        .split("/")
        .pop()
        ?.replace(/^\d+-/, "")
        .replace(/[-_]+/g, " ")
        .trim();

      if (!slug) {
        return "";
      }

      let decodedSlug = slug;

      try {
        decodedSlug = decodeURIComponent(slug);
      } catch {
        decodedSlug = slug;
      }

      return decodedSlug
        .split(/\s+/)
        .map((word) =>
          word
            ? `${word[0].toLocaleUpperCase()}${word
                .slice(1)
                .toLocaleLowerCase()}`
            : word
        )
        .join(" ");
    }

    function cleanPlayerName(link) {
      const imgAlt =
        link.querySelector("img")?.getAttribute("alt")?.replace(/\s+/g, " ") ||
        "";
      const title =
        link.getAttribute("title") ||
        link.getAttribute("aria-label") ||
        imgAlt.replace(/\b(player|thumb|thumbnail|image)\b/gi, "");
      const text = link.textContent?.replace(/\s+/g, " ").trim() || "";
      const textWithoutNumber = text.replace(/^\d+\s+/, "").trim();
      const slugName = slugToName(link.href);
      const candidates = [title, textWithoutNumber, slugName]
        .map((name) => name.replace(/\s+/g, " ").trim())
        .filter(Boolean)
        .filter((name) => !/^(view|thumbs|cutouts|cartoon|renders|table)$/i.test(name));

      const fullName = candidates.find((name) => name.split(/\s+/).length > 1);

      return fullName || candidates[0] || "";
    }

    function playerThumbForLink(link) {
      const containers = [
        link,
        link.closest("li"),
        link.closest("td"),
        link.closest("tr"),
        link.closest("div"),
        link.parentElement,
      ].filter(Boolean);

      for (const container of containers) {
        const thumb = Array.from(container.querySelectorAll("img"))
          .map(imageUrl)
          .find((src) => src?.includes("/player/thumb/"));

        if (thumb) {
          return thumb;
        }
      }

      return null;
    }

    const name =
      document.querySelector("h1")?.textContent?.replace(/\s+/g, " ").trim() ||
      fallbackName;
    const fanarts = unique(
      Array.from(document.querySelectorAll("img"))
        .map(imageUrl)
        .filter((src) => src?.includes("/team/fanart/"))
    );
    const teamMembersStartY =
      findTextY(/Team Members/i) ??
      elementY("#playerImages") ??
      elementY('[name="playerImages"]');
    const teamMembersEndY =
      findTextY(/^(Staff Members|Trophies|Collections|Fanart|Banner)$/i) ??
      Number.POSITIVE_INFINITY;
    const seenPlayers = new Set();
    const playerLinks = Array.from(
      document.querySelectorAll('a[href*="/player/"]')
    ).filter((link) => {
      if (link.closest(".col-sm-3")) {
        return false;
      }

      if (teamMembersStartY === null) {
        return false;
      }

      const rect = link.getBoundingClientRect();
      const y = rect.top + window.scrollY;

      return y >= teamMembersStartY && y < teamMembersEndY;
    });
    const players = playerLinks
      .map((link) => {
        const playerUrl = absoluteUrl(link.href);
        const playerName = cleanPlayerName(link);

        return {
          key: playerUrl || playerName,
          name: playerName,
          image: playerThumbForLink(link),
        };
      })
      .filter((player) => player.name)
      .filter((player) => {
        if (seenPlayers.has(player.key)) {
          return false;
        }

        seenPlayers.add(player.key);
        return true;
      })
      .map(({ name, image }) => ({ name, image }));

    return {
      name,
      badge: firstImageContaining("/team/badge/"),
      logo: firstImageContaining("/team/logo/"),
      banner: firstImageContaining("/team/banner/"),
      fanarts,
      players,
    };
  }, teamLink.name);
}

const teamLinks = JSON.parse(await readFile(linksPath, "utf8"));

if (!Array.isArray(teamLinks) || teamLinks.length === 0) {
  throw new Error(`No team links found in ${linksPath}`);
}

const context = await chromium.launchPersistentContext(chromeUserDataDir, {
  executablePath: chromeExecutablePath,
  headless: false,
  viewport: { width: 1440, height: 1000 },
});

try {
  const page = context.pages()[0] || (await context.newPage());

  await loadPage(page, withThumbView(teamLinks[0].url));
  const session = await waitForManualLogin(page, withThumbView(teamLinks[0].url));

  console.log(`Browser profile: ${chromeUserDataDir}`);
  console.log(`Logged in: ${session.loggedIn ? "yes" : "no"}`);
  console.log(`Teams to scrape: ${teamLinks.length}`);

  const teams = [];

  for (const [index, teamLink] of teamLinks.entries()) {
    console.log(
      `[${index + 1}/${teamLinks.length}] Scraping ${teamLink.name}: ${teamLink.url}`
    );

    const team = await scrapeTeam(page, teamLink);
    teams.push(team);

    console.log(
      `  -> ${team.name}: ${team.players.length} players, ${team.fanarts.length} fanarts`
    );
  }

  await writeFile(outputPath, `${JSON.stringify({ teams }, null, 2)}\n`, "utf8");
  console.log(`Saved: ${outputPath}`);
} finally {
  await context.close();
}
