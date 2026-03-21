"use client";

import { useMemo, useRef, useState } from "react";
import Papa from "papaparse";

type ParentRowData = {
  招生群類別?: string;
  成績區間?: string | number;
  國文: number | string;
  英文: number | string;
  數學: number | string;
  專業一: number | string;
  專業二: number | string;
};

type SelectionRowData = {
  招生系科?: string;
  招生群類別?: string;
  國文: number | string;
  英文: number | string;
  數學: number | string;
  專業一: number | string;
  專業二: number | string;
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

type FilterField = "國文" | "英文" | "數學" | "專業一" | "專業二";

type ParsedFileResult<T> = {
  ok: boolean;
  rows: T[];
  error?: string;
};

type HistogramBin = {
  score: number;
  parentCount: number;
  selectionRawCount: number;
  selectionFilteredCount: number;
};

const scoreFields: FilterField[] = ["國文", "英文", "數學", "專業一", "專業二"];

export default function Home() {
  const configFileInputRef = useRef<HTMLInputElement | null>(null);
  const parentFileInputRef = useRef<HTMLInputElement | null>(null);
  const selectionFileInputRef = useRef<HTMLInputElement | null>(null);

  const [configData, setConfigData] = useState<ConfigRow[]>([]);
  const [parentData, setParentData] = useState<ParentRowData[]>([]);
  const [selectionData, setSelectionData] = useState<SelectionRowData[]>([]);
  const [result, setResult] = useState<SelectionRowData[]>([]);

  const [configFileName, setConfigFileName] = useState("");
  const [parentFileName, setParentFileName] = useState("");
  const [selectionFileName, setSelectionFileName] = useState("");

  const [error, setError] = useState("");
  const [quota, setQuota] = useState<number>(0);
  const [steps, setSteps] = useState<string[]>([]);
  const [hasSimulationRun, setHasSimulationRun] = useState(false);

  const [selectedDepartment, setSelectedDepartment] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");

  const [multiplier, setMultiplier] = useState<Record<FilterField, number>>({
    國文: 0,
    英文: 0,
    數學: 0,
    專業一: 0,
    專業二: 0,
  });

  const resetSimulationState = () => {
    setQuota(0);
    setMultiplier({
      國文: 0,
      英文: 0,
      數學: 0,
      專業一: 0,
      專業二: 0,
    });
    setResult([]);
    setSteps([]);
    setHasSimulationRun(false);
    setError("");
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
        resetSimulationState();
      }
    );
  };

  const handleParentFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setParentFileName(file.name);

    parseCsvFile<ParentRowData>(
      file,
      ["招生群類別", "成績區間", "國文", "英文", "數學", "專業一", "專業二"],
      (parsed) => {
        if (!parsed.ok) {
          setParentData([]);
          setError(parsed.error || "全國成績檔案讀取失敗");
          return;
        }

        const cleaned = parsed.rows.map((row) => ({
          ...row,
          招生群類別: String(row.招生群類別 ?? "").trim(),
          成績區間: String(row.成績區間 ?? "").trim(),
        }));

        setParentData(cleaned);
        setError("");
        setResult([]);
        setSteps([]);
        setHasSimulationRun(false);
      }
    );
  };

  const handleSelectionFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectionFileName(file.name);

    parseCsvFile<SelectionRowData>(
      file,
      ["招生系科", "招生群類別", "國文", "英文", "數學", "專業一", "專業二"],
      (parsed) => {
        if (!parsed.ok) {
          setSelectionData([]);
          setError(parsed.error || "甄選成績檔讀取失敗");
          return;
        }

        const cleaned = parsed.rows.map((r) => ({
          ...r,
          招生系科: String(r.招生系科 ?? "").trim(),
          招生群類別: String(r.招生群類別 ?? "").trim(),
        }));

        setSelectionData(cleaned);
        setError("");
        setResult([]);
        setSteps([]);
        setHasSimulationRun(false);
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

  const linkedSelectionData = useMemo(() => {
    if (!selectedDepartment || !selectedCategory) return [];

    return selectionData.filter(
      (row) =>
        String(row.招生系科 ?? "").trim() === selectedDepartment &&
        String(row.招生群類別 ?? "").trim() === selectedCategory
    );
  }, [selectionData, selectedDepartment, selectedCategory]);

  const linkedParentData = useMemo(() => {
    if (!selectedCategory) return [];

    return parentData.filter(
      (row) => String(row.招生群類別 ?? "").trim() === selectedCategory
    );
  }, [parentData, selectedCategory]);

  const calculate = () => {
    setError("");
    setSteps([]);
    setResult([]);
    setHasSimulationRun(false);

    if (!configData.length) {
      setError("請先上傳倍率設定檔");
      return;
    }

    if (!parentData.length) {
      setError("請先上傳全國成績檔案");
      return;
    }

    if (!selectionData.length) {
      setError("請先上傳甄選成績檔");
      return;
    }

    if (!selectedDepartment) {
      setError("請先選擇招生系科");
      return;
    }

    if (!selectedCategory) {
      setError("請先選擇招生群類別");
      return;
    }

    if (!linkedParentData.length) {
      setError("全國成績檔中沒有符合此群類別的資料");
      return;
    }

    if (!linkedSelectionData.length) {
      setError("甄選成績檔中沒有符合此系科與群類別的資料");
      return;
    }

    const activeFilters = scoreFields
      .map((field) => ({
        field,
        times: Number(multiplier[field] || 0),
      }))
      .filter((item) => item.times >= 3);

    if (!quota || quota <= 0 || activeFilters.length === 0) {
      return;
    }

    let workingList = [...linkedSelectionData];

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

      const sorted = workingList
        .map((row) => ({
          ...row,
          __groupScore: group.fields.reduce(
            (sum, field) => sum + Number(row[field] || 0),
            0
          ),
        }))
        .sort((a, b) => Number((b as any).__groupScore) - Number((a as any).__groupScore));

      workingList = sorted
        .slice(0, limit)
        .map(({ __groupScore, ...rest }) => rest as SelectionRowData);

      const fieldLabel =
        group.fields.length === 1 ? `${group.fields[0]}` : `${group.fields.join(" + ")}`;

      processSteps.push(
        `倍率 ${group.times}：${fieldLabel} 加總篩選 → 保留前 ${limit} 人，目前剩 ${workingList.length} 人`
      );
    }

    setResult(workingList);
    setSteps(processSteps);
    setHasSimulationRun(true);
  };

  const parentDisplayCount = useMemo(() => {
    if (!linkedParentData.length) return 0;
    return sumParentDistributionCounts(linkedParentData, "國文");
  }, [linkedParentData]);

  const selectionDisplayCount = useMemo(() => {
    return linkedSelectionData.length;
  }, [linkedSelectionData]);

  return (
    <main style={pageStyle}>
      <div style={shellStyle}>
        <header style={headerStyle}>
  <div style={headerMainStyle}>
    <div style={headerTextWrapStyle}>
      <h1 style={titleStyle}>甄選入學成績倍率篩選系統</h1>
    </div>

    <div style={stepBarInlineStyle}>
      <StepPill index={1} label="上傳倍率" />
      <StepArrow />
      <StepPill index={2} label="上傳全國成績" />
      <StepArrow />
      <StepPill index={3} label="上傳甄選成績" />
      <StepArrow />
      <StepPill index={4} label="選擇系群條件" />
      <StepArrow />
      <StepPill index={5} label="執行模擬" />
    </div>
  </div>
</header>

        <div style={contentGridStyle}>
          <section style={leftColumnStyle}>
            <div style={cardStyle}>
              <div style={cardHeaderStyle}>設定來源資料</div>

              <div style={uploadPanelStyle}>
                <div style={uploadPanelHeaderStyle}>資料上傳區</div>
                <div style={uploadGridStyle}>
                  <UploadCard
                    title="倍率設定檔"
                    fileName={configFileName}
                    buttonLabel="上傳倍率設定檔"
                    onClick={() => configFileInputRef.current?.click()}
                    isReady={!!configFileName}
                  />
                  <UploadCard
                    title="全國成績檔案"
                    fileName={parentFileName}
                    buttonLabel="選擇全國成績檔案"
                    onClick={() => parentFileInputRef.current?.click()}
                    isReady={!!parentFileName}
                  />
                  <UploadCard
                    title="甄選成績檔"
                    fileName={selectionFileName}
                    buttonLabel="選擇甄選成績檔"
                    onClick={() => selectionFileInputRef.current?.click()}
                    isReady={!!selectionFileName}
                  />
                </div>

                <input
                  ref={configFileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleConfigFile}
                  style={{ display: "none" }}
                />
                <input
                  ref={parentFileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleParentFile}
                  style={{ display: "none" }}
                />
                <input
                  ref={selectionFileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleSelectionFile}
                  style={{ display: "none" }}
                />
              </div>

              <div style={selectorPanelStyle}>
                <div style={selectorPanelHeaderStyle}>條件選擇區</div>
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
                          resetSimulationState();
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
                          resetSimulationState();
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
              </div>

              <div style={{ marginTop: 18 }}>
                <div style={sectionLabelStyle}>模擬參數設定</div>

                <div style={quotaPanelStyle}>
                  <div style={fieldLabelStyle}>招生人數</div>
                  <input
                    type="number"
                    min={0}
                    value={quota}
                    onChange={(e) => {
                      setQuota(Number(e.target.value));
                      setResult([]);
                      setSteps([]);
                      setHasSimulationRun(false);
                    }}
                    style={quotaInputStyle}
                  />
                </div>

                <div style={ratioPanelStyle}>
                  <div style={ratioGridStyle}>
                    {scoreFields.map((field) => (
                      <div key={field} style={ratioItemStyle}>
                        <label style={ratioLabelStyle}>{field}</label>
                        <input
                          type="number"
                          min={0}
                          value={multiplier[field]}
                          onChange={(e) => {
                            setMultiplier({
                              ...multiplier,
                              [field]: Number(e.target.value),
                            });
                            setResult([]);
                            setSteps([]);
                            setHasSimulationRun(false);
                          }}
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
              <div style={infoCardHeaderStyle}>招生條件摘要</div>
              {selectedConfig ? (
                <div style={summaryInfoGridStyle}>
                  <InfoMiniCard
                    label="原始招生名額"
                    value={toMultiplierNumber(selectedConfig["一般考生招生名額"])}
                  />
                  <InfoMiniCard label="國文倍率" value={toMultiplierNumber(selectedConfig["國文"])} />
                  <InfoMiniCard label="英文倍率" value={toMultiplierNumber(selectedConfig["英文"])} />
                  <InfoMiniCard label="數學倍率" value={toMultiplierNumber(selectedConfig["數學"])} />
                  <InfoMiniCard label="專業一倍率" value={toMultiplierNumber(selectedConfig["專業一"])} />
                  <InfoMiniCard label="專業二倍率" value={toMultiplierNumber(selectedConfig["專業二"])} />
                </div>
              ) : (
                <div style={emptyHintStyle}>
                  請先完成三份檔案上傳，並選擇招生系科與招生群類別。
                </div>
              )}
            </div>

            <div style={{ ...cardStyle, marginTop: 20 }}>
              <div style={cardHeaderStyle}>篩選流程與結果</div>

              <div style={summaryRowStyle}>
                <SummaryBox label="全國人數" value={parentDisplayCount} />
                <SummaryBox label="甄選人數" value={selectionDisplayCount} />
                <SummaryBox label="篩選後人數" value={hasSimulationRun ? result.length : 0} />
              </div>

              {hasSimulationRun && steps.length > 0 && (
                <div style={stepsBoxStyle}>
                  {steps.map((step, index) => (
                    <div key={index} style={stepTextStyle}>
                      {index + 1}. {step}
                    </div>
                  ))}
                </div>
              )}

              <div style={legendRowStyle}>
                <LegendBox color="rgba(124, 199, 238, 0.42)" label="全國成績分布（面積）" />
                <LegendBox color="rgba(250, 204, 21, 0.65)" label="未篩選甄選成績分布" />
                <LegendBox color="rgba(37, 99, 235, 0.82)" label="篩選後成績分布" />
              </div>

              <div style={chartGridStyle}>
                {scoreFields.map((field) => (
                  <OverlayHistogramCard
                    key={field}
                    title={field}
                    parentRows={linkedParentData}
                    selectionRawRows={linkedSelectionData}
                    selectionFilteredRows={hasSimulationRun ? result : []}
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

function UploadCard({
  title,
  desc,
  fileName,
  buttonLabel,
  onClick,
  isReady,
}: {
  title: string;
  desc: string;
  fileName: string;
  buttonLabel: string;
  onClick: () => void;
  isReady: boolean;
}) {
  return (
    <div style={uploadCardStyle}>
      <div style={uploadCardTopStyle}>
        <div style={uploadCardTitleStyle}>{title}</div>
        <div
          style={{
            ...uploadStatusStyle,
            background: isReady ? "#dcfce7" : "#f1f5f9",
            color: isReady ? "#166534" : "#64748b",
          }}
        >
          {isReady ? "已上傳" : "待上傳"}
        </div>
      </div>

      <div style={uploadDescStyle}>{desc}</div>

      <button onClick={onClick} style={uploadButtonStyle}>
        {buttonLabel}
      </button>

      <div style={uploadFileNameStyle}>{fileName || "尚未選擇檔案"}</div>
    </div>
  );
}

function InfoMiniCard({ label, value }: { label: string; value: number }) {
  return (
    <div style={infoMiniCardStyle}>
      <div style={infoMiniLabelStyle}>{label}</div>
      <div style={infoMiniValueStyle}>{value}</div>
    </div>
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
  selectionRawRows,
  selectionFilteredRows,
  field,
}: {
  title: string;
  parentRows: ParentRowData[];
  selectionRawRows: SelectionRowData[];
  selectionFilteredRows: SelectionRowData[];
  field: FilterField;
}) {
  const bins = buildOverlayBins(
    parentRows,
    selectionRawRows,
    selectionFilteredRows,
    field
  );

  const rawLeftMaxCount = Math.max(...bins.map((b) => b.parentCount), 1);
  const leftMaxCount = Math.ceil(rawLeftMaxCount * 1.05);

  const rawRightMaxCount = Math.max(
    ...bins.map((b) => Math.max(b.selectionRawCount, b.selectionFilteredCount)),
    1
  );
  const rightMaxCount = Math.ceil(rawRightMaxCount * 1.05);

  const areaPath = buildAreaPath(bins, leftMaxCount);

  const parentStats = computeParentStats(parentRows, field);
  const selectionStats = computeSelectionStats(selectionRawRows, field);

  return (
    <div style={chartCardStyle}>
      <h3 style={chartTitleStyle}>{title}成績分布</h3>

      <div style={chartStatsWrapStyle}>
        <div style={chartStatsRowStyle}>
          <span style={statsTagStyle}>全國</span>
          <span>
            平均數 <b style={{ fontSize: "20px" }}>{parentStats.mean.toFixed(2)}</b>
          </span>
          <span>
            標準差 <b style={{ fontSize: "20px" }}>{parentStats.sd.toFixed(2)}</b>
          </span>
          <span>
            總人數 <b style={{ fontSize: "20px" }}>{parentStats.total.toLocaleString()}</b>
          </span>
        </div>

        <div style={chartStatsRowStyle}>
          <span
            style={{
              ...statsTagStyle,
              background: "#f8fafc",
              color: "#64748b",
            }}
          >
            甄選
          </span>
          <span>
            平均數 <b style={{ fontSize: "20px" }}>{selectionStats.mean.toFixed(2)}</b>
          </span>
          <span>
            標準差 <b style={{ fontSize: "20px" }}>{selectionStats.sd.toFixed(2)}</b>
          </span>
          <span>
            總人數 <b style={{ fontSize: "20px" }}>{selectionStats.total.toLocaleString()}</b>
          </span>
        </div>
      </div>

      {bins.length === 0 ? (
        <div style={emptyChartStyle}>尚無資料</div>
      ) : (
        <svg viewBox="0 0 660 380" style={{ width: "100%", height: "auto" }}>
          <line x1="60" y1="25" x2="60" y2="310" stroke="#0f172a" strokeWidth="1.5" />
          <line x1="615" y1="25" x2="615" y2="310" stroke="#2563eb" strokeWidth="1.5" />
          <line x1="60" y1="310" x2="615" y2="310" stroke="#0f172a" strokeWidth="1.5" />

          <text
            x="20"
            y="170"
            transform="rotate(-90 20 170)"
            textAnchor="middle"
            fontSize="16"
            fill="#0f172a"
          >
            全國人數
          </text>

          <text
            x="645"
            y="170"
            transform="rotate(90 645 170)"
            textAnchor="middle"
            fontSize="16"
            fill="#2563eb"
          >
            甄選人數
          </text>

          <text x="338" y="355" textAnchor="middle" fontSize="16" fill="#0f172a">
            分數
          </text>

          {buildYTicks(leftMaxCount).map((tick, idx) => {
            const y = 310 - (tick / leftMaxCount) * 250;
            return (
              <g key={`left-${idx}`}>
                <line x1="55" y1={y} x2="60" y2={y} stroke="#0f172a" strokeWidth="1" />
                <text x="48" y={y + 4} textAnchor="end" fontSize="12" fill="#475569">
                  {tick}
                </text>
                <line x1="60" y1={y} x2="615" y2={y} stroke="#e2e8f0" strokeWidth="1" />
              </g>
            );
          })}

          {buildYTicks(rightMaxCount).map((tick, idx) => {
            const y = 310 - (tick / rightMaxCount) * 250;
            return (
              <g key={`right-${idx}`}>
                <line x1="615" y1={y} x2="620" y2={y} stroke="#2563eb" strokeWidth="1" />
                <text x="628" y={y + 4} textAnchor="start" fontSize="12" fill="#2563eb">
                  {tick}
                </text>
              </g>
            );
          })}

          <path
            d={areaPath}
            fill="rgba(124, 199, 238, 0.42)"
            stroke="#7cc7ee"
            strokeWidth="2"
          />

          {bins.map((bin, index) => {
            const chartWidth = 540;
            const baseX = 70;
            const slotWidth = chartWidth / bins.length;

            const rawBarWidth = Math.max(slotWidth * 0.6, 3);
            const filteredBarWidth = Math.max(slotWidth * 0.36, 2);

            const xRaw = baseX + index * slotWidth + (slotWidth - rawBarWidth) / 2;
            const xFiltered =
              baseX + index * slotWidth + (slotWidth - filteredBarWidth) / 2;

            const rawHeight = Number.isFinite(bin.selectionRawCount)
              ? (bin.selectionRawCount / rightMaxCount) * 250
              : 0;
            const filteredHeight = Number.isFinite(bin.selectionFilteredCount)
              ? (bin.selectionFilteredCount / rightMaxCount) * 250
              : 0;

            const yRaw = Number.isFinite(rawHeight) ? 310 - rawHeight : 310;
            const yFiltered = Number.isFinite(filteredHeight)
              ? 310 - filteredHeight
              : 310;

            return (
              <g key={index}>
                <title>
                  {`${bin.score}分 ｜ 全國(左軸) ${bin.parentCount} 人 ｜ 未篩選甄選(右軸) ${bin.selectionRawCount} 人 ｜ 篩選後(右軸) ${bin.selectionFilteredCount} 人`}
                </title>

                <rect
                  x={xRaw}
                  y={yRaw}
                  width={rawBarWidth}
                  height={rawHeight}
                  fill="rgba(250, 204, 21, 0.65)"
                  rx="2"
                />
                <rect
                  x={xFiltered}
                  y={yFiltered}
                  width={filteredBarWidth}
                  height={filteredHeight}
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

function buildAreaPath(
  bins: HistogramBin[],
  leftMaxCount: number,
  chartLeft = 70,
  chartBottom = 310,
  chartHeight = 250,
  chartWidth = 540
) {
  if (!bins.length || leftMaxCount <= 0) return "";

  const slotWidth = chartWidth / bins.length;

  const points = bins.map((bin, index) => {
    const x = chartLeft + index * slotWidth + slotWidth / 2;
    const y = chartBottom - (bin.parentCount / leftMaxCount) * chartHeight;
    return { x, y };
  });

  let d = `M ${points[0].x} ${chartBottom}`;
  d += `L ${points[0].x} ${points[0].y}`;

  for (let i = 1; i < points.length; i++) {
    d += ` L ${points[i].x} ${points[i].y}`;
  }

  d += ` L ${points[points.length - 1].x} ${chartBottom} Z`;
  return d;
}

function buildOverlayBins(
  parentRows: ParentRowData[],
  selectionRawRows: SelectionRowData[],
  selectionFilteredRows: SelectionRowData[],
  field: FilterField
): HistogramBin[] {
  const parentMap = new Map<number, number>();

  parentRows.forEach((row) => {
    const score = parseScoreMid(row.成績區間);
    const count = Number(row[field] || 0);

    if (Number.isFinite(score) && Number.isFinite(count) && count > 0) {
      const roundedScore = Math.round(score);
      parentMap.set(roundedScore, (parentMap.get(roundedScore) || 0) + count);
    }
  });

  const selectionRawMap = new Map<number, number>();
  selectionRawRows.forEach((row) => {
    const score = Number(row[field] || 0);
    if (Number.isFinite(score)) {
      const roundedScore = Math.round(score);
      selectionRawMap.set(roundedScore, (selectionRawMap.get(roundedScore) || 0) + 1);
    }
  });

  const selectionFilteredMap = new Map<number, number>();
  selectionFilteredRows.forEach((row) => {
    const score = Number(row[field] || 0);
    if (Number.isFinite(score)) {
      const roundedScore = Math.round(score);
      selectionFilteredMap.set(
        roundedScore,
        (selectionFilteredMap.get(roundedScore) || 0) + 1
      );
    }
  });

  const allScores = [
    ...new Set([
      ...parentMap.keys(),
      ...selectionRawMap.keys(),
      ...selectionFilteredMap.keys(),
    ]),
  ].sort((a, b) => a - b);

  return allScores.map((score) => ({
    score,
    parentCount: parentMap.get(score) || 0,
    selectionRawCount: selectionRawMap.get(score) || 0,
    selectionFilteredCount: selectionFilteredMap.get(score) || 0,
  }));
}

function computeParentStats(rows: ParentRowData[], field: FilterField) {
  let total = 0;
  let weightedSum = 0;

  rows.forEach((row) => {
    const score = parseScoreMid(row.成績區間);
    const count = Number(row[field] || 0);

    if (Number.isFinite(score) && Number.isFinite(count) && count > 0) {
      total += count;
      weightedSum += score * count;
    }
  });

  const mean = total > 0 ? weightedSum / total : 0;

  let weightedVarSum = 0;
  rows.forEach((row) => {
    const score = parseScoreMid(row.成績區間);
    const count = Number(row[field] || 0);

    if (Number.isFinite(score) && Number.isFinite(count) && count > 0) {
      weightedVarSum += Math.pow(score - mean, 2) * count;
    }
  });

  const variance = total > 0 ? weightedVarSum / total : 0;
  return { total, mean, sd: Math.sqrt(variance) };
}

function computeSelectionStats(rows: SelectionRowData[], field: FilterField) {
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

  return { total, mean, sd: Math.sqrt(variance) };
}

function parseScoreMid(value: unknown): number {
  if (value === null || value === undefined) return NaN;

  const text = String(value).trim().replace("～", "~");
  const matches = text.match(/\d+(\.\d+)?/g);

  if (!matches || matches.length === 0) return NaN;
  if (matches.length === 1) return Number(matches[0]);

  return (Number(matches[0]) + Number(matches[1])) / 2;
}

function sumParentDistributionCounts(rows: ParentRowData[], field: FilterField) {
  return rows.reduce((sum, row) => {
    const count = Number(row[field] || 0);
    return sum + (Number.isFinite(count) ? count : 0);
  }, 0);
}

function buildYTicks(maxValue: number) {
  if (!Number.isFinite(maxValue) || maxValue <= 0) return [0, 1, 2, 3, 4, 5];
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
  background: "linear-gradient(180deg, #eef4ff 0%, #f7f9fc 24%, #f4f7fb 100%)",
  padding: "32px 20px",
  fontFamily:
    'Arial, "Noto Sans TC", "PingFang TC", "Microsoft JhengHei", sans-serif',
};

const shellStyle: React.CSSProperties = {
  maxWidth: "1540px",
  margin: "0 auto",
  background: "rgba(255,255,255,0.94)",
  border: "1px solid rgba(226,232,240,0.9)",
  borderRadius: "28px",
  boxShadow: "0 24px 70px rgba(15, 23, 42, 0.08)",
  overflow: "hidden",
  backdropFilter: "blur(10px)",
};

const headerStyle: React.CSSProperties = {
  padding: "24px 36px 18px",
  borderBottom: "1px solid #e2e8f0",
};

const headerMainStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "24px",
};

const headerTextWrapStyle: React.CSSProperties = {
  flex: 1,
  minWidth: 0,
};

const stepBarInlineStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  flexWrap: "nowrap",
  gap: "8px",
  justifyContent: "flex-end",
  overflowX: "auto",
  whiteSpace: "nowrap",
};

const titleStyle: React.CSSProperties = {
  fontSize: "40px",
  lineHeight: 1.1,
  margin: 0,
  color: "#0f172a",
  fontWeight: 800,
  letterSpacing: "-0.02em",
};

const subtitleStyle: React.CSSProperties = {
  margin: "12px 0 0",
  fontSize: "18px",
  lineHeight: 1.7,
  color: "#64748b",
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
  gap: "8px",
  background: "#eef4ff",
  border: "1px solid #dbeafe",
  color: "#334155",
  borderRadius: "999px",
  padding: "8px 12px",
  fontSize: "16px",
  fontWeight: 700,
  flexShrink:0,
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
  gridTemplateColumns: "520px minmax(0, 1fr)",
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
  padding: "18px",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.75)",
};

const infoCardStyle: React.CSSProperties = {
  background: "#f8fbff",
  border: "1px solid #dbe7f5",
  borderRadius: "20px",
  overflow: "hidden",
  boxShadow: "0 8px 20px rgba(37, 99, 235, 0.06)",
};

const cardHeaderStyle: React.CSSProperties = {
  fontSize: "26px",
  fontWeight: 800,
  color: "#0f172a",
  marginBottom: "12px",
};

const infoCardHeaderStyle: React.CSSProperties = {
  background: "linear-gradient(90deg, #4f8df3 0%, #79aaf8 100%)",
  color: "#ffffff",
  padding: "14px 20px",
  fontSize: "24px",
  fontWeight: 800,
};

const uploadPanelStyle: React.CSSProperties = {
  background: "linear-gradient(180deg, #f8fbff 0%, #eef5ff 100%)",
  border: "1px solid #dbeafe",
  borderRadius: "22px",
  padding: "16px",
  marginBottom: "18px",
};

const uploadPanelHeaderStyle: React.CSSProperties = {
  fontSize: "20px",
  fontWeight: 800,
  color: "#1e3a8a",
  marginBottom: "12px",
};

const uploadGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr",
  gap: "12px",
};

const uploadCardStyle: React.CSSProperties = {
  background: "#ffffff",
  border: "1px solid #dbe7f5",
  borderRadius: "18px",
  padding: "14px",
  boxShadow: "0 8px 18px rgba(15, 23, 42, 0.04)",
};

const uploadCardTopStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "10px",
  marginBottom: "6px",
};

const uploadCardTitleStyle: React.CSSProperties = {
  fontSize: "20px",
  fontWeight: 800,
  color: "#0f172a",
};

const uploadStatusStyle: React.CSSProperties = {
  padding: "5px 9px",
  borderRadius: "999px",
  fontSize: "13px",
  fontWeight: 800,
};

const uploadDescStyle: React.CSSProperties = {
  fontSize: "14px",
  color: "#64748b",
  lineHeight: 1.5,
  marginBottom: "10px",
};

const uploadButtonStyle: React.CSSProperties = {
  width: "100%",
  padding: "13px 16px",
  fontSize: "18px",
  fontWeight: 800,
  color: "#ffffff",
  background: "linear-gradient(90deg, #4f8df3 0%, #5f9dff 100%)",
  border: "none",
  borderRadius: "14px",
  cursor: "pointer",
  boxShadow: "0 8px 18px rgba(37, 99, 235, 0.18)",
};

const uploadFileNameStyle: React.CSSProperties = {
  marginTop: "8px",
  fontSize: "15px",
  color: "#475569",
  wordBreak: "break-all",
  lineHeight: 1.4,
};

const selectorPanelStyle: React.CSSProperties = {
  background: "#ffffff",
  border: "1px solid #dbe7f5",
  borderRadius: "20px",
  padding: "16px",
  marginBottom: "18px",
};

const selectorPanelHeaderStyle: React.CSSProperties = {
  fontSize: "20px",
  fontWeight: 800,
  color: "#0f172a",
  marginBottom: "12px",
};

const summaryInfoGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: "10px 12px",
  padding: "14px 18px",
};

const infoMiniCardStyle: React.CSSProperties = {
  background: "#ffffff",
  border: "1px solid #dbeafe",
  borderRadius: "14px",
  padding: "10px 12px",
  boxShadow: "0 4px 12px rgba(37, 99, 235, 0.04)",
  minHeight: "92px",
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
};

const infoMiniLabelStyle: React.CSSProperties = {
  fontSize: "13px",
  color: "#64748b",
  marginBottom: "4px",
  fontWeight: 700,
};

const infoMiniValueStyle: React.CSSProperties = {
  fontSize: "22px",
  color: "#0f172a",
  fontWeight: 800,
};

const emptyHintStyle: React.CSSProperties = {
  padding: "18px 20px",
  fontSize: "18px",
  color: "#64748b",
  lineHeight: 1.6,
};

const twoColGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "16px",
};

const fieldLabelStyle: React.CSSProperties = {
  fontSize: "18px",
  fontWeight: 700,
  color: "#1e293b",
  marginBottom: "8px",
};

const sectionLabelStyle: React.CSSProperties = {
  fontSize: "24px",
  fontWeight: 800,
  color: "#0f172a",
  marginBottom: "10px",
};

const selectStyle: React.CSSProperties = {
  width: "100%",
  padding: "13px 14px",
  fontSize: "18px",
  border: "2px solid #b8c7dc",
  borderRadius: "14px",
  backgroundColor: "#ffffff",
  color: "#0f172a",
  outline: "none",
};

const quotaPanelStyle: React.CSSProperties = {
  background: "#ffffff",
  border: "1px solid #dbe7f5",
  borderRadius: "18px",
  padding: "14px",
  marginBottom: "14px",
};

const quotaInputStyle: React.CSSProperties = {
  width: "140px",
  padding: "12px 14px",
  fontSize: "20px",
  border: "2px solid #b8c7dc",
  borderRadius: "14px",
  backgroundColor: "#ffffff",
  color: "#0f172a",
  outline: "none",
};

const ratioPanelStyle: React.CSSProperties = {
  background: "#f1f6fd",
  border: "1px solid #d5e2f0",
  borderRadius: "18px",
  padding: "16px",
};

const ratioGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, 1fr)",
  gap: "16px 18px",
};

const ratioItemStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: "7px",
};

const ratioLabelStyle: React.CSSProperties = {
  fontSize: "18px",
  fontWeight: 800,
  color: "#1e293b",
};

const ratioInputStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: "120px",
  padding: "11px",
  fontSize: "20px",
  border: "2px solid #b8c7dc",
  borderRadius: "13px",
  backgroundColor: "#ffffff",
  textAlign: "center",
};

const primaryButtonStyle: React.CSSProperties = {
  width: "100%",
  marginTop: "22px",
  padding: "17px 22px",
  fontSize: "28px",
  fontWeight: 800,
  color: "#ffffff",
  background: "linear-gradient(90deg, #4f8df3 0%, #5f9dff 100%)",
  border: "none",
  borderRadius: "18px",
  cursor: "pointer",
  boxShadow: "0 12px 28px rgba(37, 99, 235, 0.22)",
};

const errorStyle: React.CSSProperties = {
  marginTop: "16px",
  color: "#b91c1c",
  background: "#fee2e2",
  border: "1px solid #fecaca",
  padding: "12px 14px",
  borderRadius: "12px",
  fontSize: "16px",
};

const summaryRowStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: "10px",
  marginBottom: "12px",
};

const summaryBoxStyle: React.CSSProperties = {
  background: "#ffffff",
  border: "1px solid #dbe7f5",
  borderRadius: "14px",
  padding: "12px 14px",
  minHeight: "90px",
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
};

const summaryLabelStyle: React.CSSProperties = {
  fontSize: "14px",
  color: "#64748b",
  marginBottom: "6px",
  fontWeight: 700,
};

const summaryValueStyle: React.CSSProperties = {
  fontSize: "26px",
  color: "#0f172a",
  fontWeight: 800,
};

const stepsBoxStyle: React.CSSProperties = {
  background: "#ffffff",
  border: "1px solid #dbe7f5",
  borderRadius: "14px",
  padding: "12px 14px",
  marginBottom: "12px",
};

const stepTextStyle: React.CSSProperties = {
  fontSize: "15px",
  color: "#1e293b",
  marginBottom: "6px",
  lineHeight: 1.5,
};

const legendRowStyle: React.CSSProperties = {
  display: "flex",
  gap: "18px",
  alignItems: "center",
  flexWrap: "wrap",
  marginBottom: "14px",
  fontSize: "15px",
  color: "#334155",
};

const chartGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(460px, 1fr))",
  gap: "16px",
};

const chartCardStyle: React.CSSProperties = {
  border: "1px solid #d7e3f1",
  borderRadius: "18px",
  padding: "16px",
  background: "#ffffff",
  boxShadow: "0 8px 24px rgba(15, 23, 42, 0.04)",
};

const chartTitleStyle: React.CSSProperties = {
  fontSize: "22px",
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
  fontSize: "16px",
  color: "#334155",
};

const statsTagStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  background: "#e0f2fe",
  color: "#0369a1",
  borderRadius: "999px",
  padding: "5px 9px",
  fontWeight: 800,
};

const emptyChartStyle: React.CSSProperties = {
  color: "#64748b",
  fontSize: "17px",
  padding: "20px 0",
  textAlign: "center",
};