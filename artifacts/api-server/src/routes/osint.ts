import { Router } from "express";
const router = Router();

const PLATFORMS: Array<{ name: string; url: string; cat: string }> = [
  { name: "GitHub", url: "https://github.com/{}", cat: "dev" },
  { name: "Twitter/X", url: "https://twitter.com/{}", cat: "social" },
  { name: "Instagram", url: "https://instagram.com/{}", cat: "social" },
  { name: "Reddit", url: "https://reddit.com/user/{}", cat: "social" },
  { name: "LinkedIn", url: "https://linkedin.com/in/{}", cat: "professional" },
  { name: "TikTok", url: "https://tiktok.com/@{}", cat: "social" },
  { name: "YouTube", url: "https://youtube.com/@{}", cat: "social" },
  { name: "Pinterest", url: "https://pinterest.com/{}", cat: "social" },
  { name: "Twitch", url: "https://twitch.tv/{}", cat: "gaming" },
  { name: "Steam", url: "https://steamcommunity.com/id/{}", cat: "gaming" },
  { name: "HackerNews", url: "https://news.ycombinator.com/user?id={}", cat: "dev" },
  { name: "GitLab", url: "https://gitlab.com/{}", cat: "dev" },
  { name: "Bitbucket", url: "https://bitbucket.org/{}", cat: "dev" },
  { name: "Dev.to", url: "https://dev.to/{}", cat: "dev" },
  { name: "Medium", url: "https://medium.com/@{}", cat: "blog" },
  { name: "Substack", url: "https://{}.substack.com", cat: "blog" },
  { name: "Keybase", url: "https://keybase.io/{}", cat: "crypto" },
  { name: "Mastodon", url: "https://mastodon.social/@{}", cat: "social" },
  { name: "Snapchat", url: "https://snapchat.com/add/{}", cat: "social" },
  { name: "Telegram", url: "https://t.me/{}", cat: "messaging" },
  { name: "DockerHub", url: "https://hub.docker.com/u/{}", cat: "dev" },
  { name: "npm", url: "https://npmjs.com/~{}", cat: "dev" },
  { name: "PyPI", url: "https://pypi.org/user/{}", cat: "dev" },
  { name: "Behance", url: "https://behance.net/{}", cat: "creative" },
  { name: "Dribbble", url: "https://dribbble.com/{}", cat: "creative" },
  { name: "Flickr", url: "https://flickr.com/people/{}", cat: "creative" },
  { name: "Vimeo", url: "https://vimeo.com/{}", cat: "creative" },
  { name: "SoundCloud", url: "https://soundcloud.com/{}", cat: "music" },
  { name: "Last.fm", url: "https://last.fm/user/{}", cat: "music" },
  { name: "Spotify", url: "https://open.spotify.com/user/{}", cat: "music" },
  { name: "Goodreads", url: "https://goodreads.com/user/show/{}", cat: "other" },
  { name: "About.me", url: "https://about.me/{}", cat: "other" },
  { name: "Gravatar", url: "https://gravatar.com/{}", cat: "other" },
  { name: "Pastebin", url: "https://pastebin.com/u/{}", cat: "dev" },
  { name: "HackTheBox", url: "https://hackthebox.eu/profile/{}", cat: "hacking" },
  { name: "TryHackMe", url: "https://tryhackme.com/p/{}", cat: "hacking" },
];

router.get("/osint/username", async (req, res) => {
  const username = String(req.query.q ?? "").trim().toLowerCase().replace(/[^a-z0-9._\-]/g, "");
  if (!username) { res.status(400).json({ error: "q required" }); return; }

  const results = await Promise.allSettled(
    PLATFORMS.map(async (p) => {
      const url = p.url.replace("{}", username);
      try {
        const r = await fetch(url, {
          method: "HEAD",
          headers: {
            "User-Agent": "Mozilla/5.0 (compatible; CyberSentinel/1.0)",
          },
          signal: AbortSignal.timeout(5000),
          redirect: "manual",
        });
        const found = r.status === 200 || r.status === 301 || r.status === 302;
        return { ...p, url, found, status: r.status };
      } catch {
        return { ...p, url, found: null, status: null };
      }
    })
  );

  const items = results.map((r, i) =>
    r.status === "fulfilled" ? r.value : { ...PLATFORMS[i], url: PLATFORMS[i].url.replace("{}", username), found: null, status: null }
  );

  res.json({
    username,
    checked: items.length,
    found: items.filter(i => i.found).length,
    results: items,
  });
});

export default router;
