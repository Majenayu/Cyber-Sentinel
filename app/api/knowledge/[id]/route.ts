import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Knowledge from '@/lib/models/Knowledge';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await connectToDatabase();
    const entry = await Knowledge.findById(id);
    if (!entry) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({
      id: entry._id.toString(),
      title: entry.title,
      content: entry.content,
      tags: entry.tags ?? [],
      source: entry.source ?? null,
      createdAt: entry.createdAt,
      updatedAt: entry.createdAt,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await connectToDatabase();
    const body = await req.json();
    const entry = await Knowledge.findByIdAndUpdate(
      id,
      { $set: { ...body } },
      { new: true }
    );
    if (!entry) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({
      id: entry._id.toString(),
      title: entry.title,
      content: entry.content,
      tags: entry.tags ?? [],
      source: entry.source ?? null,
      createdAt: entry.createdAt,
      updatedAt: entry.createdAt,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await connectToDatabase();
    await Knowledge.findByIdAndDelete(id);
    return new NextResponse(null, { status: 204 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
