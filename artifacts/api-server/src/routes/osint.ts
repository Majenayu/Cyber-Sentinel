import { Router } from "express";
const router = Router();

const PLATFORMS: Array<{ name: string; url: string; cat: string; reliable: boolean }> = [
  // Reliable: these platforms return HTTP 404 for non-existent users
  { name: "GitHub", url: "https://github.com/{}", cat: "dev", reliable: true },
  { name: "GitLab", url: "https://gitlab.com/{}", cat: "dev", reliable: true },
  { name: "Reddit", url: "https://reddit.com/user/{}", cat: "social", reliable: true },
  { name: "DockerHub", url: "https://hub.docker.com/u/{}", cat: "dev", reliable: true },
  { name: "npm", url: "https://npmjs.com/~{}", cat: "dev", reliable: true },
  { name: "PyPI", url: "https://pypi.org/user/{}", cat: "dev", reliable: true },
  { name: "Bitbucket", url: "https://bitbucket.org/{}", cat: "dev", reliable: true },
  { name: "Dev.to", url: "https://dev.to/{}", cat: "dev", reliable: true },
  { name: "HackTheBox", url: "https://app.hackthebox.com/users/profile/{}", cat: "hacking", reliable: true },
  // Link-only: these platforms return 200 for any URL (false positives)
  { name: "Twitter/X", url: "https://twitter.com/{}", cat: "social", reliable: false },
  { name: "Instagram", url: "https://instagram.com/{}", cat: "social", reliable: false },
  { name: "LinkedIn", url: "https://linkedin.com/in/{}", cat: "professional", reliable: false },
  { name: "TikTok", url: "https://tiktok.com/@{}", cat: "social", reliable: false },
  { name: "YouTube", url: "https://youtube.com/@{}", cat: "social", reliable: false },
  { name: "Pinterest", url: "https://pinterest.com/{}", cat: "social", reliable: false },
  { name: "Twitch", url: "https://twitch.tv/{}", cat: "gaming", reliable: false },
  { name: "Steam", url: "https://steamcommunity.com/id/{}", cat: "gaming", reliable: false },
  { name: "HackerNews", url: "https://news.ycombinator.com/user?id={}", cat: "dev", reliable: false },
  { name: "Medium", url: "https://medium.com/@{}", cat: "blog", reliable: false },
  { name: "Substack", url: "https://{}.substack.com", cat: "blog", reliable: false },
  { name: "Keybase", url: "https://keybase.io/{}", cat: "crypto", reliable: false },
  { name: "Mastodon", url: "https://mastodon.social/@{}", cat: "social", reliable: false },
  { name: "Snapchat", url: "https://snapchat.com/add/{}", cat: "social", reliable: false },
  { name: "Telegram", url: "https://t.me/{}", cat: "messaging", reliable: false },
  { name: "Pastebin", url: "https://pastebin.com/u/{}", cat: "dev", reliable: false },
  { name: "TryHackMe", url: "https://tryhackme.com/p/{}", cat: "hacking", reliable: false },
  { name: "Behance", url: "https://behance.net/{}", cat: "creative", reliable: false },
  { name: "Dribbble", url: "https://dribbble.com/{}", cat: "creative", reliable: false },
  { name: "Flickr", url: "https://flickr.com/people/{}", cat: "creative", reliable: false },
  { name: "Vimeo", url: "https://vimeo.com/{}", cat: "creative", reliable: false },
  { name: "SoundCloud", url: "https://soundcloud.com/{}", cat: "music", reliable: false },
  { name: "Last.fm", url: "https://last.fm/user/{}", cat: "music", reliable: false },
  { name: "Spotify", url: "https://open.spotify.com/user/{}", cat: "music", reliable: false },
  { name: "Gravatar", url: "https://gravatar.com/{}", cat: "other", reliable: false },
  { name: "About.me", url: "https://about.me/{}", cat: "other", reliable: false },
];

router.get("/osint/username", async (req, res) => {
  const username = String(req.query.q ?? "").trim().toLowerCase().replace(/[^a-z0-9._\-]/g, "");
  if (!username) { res.status(400).json({ error: "q required" }); return; }

  const results = await Promise.allSettled(
    PLATFORMS.map(async (p) => {
      const url = p.url.replace("{}", username);

      if (!p.reliable) {
        return { ...p, url, found: null, status: -1, linkOnly: true };
      }

      try {
        const r = await fetch(url, {
          method: "HEAD",
          headers: {
            "User-Agent": "Mozilla/5.0 (compatible; CyberSentinel/1.0)",
          },
          signal: AbortSignal.timeout(6000),
          redirect: "manual",
        });
        const found = r.status === 200 || r.status === 301 || r.status === 302;
        return { ...p, url, found, status: r.status, linkOnly: false };
      } catch {
        return { ...p, url, found: null, status: null, linkOnly: false };
      }
    })
  );

  const items = results.map((r, i) =>
    r.status === "fulfilled"
      ? r.value
      : { ...PLATFORMS[i], url: PLATFORMS[i].url.replace("{}", username), found: null, status: null, linkOnly: PLATFORMS[i].reliable === false }
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
