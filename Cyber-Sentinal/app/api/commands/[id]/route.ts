import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Command from '@/lib/models/Command';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await connectToDatabase();
    const body = await req.json();
    const cmd = await Command.findByIdAndUpdate(id, { $set: body }, { new: true });
    if (!cmd) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({
      id: cmd._id.toString(),
      title: cmd.title,
      command: cmd.command,
      description: cmd.description ?? null,
      category: cmd.category,
      createdAt: cmd.createdAt,
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
    await Command.findByIdAndDelete(id);
    return new NextResponse(null, { status: 204 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
