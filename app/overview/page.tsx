"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Papa from "papaparse";
import Link from "next/link";

type OverviewRow = {
  學校?: string;
  招生系科?: string;
  招生群類別?: string;
  一般考生招生名額?: string | number;
  國文?: string | number;
  英文?: string | number;
  數學?: string | number;
  專業一?: string | number;
  專業二?: string | number;
};

type ScoreField = "國文" | "英文" | "數學" | "專業一" | "專業二";
type FilterType = "department" | "category" | "school";

const scoreFields: ScoreField[] = ["國文", "英文", "數學", "專業一", "專業二"];

export default function OverviewPage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const departmentSearchRef = useRef<HTMLDivElement | null>(null);
  const categorySearchRef = useRef<HTMLDivElement | null>(null);
  const schoolSearchRef = useRef<HTMLDivElement | null>(null);

  const [rows, setRows] = useState<OverviewRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");

  const [departmentKeyword, setDepartmentKeyword] = useState("");
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([]);

  const [categoryKeyword, setCategoryKeyword] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  const [schoolKeyword, setSchoolKeyword] = useState("");
  const [selectedSchools, setSelectedSchools] = useState<string[]>([]);

  const [selectedSchool, setSelectedSchool] = useState("");
  const [selectedDepartmentCard, setSelectedDepartmentCard] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");

  const [showDepartmentDropdown, setShowDepartmentDropdown] = useState(false);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showSchoolDropdown, setShowSchoolDropdown] = useState(false);

  useEffect(() => {
    const loadCsv = async () => {
      try {
        const res = await fetch("/114全國一階篩選倍率.csv");
        const text = await res.text();

        Papa.parse<OverviewRow>(text, {
          header: true,
          skipEmptyLines: true,
          complete: (result) => {
            const cleaned = normalizeRows(result.data || []);

            if (!cleaned.length) {
              setRows([]);
              setError("沒有資料");
              return;
            }

            setRows(cleaned);
            setFileName("114全國一階篩選倍率.csv");
            setError("");
          },
          error: () => {
            setRows([]);
            setError("讀取失敗");
          },
        });
      } catch {
        setRows([]);
        setError("無法載入雲端檔案");
      }
    };

    loadCsv();
  }, []);

  const parseCsvFile = (file: File) => {
    Papa.parse<OverviewRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        const cleaned = normalizeRows(result.data || []);

        if (!cleaned.length) {
          setRows([]);
          setError("沒有資料");
          return;
        }

        const requiredColumns = [
          "學校",
          "招生系科",
          "招生群類別",
          "一般考生招生名額",
          "國文",
          "英文",
          "數學",
          "專業一",
          "專業二",
        ];

        const firstRow = cleaned[0] as Record<string, unknown>;
        const missingColumns = requiredColumns.filter((col) => !(col in firstRow));

        if (missingColumns.length > 0) {
          setRows([]);
          setError(`缺少欄位：${missingColumns.join("、")}`);
          return;
        }

        setRows(cleaned);
        setFileName(file.name);
        setError("");

        setDepartmentKeyword("");
        setSelectedDepartments([]);

        setCategoryKeyword("");
        setSelectedCategories([]);

        setSchoolKeyword("");
        setSelectedSchools([]);

        setSelectedSchool("");
        setSelectedDepartmentCard("");
        setSelectedCategory("");

        setShowDepartmentDropdown(false);
        setShowCategoryDropdown(false);
        setShowSchoolDropdown(false);
      },
      error: () => {
        setRows([]);
        setError("讀取失敗");
      },
    });
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    parseCsvFile(file);
  };

  const allDepartmentOptions = useMemo(() => {
    return uniqueSorted(rows.map((r) => String(r.招生系科 ?? "").trim()).filter(Boolean));
  }, [rows]);

  const allCategoryOptions = useMemo(() => {
    return uniqueSorted(rows.map((r) => String(r.招生群類別 ?? "").trim()).filter(Boolean));
  }, [rows]);

  const allSchoolOptions = useMemo(() => {
    return uniqueSorted(rows.map((r) => String(r.學校 ?? "").trim()).filter(Boolean));
  }, [rows]);

  const rowsForDepartmentOptions = useMemo(() => {
    return rows.filter((row) => {
      const category = String(row.招生群類別 ?? "").trim();
      const school = String(row.學校 ?? "").trim();

      const categoryMatched =
        selectedCategories.length === 0 || selectedCategories.includes(category);
      const schoolMatched =
        selectedSchools.length === 0 || selectedSchools.includes(school);

      return categoryMatched && schoolMatched;
    });
  }, [rows, selectedCategories, selectedSchools]);

  const rowsForCategoryOptions = useMemo(() => {
    return rows.filter((row) => {
      const department = String(row.招生系科 ?? "").trim();
      const school = String(row.學校 ?? "").trim();

      const departmentMatched =
        selectedDepartments.length === 0 || selectedDepartments.includes(department);
      const schoolMatched =
        selectedSchools.length === 0 || selectedSchools.includes(school);

      return departmentMatched && schoolMatched;
    });
  }, [rows, selectedDepartments, selectedSchools]);

  const rowsForSchoolOptions = useMemo(() => {
    return rows.filter((row) => {
      const department = String(row.招生系科 ?? "").trim();
      const category = String(row.招生群類別 ?? "").trim();

      const departmentMatched =
        selectedDepartments.length === 0 || selectedDepartments.includes(department);
      const categoryMatched =
        selectedCategories.length === 0 || selectedCategories.includes(category);

      return departmentMatched && categoryMatched;
    });
  }, [rows, selectedDepartments, selectedCategories]);

  const departmentOptions = useMemo(() => {
    return uniqueSorted(
      rowsForDepartmentOptions
        .map((r) => String(r.招生系科 ?? "").trim())
        .filter(Boolean)
    );
  }, [rowsForDepartmentOptions]);

  const categoryOptions = useMemo(() => {
    return uniqueSorted(
      rowsForCategoryOptions
        .map((r) => String(r.招生群類別 ?? "").trim())
        .filter(Boolean)
    );
  }, [rowsForCategoryOptions]);

  const schoolOptions = useMemo(() => {
    return uniqueSorted(
      rowsForSchoolOptions
        .map((r) => String(r.學校 ?? "").trim())
        .filter(Boolean)
    );
  }, [rowsForSchoolOptions]);

useEffect(() => {
  setSelectedDepartments((prev) => {
    const next = prev.filter((item) => departmentOptions.includes(item));
    return isSameStringArray(prev, next) ? prev : next;
  });
}, [departmentOptions]);

useEffect(() => {
  setSelectedCategories((prev) => {
    const next = prev.filter((item) => categoryOptions.includes(item));
    return isSameStringArray(prev, next) ? prev : next;
  });
}, [categoryOptions]);

useEffect(() => {
  setSelectedSchools((prev) => {
    const next = prev.filter((item) => schoolOptions.includes(item));
    return isSameStringArray(prev, next) ? prev : next;
  });
}, [schoolOptions]);

  const filteredDepartmentOptions = useMemo(() => {
    const keyword = departmentKeyword.trim();
    const base = keyword
      ? departmentOptions.filter((item) => item.includes(keyword))
      : departmentOptions;

    return sortOptionsWithSelectedFirst(base, selectedDepartments).slice(0, 100);
  }, [departmentOptions, departmentKeyword, selectedDepartments]);

  const filteredCategoryOptions = useMemo(() => {
    const keyword = categoryKeyword.trim();
    const base = keyword
      ? categoryOptions.filter((item) => item.includes(keyword))
      : categoryOptions;

    return sortOptionsWithSelectedFirst(base, selectedCategories).slice(0, 100);
  }, [categoryOptions, categoryKeyword, selectedCategories]);

  const filteredSchoolOptions = useMemo(() => {
    const keyword = schoolKeyword.trim();
    const base = keyword ? schoolOptions.filter((item) => item.includes(keyword)) : schoolOptions;

    return sortOptionsWithSelectedFirst(base, selectedSchools).slice(0, 100);
  }, [schoolOptions, schoolKeyword, selectedSchools]);

  const hasActiveFilters =
    selectedDepartments.length > 0 ||
    selectedCategories.length > 0 ||
    selectedSchools.length > 0;

  const filteredRows = useMemo(() => {
    if (!hasActiveFilters) return [];

    return rows.filter((row) => {
      const department = String(row.招生系科 ?? "").trim();
      const category = String(row.招生群類別 ?? "").trim();
      const school = String(row.學校 ?? "").trim();

      const departmentMatched =
        selectedDepartments.length === 0 || selectedDepartments.includes(department);
      const categoryMatched =
        selectedCategories.length === 0 || selectedCategories.includes(category);
      const schoolMatched = selectedSchools.length === 0 || selectedSchools.includes(school);

      return departmentMatched && categoryMatched && schoolMatched;
    });
  }, [rows, selectedDepartments, selectedCategories, selectedSchools, hasActiveFilters]);

  const groupedCards = useMemo(() => {
    const map = new Map<
      string,
      {
        school: string;
        department: string;
        categories: string[];
        totalQuota: number;
      }
    >();

    filteredRows.forEach((row) => {
      const school = String(row.學校 ?? "").trim();
      const department = String(row.招生系科 ?? "").trim();
      const category = String(row.招生群類別 ?? "").trim();
      const quota = toNumber(row.一般考生招生名額);

      const key = `${school}__${department}`;

      if (!map.has(key)) {
        map.set(key, {
          school,
          department,
          categories: [],
          totalQuota: 0,
        });
      }

      const current = map.get(key)!;

      if (category && !current.categories.includes(category)) {
        current.categories.push(category);
      }

      current.totalQuota += quota;
    });

    return Array.from(map.values())
      .map((item) => ({
        ...item,
        categories: item.categories.sort((a, b) => a.localeCompare(b, "zh-Hant")),
      }))
      .sort((a, b) => {
        const schoolCompare = a.school.localeCompare(b.school, "zh-Hant");
        if (schoolCompare !== 0) return schoolCompare;
        return a.department.localeCompare(b.department, "zh-Hant");
      });
  }, [filteredRows]);

  const totalSchools = useMemo(() => {
    return new Set(filteredRows.map((row) => String(row.學校 ?? "").trim()).filter(Boolean)).size;
  }, [filteredRows]);

  const totalQuota = useMemo(() => {
    return filteredRows.reduce((sum, row) => sum + toNumber(row.一般考生招生名額), 0);
  }, [filteredRows]);

  const selectedSchoolRows = useMemo(() => {
    if (!selectedSchool || !selectedDepartmentCard) return [];

    return filteredRows.filter(
      (row) =>
        String(row.學校 ?? "").trim() === selectedSchool &&
        String(row.招生系科 ?? "").trim() === selectedDepartmentCard
    );
  }, [filteredRows, selectedSchool, selectedDepartmentCard]);

  const selectedSchoolCategories = useMemo(() => {
    return uniqueSorted(
      selectedSchoolRows
        .map((row) => String(row.招生群類別 ?? "").trim())
        .filter(Boolean)
    );
  }, [selectedSchoolRows]);

  const selectedDetail = useMemo(() => {
    if (!selectedSchool || !selectedDepartmentCard || !selectedCategory) return null;

    return (
      selectedSchoolRows.find(
        (row) =>
          String(row.學校 ?? "").trim() === selectedSchool &&
          String(row.招生系科 ?? "").trim() === selectedDepartmentCard &&
          String(row.招生群類別 ?? "").trim() === selectedCategory
      ) || null
    );
  }, [selectedSchool, selectedDepartmentCard, selectedCategory, selectedSchoolRows]);

  useEffect(() => {
    if (!hasActiveFilters) {
      setSelectedSchool("");
      setSelectedDepartmentCard("");
      setSelectedCategory("");
      return;
    }

    if (groupedCards.length === 0) {
      setSelectedSchool("");
      setSelectedDepartmentCard("");
      setSelectedCategory("");
      return;
    }

    const found = groupedCards.find(
      (item) => item.school === selectedSchool && item.department === selectedDepartmentCard
    );

    if (!found) {
      setSelectedSchool(groupedCards[0].school);
      setSelectedDepartmentCard(groupedCards[0].department);
      setSelectedCategory(groupedCards[0].categories[0] || "");
    }
  }, [hasActiveFilters, groupedCards, selectedSchool, selectedDepartmentCard]);

  useEffect(() => {
    if (!selectedSchool || !selectedDepartmentCard) {
      setSelectedCategory("");
      return;
    }

    if (selectedSchoolCategories.length === 0) {
      setSelectedCategory("");
      return;
    }

    if (!selectedSchoolCategories.includes(selectedCategory)) {
      setSelectedCategory(selectedSchoolCategories[0]);
    }
  }, [selectedSchool, selectedDepartmentCard, selectedSchoolCategories, selectedCategory]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;

      if (departmentSearchRef.current && !departmentSearchRef.current.contains(target)) {
        setShowDepartmentDropdown(false);
      }

      if (categorySearchRef.current && !categorySearchRef.current.contains(target)) {
        setShowCategoryDropdown(false);
      }

      if (schoolSearchRef.current && !schoolSearchRef.current.contains(target)) {
        setShowSchoolDropdown(false);
      }
    };

    document.addEventListener("pointerdown", handleClickOutside);

    return () => {
      document.removeEventListener("pointerdown", handleClickOutside);
    };
  }, []);

  const toggleDepartment = (item: string) => {
    setSelectedDepartments((prev) =>
      prev.includes(item) ? prev.filter((x) => x !== item) : [...prev, item]
    );
  };

  const removeDepartment = (item: string) => {
    setSelectedDepartments((prev) => prev.filter((x) => x !== item));
  };

  const toggleCategoryFilter = (item: string) => {
    setSelectedCategories((prev) =>
      prev.includes(item) ? prev.filter((x) => x !== item) : [...prev, item]
    );
  };

  const removeCategoryFilter = (item: string) => {
    setSelectedCategories((prev) => prev.filter((x) => x !== item));
  };

  const toggleSchool = (item: string) => {
    setSelectedSchools((prev) =>
      prev.includes(item) ? prev.filter((x) => x !== item) : [...prev, item]
    );
  };

  const removeSchool = (item: string) => {
    setSelectedSchools((prev) => prev.filter((x) => x !== item));
  };

  const clearAllFilters = () => {
    setDepartmentKeyword("");
    setCategoryKeyword("");
    setSchoolKeyword("");

    setSelectedDepartments([]);
    setSelectedCategories([]);
    setSelectedSchools([]);

    setSelectedSchool("");
    setSelectedDepartmentCard("");
    setSelectedCategory("");

    setShowDepartmentDropdown(false);
    setShowCategoryDropdown(false);
    setShowSchoolDropdown(false);
  };

  return (
    <main style={pageStyle}>
      <div style={appShellStyle}>
        <header style={topHeaderStyle}>
          <div style={headerInnerStyle}>
            <div style={brandWrapStyle}>
              <div style={brandIconStyle}>📊</div>
              <div>
                <h1 style={titleStyle}>同系科跨校招生倍率</h1>
              </div>
            </div>

            <Link href="/" style={navButtonStyle}>
              ← 返回篩選系統
            </Link>
          </div>
        </header>

        <div style={layoutStyle}>
          <aside style={sidebarStyle}>
            <Panel title="資料上傳">
              <UploadCard
                title="倍率資料"
                buttonLabel="選擇檔案"
                onClick={() => fileInputRef.current?.click()}
                isReady={!!fileName}
                accent="#2563eb"
              />
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFile}
                style={{ display: "none" }}
              />
              {error ? <div style={errorStyle}>{error}</div> : null}
            </Panel>

            <Panel
              title={
                <div style={filterPanelHeaderRowStyle}>
                  <span>條件搜尋</span>
                  <button
                    type="button"
                    onClick={clearAllFilters}
                    style={clearFilterButtonStyle}
                    disabled={!hasActiveFilters}
                  >
                    清除全部
                  </button>
                </div>
              }
            >
              <div style={fieldBlockStyle}>
                <label style={fieldLabelStyle}>搜尋招生系科</label>
                <div style={searchWrapStyle} ref={departmentSearchRef}>
                  <input
                    type="text"
                    value={departmentKeyword}
                    placeholder="例如：護理、資訊、電子工程"
                    onChange={(e) => {
                      setDepartmentKeyword(e.target.value);
                      setShowDepartmentDropdown(true);
                      setShowCategoryDropdown(false);
                      setShowSchoolDropdown(false);
                    }}
                    onFocus={() => {
                      setShowDepartmentDropdown(true);
                      setShowCategoryDropdown(false);
                      setShowSchoolDropdown(false);
                    }}
                    style={searchInputStyle}
                  />

                  {showDepartmentDropdown && (
                    <div style={searchDropdownStyle}>
                      {filteredDepartmentOptions.length > 0 ? (
                        filteredDepartmentOptions.map((item) => {
                          const isSelected = selectedDepartments.includes(item);

                          return (
                            <button
                              key={item}
                              type="button"
                              style={{
                                ...searchOptionStyle,
                                background: isSelected ? "#eff6ff" : "#ffffff",
                                color: "#0f172a",
                              }}
                              onPointerDown={(e) => e.preventDefault()}
                              onClick={() => toggleDepartment(item)}
                            >
                              <span
                                style={{
                                  ...checkboxStyle,
                                  background: isSelected ? "#2563eb" : "#ffffff",
                                  borderColor: isSelected ? "#2563eb" : "#cbd5e1",
                                  color: isSelected ? "#ffffff" : "transparent",
                                }}
                              >
                                ✓
                              </span>
                              <span>{item}</span>
                            </button>
                          );
                        })
                      ) : (
                        <div style={dropdownEmptyStyle}>查無可選系科</div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {selectedDepartments.length > 0 ? (
                <div style={selectedChipWrapStyle}>
                  {selectedDepartments.map((item) => (
                    <div key={item} style={selectedChipStyle}>
                      <span>{item}</span>
                      <button
                        type="button"
                        style={selectedChipRemoveStyle}
                        onClick={() => removeDepartment(item)}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}

              <div style={optionHintStyle}>
              </div>

              <div style={dividerStyle} />

              <div style={fieldBlockStyle}>
                <label style={fieldLabelStyle}>搜尋群類別</label>
                <div style={searchWrapStyle} ref={categorySearchRef}>
                  <input
                    type="text"
                    value={categoryKeyword}
                    placeholder="例如：衛生與護理類、家政群幼保類"
                    onChange={(e) => {
                      setCategoryKeyword(e.target.value);
                      setShowCategoryDropdown(true);
                      setShowDepartmentDropdown(false);
                      setShowSchoolDropdown(false);
                    }}
                    onFocus={() => {
                      setShowCategoryDropdown(true);
                      setShowDepartmentDropdown(false);
                      setShowSchoolDropdown(false);
                    }}
                    style={searchInputStyle}
                  />

                  {showCategoryDropdown && (
                    <div style={searchDropdownStyle}>
                      {filteredCategoryOptions.length > 0 ? (
                        filteredCategoryOptions.map((item) => {
                          const isSelected = selectedCategories.includes(item);

                          return (
                            <button
                              key={item}
                              type="button"
                              style={{
                                ...searchOptionStyle,
                                background: isSelected ? "#eff6ff" : "#ffffff",
                                color: "#0f172a",
                              }}
                              onPointerDown={(e) => e.preventDefault()}
                              onClick={() => toggleCategoryFilter(item)}
                            >
                              <span
                                style={{
                                  ...checkboxStyle,
                                  background: isSelected ? "#2563eb" : "#ffffff",
                                  borderColor: isSelected ? "#2563eb" : "#cbd5e1",
                                  color: isSelected ? "#ffffff" : "transparent",
                                }}
                              >
                                ✓
                              </span>
                              <span>{item}</span>
                            </button>
                          );
                        })
                      ) : (
                        <div style={dropdownEmptyStyle}>查無可選群類</div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {selectedCategories.length > 0 ? (
                <div style={selectedChipWrapStyle}>
                  {selectedCategories.map((item) => (
                    <div key={item} style={selectedChipStyle}>
                      <span>{item}</span>
                      <button
                        type="button"
                        style={selectedChipRemoveStyle}
                        onClick={() => removeCategoryFilter(item)}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}

              <div style={optionHintStyle}>
              </div>

              <div style={dividerStyle} />

              <div style={fieldBlockStyle}>
                <label style={fieldLabelStyle}>搜尋學校</label>
                <div style={searchWrapStyle} ref={schoolSearchRef}>
                  <input
                    type="text"
                    value={schoolKeyword}
                    placeholder="例如：長庚、國立、科技大學"
                    onChange={(e) => {
                      setSchoolKeyword(e.target.value);
                      setShowSchoolDropdown(true);
                      setShowDepartmentDropdown(false);
                      setShowCategoryDropdown(false);
                    }}
                    onFocus={() => {
                      setShowSchoolDropdown(true);
                      setShowDepartmentDropdown(false);
                      setShowCategoryDropdown(false);
                    }}
                    style={searchInputStyle}
                  />

                  {showSchoolDropdown && (
                    <div style={searchDropdownStyle}>
                      {filteredSchoolOptions.length > 0 ? (
                        filteredSchoolOptions.map((item) => {
                          const isSelected = selectedSchools.includes(item);

                          return (
                            <button
                              key={item}
                              type="button"
                              style={{
                                ...searchOptionStyle,
                                background: isSelected ? "#eff6ff" : "#ffffff",
                                color: "#0f172a",
                              }}
                              onPointerDown={(e) => e.preventDefault()}
                              onClick={() => toggleSchool(item)}
                            >
                              <span
                                style={{
                                  ...checkboxStyle,
                                  background: isSelected ? "#2563eb" : "#ffffff",
                                  borderColor: isSelected ? "#2563eb" : "#cbd5e1",
                                  color: isSelected ? "#ffffff" : "transparent",
                                }}
                              >
                                ✓
                              </span>
                              <span>{item}</span>
                            </button>
                          );
                        })
                      ) : (
                        <div style={dropdownEmptyStyle}>查無可選學校</div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {selectedSchools.length > 0 ? (
                <div style={selectedChipWrapStyle}>
                  {selectedSchools.map((item) => (
                    <div key={item} style={selectedChipStyle}>
                      <span>{item}</span>
                      <button
                        type="button"
                        style={selectedChipRemoveStyle}
                        onClick={() => removeSchool(item)}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}

              <div style={optionHintStyle}>
              </div>
            </Panel>
          </aside>

          <section style={contentStyle}>
            <Card
              title={
                <div style={cardTitleRowStyle}>
                  <span>學校總覽</span>
                  <div style={overviewMetricCardWrapStyle}>
                    <div
                      style={{
                        ...overviewMetricCardStyle,
                        borderColor: "#bfdbfe",
                        background: "#eff6ff",
                      }}
                    >
                      <div style={overviewMetricLabelStyle}>招收學校數</div>
                      <div style={{ ...overviewMetricValueStyle, color: "#2563eb" }}>
                        {totalSchools.toLocaleString()}
                      </div>
                    </div>

                    <div
                      style={{
                        ...overviewMetricCardStyle,
                        borderColor: "#a7f3d0",
                        background: "#ecfdf5",
                      }}
                    >
                      <div style={overviewMetricLabelStyle}>總招生名額</div>
                      <div style={{ ...overviewMetricValueStyle, color: "#059669" }}>
                        {totalQuota.toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>
              }
            >
              {!hasActiveFilters ? (
                <div style={emptyStateStyle}>請先在左側選擇任一條件。</div>
              ) : groupedCards.length === 0 ? (
                <div style={emptyStateStyle}>查無符合資料。</div>
              ) : (
                <div style={schoolGridStyle}>
                  {groupedCards.map((item) => {
                    const isActive =
                      selectedSchool === item.school &&
                      selectedDepartmentCard === item.department;

                    return (
                      <div
                        key={`${item.school}__${item.department}`}
                        role="button"
                        tabIndex={0}
                        onClick={() => {
                          setSelectedSchool(item.school);
                          setSelectedDepartmentCard(item.department);
                          setSelectedCategory(item.categories[0] || "");
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            setSelectedSchool(item.school);
                            setSelectedDepartmentCard(item.department);
                            setSelectedCategory(item.categories[0] || "");
                          }
                        }}
                        style={{
                          ...schoolCardStyle,
                          borderColor: isActive ? "#93c5fd" : "#e2e8f0",
                          background: isActive ? "#f8fbff" : "#ffffff",
                          boxShadow: isActive
                            ? "0 12px 24px rgba(37,99,235,0.10)"
                            : "0 8px 18px rgba(15,23,42,0.04)",
                        }}
                      >
                        <div style={schoolCardHeaderStyle}>
                          <div style={schoolTextBlockStyle}>
                            <div style={schoolNameStyle}>{item.school}</div>
                            <div style={schoolDepartmentStyle}>{item.department}</div>
                          </div>

                          <div style={schoolRightMetaStyle}>
                            <div
                              style={{
                                ...schoolBadgeStyle,
                                background: isActive ? "#dbeafe" : "#f1f5f9",
                                color: isActive ? "#1d4ed8" : "#475569",
                              }}
                            >
                              {item.categories.length} 群類
                            </div>
                            <div style={schoolQuotaBadgeStyle}>
                              招生名額 {item.totalQuota.toLocaleString()}
                            </div>
                          </div>
                        </div>

                        <div style={categoryChipWrapStyle}>
                          {item.categories.map((cat) => {
                            const chipActive =
                              selectedSchool === item.school &&
                              selectedDepartmentCard === item.department &&
                              selectedCategory === cat;

                            return (
                              <button
                                key={cat}
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedSchool(item.school);
                                  setSelectedDepartmentCard(item.department);
                                  setSelectedCategory(cat);
                                }}
                                style={{
                                  ...categoryChipButtonStyle,
                                  background: chipActive ? "#dbeafe" : "#f8fafc",
                                  color: chipActive ? "#1d4ed8" : "#475569",
                                  borderColor: chipActive ? "#93c5fd" : "#e2e8f0",
                                }}
                              >
                                {cat}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>

            <div style={detailGridStyle}>
              <Card title="群類選擇">
                {!hasActiveFilters ? (
                  <div style={emptyStateStyle}>請先選擇任一條件。</div>
                ) : !selectedSchool ? (
                  <div style={emptyStateStyle}>請先選擇學校與系科。</div>
                ) : (
                  <>
                    <div style={detailTitleBarStyle}>
                      <div style={detailTitleMainStyle}>{selectedSchool}</div>
                      <div style={detailDepartmentStyle}>{selectedDepartmentCard}</div>
                      <div style={detailSubTitleStyle}>
                        共 {selectedSchoolCategories.length} 個招生群類
                      </div>
                    </div>

                    <div style={categorySelectGridStyle}>
                      {selectedSchoolCategories.map((cat) => {
                        const active = selectedCategory === cat;
                        return (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => setSelectedCategory(cat)}
                            style={{
                              ...categorySelectCardStyle,
                              borderColor: active ? "#93c5fd" : "#e2e8f0",
                              background: active ? "#eff6ff" : "#ffffff",
                              color: active ? "#1d4ed8" : "#0f172a",
                            }}
                          >
                            {cat}
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}
              </Card>

              <Card title="群類倍率明細">
                {!hasActiveFilters ? (
                  <div style={emptyStateStyle}>請先選擇任一條件。</div>
                ) : !selectedDetail ? (
                  <div style={emptyStateStyle}>請先選擇群類別。</div>
                ) : (
                  <>
                    <div style={detailHeaderPanelStyle}>
                      <div>
                        <div style={detailSchoolStyle}>{selectedSchool}</div>
                        <div style={detailDepartmentInlineStyle}>{selectedDepartmentCard}</div>
                        <div style={detailCategoryStyle}>{selectedCategory}</div>
                      </div>
                      <div style={quotaBadgeStyle}>
                        招生名額 {toNumber(selectedDetail.一般考生招生名額).toLocaleString()}
                      </div>
                    </div>

                    <div style={scoreCardGridStyle}>
                      {scoreFields.map((field) => {
                        const n = toNumber(selectedDetail[field]);
                        const tone = getHeatTone(n);

                        return (
                          <div
                            key={field}
                            style={{
                              ...scoreCardStyle,
                              background: tone.bg,
                              borderColor: tone.border,
                            }}
                          >
                            <div style={scoreCardLabelStyle}>{field}</div>
                            <div style={{ ...scoreCardValueStyle, color: tone.color }}>
                              {displayValue(selectedDetail[field])}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </Card>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

function Panel({
  title,
  children,
}: {
  title: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section style={panelStyle}>
      <div style={panelHeaderStyle}>{title}</div>
      {children}
    </section>
  );
}

function Card({
  title,
  children,
}: {
  title: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section style={cardStyle}>
      <div style={cardHeaderStyle}>{title}</div>
      {children}
    </section>
  );
}
function isSameStringArray(a: string[], b: string[]) {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

function UploadCard({
  title,
  buttonLabel,
  onClick,
  isReady,
  accent,
}: {
  title: string;
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

function normalizeRows(data: OverviewRow[]): OverviewRow[] {
  return (data || [])
    .filter((row) => Object.values(row).some((v) => String(v ?? "").trim() !== ""))
    .map((row) => ({
      學校: String(row.學校 ?? "").trim(),
      招生系科: String(row.招生系科 ?? "").trim(),
      招生群類別: String(row.招生群類別 ?? "").trim(),
      一般考生招生名額: row.一般考生招生名額 ?? "",
      國文: row.國文 ?? "",
      英文: row.英文 ?? "",
      數學: row.數學 ?? "",
      專業一: row.專業一 ?? "",
      專業二: row.專業二 ?? "",
    }));
}

function uniqueSorted(list: string[]) {
  return [...new Set(list)].sort((a, b) => a.localeCompare(b, "zh-Hant"));
}

function sortOptionsWithSelectedFirst(options: string[], selected: string[]) {
  const selectedSet = new Set(selected);

  return [...options].sort((a, b) => {
    const aSelected = selectedSet.has(a);
    const bSelected = selectedSet.has(b);

    if (aSelected && !bSelected) return -1;
    if (!aSelected && bSelected) return 1;

    return a.localeCompare(b, "zh-Hant");
  });
}

function toNumber(value: unknown): number {
  const text = String(value ?? "").trim();
  if (!text || text === "--") return 0;
  const n = Number(text);
  return Number.isFinite(n) ? n : 0;
}

function displayValue(value: unknown): string {
  const text = String(value ?? "").trim();
  return text || "--";
}

function getHeatTone(value: number) {
  if (value >= 5) {
    return {
      bg: "#dbeafe",
      color: "#1d4ed8",
      border: "#93c5fd",
    };
  }
  if (value >= 4) {
    return {
      bg: "#eef2ff",
      color: "#4338ca",
      border: "#c7d2fe",
    };
  }
  if (value >= 3) {
    return {
      bg: "#fff7ed",
      color: "#ea580c",
      border: "#fdba74",
    };
  }
  if (value > 0) {
    return {
      bg: "#f8fafc",
      color: "#475569",
      border: "#e2e8f0",
    };
  }
  return {
    bg: "#f8fafc",
    color: "#94a3b8",
    border: "#e2e8f0",
  };
}

const pageStyle: React.CSSProperties = {
  minHeight: "100vh",
  background: "linear-gradient(180deg, #eef3f9 0%, #f6f8fb 38%, #f3f6fa 100%)",
  padding: "8px 24px 24px",
  fontFamily: '"Inter", "Noto Sans TC", "PingFang TC", "Microsoft JhengHei", sans-serif',
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
  marginBottom: "14px",
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
  fontSize: "30px",
  lineHeight: 1.1,
  fontWeight: 800,
  letterSpacing: "-0.03em",
  color: "#0f172a",
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
  fontSize: "20px",
  fontWeight: 800,
  color: "#0f172a",
  marginBottom: "12px",
};

const filterPanelHeaderRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "12px",
};

const clearFilterButtonStyle: React.CSSProperties = {
  border: "1px solid #dbeafe",
  background: "#eff6ff",
  color: "#2563eb",
  borderRadius: "10px",
  padding: "8px 12px",
  fontSize: "13px",
  fontWeight: 800,
  cursor: "pointer",
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

const cardTitleRowStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "12px",
  flexWrap: "wrap",
  width: "100%",
};

const overviewMetricCardWrapStyle: React.CSSProperties = {
  display: "flex",
  gap: "12px",
  flexWrap: "wrap",
  alignItems: "stretch",
  justifyContent: "flex-start",
};

const overviewMetricCardStyle: React.CSSProperties = {
  minWidth: "144px",
  borderRadius: "16px",
  border: "1px solid",
  padding: "12px 16px",
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
};

const overviewMetricLabelStyle: React.CSSProperties = {
  fontSize: "12px",
  color: "#64748b",
  fontWeight: 700,
  marginBottom: "6px",
  lineHeight: 1.2,
};

const overviewMetricValueStyle: React.CSSProperties = {
  fontSize: "28px",
  fontWeight: 800,
  lineHeight: 1.1,
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
  fontSize: "14px",
  fontWeight: 800,
  flexShrink: 0,
};

const uploadButtonStyle: React.CSSProperties = {
  width: "100%",
  border: "none",
  borderRadius: "10px",
  background: "#eef4ff",
  color: "#2563eb",
  fontWeight: 800,
  fontSize: "14px",
  padding: "8px 10px",
  cursor: "pointer",
  lineHeight: 1.2,
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

const fieldBlockStyle: React.CSSProperties = {
  marginBottom: "4px",
};

const fieldLabelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "13px",
  fontWeight: 700,
  color: "#334155",
  marginBottom: "8px",
};

const searchWrapStyle: React.CSSProperties = {
  position: "relative",
};

const searchInputStyle: React.CSSProperties = {
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

const searchDropdownStyle: React.CSSProperties = {
  position: "absolute",
  top: "calc(100% + 8px)",
  left: 0,
  right: 0,
  maxHeight: "320px",
  overflowY: "auto",
  border: "1px solid #e2e8f0",
  borderRadius: "14px",
  background: "#ffffff",
  boxShadow: "0 16px 32px rgba(15,23,42,0.10)",
  zIndex: 20,
  padding: "8px",
};

const dropdownEmptyStyle: React.CSSProperties = {
  padding: "10px 12px",
  fontSize: "14px",
  color: "#64748b",
};

const headerInnerStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  width: "100%",
};

const navButtonStyle: React.CSSProperties = {
  textDecoration: "none",
  borderRadius: "12px",
  padding: "10px 16px",
  fontSize: "16px",
  fontWeight: 800,
  color: "#2563eb",
  background: "#eef4ff",
  border: "1px solid #dbeafe",
  cursor: "pointer",
};

const selectedChipWrapStyle: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: "8px",
  marginTop: "10px",
};

const selectedChipStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "8px",
  background: "#eff6ff",
  border: "1px solid #bfdbfe",
  color: "#1d4ed8",
  borderRadius: "999px",
  padding: "8px 12px",
  fontSize: "13px",
  fontWeight: 700,
};

const selectedChipRemoveStyle: React.CSSProperties = {
  border: "none",
  background: "transparent",
  color: "#1d4ed8",
  fontSize: "16px",
  cursor: "pointer",
  lineHeight: 1,
  padding: 0,
};

const optionHintStyle: React.CSSProperties = {
  marginTop: "10px",
  fontSize: "12px",
  color: "#64748b",
  fontWeight: 700,
};

const emptyStateStyle: React.CSSProperties = {
  fontSize: "14px",
  lineHeight: 1.8,
  color: "#64748b",
  padding: "8px 0 2px",
};

const dividerStyle: React.CSSProperties = {
  height: "1px",
  background: "#e2e8f0",
  margin: "14px 0",
};

const schoolGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
  gap: "14px",
};

const schoolCardStyle: React.CSSProperties = {
  border: "1px solid #e2e8f0",
  borderRadius: "18px",
  background: "#ffffff",
  padding: "16px",
  textAlign: "left",
  cursor: "pointer",
};

const schoolCardHeaderStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: "12px",
  alignItems: "flex-start",
  marginBottom: "12px",
};

const schoolTextBlockStyle: React.CSSProperties = {
  minWidth: 0,
  flex: 1,
};

const schoolNameStyle: React.CSSProperties = {
  fontSize: "17px",
  fontWeight: 800,
  color: "#0f172a",
  lineHeight: 1.4,
};

const schoolDepartmentStyle: React.CSSProperties = {
  marginTop: "6px",
  fontSize: "14px",
  color: "#475569",
  fontWeight: 700,
  lineHeight: 1.5,
};

const schoolRightMetaStyle: React.CSSProperties = {
  display: "flex",
  gap: "8px",
  flexWrap: "wrap",
  justifyContent: "flex-end",
  flexShrink: 0,
};

const schoolBadgeStyle: React.CSSProperties = {
  borderRadius: "999px",
  padding: "8px 12px",
  fontSize: "14px",
  fontWeight: 800,
  flexShrink: 0,
};

const schoolQuotaBadgeStyle: React.CSSProperties = {
  borderRadius: "999px",
  padding: "8px 12px",
  fontSize: "14px",
  fontWeight: 800,
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
  color: "#475569",
  flexShrink: 0,
};

const categoryChipWrapStyle: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: "8px",
};

const categoryChipButtonStyle: React.CSSProperties = {
  borderRadius: "999px",
  padding: "8px 12px",
  fontSize: "14px",
  fontWeight: 700,
  border: "1px solid #e2e8f0",
  background: "#f8fafc",
  cursor: "pointer",
};

const detailGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "360px minmax(0, 1fr)",
  gap: "16px",
  alignItems: "start",
};

const detailTitleBarStyle: React.CSSProperties = {
  marginBottom: "12px",
};

const detailTitleMainStyle: React.CSSProperties = {
  fontSize: "18px",
  fontWeight: 800,
  color: "#0f172a",
};

const detailDepartmentStyle: React.CSSProperties = {
  marginTop: "4px",
  fontSize: "14px",
  color: "#475569",
  fontWeight: 700,
  lineHeight: 1.5,
};

const detailSubTitleStyle: React.CSSProperties = {
  marginTop: "6px",
  fontSize: "13px",
  color: "#64748b",
};

const categorySelectGridStyle: React.CSSProperties = {
  display: "grid",
  gap: "10px",
};

const categorySelectCardStyle: React.CSSProperties = {
  border: "1px solid #e2e8f0",
  borderRadius: "14px",
  padding: "12px 14px",
  textAlign: "left",
  fontSize: "14px",
  fontWeight: 700,
  cursor: "pointer",
};

const detailHeaderPanelStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "12px",
  marginBottom: "16px",
  padding: "14px",
  borderRadius: "16px",
  background: "#f8fbff",
  border: "1px solid #dbeafe",
};

const detailSchoolStyle: React.CSSProperties = {
  fontSize: "16px",
  fontWeight: 800,
  color: "#0f172a",
};

const detailDepartmentInlineStyle: React.CSSProperties = {
  marginTop: "4px",
  fontSize: "14px",
  color: "#475569",
  fontWeight: 700,
};

const detailCategoryStyle: React.CSSProperties = {
  marginTop: "4px",
  fontSize: "14px",
  color: "#2563eb",
  fontWeight: 700,
};

const quotaBadgeStyle: React.CSSProperties = {
  borderRadius: "999px",
  padding: "8px 12px",
  background: "#dbeafe",
  color: "#1d4ed8",
  fontWeight: 800,
  fontSize: "13px",
  flexShrink: 0,
};

const scoreCardGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
  gap: "12px",
  marginBottom: "18px",
};

const scoreCardStyle: React.CSSProperties = {
  border: "1px solid",
  borderRadius: "16px",
  padding: "14px",
  minHeight: "96px",
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
};

const checkboxStyle: React.CSSProperties = {
  width: "18px",
  height: "18px",
  borderRadius: "4px",
  border: "2px solid #cbd5e1",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "12px",
  fontWeight: 800,
  flexShrink: 0,
  transition: "all 0.15s ease",
};

const searchOptionStyle: React.CSSProperties = {
  width: "100%",
  textAlign: "left",
  border: "none",
  borderRadius: "10px",
  padding: "10px 12px",
  fontSize: "14px",
  cursor: "pointer",
  background: "#ffffff",
  display: "flex",
  alignItems: "center",
  gap: "10px",
  transition: "background 0.15s",
};

const scoreCardLabelStyle: React.CSSProperties = {
  fontSize: "12px",
  color: "#64748b",
  marginBottom: "6px",
  fontWeight: 700,
};

const scoreCardValueStyle: React.CSSProperties = {
  fontSize: "24px",
  fontWeight: 800,
};