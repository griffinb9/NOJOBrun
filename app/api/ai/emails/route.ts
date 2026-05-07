import { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export async function POST(req: NextRequest) {
  const { type, job, apiKey } = await req.json();

  if (!apiKey) {
    return Response.json({ error: 'No API key set. Go to Settings and add your Anthropic API key.' }, { status: 400 });
  }

  const client = new Anthropic({ apiKey });

  const prompts: Record<string, string> = {
    'thank-you': `Write a warm, professional post-interview thank-you email for the following job application. Be specific and genuine. Keep it concise (3–4 short paragraphs).

Company: ${job.company}
Role: ${job.role}
${job.contactName ? `Interviewer: ${job.contactName}` : ''}
${job.interviewDates?.length ? `Interview date: ${job.interviewDates[job.interviewDates.length - 1]}` : ''}
${job.notes ? `Notes from interview: ${job.notes}` : ''}

Write only the email body (no subject line). Start with "Dear [Name]," or "Hi [Name]," as appropriate.`,

    'check-in': `Write a polite, professional status check-in email for a job application where the candidate hasn't heard back. Keep it brief (2–3 short paragraphs). Be warm but not desperate.

Company: ${job.company}
Role: ${job.role}
${job.contactName ? `Recruiter/Contact: ${job.contactName}` : ''}
${job.dateApplied ? `Date applied: ${job.dateApplied}` : ''}

Write only the email body (no subject line). Start with "Dear [Name]," or "Hi [Name]," as appropriate.`,
  };

  const prompt = prompts[type];
  if (!prompt) {
    return Response.json({ error: 'Unknown email type' }, { status: 400 });
  }

  const stream = await client.messages.stream({
    model: 'claude-sonnet-4-6',
    max_tokens: 600,
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
