// 파일: src/app/components/NitiChart.tsx (최종 수정본)

"use client";

import React, { useState } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from "recharts";
import type { NitiData } from "@/lib/krx";

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="p-3 bg-background border border-border rounded-lg shadow-lg">
        <p className="font-bold text-foreground">{`날짜: ${label}`}</p>
        {payload.map(
          (pld: any) =>
            pld.value !== null && (
              <p
                key={pld.dataKey}
                style={{ color: pld.stroke || pld.fill }}
                className="text-sm"
              >
                {`${pld.name}: ${pld.value.toFixed(2)}`}
              </p>
            )
        )}
      </div>
    );
  }
  return null;
};

const NitiChart: React.FC<{ data: NitiData[] }> = ({ data }) => {
  const [hidden, setHidden] = useState({
    close: false,
    ma: false,
    value: false,
  });

  const handleLegendClick = (o: any) => {
    const { dataKey } = o;
    setHidden((prev) => ({ ...prev, [dataKey]: !prev[dataKey] }));
  };

  const renderLegendText = (value: string, entry: any) => {
    const { dataKey } = entry;
    // @ts-ignore
    const isHidden = hidden[dataKey];
    return (
      <span
        style={{ color: isHidden ? "#a1a1aa" : "#18181b", cursor: "pointer" }}
      >
        {value}
      </span>
    );
  };

  // 데이터에서 평균값 가져오기
  const nitiMean = data?.[0]?.nitiMean;

  return (
    <ResponsiveContainer width="100%" height={400}>
      <ComposedChart
        data={data}
        margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
      >
        <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" />
        <XAxis
          dataKey="time"
          stroke="#6b7280"
          fontSize={12}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend onClick={handleLegendClick} formatter={renderLegendText} />

        {/* --- 3개의 독립된 Y축 (모두 자동 축척) --- */}
        <YAxis
          yAxisId="close"
          orientation="left"
          stroke="#4f46e5"
          fontSize={12}
          tickLine={false}
          axisLine={false}
          domain={["auto", "auto"]}
        />
        <YAxis
          yAxisId="ma"
          orientation="right"
          stroke="#f97316"
          fontSize={12}
          tickLine={false}
          axisLine={false}
          domain={["auto", "auto"]}
        />
        <YAxis
          yAxisId="value"
          orientation="right"
          hide={true}
          domain={["auto", "auto"]}
        />

        {/* 평균값 기준선 (NITI MA 축 기준) */}
        {typeof nitiMean === "number" && !isNaN(nitiMean) && (
          <ReferenceLine
            y={nitiMean}
            yAxisId="ma"
            label={{
              value: `NITI 평균 (${nitiMean.toFixed(2)})`,
              position: "insideTopLeft",
              fill: "#ef4444",
              fontSize: 12,
            }}
            stroke="#ef4444"
            strokeDasharray="4 4"
          />
        )}

        {/* --- 각 데이터를 해당 Y축에 할당, connectNulls로 초기 빈 값 처리 --- */}
        <Line
          hide={hidden.close}
          yAxisId="close"
          type="monotone"
          dataKey="close"
          name="종가"
          stroke="#4f46e5"
          strokeWidth={2}
          dot={false}
          connectNulls={false}
        />
        <Line
          hide={hidden.ma}
          yAxisId="ma"
          type="monotone"
          dataKey="ma"
          name="NITI MA"
          stroke="#f97316"
          strokeWidth={2}
          dot={false}
          connectNulls={false}
        />
        <Bar
          hide={hidden.value}
          yAxisId="value"
          dataKey="value"
          name="일일 NITI"
          fill="#9ca3af"
          barSize={20}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
};

export default NitiChart;
