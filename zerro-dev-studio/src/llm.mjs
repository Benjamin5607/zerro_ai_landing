/**
 * OpenAI-compatible chat completions (Groq / OpenAI / NVIDIA / Ollama / …).
 */

export async function chatCompletion({
  auth,
  messages,
  temperature = 0.2,
  jsonMode = false,
  signal,
}) {
  const url = `${auth.baseUrl.replace(/\/$/, '')}/chat/completions`;
  const body = {
    model: auth.model,
    messages,
    temperature,
  };
  if (jsonMode) {
    body.response_format = { type: 'json_object' };
  }

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${auth.apiKey}`,
  };

  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
    signal,
  });

  const raw = await res.text();
  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error(`LLM non-JSON (${res.status}): ${raw.slice(0, 300)}`);
  }
  if (!res.ok) {
    const msg = data?.error?.message || data?.message || raw.slice(0, 300);
    throw new Error(`LLM ${res.status}: ${msg}`);
  }

  const choice = data.choices?.[0]?.message;
  let text = choice?.content || '';
  if (!text && choice?.reasoning) text = String(choice.reasoning);
  if (!text && Array.isArray(choice?.reasoning_content)) {
    text = choice.reasoning_content.map((x) => x?.text || x).join('');
  }
  if (!String(text).trim()) {
    throw new Error('LLM returned empty content');
  }
  return { text: String(text), raw: data };
}
