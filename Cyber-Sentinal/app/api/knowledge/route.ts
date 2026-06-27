import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Knowledge from '@/lib/models/Knowledge';

export async function GET(req: Request) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const tag = searchParams.get('tag');
    const q = searchParams.get('q');

    let filter: any = {};
    if (tag) filter.tags = tag;
    if (q) {
      const regex = new RegExp(q, 'i');
      filter = { $or: [{ title: regex }, { content: regex }, { tags: regex }] };
    }

    const entries = await Knowledge.find(filter).sort({ createdAt: -1 });
    return NextResponse.json(entries.map(e => ({
      id: e._id.toString(),
      title: e.title,
      content: e.content,
      tags: e.tags ?? [],
      source: e.source ?? null,
      createdAt: e.createdAt,
      updatedAt: e.createdAt,
    })));
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await connectToDatabase();
    const body = await req.json();
    const { title, content, tags, source } = body;

    const newEntry = await Knowledge.create({
      title,
      content,
      category: 'lesson',
      tags: tags ?? [],
      source: source ?? null,
    });

    return NextResponse.json({
      id: newEntry._id.toString(),
      title: newEntry.title,
      content: newEntry.content,
      tags: newEntry.tags,
      source: newEntry.source ?? null,
      createdAt: newEntry.createdAt,
      updatedAt: newEntry.createdAt,
    }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
