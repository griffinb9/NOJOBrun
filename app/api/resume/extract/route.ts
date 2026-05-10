import { NextRequest, NextResponse } from 'next/server';
import mammoth from 'mammoth';
import { PDFParse } from 'pdf-parse';

export const runtime = 'nodejs';

const MAX_BYTES = 5 * 1024 * 1024;

/** Matches client copy in lib/resume.ts */
const READ_ERR =
  "We couldn't read this file. Please try another format or paste your resume text.";

/**
 * Extract plain text from DOCX or PDF (TXT is read on the client).
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return NextResponse.json({ error: READ_ERR }, { status: 400 });
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: 'File too large (max 5 MB).' }, { status: 400 });
    }

    const name = file.name || 'resume';
    const buf = Buffer.from(await file.arrayBuffer());
    const lower = name.toLowerCase();

    let text = '';

    if (
      lower.endsWith('.docx')
      || file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ) {
      const result = await mammoth.extractRawText({ buffer: buf });
      text = result.value;
    } else if (lower.endsWith('.pdf') || file.type === 'application/pdf') {
      const parser = new PDFParse({ data: buf });
      try {
        const result = await parser.getText();
        text = result.text;
      } finally {
        await parser.destroy();
      }
    } else {
      return NextResponse.json({ error: READ_ERR }, { status: 400 });
    }

    text = text.replace(/\0/g, '').trim();
    if (!text) {
      return NextResponse.json({ error: READ_ERR }, { status: 400 });
    }

    return NextResponse.json({ text, fileName: name });
  } catch {
    return NextResponse.json({ error: READ_ERR }, { status: 400 });
  }
}
