// 파일: src/app/page.tsx (최종 수정본)

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { format, sub, startOfDay } from "date-fns";
import { NitiData } from "@/lib/krx";
import dynamic from "next/dynamic";

// --- 아이콘 컴포넌트 ---
const PlusIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="12" x2="12" y1="5" y2="19" />
    <line x1="5" x2="19" y1="12" y2="12" />
  </svg>
);
const TrashIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M3 6h18" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    <line x1="10" x2="10" y1="11" y2="17" />
    <line x1="14" x2="14" y1="11" y2="17" />
  </svg>
);
const InfoIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="10" />
    <line x1="12" x2="12" y1="16" y2="12" />
    <line x1="12" x2="12.01" y1="8" y2="8" />
  </svg>
);

// --- 차트 컴포넌트 동적 로딩 ---
const NitiChart = dynamic(() => import("@/app/components/NitiChart"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-[400px] text-muted-foreground">
      Loading Chart...
    </div>
  ),
});

// --- 타입 및 상수 정의 ---
type ChartConfig = {
  id: number;
  asset: string;
  maPeriod: number;
  data: NitiData[];
  loading: boolean;
  error: string | null;
};
const ASSETS = [
  "코스피200",
  "미니코스피200",
  "코스닥150",
  "미국달러",
  "10년국채",
];
const QUICK_DATES = ["1M", "6M", "1Y", "2Y", "MAX"] as const;

// ======================== 메인 페이지 컴포넌트 ========================
export default function Home() {
  const [startDate, setStartDate] = useState(
    format(sub(new Date(), { years: 1 }), "yyyy-MM-dd")
  );
  const [endDate, setEndDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [charts, setCharts] = useState<ChartConfig[]>([]);
  const initialLoadDone = useRef(false);

  // --- 데이터 요청 함수 ---
  const fetchChartData = useCallback(
    async (chartConfig: ChartConfig, start: string, end: string) => {
      setCharts((prev) =>
        prev.map((c) =>
          c.id === chartConfig.id ? { ...c, loading: true, error: null } : c
        )
      );
      try {
        const response = await fetch(
          `/api/krx?asset=${chartConfig.asset}&startDate=${start}&endDate=${end}&maPeriod=${chartConfig.maPeriod}`
        );
        if (!response.ok) {
          const err = await response.json();
          throw new Error(err.details || "Failed to fetch data");
        }
        const result: NitiData[] = await response.json();
        setCharts((prev) =>
          prev.map((c) =>
            c.id === chartConfig.id ? { ...c, data: result, loading: false } : c
          )
        );
      } catch (err: any) {
        setCharts((prev) =>
          prev.map((c) =>
            c.id === chartConfig.id
              ? { ...c, error: err.message, loading: false, data: [] }
              : c
          )
        );
      }
    },
    []
  );

  // --- 기간 변경 시 모든 차트 데이터 다시 가져오기 ---
  useEffect(() => {
    if (!initialLoadDone.current) return;
    charts.forEach((chart) => fetchChartData(chart, startDate, endDate));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate]);

  // --- 차트 개별 설정 변경 시 해당 차트만 데이터 다시 가져오기 ---
  const handleChartConfigChange = (
    id: number,
    newConfig: Partial<Pick<ChartConfig, "asset" | "maPeriod">>
  ) => {
    const chartToUpdate = charts.find((c) => c.id === id);
    if (chartToUpdate) {
      const updatedChart = { ...chartToUpdate, ...newConfig };
      setCharts((prev) => prev.map((c) => (c.id === id ? updatedChart : c)));
      fetchChartData(updatedChart, startDate, endDate);
    }
  };

  // --- 차트 추가/제거 ---
  const addChart = () => {
    if (charts.length >= 4) return;
    const newChart: ChartConfig = {
      id: Date.now(),
      asset: "코스피200",
      maPeriod: 20,
      data: [],
      loading: true,
      error: null,
    };
    setCharts((prev) => [...prev, newChart]);
    fetchChartData(newChart, startDate, endDate);
  };
  const removeChart = (id: number) =>
    setCharts((prev) => prev.filter((c) => c.id !== id));

  // --- 기간 간편 선택 ---
  const handleQuickDateSelect = (period: (typeof QUICK_DATES)[number]) => {
    const end = startOfDay(new Date());
    let start;
    if (period === "1M") start = sub(end, { months: 1 });
    else if (period === "6M") start = sub(end, { months: 6 });
    else if (period === "1Y") start = sub(end, { years: 1 });
    else if (period === "2Y") start = sub(end, { years: 2 });
    else start = new Date("2016-01-01");
    setStartDate(format(start, "yyyy-MM-dd"));
    setEndDate(format(end, "yyyy-MM-dd"));
  };

  // --- 최초 로딩 시 기본 차트 설정 ---
  useEffect(() => {
    if (!initialLoadDone.current) {
      const initialCharts: ChartConfig[] = [
        {
          id: 1,
          asset: "미니코스피200",
          maPeriod: 20,
          data: [],
          loading: false,
          error: null,
        },
        {
          id: 2,
          asset: "코스닥150",
          maPeriod: 20,
          data: [],
          loading: false,
          error: null,
        },
      ];
      setCharts(initialCharts);
      const oneYearAgo = format(sub(new Date(), { years: 1 }), "yyyy-MM-dd");
      const today = format(new Date(), "yyyy-MM-dd");
      initialCharts.forEach((chart) =>
        fetchChartData(chart, oneYearAgo, today)
      );
      initialLoadDone.current = true;
    }
  }, [fetchChartData]);

  // ======================== JSX 렌더링 시작 ========================
  return (
    // ★★★ 모바일에서는 세로, 데스크탑에서는 가로로 배치 ★★★
    <div className="flex flex-col md:flex-row min-h-screen bg-secondary">
      {/* --- 사이드바 (컨트롤 패널) --- */}
      <aside className="w-full md:w-[380px] flex-shrink-0 border-b md:border-b-0 md:border-r border-border bg-background p-6 flex flex-col gap-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tighter text-primary">
            Intraday 추세 분석
          </h1>
          <p className="text-muted-foreground mt-2 text-sm">
            자산별 NITI 지표를 통해 일중 추세의 강도를 분석합니다.
          </p>
        </div>

        <div className="border-t border-border pt-6">
          <h2 className="text-lg font-semibold mb-4">기간 설정</h2>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="start-date"
                  className="text-sm font-medium text-muted-foreground"
                >
                  시작일
                </label>
                <input
                  type="date"
                  id="start-date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full mt-1"
                />
              </div>
              <div>
                <label
                  htmlFor="end-date"
                  className="text-sm font-medium text-muted-foreground"
                >
                  종료일
                </label>
                <input
                  type="date"
                  id="end-date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full mt-1"
                />
              </div>
            </div>
            <div className="flex items-center gap-1 p-1 bg-muted rounded-md">
              {QUICK_DATES.map((p) => (
                <button
                  key={p}
                  onClick={() => handleQuickDateSelect(p)}
                  className="flex-1 px-2 py-1 text-sm rounded-sm bg-background data-[active=true]:bg-primary data-[active=true]:text-primary-foreground hover:bg-muted"
                  data-active={
                    p === "1Y" &&
                    format(sub(new Date(), { years: 1 }), "yyyy-MM-dd") ===
                      startDate
                  }
                >
                  {p === "MAX" ? "전체" : p}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="border-t border-border pt-6 flex-1 flex flex-col gap-4">
          <h2 className="text-lg font-semibold">차트 목록</h2>
          <div className="space-y-4">
            {charts.map((chart) => (
              <div key={chart.id} className="p-3 border rounded-lg bg-muted/50">
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label
                      htmlFor={`asset-${chart.id}`}
                      className="text-xs font-medium text-muted-foreground"
                    >
                      자산
                    </label>
                    <select
                      id={`asset-${chart.id}`}
                      value={chart.asset}
                      onChange={(e) =>
                        handleChartConfigChange(chart.id, {
                          asset: e.target.value,
                        })
                      }
                      className="h-9 w-full mt-1 text-sm"
                    >
                      {ASSETS.map((a) => (
                        <option key={a} value={a}>
                          {a}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="w-20">
                    <label
                      htmlFor={`ma-${chart.id}`}
                      className="text-xs font-medium text-muted-foreground"
                    >
                      MA 주기
                    </label>
                    <input
                      id={`ma-${chart.id}`}
                      type="number"
                      value={chart.maPeriod}
                      onChange={(e) =>
                        handleChartConfigChange(chart.id, {
                          maPeriod: parseInt(e.target.value, 10) || 1,
                        })
                      }
                      className="h-9 w-full mt-1 text-center text-sm"
                    />
                  </div>
                  <div className="self-end">
                    <button
                      onClick={() => removeChart(chart.id)}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90 h-9 w-9 flex items-center justify-center rounded-md"
                    >
                      <TrashIcon />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {charts.length < 4 && (
            <div className="mt-auto pt-4">
              <button
                onClick={addChart}
                className="bg-primary text-primary-foreground hover:bg-primary/90 w-full py-2 rounded-md flex items-center justify-center gap-2"
              >
                <PlusIcon />
                차트 추가 ({charts.length}/4)
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* --- 메인 콘텐츠 영역 (차트 표시) --- */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto">
        <div className="prose prose-sm max-w-none bg-background border rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <InfoIcon className="mt-1 flex-shrink-0 text-primary" />
            <div>
              <h3 className="font-semibold mt-0">지표 설명</h3>
              <ul className="text-muted-foreground text-xs space-y-1">
                <li>
                  <strong>종가 (파란색 선)</strong>: 자산의 가격 추세를
                  나타냅니다.
                </li>
                <li>
                  <strong>NITI MA (주황색 선)</strong>: 추세 강도의 장기적인
                  흐름을 보여줍니다. 이 값이 높고 '추세 강세 기준선' 위에
                  있다면, 변동성이 크고 추세가 강한 시기임을 의미합니다.
                </li>
                <li>
                  <strong>일일 NITI (회색 막대)</strong>: 하루 동안의 추세
                  강도를 나타냅니다. 막대가 높을수록 뚜렷한 방향성을 가진
                  날입니다.
                </li>
              </ul>
            </div>
          </div>
        </div>
        {/* ★★★ 차트 간 세로 간격을 줄임 (gap-8 -> gap-6) ★★★ */}
        <div className="grid gap-6">
          {charts.length > 0 ? (
            charts.map((chart) => (
              <section key={chart.id} className="card p-4 sm:p-6">
                <h3 className="text-xl font-semibold mb-4">{chart.asset}</h3>
                <div className="h-[400px] w-full -ml-4">
                  {chart.loading && (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                      데이터 로딩 중...
                    </div>
                  )}
                  {chart.error && (
                    <div className="flex items-center justify-center h-full text-destructive bg-destructive/10 p-4 rounded-md">
                      오류: {chart.error}
                    </div>
                  )}
                  {!chart.loading && !chart.error && chart.data.length > 0 && (
                    <NitiChart data={chart.data} />
                  )}
                  {!chart.loading &&
                    !chart.error &&
                    chart.data.length === 0 && (
                      <div className="flex items-center justify-center h-full text-muted-foreground">
                        해당 기간에 데이터가 없습니다.
                      </div>
                    )}
                </div>
              </section>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center text-center h-96 border-2 border-dashed rounded-lg">
              <h3 className="text-lg font-semibold">분석할 차트가 없습니다.</h3>
              <p className="text-muted-foreground mt-1">
                왼쪽 패널에서 '차트 추가' 버튼을 눌러 분석을 시작하세요.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
