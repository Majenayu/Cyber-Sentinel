import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Session from '@/lib/models/Session';
import { getChatResponse } from '@/lib/groq';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await connectToDatabase();
    const { content } = await req.json();
    const sessionId = id;

    if (!content) {
      return NextResponse.json({ error: "Content is required" }, { status: 400 });
    }

    // 1. Find the session
    const session = await Session.findById(sessionId);
    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // 2. Add user message to history
    session.messages.push({ role: 'user', content, createdAt: new Date() });
    
    // 3. Get AI response (passing history for context)
    // We only pass the last 10 messages to avoid token limits
    const history = session.messages.slice(-10).map((m: any) => ({
      role: m.role,
      content: m.content
    }));

    const aiResponse = await getChatResponse(content, history);

    // 4. Add AI response to session
    session.messages.push({ role: 'assistant', content: aiResponse, createdAt: new Date() });
    
    // 5. Save session (updates updatedAt via pre-save hook)
    await session.save();

    return NextResponse.json({ 
      userMessage: session.messages[session.messages.length - 2],
      assistantMessage: session.messages[session.messages.length - 1]
    }, { status: 201 });

  } catch (error: any) {
    console.error("Chat Session API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
