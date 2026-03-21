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

  const resetSimulationOutput = () => {
    setResult([]);
    setSteps([]);
    setHasSimulationRun(false);
    setError("");
  };

  const resetSimulationState = () => {
    setQuota(0);
    setMultiplier({
      國文: 0,
      英文: 0,
      數學: 0,
      專業一: 0,
      專業二: 0,
    });
    resetSimulationOutput();
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
        resetSimulationOutput();
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
        resetSimulationOutput();
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

  const activeFilters = useMemo(() => {
    return scoreFields
      .map((field) => ({
        field,
        times: Number(multiplier[field] || 0),
      }))
      .filter((item) => item.times >= 3);
  }, [multiplier]);

  const canRunSimulation =
    !!configData.length &&
    !!parentData.length &&
    !!selectionData.length &&
    !!selectedDepartment &&
    !!selectedCategory &&
    quota > 0 &&
    activeFilters.length > 0;

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

    if (!quota || quota <= 0 || activeFilters.length === 0) {
      setError("請先設定招生人數，並至少填入一個倍率 ≥ 3 的科目");
      return;
    }

    let workingList = [...linkedSelectionData];

    const groupedByTimes = [...new Set(activeFilters.map((x) => x.times))]
      .sort((a, b) => b - a)
      .map((times) => ({
        times,
        fields: activeFilters.filter((x) => x.times === times).map((x) => x.field),
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
        .sort(
          (a, b) => Number((b as any).__groupScore) - Number((a as any).__groupScore)
        );

      workingList = sorted
        .slice(0, limit)
        .map(({ __groupScore, ...rest }) => rest as SelectionRowData);

      const fieldLabel =
        group.fields.length === 1
          ? `${group.fields[0]}`
          : `${group.fields.join(" + ")}`;

      processSteps.push(
        `倍率 ${group.times}：${fieldLabel} 加總篩選，保留前 ${limit} 人，目前剩 ${workingList.length} 人`
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
      <div style={appShellStyle}>
<header style={topHeaderStyle}>
  <div style={brandWrapStyle}>
    <div style={brandIconStyle}>🎓</div>
    <div>
      <h1 style={titleStyle}>甄選入學成績倍率篩選系統</h1>
    </div>
  </div>
</header>

        <div style={stepBarStyle}>
          <StepPill index={1} label="上傳倍率" status={configFileName ? "done" : "idle"} />
          <StepConnector />
          <StepPill
            index={2}
            label="上傳全國成績"
            status={parentFileName ? "done" : "idle"}
          />
          <StepConnector />
          <StepPill
            index={3}
            label="上傳甄選成績"
            status={selectionFileName ? "done" : "idle"}
          />
          <StepConnector />
          <StepPill
            index={4}
            label="選擇系群條件"
            status={selectedDepartment && selectedCategory ? "current" : "idle"}
          />
          <StepConnector />
          <StepPill
            index={5}
            label="執行模擬"
            status={hasSimulationRun ? "done" : "idle"}
          />
        </div>

        <div style={layoutStyle}>
<aside style={sidebarStyle}>
  <Panel title="資料上傳">
    <div style={stackStyle}>
      <UploadCard
        title="倍率設定檔"
        fileName={configFileName}
        buttonLabel="選擇倍率設定檔"
        onClick={() => configFileInputRef.current?.click()}
        isReady={!!configFileName}
        accent="#3b82f6"
      />
      <UploadCard
        title="全國成績檔案"
        fileName={parentFileName}
        buttonLabel="選擇全國成績檔案"
        onClick={() => parentFileInputRef.current?.click()}
        isReady={!!parentFileName}
        accent="#10b981"
      />
      <UploadCard
        title="甄選成績檔"
        fileName={selectionFileName}
        buttonLabel="選擇甄選成績檔"
        onClick={() => selectionFileInputRef.current?.click()}
        isReady={!!selectionFileName}
        accent="#8b5cf6"
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
  </Panel>

  <Panel title="招生條件設定">
    <div style={fieldBlockStyle}>
      <label style={fieldLabelStyle}>招生系科</label>
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

    <div style={fieldBlockStyle}>
      <label style={fieldLabelStyle}>招生群類別</label>
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
  </Panel>

  <Panel title="模擬參數">
    <div style={fieldBlockStyle}>
      <label style={fieldLabelStyle}>招生人數</label>
      <input
        type="number"
        min={0}
        value={quota}
        onChange={(e) => {
          setQuota(Number(e.target.value));
          resetSimulationOutput();
        }}
        style={inputStyle}
      />
    </div>

    <div style={dividerStyle} />

    <div style={{ marginBottom: 10 }}>
      <div style={subSectionLabelStyle}>倍率設定（需 ≥ 3 才生效）</div>
    </div>

    <div style={ratioGridStyle}>
      {scoreFields.map((field) => (
        <div key={field} style={ratioCardStyle}>
          <div style={ratioTitleStyle}>{field}</div>
          <input
            type="number"
            min={0}
            value={multiplier[field]}
            onChange={(e) => {
              setMultiplier({
                ...multiplier,
                [field]: Number(e.target.value),
              });
              resetSimulationOutput();
            }}
            style={ratioInputStyle}
          />
        </div>
      ))}
    </div>

    <button
      onClick={calculate}
      disabled={!canRunSimulation}
      style={{
        ...primaryButtonStyle,
        marginTop: 18,
        opacity: canRunSimulation ? 1 : 0.6,
        cursor: canRunSimulation ? "pointer" : "not-allowed",
      }}
    >
      開始模擬
    </button>

    {!canRunSimulation && (
      <div style={mutedHintStyle}>請確認檔案、系群條件、招生人數與倍率設定</div>
    )}

    {error && <div style={errorStyle}>{error}</div>}
  </Panel>
</aside>


          <section style={contentStyle}>
            <Card title="招生條件摘要">
              {selectedConfig ? (
                <div style={summaryInfoGridStyle}>
                  <InfoMiniCard
                    label="原始招生名額"
                    value={toMultiplierNumber(selectedConfig["一般考生招生名額"])}
                    tone="default"
                  />
                  <InfoMiniCard
                    label="國文倍率"
                    value={toMultiplierNumber(selectedConfig["國文"])}
                    tone="red"
                  />
                  <InfoMiniCard
                    label="英文倍率"
                    value={toMultiplierNumber(selectedConfig["英文"])}
                    tone="orange"
                  />
                  <InfoMiniCard
                    label="數學倍率"
                    value={toMultiplierNumber(selectedConfig["數學"])}
                    tone="blue"
                  />
                  <InfoMiniCard
                    label="專業一倍率"
                    value={toMultiplierNumber(selectedConfig["專業一"])}
                    tone="violet"
                  />
                  <InfoMiniCard
                    label="專業二倍率"
                    value={toMultiplierNumber(selectedConfig["專業二"])}
                    tone="green"
                  />
                </div>
              ) : (
                <div style={emptyStateStyle}>
                  請先完成三份檔案上傳，並選擇招生系科與招生群類別。
                </div>
              )}
            </Card>

            <Card title="篩選結果統計">
              <div style={summaryRowStyle}>
                <SummaryBox
                  label="全國人數"
                  value={parentDisplayCount}
                  tone="blue"
                  sublabel="群類總人數"
                />
                <SummaryBox
                  label="甄選人數"
                  value={selectionDisplayCount}
                  tone="violet"
                  sublabel="二階報名考生"
                />
                <SummaryBox
                  label="篩選後人數"
                  value={hasSimulationRun ? result.length : 0}
                  tone="green"
                  sublabel={hasSimulationRun ? "模擬完成" : "尚未執行"}
                />
              </div>

              {steps.length > 0 && (
                <div style={stepFlowBoxStyle}>
                  <div style={stepFlowTitleStyle}>篩選流程</div>
                  <div style={stepChipWrapStyle}>
                    {steps.map((step, index) => (
                      <div key={index} style={flowItemStyle}>
                        <span style={flowIndexStyle}>{index + 1}</span>
                        <span>{step}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div style={legendRowStyle}>
                <LegendBox color="rgba(110, 193, 255, 0.30)" label="全國成績分布" />
                <LegendBox color="rgba(245, 183, 32, 0.75)" label="未篩選甄選成績分布" />
                <LegendBox color="rgba(51, 96, 255, 0.82)" label="篩選後成績分布" />
              </div>
            </Card>

            <div style={chartsSectionTitleStyle}>各科成績分布</div>

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
          </section>
        </div>
      </div>
    </main>
  );
}

function Panel({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section style={panelStyle}>
      <div style={panelHeaderStyle}>{title}</div>
      {subtitle ? <div style={panelSubtitleStyle}>{subtitle}</div> : null}
      {children}
    </section>
  );
}

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section style={cardStyle}>
      <div style={cardHeaderStyle}>{title}</div>
      {children}
    </section>
  );
}

function UploadCard({
  title,
  fileName,
  buttonLabel,
  onClick,
  isReady,
  accent,
}: {
  title: string;
  fileName: string;
  buttonLabel: string;
  onClick: () => void;
  isReady: boolean;
  accent: string;
}) {
  return (
    <div style={uploadCardStyle}>
      <div
        style={{
          ...uploadIconStyle,
          background: `${accent}18`,
          color: accent,
        }}
      >
        📄
      </div>

        <div style={uploadContentStyle}>
        <div style={uploadTopRowStyle}>
          <div style={uploadCardTitleStyle}>{title}</div>

          <div
            style={{
              ...uploadStatusStyle,
              background: isReady ? "#dcfce7" : "#eef2f7",
              color: isReady ? "#166534" : "#64748b",
            }}
          >
            {isReady ? "已上傳" : "待上傳"}
          </div>
        </div>

        <button onClick={onClick} style={uploadButtonStyle}>
          {buttonLabel}
        </button>
      </div>
    </div>
  );
}
function InfoMiniCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "default" | "red" | "orange" | "blue" | "violet" | "green";
}) {
  const toneMap = {
    default: { bg: "#f8fafc", color: "#0f172a" },
    red: { bg: "#fff1f2", color: "#dc2626" },
    orange: { bg: "#fff7ed", color: "#ea580c" },
    blue: { bg: "#eff6ff", color: "#2563eb" },
    violet: { bg: "#f5f3ff", color: "#7c3aed" },
    green: { bg: "#ecfdf5", color: "#059669" },
  };

  return (
    <div style={{ ...infoMiniCardStyle, background: toneMap[tone].bg }}>
      <div style={infoMiniLabelStyle}>{label}</div>
      <div style={{ ...infoMiniValueStyle, color: toneMap[tone].color }}>{value}</div>
    </div>
  );
}

function StepPill({
  index,
  label,
  status,
}: {
  index: number;
  label: string;
  status: "done" | "current" | "idle";
}) {
  const styles = {
    done: {
      bg: "#ecfdf5",
      border: "#bbf7d0",
      text: "#166534",
      circleBg: "#22c55e",
      circleText: "#ffffff",
    },
    current: {
      bg: "#eff6ff",
      border: "#bfdbfe",
      text: "#1d4ed8",
      circleBg: "#2563eb",
      circleText: "#ffffff",
    },
    idle: {
      bg: "#ffffff",
      border: "#e2e8f0",
      text: "#64748b",
      circleBg: "#e2e8f0",
      circleText: "#475569",
    },
  }[status];

  return (
    <div
      style={{
        ...stepPillStyle,
        background: styles.bg,
        borderColor: styles.border,
        color: styles.text,
      }}
    >
      <span
        style={{
          ...stepIndexStyle,
          background: styles.circleBg,
          color: styles.circleText,
        }}
      >
        {status === "done" ? "✓" : index}
      </span>
      <span>{label}</span>
    </div>
  );
}

function StepConnector() {
  return <div style={stepConnectorStyle} />;
}

function SummaryBox({
  label,
  value,
  tone,
  sublabel,
}: {
  label: string;
  value: number;
  tone: "blue" | "violet" | "green";
  sublabel: string;
}) {
  const palette = {
    blue: { bg: "#eff6ff", num: "#1d4ed8", border: "#dbeafe" },
    violet: { bg: "#f5f3ff", num: "#7c3aed", border: "#ddd6fe" },
    green: { bg: "#ecfdf5", num: "#059669", border: "#a7f3d0" },
  }[tone];

  return (
    <div
      style={{
        ...summaryBoxStyle,
        background: palette.bg,
        borderColor: palette.border,
      }}
    >
      <div style={summaryLabelStyle}>{label}</div>
      <div style={{ ...summaryValueStyle, color: palette.num }}>
        {value.toLocaleString()}
      </div>
      <div style={summarySubLabelStyle}>{sublabel}</div>
    </div>
  );
}

function LegendBox({ color, label }: { color: string; label: string }) {
  return (
    <div style={legendItemStyle}>
      <span
        style={{
          width: 14,
          height: 14,
          borderRadius: 999,
          background: color,
          border: "1px solid rgba(148,163,184,0.6)",
          display: "inline-block",
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
      <div style={chartHeaderRowStyle}>
        <h3 style={chartTitleStyle}>{title}成績分布</h3>
      </div>

      <div style={chartStatsWrapStyle}>
        <div style={chartStatGroupStyle}>
          <span style={statsTagBlueStyle}>全國</span>
          <span style={chartStatTextStyle}>平均 {parentStats.mean.toFixed(2)}</span>
          <span style={chartStatTextStyle}>標準差 {parentStats.sd.toFixed(2)}</span>
          <span style={chartStatTextStyle}>人數 {parentStats.total.toLocaleString()}</span>
        </div>

        <div style={chartStatGroupStyle}>
          <span style={statsTagGrayStyle}>甄選</span>
          <span style={chartStatTextStyle}>平均 {selectionStats.mean.toFixed(2)}</span>
          <span style={chartStatTextStyle}>標準差 {selectionStats.sd.toFixed(2)}</span>
          <span style={chartStatTextStyle}>人數 {selectionStats.total.toLocaleString()}</span>
        </div>
      </div>

      {bins.length === 0 ? (
        <div style={emptyChartStyle}>尚無資料</div>
      ) : (
        <svg viewBox="0 0 660 380" style={{ width: "100%", height: "auto" }}>
          <line x1="60" y1="25" x2="60" y2="310" stroke="#334155" strokeWidth="1.2" />
          <line x1="615" y1="25" x2="615" y2="310" stroke="#2563eb" strokeWidth="1.2" />
          <line x1="60" y1="310" x2="615" y2="310" stroke="#334155" strokeWidth="1.2" />

          <text
            x="20"
            y="170"
            transform="rotate(-90 20 170)"
            textAnchor="middle"
            fontSize="15"
            fill="#334155"
          >
            全國人數
          </text>

          <text
            x="645"
            y="170"
            transform="rotate(90 645 170)"
            textAnchor="middle"
            fontSize="15"
            fill="#2563eb"
          >
            甄選人數
          </text>

          <text x="338" y="355" textAnchor="middle" fontSize="15" fill="#334155">
            分數
          </text>

          {buildYTicks(leftMaxCount).map((tick, idx) => {
            const y = 310 - (tick / leftMaxCount) * 250;
            return (
              <g key={`left-${idx}`}>
                <line x1="55" y1={y} x2="60" y2={y} stroke="#334155" strokeWidth="1" />
                <text x="48" y={y + 4} textAnchor="end" fontSize="11" fill="#64748b">
                  {tick}
                </text>
                <line x1="60" y1={y} x2="615" y2={y} stroke="#eef2f7" strokeWidth="1" />
              </g>
            );
          })}

          {buildYTicks(rightMaxCount).map((tick, idx) => {
            const y = 310 - (tick / rightMaxCount) * 250;
            return (
              <g key={`right-${idx}`}>
                <line x1="615" y1={y} x2="620" y2={y} stroke="#2563eb" strokeWidth="1" />
                <text x="628" y={y + 4} textAnchor="start" fontSize="11" fill="#2563eb">
                  {tick}
                </text>
              </g>
            );
          })}

          <path
            d={areaPath}
            fill="rgba(110, 193, 255, 0.30)"
            stroke="#67b8f7"
            strokeWidth="2"
          />

          {bins.map((bin, index) => {
            const chartWidth = 540;
            const baseX = 70;
            const slotWidth = chartWidth / bins.length;

            const rawBarWidth = Math.max(slotWidth * 0.58, 3);
            const filteredBarWidth = Math.max(slotWidth * 0.34, 2);

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
                  fill="rgba(245, 183, 32, 0.75)"
                  rx="2"
                />
                <rect
                  x={xFiltered}
                  y={yFiltered}
                  width={filteredBarWidth}
                  height={filteredHeight}
                  fill="rgba(51, 96, 255, 0.82)"
                  rx="2"
                />

                {bin.score % 10 === 0 && (
                  <text
                    x={baseX + index * slotWidth + slotWidth / 2}
                    y={330}
                    textAnchor="middle"
                    fontSize="11"
                    fill="#64748b"
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
  background:
    "linear-gradient(180deg, #eef3f9 0%, #f6f8fb 38%, #f3f6fa 100%)",
  padding: "8px 24px 24px",
  fontFamily:
    '"Inter", "Noto Sans TC", "PingFang TC", "Microsoft JhengHei", sans-serif',
  color: "#0f172a",
};

const appShellStyle: React.CSSProperties = {
  maxWidth: "1560px",
  margin: "0 auto",
};

const topHeaderStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  background: "rgba(255,255,255,0.86)",
  border: "1px solid rgba(226,232,240,0.9)",
  borderRadius: "24px",
  padding: "22px 24px",
  boxShadow: "0 12px 32px rgba(15,23,42,0.06)",
  backdropFilter: "blur(10px)",
};
const brandWrapStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "14px",
};

const brandIconStyle: React.CSSProperties = {
  width: "52px",
  height: "52px",
  borderRadius: "16px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "28px",
  background: "linear-gradient(135deg, #2563eb 0%, #4f8cff 100%)",
  color: "#fff",
  boxShadow: "0 10px 24px rgba(37,99,235,0.22)",
};

const titleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: "32px",
  lineHeight: 1.1,
  fontWeight: 800,
  letterSpacing: "-0.03em",
  color: "#0f172a",
};


const stepBarStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
  overflowX: "auto",
  padding: "6px 4px 0",
  marginBottom: "10px",
};

const stepPillStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "10px",
  border: "1px solid",
  borderRadius: "999px",
  padding: "10px 14px",
  fontSize: "14px",
  fontWeight: 700,
  whiteSpace: "nowrap",
  flexShrink: 0,
};

const stepIndexStyle: React.CSSProperties = {
  width: "26px",
  height: "26px",
  borderRadius: "999px",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "13px",
  fontWeight: 800,
};

const stepConnectorStyle: React.CSSProperties = {
  width: "28px",
  height: "1px",
  background: "#cbd5e1",
  flexShrink: 0,
};

const layoutStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "340px minmax(0, 1fr)",
  gap: "18px",
  alignItems: "start",
};

const sidebarStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "12px",
};

const contentStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "16px",
  minWidth: 0,
};

const panelStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.88)",
  border: "1px solid rgba(226,232,240,0.9)",
  borderRadius: "20px",
  padding: "12px",
  boxShadow: "0 8px 28px rgba(15,23,42,0.05)",
  backdropFilter: "blur(10px)",
};

const panelHeaderStyle: React.CSSProperties = {
  fontSize: "22px",
  fontWeight: 800,
  color: "#0f172a",
  marginBottom: "4px",
};

const panelSubtitleStyle: React.CSSProperties = {
  fontSize: "13px",
  color: "#64748b",
  lineHeight: 1.6,
  marginBottom: "14px",
};

const stackStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "8px",
};

const uploadCardStyle: React.CSSProperties = {
  display: "flex",
  gap: "10px",
  alignItems: "stretch",
  padding: "10px",
  border: "1px solid #e2e8f0",
  borderRadius: "16px",
  background: "#fbfdff",
};

const uploadIconStyle: React.CSSProperties = {
  width: "42px",
  height: "42px",
  borderRadius: "12px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "18px",
  flexShrink: 0,
};

const uploadContentStyle: React.CSSProperties = {
  flex: 1,
  minWidth: 0,
  display: "flex",
  flexDirection: "column",
  gap: "10px",
};

const uploadTopRowStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "8px",
};

const uploadCardTitleStyle: React.CSSProperties = {
  fontSize: "16px",
  fontWeight: 800,
  color: "#0f172a",
  lineHeight: 1.2,
};

const uploadStatusStyle: React.CSSProperties = {
  borderRadius: "999px",
  padding: "5px 10px",
  fontSize: "12px",
  fontWeight: 800,
  flexShrink: 0,
};

const fileNameBoxStyle: React.CSSProperties = {
  fontSize: "13px",
  color: "#475569",
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
  borderRadius: "12px",
  padding: "10px 12px",
  wordBreak: "break-all",
  marginBottom: "10px",
};

const uploadButtonStyle: React.CSSProperties = {
  width: "100%",
  border: "none",
  borderRadius: "10px",
  background: "#eef4ff",
  color: "#2563eb",
  fontWeight: 800,
  fontSize: "13px",
  padding: "6px 10px",
  cursor: "pointer",
  lineHeight: 1.2,
};

const fieldBlockStyle: React.CSSProperties = {
  marginBottom: "14px",
};

const fieldLabelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "13px",
  fontWeight: 700,
  color: "#334155",
  marginBottom: "8px",
};

const selectStyle: React.CSSProperties = {
  width: "100%",
  border: "1px solid #d7dee8",
  borderRadius: "14px",
  padding: "12px 14px",
  fontSize: "15px",
  color: "#0f172a",
  background: "#ffffff",
  outline: "none",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  border: "1px solid #d7dee8",
  borderRadius: "14px",
  padding: "12px 14px",
  fontSize: "15px",
  color: "#0f172a",
  background: "#ffffff",
  outline: "none",
  boxSizing: "border-box",
};

const dividerStyle: React.CSSProperties = {
  height: 1,
  background: "#e8edf4",
  margin: "16px 0",
};

const subSectionLabelStyle: React.CSSProperties = {
  fontSize: "13px",
  fontWeight: 800,
  color: "#475569",
};

const ratioGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: "10px",
};

const ratioCardStyle: React.CSSProperties = {
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
  borderRadius: "14px",
  padding: "12px",
};

const ratioTitleStyle: React.CSSProperties = {
  fontSize: "13px",
  fontWeight: 800,
  color: "#334155",
  marginBottom: "8px",
};

const ratioInputStyle: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  border: "1px solid #d7dee8",
  borderRadius: "12px",
  padding: "10px 12px",
  fontSize: "15px",
  textAlign: "center",
  background: "#ffffff",
};

const primaryButtonStyle: React.CSSProperties = {
  width: "100%",
  border: "none",
  borderRadius: "16px",
  padding: "14px 18px",
  fontSize: "16px",
  fontWeight: 800,
  color: "#ffffff",
  background: "linear-gradient(90deg, #2563eb 0%, #3b82f6 100%)",
  boxShadow: "0 10px 24px rgba(37,99,235,0.18)",
};

const mutedHintStyle: React.CSSProperties = {
  marginTop: "10px",
  fontSize: "12px",
  color: "#64748b",
  lineHeight: 1.6,
};

const errorStyle: React.CSSProperties = {
  marginTop: "12px",
  borderRadius: "14px",
  padding: "12px 14px",
  background: "#fef2f2",
  color: "#b91c1c",
  border: "1px solid #fecaca",
  fontSize: "13px",
  lineHeight: 1.6,
};

const cardStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.88)",
  border: "1px solid rgba(226,232,240,0.9)",
  borderRadius: "22px",
  padding: "18px",
  boxShadow: "0 8px 28px rgba(15,23,42,0.05)",
  backdropFilter: "blur(10px)",
};

const cardHeaderStyle: React.CSSProperties = {
  fontSize: "22px",
  fontWeight: 800,
  color: "#0f172a",
  marginBottom: "14px",
};

const summaryInfoGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(6, minmax(0, 1fr))",
  gap: "12px",
};

const infoMiniCardStyle: React.CSSProperties = {
  borderRadius: "16px",
  padding: "14px",
  border: "1px solid rgba(226,232,240,0.8)",
  minHeight: "92px",
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
};

const infoMiniLabelStyle: React.CSSProperties = {
  fontSize: "12px",
  color: "#64748b",
  marginBottom: "6px",
  fontWeight: 700,
};

const infoMiniValueStyle: React.CSSProperties = {
  fontSize: "22px",
  fontWeight: 800,
};

const emptyStateStyle: React.CSSProperties = {
  fontSize: "14px",
  lineHeight: 1.8,
  color: "#64748b",
  padding: "8px 0 2px",
};

const summaryRowStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: "12px",
};

const summaryBoxStyle: React.CSSProperties = {
  border: "1px solid",
  borderRadius: "18px",
  padding: "16px",
  minHeight: "110px",
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
};

const summaryLabelStyle: React.CSSProperties = {
  fontSize: "13px",
  color: "#475569",
  marginBottom: "6px",
  fontWeight: 700,
};

const summaryValueStyle: React.CSSProperties = {
  fontSize: "34px",
  fontWeight: 800,
  lineHeight: 1.1,
};

const summarySubLabelStyle: React.CSSProperties = {
  marginTop: "6px",
  fontSize: "12px",
  color: "#64748b",
};

const stepFlowBoxStyle: React.CSSProperties = {
  marginTop: "14px",
  padding: "14px",
  background: "#fbfcfe",
  border: "1px solid #e5ebf2",
  borderRadius: "16px",
};

const stepFlowTitleStyle: React.CSSProperties = {
  fontSize: "14px",
  fontWeight: 800,
  color: "#334155",
  marginBottom: "10px",
};

const stepChipWrapStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "10px",
};

const flowItemStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  gap: "10px",
  fontSize: "13px",
  color: "#334155",
  lineHeight: 1.7,
};

const flowIndexStyle: React.CSSProperties = {
  width: "22px",
  height: "22px",
  borderRadius: "999px",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
  background: "#eaf2ff",
  color: "#2563eb",
  fontWeight: 800,
  fontSize: "12px",
};

const legendRowStyle: React.CSSProperties = {
  display: "flex",
  gap: "18px",
  alignItems: "center",
  flexWrap: "wrap",
  marginTop: "16px",
  fontSize: "13px",
  color: "#475569",
};

const legendItemStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "8px",
};

const chartsSectionTitleStyle: React.CSSProperties = {
  fontSize: "22px",
  fontWeight: 800,
  color: "#0f172a",
  paddingLeft: "4px",
};

const chartGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(420px, 1fr))",
  gap: "16px",
};

const chartCardStyle: React.CSSProperties = {
  borderRadius: "20px",
  padding: "16px",
  background: "rgba(255,255,255,0.92)",
  border: "1px solid rgba(226,232,240,0.9)",
  boxShadow: "0 8px 24px rgba(15,23,42,0.05)",
};

const chartHeaderRowStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: "12px",
};

const chartTitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: "18px",
  lineHeight: 1.2,
  color: "#0f172a",
  fontWeight: 800,
};

const chartStatsWrapStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "8px",
  marginBottom: "14px",
};

const chartStatGroupStyle: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: "12px",
  alignItems: "center",
};

const chartStatTextStyle: React.CSSProperties = {
  fontSize: "13px",
  color: "#475569",
  fontWeight: 600,
};

const statsTagBlueStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: "999px",
  padding: "5px 10px",
  background: "#e0f2fe",
  color: "#0369a1",
  fontWeight: 800,
  fontSize: "12px",
};

const statsTagGrayStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: "999px",
  padding: "5px 10px",
  background: "#f1f5f9",
  color: "#475569",
  fontWeight: 800,
  fontSize: "12px",
};

const emptyChartStyle: React.CSSProperties = {
  color: "#64748b",
  fontSize: "14px",
  padding: "26px 0 20px",
  textAlign: "center",
};