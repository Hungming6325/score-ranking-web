"use client";

import { useMemo, useRef, useState } from "react";
import Papa from "papaparse";

type RowData = {
  Score?: string | number;
  ID?: string;
  Department?: string;
  Catetory?: string;
  Chinese: number | string;
  English: number | string;
  Math: number | string;
  Professional_1: number | string;
  Professional_2: number | string;
  Total?: number | string;
};

type FilterField =
  | "Chinese"
  | "English"
  | "Math"
  | "Professional_1"
  | "Professional_2";

type ParsedFileResult = {
  ok: boolean;
  rows: RowData[];
  error?: string;
};

type HistogramBin = {
  score: number;
  parentCount: number;
  simCount: number;
};

const categoryOptions = [
  "01機械群",
  "02動力機械群",
  "03電機與電子群電機類",
  "04電機與電子群資電類",
  "05化工群",
  "06土木與建築群",
  "07設計群",
  "08工程與管理類",
  "09商業與管理群",
  "10衛生與護理類",
  "11食品群",
  "12家政群幼保類",
  "13家政群生活應用類",
  "14農業群",
  "15外語群英語類",
  "16外語群日語類",
  "17餐旅群",
  "18海事群",
  "19水產群",
  "20藝術群影視類",
];

const scoreFields: FilterField[] = [
  "Chinese",
  "English",
  "Math",
  "Professional_1",
  "Professional_2",
];

export default function Home() {
  const parentFileInputRef = useRef<HTMLInputElement | null>(null);
  const simFileInputRef = useRef<HTMLInputElement | null>(null);

  const [parentData, setParentData] = useState<RowData[]>([]);
  const [simData, setSimData] = useState<RowData[]>([]);
  const [result, setResult] = useState<RowData[]>([]);

  const [parentFileName, setParentFileName] = useState("");
  const [simFileName, setSimFileName] = useState("");

  const [error, setError] = useState("");
  const [quota, setQuota] = useState<number>(0);
  const [steps, setSteps] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("");

  const [multiplier, setMultiplier] = useState<Record<FilterField, number>>({
    Chinese: 0,
    English: 0,
    Math: 0,
    Professional_1: 0,
    Professional_2: 0,
  });

  const parseCsvFile = (
    file: File,
    requiredColumns: string[],
    onDone: (result: ParsedFileResult) => void
  ) => {
    Papa.parse<RowData>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (res) => {
        const rows = (res.data || []).filter((row) =>
          Object.values(row).some((v) => String(v ?? "").trim() !== "")
        );

        const firstRow = rows[0];
        if (!firstRow) {
          onDone({
            ok: false,
            rows: [],
            error: "CSV 沒有資料",
          });
          return;
        }

        const missingColumns = requiredColumns.filter((col) => !(col in firstRow));
        if (missingColumns.length > 0) {
          onDone({
            ok: false,
            rows: [],
            error: `缺少欄位：${missingColumns.join(", ")}`,
          });
          return;
        }

        rows.forEach((r) => {
          if (r.ID !== undefined) {
            r.ID = String(r.ID).trim();
          }
        });

        onDone({
          ok: true,
          rows,
        });
      },
      error: () => {
        onDone({
          ok: false,
          rows: [],
          error: "CSV 讀取失敗",
        });
      },
    });
  };

  const handleParentFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setParentFileName(file.name);
    setError("");

    parseCsvFile(
      file,
      ["Score", "Chinese", "English", "Math", "Professional_1", "Professional_2"],
      (parsed) => {
        if (!parsed.ok) {
          setParentData([]);
          setError(parsed.error || "母體成績檔案讀取失敗");
          return;
        }

        setParentData(parsed.rows);
      }
    );
  };

  const handleSimFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSimFileName(file.name);
    setError("");
    setSteps([]);
    setResult([]);

    parseCsvFile(
      file,
      ["ID", "Chinese", "English", "Math", "Professional_1", "Professional_2"],
      (parsed) => {
        if (!parsed.ok) {
          setSimData([]);
          setError(parsed.error || "模擬檔案讀取失敗");
          return;
        }

        setSimData(parsed.rows);
      }
    );
  };

  const calculate = () => {
    setError("");
    setSteps([]);

    if (!parentData.length) {
      setError("請先上傳母體成績檔案");
      return;
    }

    if (!simData.length) {
      setError("請先上傳模擬檔案");
      return;
    }

    if (!quota || quota <= 0) {
      setError("請輸入正確的招生名額");
      return;
    }

    let workingList = [...simData];

    const activeFilters = scoreFields
      .map((field) => ({
        field,
        times: Number(multiplier[field] || 0),
      }))
      .filter((item) => item.times >= 3);

    if (!activeFilters.length) {
      setError("請至少設定一個大於等於 3 的篩選倍率");
      return;
    }

    const groupedByTimes = [...new Set(activeFilters.map((x) => x.times))]
      .sort((a, b) => b - a)
      .map((times) => ({
        times,
        fields: activeFilters
          .filter((x) => x.times === times)
          .map((x) => x.field),
      }));

    const processSteps: string[] = [];

    for (const group of groupedByTimes) {
      const limit = quota * group.times;

      workingList = workingList
        .map((row) => ({
          ...row,
          __groupScore: group.fields.reduce(
            (sum, field) => sum + Number(row[field] || 0),
            0
          ),
        }))
        .sort((a, b) => Number(b.__groupScore) - Number(a.__groupScore))
        .slice(0, limit)
        .map(({ __groupScore, ...rest }) => rest as RowData);

      processSteps.push(
        `倍率 ${group.times}：${group.fields.join(" + ")} 加總篩選 → 保留前 ${limit} 人，目前剩 ${workingList.length} 人`
      );
    }

    setResult(workingList);
    setSteps(processSteps);
  };

  const parentDisplayCount = useMemo(() => {
    if (!parentData.length) return 0;
    const totals = scoreFields.map((field) =>
      sumDistributionCounts(parentData, field)
    );
    return Math.min(...totals);
  }, [parentData]);

  return (
    <main
      style={{
        padding: "32px",
        fontFamily: "Arial, sans-serif",
        background: "#f7f8fb",
        minHeight: "100vh",
      }}
    >
      <div
        style={{
          maxWidth: "1500px",
          margin: "0 auto",
          background: "#ffffff",
          borderRadius: "20px",
          padding: "32px",
          boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
        }}
      >
        <h1
          style={{
            fontSize: "56px",
            marginBottom: "28px",
            fontWeight: 700,
            color: "#1f2937",
          }}
        >
          成績倍率系統
        </h1>

        <h2 style={sectionTitleStyle}>招生群類別</h2>
        <div style={{ marginBottom: "28px" }}>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            style={selectStyle}
          >
            <option value="">請選擇群類別</option>
            {categoryOptions.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>

        <div
          style={{
            marginBottom: "18px",
            display: "flex",
            alignItems: "center",
            gap: "16px",
            flexWrap: "wrap",
          }}
        >
          <input
            ref={parentFileInputRef}
            type="file"
            accept=".csv"
            onChange={handleParentFile}
            style={{ display: "none" }}
          />

          <button
            onClick={() => parentFileInputRef.current?.click()}
            style={buttonStyle}
          >
            選擇母體成績檔案
          </button>

          <span style={{ fontSize: "28px", color: "#1f2937" }}>
            {parentFileName || "尚未選擇檔案"}
          </span>
        </div>

        <div
          style={{
            marginBottom: "28px",
            display: "flex",
            alignItems: "center",
            gap: "16px",
            flexWrap: "wrap",
          }}
        >
          <input
            ref={simFileInputRef}
            type="file"
            accept=".csv"
            onChange={handleSimFile}
            style={{ display: "none" }}
          />

          <button
            onClick={() => simFileInputRef.current?.click()}
            style={buttonStyle}
          >
            選擇模擬檔案
          </button>

          <span style={{ fontSize: "28px", color: "#1f2937" }}>
            {simFileName || "尚未選擇檔案"}
          </span>
        </div>

        <h2 style={sectionTitleStyle}>招生名額</h2>
        <div style={{ marginBottom: "28px" }}>
          <input
            type="number"
            min={0}
            value={quota}
            onChange={(e) => setQuota(Number(e.target.value))}
            style={inputStyle}
          />
        </div>

        <h2 style={sectionTitleStyle}>篩選倍率</h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "260px 180px",
            gap: "18px 20px",
            alignItems: "center",
            marginBottom: "28px",
            maxWidth: "520px",
          }}
        >
          {scoreFields.map((field) => (
            <div
              key={field}
              style={{
                display: "contents",
              }}
            >
              <label
                style={{
                  fontSize: "28px",
                  color: "#111827",
                  fontWeight: 500,
                }}
              >
                {field}
              </label>

              <input
                type="number"
                value={multiplier[field]}
                onChange={(e) =>
                  setMultiplier({
                    ...multiplier,
                    [field]: Number(e.target.value),
                  })
                }
                style={inputStyle}
              />
            </div>
          ))}
        </div>

        <button onClick={calculate} style={runButtonStyle}>
          執行
        </button>

        {error && (
          <div
            style={{
              marginTop: "20px",
              color: "#b91c1c",
              background: "#fee2e2",
              border: "1px solid #fecaca",
              padding: "14px 16px",
              borderRadius: "10px",
              fontSize: "20px",
            }}
          >
            {error}
          </div>
        )}

        {steps.length > 0 && (
          <>
            <h2 style={{ ...sectionTitleStyle, marginTop: "36px" }}>篩選流程</h2>
            <div
              style={{
                background: "#f3f4f6",
                border: "1px solid #d1d5db",
                borderRadius: "12px",
                padding: "16px",
                marginBottom: "28px",
              }}
            >
              {steps.map((step, index) => (
                <div
                  key={index}
                  style={{
                    fontSize: "20px",
                    color: "#111827",
                    marginBottom: index === steps.length - 1 ? 0 : "10px",
                  }}
                >
                  {index + 1}. {step}
                </div>
              ))}
            </div>
          </>
        )}

        <h2 style={sectionTitleStyle}>結果</h2>
        <div
          style={{
            marginBottom: "8px",
            fontSize: "22px",
            color: "#374151",
          }}
        >
          群類別：{selectedCategory || "未選擇"}
        </div>
        <div
          style={{
            marginBottom: "20px",
            fontSize: "22px",
            color: "#374151",
          }}
        >
          母體人數：{parentDisplayCount}
        </div>

        <div
          style={{
            display: "flex",
            gap: "24px",
            alignItems: "center",
            marginBottom: "20px",
            flexWrap: "wrap",
            fontSize: "18px",
          }}
        >
          <LegendBox color="#8bb8ea" label="母體成績分布" />
          <LegendBox color="rgba(45, 92, 184, 0.85)" label="篩選後成績分布" />
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(560px, 1fr))",
            gap: "24px",
          }}
        >
          {scoreFields.map((field) => (
            <OverlayHistogramCard
              key={field}
              title={field}
              parentRows={parentData}
              simRows={result}
              field={field}
            />
          ))}
        </div>
      </div>
    </main>
  );
}

function LegendBox({ color, label }: { color: string; label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
      <span
        style={{
          display: "inline-block",
          width: "24px",
          height: "14px",
          background: color,
          borderRadius: "4px",
          border: "1px solid #94a3b8",
        }}
      />
      <span>{label}</span>
    </div>
  );
}

function OverlayHistogramCard({
  title,
  parentRows,
  simRows,
  field,
}: {
  title: string;
  parentRows: RowData[];
  simRows: RowData[];
  field: FilterField;
}) {
  const bins = buildOverlayBins(parentRows, simRows, field);
  const maxCount = Math.max(...bins.map((b) => b.parentCount), 1);

  const parentStats = computeParentStats(parentRows, field);

  return (
    <div
      style={{
        border: "1px solid #d1d5db",
        borderRadius: "16px",
        padding: "20px",
        background: "#ffffff",
        boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
      }}
    >
      <h3
        style={{
          fontSize: "28px",
          marginBottom: "8px",
          color: "#111827",
          textAlign: "center",
        }}
      >
        {title} Score Distribution
      </h3>

      <div
        style={{
          textAlign: "center",
          fontSize: "15px",
          color: "#374151",
          marginBottom: "12px",
        }}
      >
        平均數 = {parentStats.mean.toFixed(2)}　標準差 = {parentStats.sd.toFixed(2)}　總人數 ={" "}
        {parentStats.total}
      </div>

      {bins.length === 0 ? (
        <div style={{ color: "#6b7280", fontSize: "18px" }}>尚無資料</div>
      ) : (
        <svg viewBox="0 0 640 380" style={{ width: "100%", height: "auto" }}>
          <line x1="60" y1="25" x2="60" y2="310" stroke="#111827" strokeWidth="1.5" />
          <line x1="60" y1="310" x2="615" y2="310" stroke="#111827" strokeWidth="1.5" />

          <text
            x="20"
            y="170"
            transform="rotate(-90 20 170)"
            textAnchor="middle"
            fontSize="16"
            fill="#111827"
          >
            人數
          </text>

          <text x="338" y="355" textAnchor="middle" fontSize="16" fill="#111827">
            分數
          </text>

          {buildYTicks(maxCount).map((tick, idx) => {
            const y = 310 - (tick / maxCount) * 250;
            return (
              <g key={idx}>
                <line x1="55" y1={y} x2="60" y2={y} stroke="#111827" strokeWidth="1" />
                <text x="48" y={y + 4} textAnchor="end" fontSize="12" fill="#374151">
                  {tick}
                </text>
                <line
                  x1="60"
                  y1={y}
                  x2="615"
                  y2={y}
                  stroke="#e5e7eb"
                  strokeWidth="1"
                />
              </g>
            );
          })}

          {bins.map((bin, index) => {
            const chartWidth = 540;
            const baseX = 70;
            const slotWidth = chartWidth / bins.length;
            const parentBarWidth = Math.max(slotWidth * 0.82, 4);
            const simBarWidth = Math.max(slotWidth * 0.46, 3);

            const xParent = baseX + index * slotWidth + (slotWidth - parentBarWidth) / 2;
            const xSim = baseX + index * slotWidth + (slotWidth - simBarWidth) / 2;

            const parentHeight = (bin.parentCount / maxCount) * 250;
            const simHeight = (bin.simCount / maxCount) * 250;

            const yParent = 310 - parentHeight;
            const ySim = 310 - simHeight;

            return (
              <g key={index}>
                <title>{`${bin.score}分 ｜ 母體 ${bin.parentCount} 人 ｜ 篩選後 ${bin.simCount} 人`}</title>

                <rect
                  x={xParent}
                  y={yParent}
                  width={parentBarWidth}
                  height={parentHeight}
                  fill="#8bb8ea"
                />
                <rect
                  x={xSim}
                  y={ySim}
                  width={simBarWidth}
                  height={simHeight}
                  fill="rgba(45, 92, 184, 0.85)"
                />

                {bin.score % 10 === 0 && (
                  <text
                    x={baseX + index * slotWidth + slotWidth / 2}
                    y={330}
                    textAnchor="middle"
                    fontSize="11"
                    fill="#374151"
                  >
                    {bin.score}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      )}
    </div>
  );
}

function buildOverlayBins(
  parentRows: RowData[],
  simRows: RowData[],
  field: FilterField
): HistogramBin[] {
  const parentMap = new Map<number, number>();

  parentRows.forEach((row) => {
    const score = parseScoreMid(row.Score);
    const count = Number(row[field] || 0);

    if (Number.isFinite(score) && Number.isFinite(count) && count > 0) {
      const roundedScore = Math.round(score);
      parentMap.set(roundedScore, (parentMap.get(roundedScore) || 0) + count);
    }
  });

  const simMap = new Map<number, number>();
  simRows.forEach((row) => {
    const score = Number(row[field] || 0);
    if (Number.isFinite(score)) {
      const roundedScore = Math.round(score);
      simMap.set(roundedScore, (simMap.get(roundedScore) || 0) + 1);
    }
  });

  const allScores = [...new Set([...parentMap.keys(), ...simMap.keys()])].sort((a, b) => a - b);

  return allScores.map((score) => ({
    score,
    parentCount: parentMap.get(score) || 0,
    simCount: simMap.get(score) || 0,
  }));
}

function computeParentStats(rows: RowData[], field: FilterField) {
  let total = 0;
  let weightedSum = 0;

  rows.forEach((row) => {
    const score = parseScoreMid(row.Score);
    const count = Number(row[field] || 0);

    if (Number.isFinite(score) && Number.isFinite(count) && count > 0) {
      total += count;
      weightedSum += score * count;
    }
  });

  const mean = total > 0 ? weightedSum / total : 0;

  let weightedVarSum = 0;
  rows.forEach((row) => {
    const score = parseScoreMid(row.Score);
    const count = Number(row[field] || 0);

    if (Number.isFinite(score) && Number.isFinite(count) && count > 0) {
      weightedVarSum += Math.pow(score - mean, 2) * count;
    }
  });

  const variance = total > 0 ? weightedVarSum / total : 0;
  const sd = Math.sqrt(variance);

  return { total, mean, sd };
}

function parseScoreMid(value: unknown): number {
  if (value === null || value === undefined) return NaN;

  const text = String(value).trim().replace("～", "~");
  const matches = text.match(/\d+(\.\d+)?/g);

  if (!matches || matches.length === 0) return NaN;
  if (matches.length === 1) return Number(matches[0]);

  return (Number(matches[0]) + Number(matches[1])) / 2;
}

function sumDistributionCounts(rows: RowData[], field: FilterField) {
  return rows.reduce((sum, row) => {
    const count = Number(row[field] || 0);
    return sum + (Number.isFinite(count) ? count : 0);
  }, 0);
}

function buildYTicks(maxValue: number) {
  if (maxValue <= 5) return [0, 1, 2, 3, 4, 5];

  const roughStep = maxValue / 5;
  const magnitude = Math.pow(10, Math.floor(Math.log10(roughStep)));
  const normalized = roughStep / magnitude;

  let niceStep = magnitude;
  if (normalized > 5) niceStep = 10 * magnitude;
  else if (normalized > 2) niceStep = 5 * magnitude;
  else if (normalized > 1) niceStep = 2 * magnitude;

  const ticks: number[] = [];
  const top = Math.ceil(maxValue / niceStep) * niceStep;

  for (let v = 0; v <= top; v += niceStep) {
    ticks.push(v);
  }

  return ticks;
}

const sectionTitleStyle: React.CSSProperties = {
  fontSize: "34px",
  marginBottom: "14px",
  color: "#111827",
};

const buttonStyle: React.CSSProperties = {
  padding: "14px 24px",
  fontSize: "24px",
  border: "1px solid #9ca3af",
  borderRadius: "14px",
  backgroundColor: "#eef2ff",
  color: "#111827",
  cursor: "pointer",
  fontWeight: 600,
};

const runButtonStyle: React.CSSProperties = {
  padding: "16px 28px",
  fontSize: "30px",
  border: "1px solid #94a3b8",
  borderRadius: "14px",
  backgroundColor: "#dbeafe",
  color: "#111827",
  cursor: "pointer",
  fontWeight: 700,
};

const inputStyle: React.CSSProperties = {
  width: "160px",
  padding: "12px 14px",
  fontSize: "28px",
  border: "2px solid #94a3b8",
  borderRadius: "12px",
  backgroundColor: "#f1f5f9",
  color: "#111827",
  outline: "none",
};

const selectStyle: React.CSSProperties = {
  width: "520px",
  maxWidth: "100%",
  padding: "12px 14px",
  fontSize: "24px",
  border: "2px solid #94a3b8",
  borderRadius: "12px",
  backgroundColor: "#f1f5f9",
  color: "#111827",
  outline: "none",
};