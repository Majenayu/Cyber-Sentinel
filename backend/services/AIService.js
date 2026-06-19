const { GoogleGenerativeAI } = require("@google/generative-ai");
const Groq = require("groq-sdk");
const { CohereClient } = require("cohere-ai");

/**
 * MultiProviderAIService handles multiple AI providers (Gemini, Groq, Cohere)
 * to ensure maximum reliability and capacity.
 */
class MultiProviderAIService {
  constructor() {
    this.providers = [];

    // 1. Setup Gemini
    const geminiKeys = process.env.GEMINI_API_KEYS ? process.env.GEMINI_API_KEYS.split(",") : [process.env.GEMINI_API_KEY];
    geminiKeys.forEach(key => {
      if (key?.trim()) {
        this.providers.push({
          type: "gemini",
          client: new GoogleGenerativeAI(key.trim()).getGenerativeModel({ model: "gemini-2.0-flash" }),
          weight: 1
        });
      }
    });

    // 2. Setup Groq (Very fast Llama 3)
    const groqKey = process.env.GROQ_API_KEY;
    if (groqKey) {
      this.providers.push({
        type: "groq",
        client: new Groq({ apiKey: groqKey }),
        weight: 2 // Prefer Groq for speed
      });
    }

    // 3. Setup Cohere
    const cohereKey = process.env.COHERE_API_KEY;
    if (cohereKey) {
      this.providers.push({
        type: "cohere",
        client: new CohereClient({ token: cohereKey }),
        weight: 1
      });
    }

    this.currentIndex = 0;
    this.usageStats = { total: 0, failures: 0 };

    const priority = { groq: 0, gemini: 1, cohere: 2 };
    this.providers.sort((a, b) => (priority[a.type] ?? 9) - (priority[b.type] ?? 9));

    console.log(`🚀 Multi-Provider AI Service initialized with ${this.providers.length} provider slots.`);
  }

  /**
   * Selects a provider. Can be expanded to use weights or load-balancing.
   */
  getProvider() {
    // Round-robin for now, but prioritized by index in constructor
    const provider = this.providers[this.currentIndex];
    this.currentIndex = (this.currentIndex + 1) % this.providers.length;
    return provider;
  }

  async generateContent(prompt) {
    if (this.providers.length === 0) {
      throw new Error("No AI providers configured. Set GROQ_API_KEY, GEMINI_API_KEY, or COHERE_API_KEY in .env");
    }

    // Try providers in order (simple round-robin but could be weighted)
    for (let i = 0; i < this.providers.length; i++) {
      const providerIndex = (this.currentIndex + i) % this.providers.length;
      const provider = this.providers[providerIndex];

      try {
        console.log(`🤖 Attempting with provider: ${provider.type} (Slot ${providerIndex})`);
        
        let text = "";
        if (provider.type === "gemini") {
          const result = await provider.client.generateContent(prompt);
          text = result.response.text();
        } 
        else if (provider.type === "groq") {
          const completion = await provider.client.chat.completions.create({
            messages: [{ role: "user", content: prompt }],
            model: "llama-3.1-8b-instant",
          });
          text = completion.choices[0]?.message?.content || "";
        } 
        else if (provider.type === "cohere") {
          const response = await provider.client.chat({
            message: prompt,
            model: "command-r-plus-08-2024",
          });
          text = response.text || "";
        }

        // Advance index for next time
        this.currentIndex = (providerIndex + 1) % this.providers.length;
        return { text: () => text }; // Standardize format similar to Gemini response

      } catch (err) {
        this.usageStats.failures++;
        console.warn(`⚠️ Provider ${provider.type} failed:`, err.message);
        // If it's a 429, we definitely want to skip to next
        if (err.status === 429) continue;
        // For other errors, still try next one
      }
    }

    throw new Error("All AI providers failed. Check your API keys and rate limits.");
  }
}

module.exports = new MultiProviderAIService();
