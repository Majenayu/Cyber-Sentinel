import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Command from '@/lib/models/Command';

export async function GET() {
  try {
    await connectToDatabase();
    const commands = await Command.find({}).sort({ createdAt: -1 });
    return NextResponse.json(commands.map(c => ({
      id: c._id.toString(),
      title: c.title,
      command: c.command,
      description: c.description ?? null,
      category: c.category,
      createdAt: c.createdAt,
    })));
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await connectToDatabase();
    const { title, command, description, category } = await req.json();
    const newCmd = await Command.create({
      title, command, description: description ?? null, category: category || 'uncategorized'
    });
    return NextResponse.json({
      id: newCmd._id.toString(),
      title: newCmd.title,
      command: newCmd.command,
      description: newCmd.description ?? null,
      category: newCmd.category,
      createdAt: newCmd.createdAt,
    }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
