import { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { Story } from '@/lib/types';

function buildPrompt(key: string, job: { company: string; role: string; jobDescription?: string }, stories: Story[]): string {
  const jd = job.jobDescription ? `\nJob Description:\n${job.jobDescription}` : '';
  const storyBlock = stories.length > 0
    ? `\nUser's STAR Stories:\n${stories.map((s, i) => `${i + 1}. ${s.title}\n  Situation: ${s.situation}\n  Task: ${s.task}\n  Action: ${s.action}\n  Result: ${s.result}`).join('\n\n')}`
    : '';

  const context = `Company: ${job.company}\nRole: ${job.role}${jd}${storyBlock}`;

  const prompts: Record<string, string> = {
    'tmay': `You are an expert interview coach. Write a compelling "Tell Me About Yourself" answer for a candidate interviewing for the following role. Make it 2–3 paragraphs, conversational, and tailored to the role. End with why they're excited about this specific opportunity.

${context}

Write the answer as if the candidate is speaking. Be natural and engaging.`,

    'why-company': `You are an expert interview coach. Write 3 specific, well-researched talking points for "Why do you want to work at [Company]?" for the role below. Be specific about the company's mission, culture, products, or industry position. Avoid generic answers.

${context}

Format as 3 numbered talking points with brief explanations.`,

    'why-role': `You are an expert interview coach. Write a compelling answer for "Why do you want this role?" that bridges the candidate's background (from their stories if available) to this specific position.

${context}

Keep it 2 paragraphs. Be specific about what excites them about the work itself.`,

    'questions': `You are an expert interview coach. Generate 10–12 likely interview questions for this role. Group them by category (Behavioral, Technical/Role-Specific, Situational, Culture Fit). Include a brief note on what each question is probing for.

${context}

Format with clear category headers and numbered questions.`,

    'star': `You are an expert interview coach. Using the candidate's STAR stories below, write 3–4 polished STAR-format answers for common behavioral interview questions relevant to this role. For each, state the question, then write the full STAR answer.

${context}

If no stories are provided, write example STAR answers using placeholders the candidate can fill in. Format clearly with the question bolded and STAR labels.`,
  };

  return prompts[key] ?? `Generate interview prep content for: ${key}`;
}

export async function POST(req: NextRequest) {
  const { key, job, stories = [], apiKey } = await req.json();

  if (!apiKey) {
    return Response.json({ error: 'No API key set. Go to Settings and add your Anthropic API key.' }, { status: 400 });
  }

  const client = new Anthropic({ apiKey });
  const prompt = buildPrompt(key, job, stories);

  const stream = await client.messages.stream({
    model: 'claude-sonnet-4-6',
    max_tokens: 1500,
    messages: [{ role: 'user', content: prompt }],
  });

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
          controller.enqueue(encoder.encode(chunk.delta.text));
        }
      }
      controller.close();
    },
  });

  return new Response(readable, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
