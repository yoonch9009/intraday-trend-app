// 파일: src/app/api/krx/route.ts

import { NextResponse } from "next/server";
import { getMarketDataAndNiti } from "@/lib/krx";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const asset = searchParams.get("asset");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const maPeriodStr = searchParams.get("maPeriod");

    if (!asset || !startDate || !endDate || !maPeriodStr) {
      return NextResponse.json(
        { error: "Missing required query parameters" },
        { status: 400 }
      );
    }

    const maPeriod = parseInt(maPeriodStr, 10);
    if (isNaN(maPeriod)) {
      return NextResponse.json({ error: "Invalid maPeriod" }, { status: 400 });
    }

    const data = await getMarketDataAndNiti(
      asset,
      startDate,
      endDate,
      maPeriod
    );
    return NextResponse.json(data);
  } catch (error) {
    console.error("[API Error]", error);
    const message =
      error instanceof Error ? error.message : "An unknown error occurred";
    return NextResponse.json(
      { error: "Failed to fetch data", details: message },
      { status: 500 }
    );
  }
}
