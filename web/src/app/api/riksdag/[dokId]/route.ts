import { fetchDocument } from "@/lib/riksdag";
import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ dokId: string }> }
) {
  const { dokId } = await params;
  
  if (!dokId) {
    return NextResponse.json(
      { error: "Document ID is required" },
      { status: 400 }
    );
  }

  const result = await fetchDocument(dokId);

  if (!result.success) {
    return NextResponse.json(
      { error: result.error },
      { status: 404 }
    );
  }

  return NextResponse.json(result);
}
