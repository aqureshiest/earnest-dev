import { NextResponse } from "next/server";

export async function GET() {
    return NextResponse.json({ status: "ok", message: "Service is healthy" }, { status: 200 });
}
