import Anthropic from "@anthropic-ai/sdk"

let client: Anthropic | null = null

export function getAnthropicClient(): Anthropic {
  if (!client) {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY is not set")
    }
    client = new Anthropic({ apiKey })
  }
  return client
}

export async function generateText(prompt: string, systemPrompt?: string): Promise<string> {
  const anthropic = getAnthropicClient()

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-5-20250929",
    max_tokens: 1024,
    system: systemPrompt || "Jsi asistent pro správu zakázek české HVAC firmy NANTO. Odpovídej vždy česky, stručně a věcně.",
    messages: [{ role: "user", content: prompt }],
  })

  const textBlock = response.content.find((block) => block.type === "text")
  return textBlock?.text || ""
}
