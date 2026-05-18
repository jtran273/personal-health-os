import { NextResponse, type NextRequest } from "next/server";
import { createMealLogFromOpenClaw } from "@/lib/providers/openclaw";

export async function GET() {
  return NextResponse.json({
    meals: [],
    todos: ["Persist meal logs", "Add photo analysis queue", "Resolve known food matches"]
  });
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as { text?: string; photoUrl?: string; loggedAt?: string };
  const meal = createMealLogFromOpenClaw(body);

  return NextResponse.json(
    {
      meal,
      todos: ["Validate trusted ingestion token", "Persist raw OpenClaw event"]
    },
    { status: 202 }
  );
}
