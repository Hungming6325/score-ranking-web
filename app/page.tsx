"use client";

import { useMemo, useRef, useState } from "react";
import Papa from "papaparse";

type RowData = {
  Score?: string | number;
  ID?: string;
  Department?: string;
  Category?: string;
  Chinese: number | string;
  English: number | string;
  Math: number | string;
  Professional_1: number | string;
  Professional_2: number | string;
  Total?: number | string;
};

type ConfigRow = {
  招生系科: string;
  招生群類別: string;
  一般考生招生名額: string | number;
  國文: string | number;
  英文: string | number;
  數學: string | number;
  專業一: string | number;
  專業二: string | number;
  總級分?: string | number;
};

type FilterField =
  | "Chinese"
  | "English"
  | "Math"
  | "Professional_1"
  | "Professional_2";

type ParsedFileResult<T> = {
  ok: boolean;
  rows: T[];
  error?: string;
};

type HistogramBin = {
  score: number;
  parentCount: number;
  simRawCount: number;
  simFilteredCount: number;
};

const scoreFields: FilterField[] = [
  "Chinese",
  "English",
  "Math",
  "Professional_1",
  "Professional_2",
];

const scoreFieldLabels: Record<FilterField, string> = {
  Chinese: "國文",
  English: "英文",
  Math: "數學",
  Professional_1: "專業一",
  Professional_2: "專業二",
};

export default function Home() {
  const configFileInputRef = useRef<HTMLInputElement | null>(null);
  const parentFileInputRef = useRef<HTMLInputElement | null>(null);
  const simFileInputRef = useRef<HTMLInputElement | null>(null);

  const [configData, setConfigData] = useState<ConfigRow[]>([]);
  const [parentData, setParentData] = useState<RowData[]>([]);
  const [simData, setSimData] = useState<RowData[]>([]);
  const [result, setResult] = useState<RowData[]>([]);

  const [configFileName, setConfigFileName] = useState("");
  const [parentFileName, setParentFileName] = useState("");
  const [simFileName, setSimFileName] = useState("");

  const [error, setError] = useState("");
  const [quota, setQuota] = useState<number>(0);
  const [steps, setSteps] = useState<string[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");

  const [multiplier, setMultiplier] = useState<Record<FilterField, number>>({
    Chinese: 0,
    English: 0,
    Math: 0,
    Professional_1: 0,
    Professional_2: 0,
  });

  const resetUploadedFiles = () => {
    setParentData([]);
    setSimData([]);
    setResult([]);
    setSteps([]);
    setError("");
    setParentFileName("");
    setSimFileName("");

    if (parentFileInputRef.current) {
      parentFileInputRef.current.value = "";
    }

    if (simFileInputRef.current) {
      simFileInputRef.current.value = "";
    }
  };

  const parseCsvFile = <T extends Record<string, unknown>>(
    file: File,
    requiredColumns: string[],
    onDone: (result: ParsedFileResult<T>) => void
  ) => {
    Papa.parse<T>(file, {
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

  const handleConfigFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setConfigFileName(file.name);
    setError("");
    setSteps([]);
    setResult([]);

    parseCsvFile<ConfigRow>(
      file,
      [
        "招生系科",
        "招生群類別",
        "一般考生招生名額",
        "國文",
        "英文",
        "數學",
        "專業一",
        "專業二",
      ],
      (parsed) => {
        if (!parsed.ok) {
          setConfigData([]);
          setError(parsed.error || "倍率設定檔讀取失敗");
          return;
        }

        const cleaned = parsed.rows.map((row) => ({
          ...row,
          招生系科: String(row.招生系科 ?? "").trim(),
          招生群類別: String(row.招生群類別 ?? "").trim(),
        }));

        setConfigData(cleaned);
        setSelectedDepartment("");
        setSelectedCategory("");
        resetUploadedFiles();
      }
    );
  };

  const handleParentFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setParentFileName(file.name);
    setError("");

    parseCsvFile<RowData>(
      file,
      ["Score", "Chinese", "English", "Math", "Professional_1", "Professional_2"],
      (parsed) => {
        if (!parsed.ok) {
          setParentData([]);
          setError(parsed.error || "全國成績檔案讀取失敗");
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

    parseCsvFile<RowData>(
      file,
      ["ID", "Chinese", "English", "Math", "Professional_1", "Professional_2"],
      (parsed) => {
        if (!parsed.ok) {
          setSimData([]);
          setError(parsed.error || "模擬檔案讀取失敗");
          return;
        }

        const cleaned = parsed.rows.map((r) => {
          if (r.ID !== undefined) {
            r.ID = String(r.ID).trim();
          }
          return r;
        });

        setSimData(cleaned);
      }
    );
  };

  const departmentOptions = useMemo(() => {
    return [...new Set(configData.map((row) => row.招生系科).filter(Boolean))];
  }, [configData]);

  const categoryOptions = useMemo(() => {
    const rows = selectedDepartment
      ? configData.filter((row) => row.招生系科 === selectedDepartment)
      : configData;

    return [...new Set(rows.map((row) => row.招生群類別).filter(Boolean))];
  }, [configData, selectedDepartment]);

  const selectedConfig = useMemo(() => {
    if (!selectedDepartment || !selectedCategory) return null;

    return (
      configData.find(
        (row) =>
          row.招生系科 === selectedDepartment &&
          row.招生群類別 === selectedCategory
      ) || null
    );
  }, [configData, selectedDepartment, selectedCategory]);

  const calculate = () => {
    setError("");
    setSteps([]);

    if (!selectedDepartment) {
      setError("請先選擇招生系科");
      return;
    }

    if (!selectedCategory) {
      setError("請先選擇招生群類別");
      return;
    }

    if (!parentData.length) {
      setError("請先上傳全國成績檔案");
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
        .sort(
          (a, b) =>
            Number((b as RowData & { __groupScore: number }).__groupScore) -
            Number((a as RowData & { __groupScore: number }).__groupScore)
        )
        .slice(0, limit)
        .map(({ __groupScore, ...rest }) => rest as RowData);

      processSteps.push(
        `倍率 ${group.times}：${group.fields
          .map((field) => scoreFieldLabels[field])
          .join(" + ")} 加總篩選 → 保留前 ${limit} 人，目前剩 ${workingList.length} 人`
      );
    }

    setResult(workingList);
    setSteps(processSteps);
  };

  const parentDisplayCount = useMemo(() => {
    if (!parentData.length) return 0;
    return sumDistributionCounts(parentData, "Chinese");
  }, [parentData]);

  const simDisplayCount = useMemo(() => {
    return simData.length;
  }, [simData]);

  return (
    <main style={pageStyle}>
      <div style={shellStyle}>
        <header style={headerStyle}>
          <h1 style={titleStyle}>甄選入學成績倍率篩選系統</h1>
        </header>

        <div style={stepBarStyle}>
          <StepPill index={1} label="上傳倍率設定檔" />
          <StepArrow />
          <StepPill index={2} label="選擇系科與群類別" />
          <StepArrow />
          <StepPill index={3} label="上傳成績檔" />
          <StepArrow />
          <StepPill index={4} label="設定模擬倍率" />
          <StepArrow />
          <StepPill index={5} label="執行與查看結果" />
        </div>

        <div style={contentGridStyle}>
          <section style={leftColumnStyle}>
            <div style={cardStyle}>
              <div style={cardHeaderStyle}>設定來源資料</div>

              <div style={{ marginBottom: 24 }}>
                <input
                  ref={configFileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleConfigFile}
                  style={{ display: "none" }}
                />
                <div style={fileRowStyle}>
                  <button
                    onClick={() => configFileInputRef.current?.click()}
                    style={secondaryButtonStyle}
                  >
                    上傳倍率設定檔
                  </button>
                  <div style={fileNameStyle}>
                    {configFileName || "尚未選擇檔案"}
                  </div>
                </div>
              </div>

              <div style={twoColGridStyle}>
                <div>
                  <div style={fieldLabelStyle}>招生系科</div>
                  <select
                    value={selectedDepartment}
                    onChange={(e) => {
                      const newDepartment = e.target.value;
                      if (newDepartment !== selectedDepartment) {
                        setSelectedDepartment(newDepartment);
                        setSelectedCategory("");
                        resetUploadedFiles();
                      }
                    }}
                    style={selectStyle}
                    disabled={!configData.length}
                  >
                    <option value="">請選擇系科</option>
                    {departmentOptions.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <div style={fieldLabelStyle}>招生群類別</div>
                  <select
                    value={selectedCategory}
                    onChange={(e) => {
                      const newCategory = e.target.value;
                      if (newCategory !== selectedCategory) {
                        setSelectedCategory(newCategory);
                        resetUploadedFiles();
                      }
                    }}
                    style={selectStyle}
                    disabled={!selectedDepartment}
                  >
                    <option value="">請選擇群類別</option>
                    {categoryOptions.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ marginTop: 28 }}>
                <div style={fileRowStyle}>
                  <input
                    ref={parentFileInputRef}
                    type="file"
                    accept=".csv"
                    onChange={handleParentFile}
                    style={{ display: "none" }}
                  />
                  <button
                    onClick={() => parentFileInputRef.current?.click()}
                    style={outlineButtonStyle}
                  >
                    選擇全國成績檔案
                  </button>
                  <div style={fileNameStyle}>{parentFileName || "尚未選擇檔案"}</div>
                </div>

                <div style={{ ...fileRowStyle, marginTop: 16 }}>
                  <input
                    ref={simFileInputRef}
                    type="file"
                    accept=".csv"
                    onChange={handleSimFile}
                    style={{ display: "none" }}
                  />
                  <button
                    onClick={() => simFileInputRef.current?.click()}
                    style={outlineButtonStyle}
                  >
                    選擇模擬檔案
                  </button>
                  <div style={fileNameStyle}>{simFileName || "尚未選擇檔案"}</div>
                </div>
              </div>

              <div style={{ marginTop: 28 }}>
                <div style={sectionLabelStyle}>招生名額</div>
                <input
                  type="number"
                  min={0}
                  value={quota}
                  onChange={(e) => setQuota(Number(e.target.value))}
                  style={smallInputStyle}
                />
              </div>

              <div style={{ marginTop: 28 }}>
                <div style={sectionLabelStyle}>篩選倍率</div>
                <div style={ratioPanelStyle}>
                  <div style={ratioGridStyle}>
                    {scoreFields.map((field) => (
                      <div key={field} style={ratioItemStyle}>
                        <label style={ratioLabelStyle}>{scoreFieldLabels[field]}</label>
                        <input
                          type="number"
                          value={multiplier[field]}
                          onChange={(e) =>
                            setMultiplier({
                              ...multiplier,
                              [field]: Number(e.target.value),
                            })
                          }
                          style={ratioInputStyle}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <button onClick={calculate} style={primaryButtonStyle}>
                執行
              </button>

              {error && <div style={errorStyle}>{error}</div>}
            </div>
          </section>

          <section style={rightColumnStyle}>
            <div style={infoCardStyle}>
              <div style={infoCardHeaderStyle}>自動帶入資訊</div>
              {selectedConfig ? (
                <div style={infoGridStyle}>
                  <div>招生人數：{toMultiplierNumber(selectedConfig["一般考生招生名額"])}</div>
                  <div>國文倍率：{toMultiplierNumber(selectedConfig["國文"])}</div>
                  <div>英文倍率：{toMultiplierNumber(selectedConfig["英文"])}</div>
                  <div>數學倍率：{toMultiplierNumber(selectedConfig["數學"])}</div>
                  <div>專業一倍率：{toMultiplierNumber(selectedConfig["專業一"])}</div>
                  <div>專業二倍率：{toMultiplierNumber(selectedConfig["專業二"])}</div>
                </div>
              ) : (
                <div style={emptyHintStyle}>
                  請先上傳倍率設定檔，並選擇系科與群類別
                </div>
              )}
            </div>

            <div style={{ ...cardStyle, marginTop: 20 }}>
              <div style={cardHeaderStyle}>篩選流程與結果</div>

              <div style={summaryRowStyle}>
                <SummaryBox label="全國人數" value={parentDisplayCount} />
                <SummaryBox label="模擬人數" value={simDisplayCount} />
                <SummaryBox label="篩選後人數" value={result.length} />
              </div>

              {steps.length > 0 && (
                <div style={stepsBoxStyle}>
                  {steps.map((step, index) => (
                    <div key={index} style={stepTextStyle}>
                      {index + 1}. {step}
                    </div>
                  ))}
                </div>
              )}

              <div style={legendRowStyle}>
                <LegendBox color="#7cc7ee" label="全國成績分布" />
                <LegendBox color="rgba(250, 204, 21, 0.65)" label="未篩選模擬成績分布" />
                <LegendBox color="rgba(37, 99, 235, 0.82)" label="篩選後成績分布" />
              </div>

              <div style={chartGridStyle}>
                {scoreFields.map((field) => (
                  <OverlayHistogramCard
                    key={field}
                    title={scoreFieldLabels[field]}
                    parentRows={parentData}
                    simRawRows={simData}
                    simFilteredRows={result}
                    field={field}
                  />
                ))}
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

function StepPill({ index, label }: { index: number; label: string }) {
  return (
    <div style={stepPillStyle}>
      <span style={stepIndexStyle}>{index}</span>
      <span>{label}</span>
    </div>
  );
}

function StepArrow() {
  return <div style={stepArrowStyle}>›</div>;
}

function SummaryBox({ label, value }: { label: string; value: number }) {
  return (
    <div style={summaryBoxStyle}>
      <div style={summaryLabelStyle}>{label}</div>
      <div style={summaryValueStyle}>{value.toLocaleString()}</div>
    </div>
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
          borderRadius: "999px",
          border: "1px solid rgba(148, 163, 184, 0.8)",
        }}
      />
      <span>{label}</span>
    </div>
  );
}

function OverlayHistogramCard({
  title,
  parentRows,
  simRawRows,
  simFilteredRows,
  field,
}: {
  title: string;
  parentRows: RowData[];
  simRawRows: RowData[];
  simFilteredRows: RowData[];
  field: FilterField;
}) {
  const bins = buildOverlayBins(parentRows, simRawRows, simFilteredRows, field);
  const maxCount = Math.max(
    ...bins.map((b) =>
      Math.max(b.parentCount, b.simRawCount, b.simFilteredCount)
    ),
    1
  );

  const parentStats = computeParentStats(parentRows, field);
  const simStats = computeSimStats(simRawRows, field);

  return (
    <div style={chartCardStyle}>
      <h3 style={chartTitleStyle}>{title}成績分布</h3>

      <div style={chartStatsWrapStyle}>
        <div style={chartStatsRowStyle}>
          <span style={statsTagStyle}>全國</span>
          <span>平均數 <b>{parentStats.mean.toFixed(2)}</b></span>
          <span>標準差 <b>{parentStats.sd.toFixed(2)}</b></span>
          <span>總人數 <b>{parentStats.total.toLocaleString()}</b></span>
        </div>

        <div style={chartStatsRowStyle}>
          <span style={{ ...statsTagStyle, background: "#f8fafc", color: "#64748b" }}>
            模擬
          </span>
          <span>平均數 <b>{simStats.mean.toFixed(2)}</b></span>
          <span>標準差 <b>{simStats.sd.toFixed(2)}</b></span>
          <span>總人數 <b>{simStats.total.toLocaleString()}</b></span>
        </div>
      </div>

      {bins.length === 0 ? (
        <div style={emptyChartStyle}>尚無資料</div>
      ) : (
        <svg viewBox="0 0 640 380" style={{ width: "100%", height: "auto" }}>
          <line x1="60" y1="25" x2="60" y2="310" stroke="#0f172a" strokeWidth="1.5" />
          <line x1="60" y1="310" x2="615" y2="310" stroke="#0f172a" strokeWidth="1.5" />

          <text
            x="20"
            y="170"
            transform="rotate(-90 20 170)"
            textAnchor="middle"
            fontSize="16"
            fill="#0f172a"
          >
            人數
          </text>

          <text x="338" y="355" textAnchor="middle" fontSize="16" fill="#0f172a">
            分數
          </text>

          {buildYTicks(maxCount).map((tick, idx) => {
            const y = 310 - (tick / maxCount) * 250;
            return (
              <g key={idx}>
                <line x1="55" y1={y} x2="60" y2={y} stroke="#0f172a" strokeWidth="1" />
                <text x="48" y={y + 4} textAnchor="end" fontSize="12" fill="#475569">
                  {tick}
                </text>
                <line
                  x1="60"
                  y1={y}
                  x2="615"
                  y2={y}
                  stroke="#e2e8f0"
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
            const simRawBarWidth = Math.max(slotWidth * 0.6, 3);
            const simFilteredBarWidth = Math.max(slotWidth * 0.36, 2);

            const xParent = baseX + index * slotWidth + (slotWidth - parentBarWidth) / 2;
            const xSimRaw = baseX + index * slotWidth + (slotWidth - simRawBarWidth) / 2;
            const xSimFiltered =
              baseX + index * slotWidth + (slotWidth - simFilteredBarWidth) / 2;

            const parentHeight = (bin.parentCount / maxCount) * 250;
            const simRawHeight = (bin.simRawCount / maxCount) * 250;
            const simFilteredHeight = (bin.simFilteredCount / maxCount) * 250;

            const yParent = 310 - parentHeight;
            const ySimRaw = 310 - simRawHeight;
            const ySimFiltered = 310 - simFilteredHeight;

            return (
              <g key={index}>
                <title>
                  {`${bin.score}分 ｜ 全國 ${bin.parentCount} 人 ｜ 未篩選模擬 ${bin.simRawCount} 人 ｜ 篩選後 ${bin.simFilteredCount} 人`}
                </title>

                <rect
                  x={xParent}
                  y={yParent}
                  width={parentBarWidth}
                  height={parentHeight}
                  fill="#7cc7ee"
                  rx="2"
                />
                <rect
                  x={xSimRaw}
                  y={ySimRaw}
                  width={simRawBarWidth}
                  height={simRawHeight}
                  fill="rgba(250, 204, 21, 0.65)"
                  rx="2"
                />
                <rect
                  x={xSimFiltered}
                  y={ySimFiltered}
                  width={simFilteredBarWidth}
                  height={simFilteredHeight}
                  fill="rgba(37, 99, 235, 0.82)"
                  rx="2"
                />

                {bin.score % 10 === 0 && (
                  <text
                    x={baseX + index * slotWidth + slotWidth / 2}
                    y={330}
                    textAnchor="middle"
                    fontSize="11"
                    fill="#475569"
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
  simRawRows: RowData[],
  simFilteredRows: RowData[],
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

  const simRawMap = new Map<number, number>();
  simRawRows.forEach((row) => {
    const score = Number(row[field] || 0);
    if (Number.isFinite(score)) {
      const roundedScore = Math.round(score);
      simRawMap.set(roundedScore, (simRawMap.get(roundedScore) || 0) + 1);
    }
  });

  const simFilteredMap = new Map<number, number>();
  simFilteredRows.forEach((row) => {
    const score = Number(row[field] || 0);
    if (Number.isFinite(score)) {
      const roundedScore = Math.round(score);
      simFilteredMap.set(
        roundedScore,
        (simFilteredMap.get(roundedScore) || 0) + 1
      );
    }
  });

  const allScores = [
    ...new Set([
      ...parentMap.keys(),
      ...simRawMap.keys(),
      ...simFilteredMap.keys(),
    ]),
  ].sort((a, b) => a - b);

  return allScores.map((score) => ({
    score,
    parentCount: parentMap.get(score) || 0,
    simRawCount: simRawMap.get(score) || 0,
    simFilteredCount: simFilteredMap.get(score) || 0,
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

function computeSimStats(rows: RowData[], field: FilterField) {
  const values = rows
    .map((row) => Number(row[field] || 0))
    .filter((score) => Number.isFinite(score));

  const total = values.length;
  if (total === 0) {
    return { total: 0, mean: 0, sd: 0 };
  }

  const mean = values.reduce((sum, score) => sum + score, 0) / total;

  const variance =
    values.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / total;

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

function toMultiplierNumber(value: unknown): number {
  const text = String(value ?? "").trim();
  if (!text || text === "--") return 0;

  const n = Number(text);
  return Number.isFinite(n) ? n : 0;
}

const pageStyle: React.CSSProperties = {
  minHeight: "100vh",
  background:
    "linear-gradient(180deg, #eef4ff 0%, #f7f9fc 20%, #f4f7fb 100%)",
  padding: "32px 20px",
  fontFamily:
    'Arial, "Noto Sans TC", "PingFang TC", "Microsoft JhengHei", sans-serif',
};

const shellStyle: React.CSSProperties = {
  maxWidth: "1520px",
  margin: "0 auto",
  background: "rgba(255,255,255,0.92)",
  border: "1px solid rgba(226,232,240,0.9)",
  borderRadius: "28px",
  boxShadow: "0 20px 60px rgba(15, 23, 42, 0.08)",
  overflow: "hidden",
  backdropFilter: "blur(8px)",
};

const headerStyle: React.CSSProperties = {
  padding: "32px 36px 18px",
  borderBottom: "1px solid #e2e8f0",
};

const titleStyle: React.CSSProperties = {
  fontSize: "60px",
  lineHeight: 1.1,
  margin: 0,
  color: "#0f172a",
  fontWeight: 800,
  letterSpacing: "-0.02em",
};

const stepBarStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  flexWrap: "wrap",
  gap: "10px",
  padding: "18px 36px 0",
};

const stepPillStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "10px",
  background: "#eef4ff",
  border: "1px solid #dbeafe",
  color: "#334155",
  borderRadius: "999px",
  padding: "10px 16px",
  fontSize: "18px",
  fontWeight: 700,
};

const stepIndexStyle: React.CSSProperties = {
  width: "28px",
  height: "28px",
  borderRadius: "999px",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  background: "#dbeafe",
  color: "#2563eb",
  fontSize: "15px",
  fontWeight: 800,
};

const stepArrowStyle: React.CSSProperties = {
  color: "#94a3b8",
  fontSize: "24px",
  fontWeight: 700,
};

const contentGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "460px minmax(0, 1fr)",
  gap: "24px",
  padding: "24px 36px 36px",
};

const leftColumnStyle: React.CSSProperties = {
  minWidth: 0,
};

const rightColumnStyle: React.CSSProperties = {
  minWidth: 0,
};

const cardStyle: React.CSSProperties = {
  background: "#f8fbff",
  border: "1px solid #dbe7f5",
  borderRadius: "24px",
  padding: "24px",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.75)",
};

const infoCardStyle: React.CSSProperties = {
  background: "#f8fbff",
  border: "1px solid #dbe7f5",
  borderRadius: "24px",
  overflow: "hidden",
  boxShadow: "0 12px 30px rgba(37, 99, 235, 0.08)",
};

const cardHeaderStyle: React.CSSProperties = {
  fontSize: "34px",
  fontWeight: 800,
  color: "#0f172a",
  marginBottom: "18px",
};

const infoCardHeaderStyle: React.CSSProperties = {
  background: "linear-gradient(90deg, #4f8df3 0%, #79aaf8 100%)",
  color: "#ffffff",
  padding: "18px 24px",
  fontSize: "34px",
  fontWeight: 800,
};

const infoGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, 1fr)",
  gap: "14px 24px",
  padding: "20px 24px",
  fontSize: "24px",
  color: "#334155",
  lineHeight: 1.5,
};

const emptyHintStyle: React.CSSProperties = {
  padding: "24px",
  fontSize: "22px",
  color: "#64748b",
};

const twoColGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "18px",
};

const fieldLabelStyle: React.CSSProperties = {
  fontSize: "22px",
  fontWeight: 700,
  color: "#1e293b",
  marginBottom: "10px",
};

const sectionLabelStyle: React.CSSProperties = {
  fontSize: "28px",
  fontWeight: 800,
  color: "#0f172a",
  marginBottom: "12px",
};

const fileRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "14px",
  flexWrap: "wrap",
};

const fileNameStyle: React.CSSProperties = {
  fontSize: "18px",
  color: "#475569",
  wordBreak: "break-all",
  flex: 1,
  minWidth: "180px",
};

const primaryButtonStyle: React.CSSProperties = {
  width: "100%",
  marginTop: "28px",
  padding: "18px 24px",
  fontSize: "32px",
  fontWeight: 800,
  color: "#ffffff",
  background: "linear-gradient(90deg, #4f8df3 0%, #5f9dff 100%)",
  border: "none",
  borderRadius: "18px",
  cursor: "pointer",
  boxShadow: "0 12px 28px rgba(37, 99, 235, 0.22)",
};

const secondaryButtonStyle: React.CSSProperties = {
  padding: "14px 22px",
  fontSize: "22px",
  fontWeight: 800,
  color: "#ffffff",
  background: "linear-gradient(90deg, #4f8df3 0%, #5f9dff 100%)",
  border: "none",
  borderRadius: "16px",
  cursor: "pointer",
  boxShadow: "0 10px 24px rgba(37, 99, 235, 0.2)",
};

const outlineButtonStyle: React.CSSProperties = {
  padding: "14px 22px",
  fontSize: "22px",
  fontWeight: 800,
  color: "#1e293b",
  background: "#ffffff",
  border: "1px solid #cbd5e1",
  borderRadius: "16px",
  cursor: "pointer",
};

const selectStyle: React.CSSProperties = {
  width: "100%",
  padding: "14px 16px",
  fontSize: "20px",
  border: "2px solid #b8c7dc",
  borderRadius: "16px",
  backgroundColor: "#ffffff",
  color: "#0f172a",
  outline: "none",
};

const smallInputStyle: React.CSSProperties = {
  width: "120px",
  padding: "12px 14px",
  fontSize: "22px",
  border: "2px solid #b8c7dc",
  borderRadius: "16px",
  backgroundColor: "#ffffff",
  color: "#0f172a",
  outline: "none",
};

const ratioPanelStyle: React.CSSProperties = {
  background: "#f1f6fd",
  border: "1px solid #d5e2f0",
  borderRadius: "20px",
  padding: "18px",
};

const ratioGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, 1fr)",
  gap: "18px 20px",
};

const ratioItemStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: "8px",
};

const ratioLabelStyle: React.CSSProperties = {
  fontSize: "20px",
  fontWeight: 800,
  color: "#1e293b",
};

const ratioInputStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: "120px",
  padding: "12px",
  fontSize: "22px",
  border: "2px solid #b8c7dc",
  borderRadius: "14px",
  backgroundColor: "#ffffff",
  textAlign: "center",
};

const errorStyle: React.CSSProperties = {
  marginTop: "18px",
  color: "#b91c1c",
  background: "#fee2e2",
  border: "1px solid #fecaca",
  padding: "14px 16px",
  borderRadius: "14px",
  fontSize: "18px",
};

const summaryRowStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: "14px",
  marginBottom: "18px",
};

const summaryBoxStyle: React.CSSProperties = {
  background: "#ffffff",
  border: "1px solid #dbe7f5",
  borderRadius: "18px",
  padding: "16px",
};

const summaryLabelStyle: React.CSSProperties = {
  fontSize: "18px",
  color: "#64748b",
  marginBottom: "8px",
  fontWeight: 700,
};

const summaryValueStyle: React.CSSProperties = {
  fontSize: "34px",
  color: "#0f172a",
  fontWeight: 800,
};

const stepsBoxStyle: React.CSSProperties = {
  background: "#ffffff",
  border: "1px solid #dbe7f5",
  borderRadius: "18px",
  padding: "16px 18px",
  marginBottom: "18px",
};

const stepTextStyle: React.CSSProperties = {
  fontSize: "18px",
  color: "#1e293b",
  marginBottom: "10px",
  lineHeight: 1.6,
};

const legendRowStyle: React.CSSProperties = {
  display: "flex",
  gap: "18px",
  alignItems: "center",
  flexWrap: "wrap",
  marginBottom: "18px",
  fontSize: "16px",
  color: "#334155",
};

const chartGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(460px, 1fr))",
  gap: "18px",
};

const chartCardStyle: React.CSSProperties = {
  border: "1px solid #d7e3f1",
  borderRadius: "20px",
  padding: "18px",
  background: "#ffffff",
  boxShadow: "0 8px 24px rgba(15, 23, 42, 0.04)",
};

const chartTitleStyle: React.CSSProperties = {
  fontSize: "24px",
  marginBottom: "10px",
  color: "#0f172a",
  textAlign: "center",
  fontWeight: 800,
};

const chartStatsWrapStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "8px",
  marginBottom: "12px",
};

const chartStatsRowStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "90px 1fr 1fr 1fr",
  gap: "12px",
  alignItems: "center",
  fontSize: "14px",
  color: "#475569",
};

const statsTagStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  background: "#e0f2fe",
  color: "#0369a1",
  borderRadius: "999px",
  padding: "6px 10px",
  fontWeight: 800,
};

const emptyChartStyle: React.CSSProperties = {
  color: "#64748b",
  fontSize: "18px",
  padding: "24px 0",
  textAlign: "center",
};