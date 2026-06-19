async function test() {
  const fetch = (await import("node-fetch")).default;
  const api = "https://adobe.myworkdayjobs.com/wday/cxs/adobe/university/jobs";
  try {
    const res = await fetch(api, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ appliedFacets: {}, limit: 5, offset: 0, searchText: "software intern" })
    });
    const data = await res.json();
    console.log("Adobe API Results:", JSON.stringify(data.jobPostings, null, 2));
  } catch (e) { console.error("API Error:", e.message); }
}
test();
