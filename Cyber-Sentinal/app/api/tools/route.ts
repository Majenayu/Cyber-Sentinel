import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Tool from '@/lib/models/Tool';
import { seedTools } from '@/lib/seed-tools';

export async function GET() {
  try {
    await connectToDatabase();
    
    // Auto-seed on first request if empty
    const count = await Tool.countDocuments({});
    if (count === 0) await seedTools();
    
    const tools = await Tool.find({}).sort({ name: 1 });
    return NextResponse.json(tools.map(t => ({
      id: t._id.toString(),
      name: t.name,
      slug: t.slug,
      category: t.category,
      description: t.description,
      officialUrl: t.officialUrl ?? null,
    })));
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

