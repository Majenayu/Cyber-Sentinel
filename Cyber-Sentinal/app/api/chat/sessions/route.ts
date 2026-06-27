import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Session from '@/lib/models/Session';

export async function GET() {
  try {
    await connectToDatabase();
    // Sort by most recent update
    const sessions = await Session.find({}).sort({ updatedAt: -1 }).select('title createdAt updatedAt');
    return NextResponse.json(sessions);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await connectToDatabase();
    const { title } = await req.json();
    
    const newSession = await Session.create({
      title: title || `Op_${new Date().toISOString().slice(0, 10)}`,
      messages: []
    });

    return NextResponse.json(newSession, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
