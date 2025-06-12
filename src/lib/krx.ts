// 파일: src/lib/krx.ts (최종 수정본)

import { format, add, differenceInYears, parse } from "date-fns";

export interface MarketData {
  TRD_DD: string;
  TDD_CLSPRC: string;
  TDD_OPNPRC: string;
  TDD_HGPRC: string;
  TDD_LWPRC: string;
}

export interface NitiData {
  time: string;
  close: number;
  value: number | null; // 일일 NITI
  ma: number | null; // NITI MA
  nitiMean: number | null; // NITI 평균값
}

const PRODUCT_IDS: { [key: string]: string } = {
  코스피200: "KR___FUK2I",
  미니코스피200: "KR___FUMKI",
  코스닥150: "KR___FUKQI",
  미국달러: "KR___FUUSD",
  "10년국채": "KR___FUBMA",
};

async function fetchKrxData(
  prodId: string,
  startDate: string,
  endDate: string
): Promise<MarketData[]> {
  const url = "http://data.krx.co.kr/comm/bldAttendant/getJsonData.cmd";
  const payload = new URLSearchParams({
    bld: "dbms/MDC/STAT/standard/MDCSTAT12701",
    locale: "ko_KR",
    prodId,
    strtDd: startDate,
    endDd: endDate,
    share: "1",
    money: "3",
  });
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
    },
    body: payload.toString(),
  });
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  const data = await response.json();
  return data.output || [];
}

function calculateNITI(
  data: MarketData[],
  atrPeriod = 20,
  maPeriod = 20
): NitiData[] {
  if (data.length === 0) return [];

  const parsedData = data
    .map((d) => ({
      date: parse(d.TRD_DD.split(" ")[0], "yyyy/MM/dd", new Date()),
      close: parseFloat(d.TDD_CLSPRC.replace(/,/g, "")),
      open: parseFloat(d.TDD_OPNPRC.replace(/,/g, "")),
      high: parseFloat(d.TDD_HGPRC.replace(/,/g, "")),
      low: parseFloat(d.TDD_LWPRC.replace(/,/g, "")),
    }))
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  let trHistory: number[] = [];
  const calculated = parsedData.map((current, i, all) => {
    if (i === 0) return { ...current, tr: 0, atr: null, niti: null };

    const high = current.high;
    const low = current.low;
    const prevClose = all[i - 1].close;
    const tr = Math.max(
      high - low,
      Math.abs(high - prevClose),
      Math.abs(low - prevClose)
    );
    trHistory.push(tr);

    let atr = null;
    if (i >= atrPeriod - 1) {
      if (i === atrPeriod - 1) {
        atr = trHistory.reduce((sum, val) => sum + val, 0) / atrPeriod;
      } else {
        const prevAtr = all[i - 1].atr;
        if (prevAtr) {
          atr = (prevAtr * (atrPeriod - 1) + tr) / atrPeriod;
        }
      }
    }

    const niti = atr ? Math.abs(current.close - current.open) / atr : null;
    return { ...current, tr, atr, niti };
  });

  // ★★★ NITI 평균값 계산 로직 ★★★
  const allNitiValues = calculated
    .map((d) => d.niti)
    .filter((n) => n !== null) as number[];
  const nitiMean =
    allNitiValues.length > 0
      ? allNitiValues.reduce((sum, val) => sum + val, 0) / allNitiValues.length
      : null;

  return calculated.map((current, i, all) => {
    let ma: number | null = null;
    const nitiSlice = all.slice(0, i + 1).map((d) => d.niti);
    const validNitiInWindow = nitiSlice
      .slice(-maPeriod)
      .filter((n) => n !== null);

    if (validNitiInWindow.length === maPeriod) {
      ma =
        validNitiInWindow.reduce((sum, val) => sum + (val as number), 0) /
        maPeriod;
    }

    return {
      time: format(current.date, "yyyy-MM-dd"),
      close: current.close,
      value: current.niti,
      ma: ma,
      nitiMean: nitiMean,
    };
  });
}

export async function getMarketDataAndNiti(
  asset: string,
  startDateStr: string,
  endDateStr: string,
  maPeriod: number
): Promise<NitiData[]> {
  const prodId = PRODUCT_IDS[asset];
  if (!prodId) throw new Error("Invalid asset");
  const startDate = parse(startDateStr, "yyyy-MM-dd", new Date());
  const endDate = parse(endDateStr, "yyyy-MM-dd", new Date());

  if (differenceInYears(endDate, startDate) > 2) {
    let allData: MarketData[] = [];
    let currentStart = startDate;
    while (currentStart < endDate) {
      let currentEnd = add(currentStart, { years: 2, days: -1 });
      if (currentEnd > endDate) currentEnd = endDate;
      const data = await fetchKrxData(
        prodId,
        format(currentStart, "yyyyMMdd"),
        format(currentEnd, "yyyyMMdd")
      );
      allData = allData.concat(data);
      currentStart = add(currentEnd, { days: 1 });
    }
    return calculateNITI(allData, 20, maPeriod);
  } else {
    const data = await fetchKrxData(
      prodId,
      format(startDate, "yyyyMMdd"),
      format(endDate, "yyyyMMdd")
    );
    return calculateNITI(data, 20, maPeriod);
  }
}
