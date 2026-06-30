import { Router } from "express";
import { ghostFetch } from "../lib/ghost";
const router = Router();

const PLATFORMS: Array<{
  name: string; url: string; cat: string; reliable: boolean;
  checkJson?: (json: any) => boolean;
  icon?: string;
}> = [
  // ── Developer / Technical ──────────────────────────────────────────────
  { name: "GitHub",       url: "https://api.github.com/users/{}",               cat: "dev",      reliable: true,  icon: "⚙️", checkJson: (j) => !!j?.login },
  { name: "GitLab",       url: "https://gitlab.com/{}",                          cat: "dev",      reliable: true,  icon: "🦊" },
  { name: "npm",          url: "https://registry.npmjs.org/-/user/org.couchdb.user:{}", cat: "dev", reliable: true, icon: "📦" },
  { name: "PyPI",         url: "https://pypi.org/user/{}/",                      cat: "dev",      reliable: true,  icon: "🐍" },
  { name: "Bitbucket",    url: "https://bitbucket.org/{}/",                      cat: "dev",      reliable: true,  icon: "🪣" },
  { name: "Dev.to",       url: "https://dev.to/{}",                              cat: "dev",      reliable: true,  icon: "💻" },
  { name: "DockerHub",    url: "https://hub.docker.com/v2/users/{}/",            cat: "dev",      reliable: true,  icon: "🐳", checkJson: (j) => !!j?.username },
  { name: "SourceForge",  url: "https://sourceforge.net/u/{}/profile/",          cat: "dev",      reliable: true,  icon: "🔧" },
  { name: "Codepen",      url: "https://codepen.io/{}",                          cat: "dev",      reliable: true,  icon: "🖊️" },
  { name: "Replit",       url: "https://replit.com/@{}",                         cat: "dev",      reliable: true,  icon: "🔷" },
  { name: "HackerNews",   url: "https://hacker-news.firebaseio.com/v0/user/{}.json", cat: "dev", reliable: true,  icon: "🔶", checkJson: (j) => j !== null && !!j?.id },
  { name: "Pastebin",     url: "https://pastebin.com/u/{}",                      cat: "dev",      reliable: true,  icon: "📋" },
  // ── Security / Hacking ────────────────────────────────────────────────
  { name: "TryHackMe",    url: "https://tryhackme.com/p/{}",                     cat: "hacking",  reliable: true,  icon: "🔒" },
  { name: "HackTheBox",   url: "https://www.hackthebox.com/api/v4/profile/username/{}", cat: "hacking", reliable: true, icon: "🟩", checkJson: (j) => !!j?.profile?.id },
  { name: "HackerOne",    url: "https://hackerone.com/{}",                       cat: "hacking",  reliable: true,  icon: "🐛" },
  { name: "Bugcrowd",     url: "https://bugcrowd.com/{}",                        cat: "hacking",  reliable: true,  icon: "🐛" },
  // ── Social Media ─────────────────────────────────────────────────────
  { name: "Reddit",       url: "https://www.reddit.com/user/{}/about.json",      cat: "social",   reliable: true,  icon: "🟠", checkJson: (j) => j !== null && j?.kind === "t2" && !j?.data?.is_suspended },
  { name: "Mastodon",     url: "https://mastodon.social/@{}",                    cat: "social",   reliable: true,  icon: "🐘" },
  { name: "Twitter/X",    url: "https://twitter.com/{}",                         cat: "social",   reliable: false, icon: "🐦" },
  { name: "Instagram",    url: "https://www.instagram.com/{}/",                  cat: "social",   reliable: false, icon: "📸" },
  { name: "TikTok",       url: "https://www.tiktok.com/@{}",                     cat: "social",   reliable: false, icon: "🎵" },
  { name: "Snapchat",     url: "https://www.snapchat.com/add/{}",                cat: "social",   reliable: false, icon: "👻" },
  // ── Professional ──────────────────────────────────────────────────────
  { name: "LinkedIn",     url: "https://www.linkedin.com/in/{}",                 cat: "professional", reliable: false, icon: "💼" },
  { name: "AngelList",    url: "https://angel.co/u/{}",                          cat: "professional", reliable: true, icon: "👼" },
  // ── Gaming ────────────────────────────────────────────────────────────
  { name: "Steam",        url: "https://steamcommunity.com/id/{}",               cat: "gaming",   reliable: false, icon: "🎮" },
  { name: "Twitch",       url: "https://www.twitch.tv/{}",                       cat: "gaming",   reliable: false, icon: "🟣" },
  { name: "Chess.com",    url: "https://api.chess.com/pub/player/{}",            cat: "gaming",   reliable: true,  icon: "♟️", checkJson: (j) => !!j?.username },
  { name: "Codeforces",   url: "https://codeforces.com/api/user.info?handles={}", cat: "dev",    reliable: true,  icon: "🏆", checkJson: (j) => j?.status === "OK" },
  // ── Video / Creative ─────────────────────────────────────────────────
  { name: "YouTube",      url: "https://www.youtube.com/@{}",                    cat: "creative", reliable: false, icon: "▶️" },
  { name: "Vimeo",        url: "https://vimeo.com/{}",                           cat: "creative", reliable: true,  icon: "🎞️" },
  { name: "Flickr",       url: "https://www.flickr.com/people/{}/",              cat: "creative", reliable: true,  icon: "📷" },
  { name: "Behance",      url: "https://www.behance.net/{}",                     cat: "creative", reliable: false, icon: "🎨" },
  { name: "Dribbble",     url: "https://dribbble.com/{}",                        cat: "creative", reliable: false, icon: "🏀" },
  { name: "Pinterest",    url: "https://www.pinterest.com/{}/",                  cat: "creative", reliable: false, icon: "📌" },
  // ── Music ────────────────────────────────────────────────────────────
  { name: "Last.fm",      url: "https://www.last.fm/user/{}",                    cat: "music",    reliable: true,  icon: "🎵" },
  { name: "SoundCloud",   url: "https://soundcloud.com/{}",                      cat: "music",    reliable: false, icon: "🔊" },
  { name: "Spotify",      url: "https://open.spotify.com/user/{}",               cat: "music",    reliable: false, icon: "🟢" },
  // ── Blog / Writing ───────────────────────────────────────────────────
  { name: "Medium",       url: "https://medium.com/@{}",                         cat: "blog",     reliable: false, icon: "✍️" },
  { name: "Substack",     url: "https://{}.substack.com",                        cat: "blog",     reliable: false, icon: "📰" },
  { name: "Hashnode",     url: "https://hashnode.com/@{}",                       cat: "blog",     reliable: true,  icon: "📝" },
  // ── Messaging / Crypto ────────────────────────────────────────────────
  { name: "Telegram",     url: "https://t.me/{}",                                cat: "messaging", reliable: false, icon: "✈️" },
  { name: "Keybase",      url: "https://keybase.io/_/api/1.0/user/lookup.json?username={}", cat: "crypto", reliable: true, icon: "🔑", checkJson: (j) => j?.status?.code === 0 && j?.them?.length > 0 },
  { name: "Gravatar",     url: "https://en.gravatar.com/{}.json",                cat: "other",    reliable: true,  icon: "👤", checkJson: (j) => !!j?.entry?.[0]?.id },
  { name: "About.me",     url: "https://about.me/{}",                            cat: "other",    reliable: false, icon: "🌐" },
];

async function checkPlatform(p: typeof PLATFORMS[0], username: string) {
  const url = p.url.replace(/\{\}/g, username);

  if (!p.reliable) {
    return { ...p, url, found: null as boolean | null, status: -1, linkOnly: true };
  }

  try {
    const r = await ghostFetch(url, {
      method: "GET",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/json,*/*;q=0.9",
        "Accept-Language": "en-US,en;q=0.5",
      },
    });

    // If we have a custom JSON checker, use it
    if (p.checkJson) {
      try {
        const text = await r.text();
        let json: any;
        try { json = JSON.parse(text); } catch { json = null; }
        const found = r.status === 200 && p.checkJson(json);
        return { ...p, url, found, status: r.status, linkOnly: false };
      } catch {
        return { ...p, url, found: r.status === 200, status: r.status, linkOnly: false };
      }
    }

    // Default: status 200 = found
    return { ...p, url, found: r.status === 200, status: r.status, linkOnly: false };
  } catch {
    return { ...p, url, found: null as boolean | null, status: null as number | null, linkOnly: false };
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
