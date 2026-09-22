// app/api/chat+api.ts

const SYSTEM_PROMPT = `You are Harmony, a warm and knowledgeable health assistant.

Your role:
- Answer general health and wellness questions (nutrition, exercise, sleep, common symptoms).
- Explain medical concepts in simple, everyday language.
- If a user describes symptoms, ask gentle clarifying questions, but NEVER diagnose.
- Always end symptom-related responses with a reminder to see a healthcare professional.

Tone: warm, reassuring, never alarmist. Keep responses concise.
Safety: If a user mentions emergency symptoms (chest pain, difficulty breathing,
severe bleeding, fainting), immediately advise calling emergency services.`;

export async function POST(request: Request) {
  try {
    const { messages } = await request.json();

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'openai/gpt-oss-120b',
        messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages],
        stream: true,
      }),
    });

    if (!response.ok || !response.body) {
      const errorText = await response.text();
      return new Response(JSON.stringify({ error: errorText }), {
        status: response.status,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Stream Groq's SSE straight back to the client
    return new Response(response.body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}