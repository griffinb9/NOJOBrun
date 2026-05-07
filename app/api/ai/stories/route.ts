import { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { newId, now } from '@/lib/utils';

export async function POST(req: NextRequest) {
  const { resumeText, apiKey } = await req.json();

  if (!apiKey) {
    return Response.json({ error: 'No API key set. Go to Settings and add your Anthropic API key.' }, { status: 400 });
  }

  const client = new Anthropic({ apiKey });

  const prompt = `You are an expert interview coach. Read the following resume and extract 5–8 strong STAR stories from the candidate's experience. Focus on accomplishments with measurable outcomes, leadership moments, and challenges overcome.

For each story, return a JSON object with:
- title: short descriptive title (e.g. "Led redesign of student portal")
- situation: 1–2 sentences describing the context
- task: 1 sentence describing what they were responsible for
- action: 2–3 sentences describing what they specifically did
- result: 1–2 sentences describing the measurable outcome
- tags: array of relevant tags from: ["Leadership", "Teamwork", "Problem Solving", "Technical", "Communication"]

Resume:
${resumeText}

Return ONLY a valid JSON array of story objects, no other text. Example format:
[{"title":"...","situation":"...","task":"...","action":"...","result":"...","tags":["Leadership"]}]`;

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 3000,
    messages: [{ role: 'user', content: prompt }],
  });

  const raw = message.content[0].type === 'text' ? message.content[0].text : '';

  let parsed: { title: string; situation: string; task: string; action: string; result: string; tags: string[] }[];
  try {
    // Extract JSON array from response
    const match = raw.match(/\[[\s\S]*\]/);
    if (!match) throw new Error('No JSON array found');
    parsed = JSON.parse(match[0]);
  } catch {
    return Response.json({ error: 'Failed to parse AI response. Try again.' }, { status: 500 });
  }

  const ts = now();
  const stories = parsed.map((s) => ({ ...s, id: newId(), createdAt: ts, updatedAt: ts }));

  return Response.json({ stories });
}
