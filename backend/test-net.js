async function test() {
  const fetch = (await import("node-fetch")).default;
  try {
    const res = await fetch("https://www.google.com");
    console.log("Google Status:", res.status);
    const res2 = await fetch("https://careers.google.com");
    console.log("Careers Status:", res2.status);
  } catch (e) {
    console.error("Fetch Error:", e.message);
  }
}
test();
