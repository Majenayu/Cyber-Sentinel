import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Tool from '@/lib/models/Tool';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    await connectToDatabase();
    const tool = await Tool.findOne({ slug });
    if (!tool) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({
      id: tool._id.toString(),
      name: tool.name,
      slug: tool.slug,
      category: tool.category,
      description: tool.description,
      cheatsheet: tool.cheatsheet,
      officialUrl: tool.officialUrl ?? null,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
