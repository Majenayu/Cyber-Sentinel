import { Router } from "express";
const router = Router();

const PLATFORMS: Array<{ name: string; url: string; cat: string; reliable: boolean; notFoundStatus?: number }> = [
  // Reliable: reliably return HTTP 404 for non-existent users
  { name: "GitHub", url: "https://github.com/{}", cat: "dev", reliable: true },
  { name: "GitLab", url: "https://gitlab.com/{}", cat: "dev", reliable: true },
  { name: "Reddit", url: "https://www.reddit.com/user/{}/about.json", cat: "social", reliable: true },
  { name: "npm", url: "https://registry.npmjs.org/~{}", cat: "dev", reliable: true },
  { name: "PyPI", url: "https://pypi.org/user/{}/", cat: "dev", reliable: true },
  { name: "Bitbucket", url: "https://bitbucket.org/{}/", cat: "dev", reliable: true },
  { name: "Dev.to", url: "https://dev.to/{}", cat: "dev", reliable: true },
  { name: "Keybase", url: "https://keybase.io/{}/_/api/1.0/user/lookup.json?username={}", cat: "crypto", reliable: true },
  { name: "HackerNews", url: "https://hacker-news.firebaseio.com/v0/user/{}.json", cat: "dev", reliable: true },
  { name: "Gravatar", url: "https://en.gravatar.com/{}.json", cat: "other", reliable: true },
  { name: "Last.fm", url: "https://www.last.fm/user/{}", cat: "music", reliable: true },
  { name: "Pastebin", url: "https://pastebin.com/u/{}", cat: "dev", reliable: true },
  { name: "Vimeo", url: "https://vimeo.com/{}", cat: "creative", reliable: true },
  { name: "Flickr", url: "https://www.flickr.com/people/{}/", cat: "creative", reliable: true },
  { name: "DockerHub", url: "https://hub.docker.com/u/{}/", cat: "dev", reliable: true },
  { name: "SourceForge", url: "https://sourceforge.net/u/{}/profile/", cat: "dev", reliable: true },
  // Link-only: return 200 for any URL regardless of user existence
  { name: "Twitter/X", url: "https://twitter.com/{}", cat: "social", reliable: false },
  { name: "Instagram", url: "https://www.instagram.com/{}/", cat: "social", reliable: false },
  { name: "LinkedIn", url: "https://www.linkedin.com/in/{}", cat: "professional", reliable: false },
  { name: "TikTok", url: "https://www.tiktok.com/@{}", cat: "social", reliable: false },
  { name: "YouTube", url: "https://www.youtube.com/@{}", cat: "social", reliable: false },
  { name: "Pinterest", url: "https://www.pinterest.com/{}/", cat: "social", reliable: false },
  { name: "Twitch", url: "https://www.twitch.tv/{}", cat: "gaming", reliable: false },
  { name: "Steam", url: "https://steamcommunity.com/id/{}", cat: "gaming", reliable: false },
  { name: "Medium", url: "https://medium.com/@{}", cat: "blog", reliable: false },
  { name: "Substack", url: "https://{}.substack.com", cat: "blog", reliable: false },
  { name: "Mastodon", url: "https://mastodon.social/@{}", cat: "social", reliable: false },
  { name: "Snapchat", url: "https://www.snapchat.com/add/{}", cat: "social", reliable: false },
  { name: "Telegram", url: "https://t.me/{}", cat: "messaging", reliable: false },
  { name: "TryHackMe", url: "https://tryhackme.com/p/{}", cat: "hacking", reliable: false },
  { name: "HackTheBox", url: "https://app.hackthebox.com/users/profile/{}", cat: "hacking", reliable: false },
  { name: "Behance", url: "https://www.behance.net/{}", cat: "creative", reliable: false },
  { name: "Dribbble", url: "https://dribbble.com/{}", cat: "creative", reliable: false },
  { name: "SoundCloud", url: "https://soundcloud.com/{}", cat: "music", reliable: false },
  { name: "Spotify", url: "https://open.spotify.com/user/{}", cat: "music", reliable: false },
  { name: "About.me", url: "https://about.me/{}", cat: "other", reliable: false },
];

async function checkPlatform(p: typeof PLATFORMS[0], username: string) {
  const url = p.url.replace(/\{\}/g, username);

  if (!p.reliable) {
    return { ...p, url, found: null, status: -1, linkOnly: true };
  }

  try {
    const r = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
      },
      signal: AbortSignal.timeout(8000),
      redirect: "manual",
    });

    // Only HTTP 200 means definitively found — 3xx are ambiguous redirects
    // For JSON APIs (Reddit, HackerNews, Gravatar), null body or empty = not found
    const found = r.status === 200;

    if (found && (p.name === "Reddit" || p.name === "HackerNews" || p.name === "Gravatar" || p.name === "Keybase")) {
      try {
        const text = await r.text();
        const json = JSON.parse(text);
        if (json === null || json === false || json.error || json.kind === "t2" === false) {
          if (p.name === "HackerNews" && json === null) {
            return { ...p, url, found: false, status: r.status, linkOnly: false };
          }
          if (p.name === "Gravatar" && json?.error) {
            return { ...p, url, found: false, status: 404, linkOnly: false };
          }
          if (p.name === "Keybase" && json?.status?.code !== 0) {
            return { ...p, url, found: false, status: r.status, linkOnly: false };
          }
        }
        return { ...p, url, found: true, status: r.status, linkOnly: false };
      } catch {
        return { ...p, url, found: r.status === 200, status: r.status, linkOnly: false };
      }
    }

    return { ...p, url, found, status: r.status, linkOnly: false };
  } catch {
    return { ...p, url, found: null, status: null, linkOnly: false };
  }
}

router.get("/osint/username", async (req, res) => {
  const username = String(req.query.q ?? "").trim().toLowerCase().replace(/[^a-z0-9._\-]/g, "");
  if (!username) { res.status(400).json({ error: "q required" }); return; }

  const results = await Promise.allSettled(
    PLATFORMS.map(p => checkPlatform(p, username))
  );

  const items = results.map((r, i) =>
    r.status === "fulfilled"
      ? r.value
      : { ...PLATFORMS[i], url: PLATFORMS[i].url.replace(/\{\}/g, username), found: null, status: null, linkOnly: !PLATFORMS[i].reliable }
  );

  const verified = items.filter(i => !i.linkOnly);
  res.json({
    username,
    checked: verified.length,
    found: verified.filter(i => i.found === true).length,
    linkOnlyCount: items.filter(i => i.linkOnly).length,
    results: items,
  });
});

export default router;
