import React, { useState, useEffect, useRef } from "react";
import {
  Sparkles,
  FileText,
  Upload,
  Trash2,
  Check,
  Copy,
  Download,
  AlertCircle,
  FileCheck2,
  Clock,
  History,
  ChevronDown,
  ChevronUp,
  Search,
  CheckCircle2,
  FileImage,
  FileSpreadsheet,
  Plus,
  Minus,
  Moon,
  Sun,
  X,
  PlusCircle,
  CheckCircle,
  Info,
  ExternalLink,
  ShieldAlert,
  Sliders,
  BookmarkCheck,
  RefreshCw,
  FolderSync
} from "lucide-react";
import { GeneratedSuite, TestCase, Attachment } from "./types";
import {
  exportToMarkdown,
  exportToCSV,
  exportToJSON,
  exportToHTML,
  downloadFile,
  copyToClipboard
} from "./utils";
import { MarkdownView } from "./components/MarkdownView";

export default function App() {
  // Theme state: "light" | "dark" with persistent local storage
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    try {
      const stored = localStorage.getItem("tsg_theme_style_v1");
      if (stored === "light" || stored === "dark") return stored;
    } catch {
      // safe guard
    }
    return "dark"; // Default to dark for a high-end visual glow design
  });

  // Main modular requirement inputs
  const [userStory, setUserStory] = useState<string>("");
  const [acceptanceCriteria, setAcceptanceCriteria] = useState<string>("");
  const [requirementSpec, setRequirementSpec] = useState<string>("");
  const [customSpecs, setCustomSpecs] = useState<string>("");

  // Attachment upload states
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Active result & storage states
  const [activeSuite, setActiveSuite] = useState<GeneratedSuite | null>(null);
  const [suiteHistory, setSuiteHistory] = useState<GeneratedSuite[]>([]);
  const [searchHistoryTerm, setSearchHistoryTerm] = useState<string>("");

  // Modal / form states for adding a custom manual test case
  const [showAddManualModal, setShowAddManualModal] = useState<boolean>(false);
  const [manualId, setManualId] = useState<string>("");
  const [manualName, setManualName] = useState<string>("");
  const [manualScenario, setManualScenario] = useState<string>("Happy Path");
  const [manualObjective, setManualObjective] = useState<string>("");
  const [manualStepsText, setManualStepsText] = useState<string>("");
  const [manualExpected, setManualExpected] = useState<string>("");

  // Loading, success & error states
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingStep, setLoadingStep] = useState<string>("Analyzing criteria...");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copySuccessId, setCopySuccessId] = useState<string | null>(null);

  // Accordion collapsed states for individual test cases
  const [expandedCaseIds, setExpandedCaseIds] = useState<Record<string, boolean>>({});

  // Filters within the rendering active suite
  const [testCaseSearch, setTestCaseSearch] = useState<string>("");
  const [scenarioFilter, setScenarioFilter] = useState<string>("All");

  // Sync dark theme class on document level first thing
  useEffect(() => {
    try {
      localStorage.setItem("tsg_theme_style_v1", theme);
    } catch (e) {
      console.error(e);
    }
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [theme]);

  // Load history on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem("glass_suite_history_v2");
      if (stored) {
        const parsed = JSON.parse(stored) as GeneratedSuite[];
        setSuiteHistory(parsed);
        if (parsed.length > 0) {
          const first = parsed[0];
          setActiveSuite(first);
          
          // Populate fields
          setUserStory(first.userStory || first.description || "");
          setAcceptanceCriteria(first.acceptanceCriteria || "");
          setRequirementSpec(first.requirementSpec || "");
          setCustomSpecs(first.customSpecs || "");
        }
      } else {
        // Look for older history format if present, otherwise default demo
        const oldStored = localStorage.getItem("glass_suite_history_v1");
        if (oldStored) {
          const parsed = JSON.parse(oldStored) as GeneratedSuite[];
          setSuiteHistory(parsed);
          if (parsed.length > 0) {
            setActiveSuite(parsed[0]);
          }
        } else {
          loadDemoRequirements();
        }
      }
    } catch (e) {
      console.error("Local storage lookup failure:", e);
    }
  }, []);

  // Save history helper
  const saveHistory = (updated: GeneratedSuite[]) => {
    setSuiteHistory(updated);
    try {
      localStorage.setItem("glass_suite_history_v2", JSON.stringify(updated));
    } catch (e) {
      console.error("Failed to commit history logs:", e);
    }
  };

  // Drag & drop file processing + JSON restore capabilities
  const processUploadedFiles = (files: File[]) => {
    files.forEach((file) => {
      // 1. Check if the file is a backup JSON of Test Suite
      if (file.name.endsWith(".json") || file.type === "application/json") {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const rawText = e.target?.result as string;
            const parsed = JSON.parse(rawText);
            
            // Check signature of our test suite
            if (parsed && typeof parsed.testObjective === "string" && Array.isArray(parsed.testCases)) {
              const importedSuite: GeneratedSuite = {
                id: parsed.id || "suite_imported_" + Date.now(),
                timestamp: parsed.timestamp || new Date().toLocaleString(),
                description: parsed.description || parsed.userStory || "Imported File Suite",
                userStory: parsed.userStory || "",
                acceptanceCriteria: parsed.acceptanceCriteria || "",
                requirementSpec: parsed.requirementSpec || "",
                customSpecs: parsed.customSpecs || "",
                testObjective: parsed.testObjective,
                testCases: parsed.testCases,
                attachments: parsed.attachments || []
              };

              const nextSuiteList = [importedSuite, ...suiteHistory.filter((s) => s.id !== importedSuite.id).slice(0, 49)];
              saveHistory(nextSuiteList);
              setActiveSuite(importedSuite);

              // Initialize inputs to match imported metadata
              setUserStory(importedSuite.userStory || "");
              setAcceptanceCriteria(importedSuite.acceptanceCriteria || "");
              setRequirementSpec(importedSuite.requirementSpec || "");
              setCustomSpecs(importedSuite.customSpecs || "");

              // Open accordions
              const expanded: Record<string, boolean> = {};
              importedSuite.testCases.forEach((tc) => {
                expanded[tc.id] = true;
              });
              setExpandedCaseIds(expanded);
              
              // Clear inputs attachments
              setAttachments([]);
              return;
            }
          } catch (err) {
            alert("This json file does not match a valid TestSuiteGen specification JSON format.");
          }
        };
        reader.readAsText(file);
        return;
      }

      // 2. Fallback: Add as a supportive text/spec attachment
      if (file.size > 8 * 1024 * 1024) {
        alert(`File ${file.name} exceeds standard bounds limits. Max is 8MB.`);
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          const rawResult = e.target.result as string;
          const base64Parts = rawResult.split(",");
          const base64Data = base64Parts[1] || "";

          const newAttachment: Attachment = {
            name: file.name,
            mimeType: file.type || "application/octet-stream",
            base64: base64Data,
            size: file.size
          };

          setAttachments((prev) => {
            if (prev.some((a) => a.name === file.name && a.size === file.size)) {
              return prev;
            }
            return [...prev, newAttachment];
          });
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      processUploadedFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processUploadedFiles(Array.from(e.target.files));
      e.target.value = "";
    }
  };

  const removeAttachment = (indexToRemove: number) => {
    setAttachments((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  // Request trigger for generation pipeline
  const handleGenerateCases = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    const fieldsEmpty = 
      !userStory.trim() && 
      !acceptanceCriteria.trim() && 
      !requirementSpec.trim() && 
      !customSpecs.trim();

    if (fieldsEmpty) {
      setErrorMsg("Please complete at least one specification field or import a json backup to run the generator.");
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setLoadingStep("Reading specification fields...");

    // Smooth AI log timeline
    const stages = [
      { delay: 600, step: "Reading specification fields..." },
      { delay: 1500, step: "Calling Gemini 3.5 Flash SDET model..." },
      { delay: 3000, step: "Drafting overall Test Objective strategy..." },
      { delay: 4200, step: "Extracting verification scenarios..." }
    ];

    stages.forEach((s) => {
      setTimeout(() => {
        setLoadingStep((curr) => {
          if (curr.includes("completed") || curr.includes("Failed")) return curr;
          return s.step;
        });
      }, s.delay);
    });

    try {
      const response = await fetch("/api/generate-tests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userStory,
          acceptanceCriteria,
          requirementSpec,
          customSpecs,
          attachments: attachments.map((att) => ({
            name: att.name,
            mimeType: att.mimeType,
            base64: att.base64
          }))
        })
      });

      if (!response.ok) {
        let errBody;
        try {
          errBody = await response.json();
        } catch {
          // ignore
        }
        throw new Error(errBody?.error || `Gemini API pipeline failed. Status: ${response.status}`);
      }

      const generatedData = await response.json();

      const newSuite: GeneratedSuite = {
        id: "suite_" + Date.now(),
        timestamp: new Date().toLocaleString(),
        description: userStory.trim().slice(0, 60) || requirementSpec.trim().slice(0, 60) || "Merged Specification",
        userStory: userStory,
        acceptanceCriteria: acceptanceCriteria,
        requirementSpec: requirementSpec,
        customSpecs: customSpecs,
        testObjective: generatedData.testObjective || "Test and verify system objective specifications.",
        testCases: generatedData.testCases || [],
        attachments: attachments.map((att) => ({ name: att.name, size: att.size }))
      };

      // Set expanded view for all generated cases to ensure readability
      const expanded: Record<string, boolean> = {};
      newSuite.testCases.forEach((tc) => {
        expanded[tc.id] = true;
      });
      setExpandedCaseIds(expanded);

      const nextRuns = [newSuite, ...suiteHistory.slice(0, 49)];
      saveHistory(nextRuns);
      setActiveSuite(newSuite);
      setLoadingStep("Successfully completed!");
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "An exception occurred during Gemini execution. Please check your network.");
    } finally {
      setLoading(false);
    }
  };

  // Add custom manual test case dynamically
  const triggerOpenManualModal = () => {
    if (!activeSuite) return;
    const count = activeSuite.testCases.length;
    // Calculate next incremental ID
    let maxNum = count;
    activeSuite.testCases.forEach((tc) => {
      const numMatch = tc.id.match(/\d+/);
      if (numMatch) {
         const val = parseInt(numMatch[0], 10);
         if (!isNaN(val) && val > maxNum) maxNum = val;
      }
    });

    const nextIdNum = maxNum + 1;
    const nextId = "TC-" + String(nextIdNum).padStart(3, "0");

    setManualId(nextId);
    setManualName("");
    setManualScenario("Happy Path");
    setManualObjective("");
    setManualStepsText("1. Navigate to target URL\n2. Perform standard action sequences\n3. Verify operational values match expectations");
    setManualExpected("Verification matches specified acceptance outcome perfectly.");
    setShowAddManualModal(true);
  };

  const handleAddManualCase = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSuite) return;
    if (!manualId.trim() || !manualName.trim()) {
      alert("Case ID and Case Name are required.");
      return;
    }

    const stepsArray = manualStepsText
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .map((line) => line.replace(/^\d+\.\s*/, "")); // strip leading numbers

    const newCase: TestCase = {
      id: manualId.trim(),
      name: manualName.trim(),
      scenarioType: manualScenario,
      testObjective: manualObjective.trim() || "Validate customer requirements logic manually",
      testSteps: stepsArray.length > 0 ? stepsArray : ["Initiate interface workflow"],
      expectedOutput: manualExpected.trim() || "Outcome verified with zero exceptions."
    };

    const updatedCases = [...activeSuite.testCases, newCase];
    const updatedSuite = { ...activeSuite, testCases: updatedCases };

    const updatedHistory = suiteHistory.map((s) => (s.id === activeSuite.id ? updatedSuite : s));
    saveHistory(updatedHistory);
    setActiveSuite(updatedSuite);

    // Default expanded
    setExpandedCaseIds((prev) => ({ ...prev, [newCase.id]: true }));
    setShowAddManualModal(false);
  };

  // Clear inputs helper
  const clearAllInputs = () => {
    setUserStory("");
    setAcceptanceCriteria("");
    setRequirementSpec("");
    setCustomSpecs("");
    setAttachments([]);
    setActiveSuite(null);
  };

  // Navigates back to home state
  const handleLogoClick = () => {
    setActiveSuite(null);
    setUserStory("");
    setAcceptanceCriteria("");
    setRequirementSpec("");
    setCustomSpecs("");
    setAttachments([]);
  };

  // Copy helper
  const handleCopyText = async (id: string, text: string) => {
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopySuccessId(id);
      setTimeout(() => setCopySuccessId(null), 2000);
    }
  };

  const handleCopyAllAsMarkdown = () => {
    if (!activeSuite) return;
    const block = exportToMarkdown(activeSuite);
    handleCopyText("all-md", block);
  };

  const handleDownloadMarkdown = () => {
    if (!activeSuite) return;
    const text = exportToMarkdown(activeSuite);
    downloadFile(`TestSuiteGen_Spec_${activeSuite.id}.md`, text, "text/markdown;charset=utf-8");
  };

  const handleDownloadCSV = () => {
    if (!activeSuite) return;
    const body = exportToCSV(activeSuite);
    downloadFile(`TestSuiteGen_ImportSheet_${activeSuite.id}.csv`, body, "text/csv;charset=utf-8");
  };

  const handleDownloadJSON = () => {
    if (!activeSuite) return;
    const body = exportToJSON(activeSuite);
    downloadFile(`TestSuiteGen_SourceData_${activeSuite.id}.json`, body, "application/json;charset=utf-8");
  };

  const handleDownloadPDF = () => {
    if (!activeSuite) return;
    const html = exportToHTML(activeSuite);
    
    // 1. Instantly trigger safe download of the printable file with self-contained auto-printing trigger
    downloadFile(`TestSuiteGen_PrintableReport_${activeSuite.id}.html`, html, "text/html;charset=utf-8");
    
    // 2. Fallback: Also try to trigger native print inside a same-origin hidden iframe in case the local browser sandbox allows it
    try {
      const oldFrame = document.getElementById("tsg-print-iframe");
      if (oldFrame) {
        oldFrame.parentNode?.removeChild(oldFrame);
      }
      
      const iframe = document.createElement("iframe");
      iframe.id = "tsg-print-iframe";
      iframe.style.position = "fixed";
      iframe.style.right = "0";
      iframe.style.bottom = "0";
      iframe.style.width = "0";
      iframe.style.height = "0";
      iframe.style.border = "0";
      iframe.name = "pdf_print_frame";
      document.body.appendChild(iframe);
      
      const iframeWin = iframe.contentWindow;
      if (iframeWin) {
        iframeWin.document.open();
        iframeWin.document.write(html);
        iframeWin.document.close();
        
        // Let style engine calculation settle, then trigger browser print
        setTimeout(() => {
          try {
            iframeWin.focus();
            iframeWin.print();
            // Cleanup iframe after delay
            setTimeout(() => {
              const frame = document.getElementById("tsg-print-iframe");
              if (frame) frame.parentNode?.removeChild(frame);
            }, 1500);
          } catch (e) {
            console.warn("Same-origin frame print dialog intercepted, utilizing downloaded printable report fallback.", e);
          }
        }, 250);
      }
    } catch (err) {
      console.warn("Standard print intercept fallback active.", err);
    }
  };

  // Set default sample requirements
  const loadDemoRequirements = () => {
    setUserStory(
      "As a client,\nI want to trigger automatic backup exports inside my administrative profile dashboard when disk space consumption levels exceed 85%."
    );
    setAcceptanceCriteria(
      "- Background server issues a clean telemetry warning.\n- Export format choices default to ZIP archives.\n- Database records remain locked until secure generation verifies the checksum."
    );
    setRequirementSpec(
      "Max file download bandwidth restriction: 250MB/sec.\nSecurity criteria: SHA-256 validation hashes must accompany every bundle."
    );
    setCustomSpecs(
      "Verify system behaviors at bounds: exactly 85%, exactly 84.9%, and empty destination drives."
    );
    setAttachments([
      {
        name: "disk_telemetry_blueprint.txt",
        mimeType: "text/plain",
        size: 198,
        base64: "dGVsZW1ldHJ5TGltaXQ6IDg1JQpiYWNrdXBGb3JtYXQ6IFpJUApoYXNoQWxnb3JpdGhtOiBTSEEtMjU2CmJvcmRlckNoZWNrOiA4NC45JQ=="
      }
    ]);
  };

  const toggleAccordion = (id: string) => {
    setExpandedCaseIds((prev) => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const toggleAllAccordions = (expand: boolean) => {
    if (!activeSuite) return;
    const next: Record<string, boolean> = {};
    activeSuite.testCases.forEach((tc) => {
      next[tc.id] = expand;
    });
    setExpandedCaseIds(next);
  };

  const deleteHistorySuite = (suiteId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm("Delete this generated test suite permanently?")) {
      const updated = suiteHistory.filter((s) => s.id !== suiteId);
      saveHistory(updated);
      if (activeSuite?.id === suiteId) {
        setActiveSuite(updated.length > 0 ? updated[0] : null);
      }
    }
  };

  // Highlight keywords inside detailed execution steps dynamically
  const highlightKeywords = (text: string) => {
    if (!text) return "";
    // Bolds string literals, file suffixes, percentages, numbers, codes
    const keywordsRegex = /('[^']+'|"[^"]+"|\b\d+(?:\.\d+)?%?|\bTC-\d{3,}\b|\bZIP\b|\bSHA-256\b|\bMD5\b|\bchecksum\b|\bAPI\n*|\bJSON\b|\bURLs?\b)/ig;
    const parts = text.split(keywordsRegex);
    return parts.map((part, idx) => {
      if (part.match(keywordsRegex)) {
        return (
          <strong 
            key={idx} 
            className="font-bold text-zinc-900 dark:text-zinc-100"
          >
            {part}
          </strong>
        );
      }
      return <span key={idx}>{part}</span>;
    });
  };

  // Helper to highlight searched terms
  const highlightSearchMatch = (text: string, search: string) => {
    if (!search || !text) return text;
    const regex = new RegExp(`(${search.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&")})`, "gi");
    const parts = text.split(regex);
    return parts.map((part, i) => 
      regex.test(part) ? (
        <mark key={i} className="bg-yellow-250 dark:bg-yellow-950/75 text-yellow-950 dark:text-yellow-200 px-0.5 rounded">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  // Calculate Metrics list for rich distribution data instead of pass/fail (6 selections)
  const totalCasesCount = activeSuite ? activeSuite.testCases.length : 0;
  
  const distributionCounts = activeSuite ? activeSuite.testCases.reduce((acc, tc) => {
    const type = tc.scenarioType.toLowerCase();
    if (type.includes("happy")) {
      acc.happy++;
    } else if (type.includes("bound") || type.includes("limit") || type.includes("range")) {
      acc.boundary++;
    } else if (type.includes("edge") || type.includes("corner")) {
      acc.edge++;
    } else if (type.includes("validation") || type.includes("input") || type.includes("format") || type.includes("type")) {
      acc.inputValidation++;
    } else if (type.includes("exception") || type.includes("negative") || type.includes("error") || type.includes("fail")) {
      acc.exception++;
    } else {
      acc.happy++; // Graceful default fallback
    }
    return acc;
  }, { happy: 0, boundary: 0, edge: 0, inputValidation: 0, exception: 0 }) : { happy: 0, boundary: 0, edge: 0, inputValidation: 0, exception: 0 };

  // Filter list
  const filteredTestCaseList = activeSuite
    ? activeSuite.testCases.filter((tc) => {
        const matchesSearch =
          tc.name.toLowerCase().includes(testCaseSearch.toLowerCase()) ||
          tc.id.toLowerCase().includes(testCaseSearch.toLowerCase()) ||
          tc.testObjective.toLowerCase().includes(testCaseSearch.toLowerCase()) ||
          tc.testSteps.some((step) => step.toLowerCase().includes(testCaseSearch.toLowerCase())) ||
          tc.expectedOutput.toLowerCase().includes(testCaseSearch.toLowerCase());

        const matchesScenario =
          scenarioFilter === "All" ||
          tc.scenarioType.toLowerCase().replace(/\s+/g, "") === scenarioFilter.toLowerCase().replace(/\s+/g, "");

        return matchesSearch && matchesScenario;
      })
    : [];

  const availableScenarios = activeSuite
    ? ["All", ...Array.from(new Set(activeSuite.testCases.map((tc) => tc.scenarioType)))]
    : ["All"];

  const filteredHistory = suiteHistory.filter((suite) => {
    const desc = suite.description || "";
    const obj = suite.testObjective || "";
    return (
      desc.toLowerCase().includes(searchHistoryTerm.toLowerCase()) ||
      obj.toLowerCase().includes(searchHistoryTerm.toLowerCase())
    );
  });

  return (
    <div className={`min-h-screen flex flex-col font-sans transition-colors duration-300 antialiased ${
      theme === "dark" 
        ? "bg-[#0b0f19] text-zinc-100 selection:bg-sky-600/30 selection:text-white" 
        : "bg-[#f8fafc] text-zinc-900 selection:bg-sky-100 selection:text-sky-900"
    }`}>
      
      {/* BACKGROUND GRAPHICS: Elegant glowing ambient circles */}
      <div className="absolute top-0 left-0 right-0 h-[500px] overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-150px] left-[15%] w-[450px] h-[450px] rounded-full blur-[140px] opacity-[0.08] dark:opacity-[0.14] bg-sky-500 animate-float-1" />
        <div className="absolute top-[-60px] right-[20%] w-[380px] h-[380px] rounded-full blur-[120px] opacity-[0.05] dark:opacity-[0.1] bg-indigo-500 animate-float-2" />
      </div>

      {/* 1. HEADER MODULE: Clean, Premium, No subtitle overlaps */}
      <header className={`relative z-30 shrink-0 border-b px-6 py-4 flex items-center justify-between transition-all duration-300 ${
        theme === "dark" 
          ? "border-zinc-800/80 bg-zinc-950/80 backdrop-blur-lg" 
          : "border-slate-200/90 bg-white/90 backdrop-blur-lg shadow-xs"
      }`}>
        <div 
          onClick={handleLogoClick}
          className="flex items-center gap-3.5 cursor-pointer hover:opacity-85 transition-opacity select-none"
          title="Navigate to Home"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-sky-500/10">
            <FileCheck2 className="w-5.5 h-5.5" />
          </div>
          <div>
            <h1 className={`text-xl font-bold tracking-tight font-display ${
              theme === "dark" ? "text-white" : "text-zinc-900"
            }`}>
              TestSuiteGen
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className={`hidden sm:flex items-center gap-2 text-[10.5px] border px-3 py-1.5 font-mono rounded-lg transition-all ${
            theme === "dark" 
              ? "text-zinc-300 bg-zinc-900 border-zinc-800" 
              : "text-zinc-600 bg-slate-100/80 border-slate-200"
          }`}>
            <span className="w-1.5 h-1.5 rounded-full bg-sky-500 dark:bg-sky-400 animate-pulse" />
            <span>Engine Ready</span>
          </div>

          {/* Theme Switcher Button */}
          <button
            onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
            className={`p-2 rounded-xl border transition-all duration-300 hover:scale-105 cursor-pointer ${
              theme === "dark" 
                ? "bg-zinc-900 border-zinc-800 text-yellow-400 hover:bg-zinc-800 hover:text-yellow-300" 
                : "bg-white border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-900 shadow-sm"
            }`}
            title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {theme === "dark" ? <Sun className="w-4.5 h-4.5" /> : <Moon className="w-4.5 h-4.5" />}
          </button>
        </div>
      </header>

      {/* 2. MAIN BENTO SYSTEM GRID AREA */}
      <main className="relative z-20 flex-1 grid grid-cols-1 lg:grid-cols-[380px_1fr] xl:grid-cols-[400px_1fr_310px] gap-6 p-4 md:p-6 overflow-hidden">
        
        {/* ===================================== LEFT COLUMN: SPECIFICATIONS MANAGER ===================================== */}
        <section className="flex flex-col gap-4 overflow-visible">
          
          <div className={`border rounded-2xl p-5 flex flex-col gap-4 shadow-md relative transition-all duration-350 ${
            theme === "dark" 
              ? "bg-zinc-900/50 border-zinc-800/80 backdrop-blur-md" 
              : "bg-white border-slate-200/80 shadow-md shadow-slate-100/50"
          }`}>
            <div className="flex items-center justify-between pb-3.5 border-b border-zinc-200/10 dark:border-zinc-800/60">
              <div className="flex items-center gap-2">
                <FileText className="w-4.5 h-4.5 text-sky-500" />
                <h2 className="text-[11px] font-bold uppercase tracking-wider font-mono text-zinc-400">
                  Requirements Editor
                </h2>
              </div>
              
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={clearAllInputs}
                  className={`text-[9.5px] font-semibold flex items-center gap-1 border rounded-md px-2 py-1 transition-all cursor-pointer ${
                    theme === "dark"
                      ? "bg-zinc-950 hover:bg-zinc-800 border-zinc-800 text-zinc-400"
                      : "bg-slate-50 hover:bg-slate-100 border-slate-250 text-slate-600"
                  }`}
                  title="Clear all fields"
                >
                  <Trash2 className="w-3 h-3 text-rose-500" />
                  <span>Clear</span>
                </button>

                <button
                  type="button"
                  onClick={loadDemoRequirements}
                  className={`text-[9.5px] font-semibold flex items-center gap-1 border rounded-md px-2 py-1 transition-all cursor-pointer ${
                    theme === "dark" 
                      ? "bg-zinc-800 hover:bg-zinc-750 border-zinc-700 text-zinc-200" 
                      : "bg-slate-100 hover:bg-indigo-50 border-slate-250 text-indigo-755 text-indigo-700"
                  }`}
                  title="Refresh Sandbox Telemetry data"
                >
                  <RefreshCw className="w-2.5 h-2.5 text-sky-600 inline" />
                  <span>Load Demo</span>
                </button>
              </div>
            </div>

            <form onSubmit={handleGenerateCases} className="flex flex-col gap-4">
              
              {/* Field 1: User Story */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider flex justify-between">
                  <span className="text-zinc-450 dark:text-zinc-400">1. User Story Description</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleCopyText("story-in", userStory)}
                      className="hover:text-sky-500 text-zinc-400 cursor-pointer"
                      title="Copy User Story content"
                    >
                      {copySuccessId === "story-in" ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                    </button>
                    <span className="text-[9px] text-zinc-400 font-mono font-medium">{userStory.length} chars</span>
                  </div>
                </label>
                <textarea
                  id="userStory"
                  rows={3}
                  value={userStory}
                  onChange={(e) => setUserStory(e.target.value)}
                  placeholder="As an admin, I want to triggers auto backups exports..."
                  className={`w-full border rounded-xl p-3 text-xs focus:outline-none focus:ring-1 focus:ring-sky-500/50 transition-all font-mono leading-relaxed resize-y ${
                    theme === "dark" 
                      ? "bg-zinc-950 border-zinc-850 text-zinc-200 placeholder:text-zinc-600" 
                      : "bg-slate-50 border-slate-200 text-zinc-800 placeholder:text-zinc-400 focus:bg-white"
                  }`}
                />
              </div>

              {/* Field 2: Acceptance Criteria */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider flex justify-between">
                  <span className="text-zinc-450 dark:text-zinc-400">2. Acceptance Criteria</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleCopyText("ac-in", acceptanceCriteria)}
                      className="hover:text-sky-500 text-zinc-400 cursor-pointer"
                      title="Copy AC Checklist"
                    >
                      {copySuccessId === "ac-in" ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                    </button>
                    <span className="text-[9px] text-zinc-400 font-mono font-medium">{acceptanceCriteria.length} chars</span>
                  </div>
                </label>
                <textarea
                  id="acceptanceCriteria"
                  rows={3}
                  value={acceptanceCriteria}
                  onChange={(e) => setAcceptanceCriteria(e.target.value)}
                  placeholder="- Background server issues a clean warning..."
                  className={`w-full border rounded-xl p-3 text-xs focus:outline-none focus:ring-1 focus:ring-sky-500/50 transition-all font-mono leading-relaxed resize-y ${
                    theme === "dark" 
                      ? "bg-zinc-950 border-zinc-850 text-zinc-200 placeholder:text-zinc-600" 
                      : "bg-slate-50 border-slate-200 text-zinc-800 placeholder:text-zinc-400 focus:bg-white"
                  }`}
                />
              </div>

              {/* Field 3: User Requirement Specification */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider flex justify-between">
                  <span className="text-zinc-455 dark:text-zinc-400">3. Requirement Specs</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleCopyText("req-in", requirementSpec)}
                      className="hover:text-sky-500 text-zinc-400 cursor-pointer"
                      title="Copy specific rules"
                    >
                      {copySuccessId === "req-in" ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                    </button>
                    <span className="text-[9px] text-zinc-400 font-mono font-medium">{requirementSpec.length} chars</span>
                  </div>
                </label>
                <textarea
                  id="requirementSpec"
                  rows={2}
                  value={requirementSpec}
                  onChange={(e) => setRequirementSpec(e.target.value)}
                  placeholder="Bandwidth values, algorithm constraints, checksum routines..."
                  className={`w-full border rounded-xl p-3 text-xs focus:outline-none focus:ring-1 focus:ring-sky-500/50 transition-all font-mono leading-relaxed resize-y ${
                    theme === "dark" 
                      ? "bg-zinc-950 border-zinc-850 text-zinc-200 placeholder:text-zinc-600" 
                      : "bg-slate-50 border-slate-200 text-zinc-800 placeholder:text-zinc-400 focus:bg-white"
                  }`}
                />
              </div>

              {/* Field 4: Optional/Custom parameters */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider flex justify-between">
                  <span className="text-zinc-455 dark:text-zinc-400">4. Boundary & Custom Params</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleCopyText("custom-in", customSpecs)}
                      className="hover:text-sky-500 text-zinc-400 cursor-pointer"
                      title="Copy boundary specifications"
                    >
                      {copySuccessId === "custom-in" ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                </label>
                <textarea
                  id="customSpecs"
                  rows={2}
                  value={customSpecs}
                  onChange={(e) => setCustomSpecs(e.target.value)}
                  placeholder="Explicitly checks system margins: 85%, exactly 84.9%..."
                  className={`w-full border rounded-xl p-3 text-xs focus:outline-none focus:ring-1 focus:ring-sky-500/50 transition-all font-mono leading-relaxed resize-y ${
                    theme === "dark" 
                      ? "bg-zinc-950 border-zinc-850 text-zinc-200 placeholder:text-zinc-600" 
                      : "bg-slate-50 border-slate-200 text-zinc-800 placeholder:text-zinc-400 focus:bg-white"
                  }`}
                />
              </div>

              {/* Drag & Drop File Upload Panel */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-455 dark:text-zinc-400">
                  Specs Context / Import Backup
                </label>
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border border-dashed rounded-xl p-4 cursor-pointer text-center flex flex-col items-center justify-center transition-all ${
                    isDragging
                      ? "border-sky-500 bg-sky-500/10 scale-[1.01]"
                      : theme === "dark" 
                        ? "border-zinc-800 hover:border-zinc-700 bg-zinc-950/50 hover:bg-zinc-900/40" 
                        : "border-slate-205 hover:border-slate-300 bg-slate-50/50 hover:bg-slate-100/55"
                  }`}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    multiple
                    className="hidden"
                    accept=".txt,.csv,.json,.md,.pdf,.png,.jpg,.jpeg,.webp"
                  />
                  <Upload className="w-5 h-5 text-sky-500 mb-1.5 animate-pulse" />
                  <span className="text-[11.5px] font-semibold text-zinc-700 dark:text-zinc-300">
                    File drop or <span className="text-sky-500 dark:text-sky-400 underline decoration-sky-500/30">browse</span>
                  </span>
                  <p className="text-[9.5px] text-zinc-455 mt-1 leading-relaxed">
                    Drop specs, attachments, or <br />
                    <strong className="text-sky-500 dark:text-sky-400 font-semibold">TestSuiteGen .json backup</strong> to restore instant!
                  </p>
                </div>

                {/* Attachments feedback */}
                {attachments.length > 0 && (
                  <div className="space-y-1.5 mt-2 max-h-[120px] overflow-y-auto pr-1">
                    {attachments.map((file, i) => {
                      const isImage = file.mimeType.startsWith("image/");
                      return (
                        <div
                          key={file.name + i}
                          className={`flex items-center justify-between text-xs p-2 border rounded-lg transition-colors ${
                            theme === "dark" 
                              ? "bg-zinc-950 border-zinc-850/80 text-zinc-300" 
                              : "bg-slate-100 border-slate-200 text-zinc-750"
                          }`}
                        >
                          <div className="flex items-center gap-1.5 truncate mr-3">
                            {isImage ? (
                              <FileImage className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                            ) : (
                              <FileText className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                            )}
                            <span className="truncate font-mono text-[9.5px] font-medium">
                              {file.name}
                            </span>
                            <span className="text-[8.5px] font-mono text-zinc-400 shrink-0">
                              ({(file.size / 1024).toFixed(1)} KB)
                            </span>
                          </div>
                          
                          <button
                            type="button"
                            onClick={() => removeAttachment(i)}
                            className="p-1 text-zinc-400 hover:text-rose-500 rounded transition-colors cursor-pointer"
                            title="Remove attachment"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Submit Buttons */}
              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-3.5 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-700 hover:to-indigo-700 active:scale-[0.99] text-xs font-bold text-white shadow-md shadow-sky-500/10 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent animate-spin rounded-full" />
                    <span className="uppercase font-mono text-[10.5px] tracking-widest">{loadingStep}</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-sky-200" />
                    <span className="uppercase font-mono tracking-wider">Generate Test Suite</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </section>

        {/* ===================================== CENTER COLUMN: TEST CASES VIEWER ===================================== */}
        <section className="flex flex-col gap-4 overflow-hidden min-h-[450px]">
          
          <div className={`flex-1 border rounded-2xl flex flex-col overflow-hidden shadow-md relative transition-all duration-350 ${
            theme === "dark" ? "bg-zinc-900/50 border-zinc-800/80 backdrop-blur-md" : "bg-white border-slate-200"
          }`}>
            
            {/* Header controls bar */}
            <div className={`px-5 py-3 border-b flex flex-wrap items-center justify-between gap-3 shrink-0 ${
              theme === "dark" ? "bg-zinc-950/30 border-zinc-850" : "bg-slate-50 border-slate-100"
            }`}>
              <div className="flex items-center gap-2">
                <FileCheck2 className="w-4.5 h-4.5 text-sky-500" />
                <h3 className="font-bold text-xs font-mono tracking-wider uppercase text-zinc-500">
                  QUALITY SPECIFICATIONS REPORT
                </h3>
              </div>

              {activeSuite && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopyAllAsMarkdown}
                    className={`px-3 py-1.5 border rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                      theme === "dark" 
                        ? "bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700 hover:text-zinc-100" 
                        : "bg-white border-slate-220 text-slate-700 hover:bg-slate-50 shadow-xs"
                    }`}
                    title="Copy specification reports to clipboard"
                  >
                    {copySuccessId === "all-md" ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                        <span className="text-emerald-500 font-semibold font-mono text-[11px]">Copied Spec!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-zinc-400" />
                        <span className="text-[11px]">Copy Complete Spec</span>
                      </>
                    )}
                  </button>

                  <div className="h-4 w-px bg-zinc-200 dark:bg-zinc-800" />

                  {/* Enhanced Downloads Export Group */}
                  <div className="flex items-center gap-1 bg-zinc-1000/10 dark:bg-zinc-950/20 p-1 border rounded-xl border-slate-200 dark:border-zinc-800 shadow-xs">
                    <button
                      onClick={handleDownloadMarkdown}
                      className={`px-2 py-1 rounded-md text-[10px] font-bold font-mono transition-all hover:scale-105 cursor-pointer ${
                        theme === "dark" ? "bg-zinc-800 text-zinc-200 hover:bg-zinc-700" : "bg-slate-100/90 text-slate-700 hover:bg-slate-200"
                      }`}
                      title="Download clean Markdown"
                    >
                      MD
                    </button>
                    <button
                      onClick={handleDownloadCSV}
                      className={`px-2 py-1 rounded-md text-[10px] font-bold font-mono transition-all hover:scale-105 cursor-pointer ${
                        theme === "dark" ? "bg-zinc-800 text-zinc-100 hover:bg-zinc-700" : "bg-slate-100/90 text-slate-700 hover:bg-slate-200"
                      }`}
                      title="Export CSV for TestRail/Jira/Imports"
                    >
                      CSV
                    </button>
                    <button
                      onClick={handleDownloadJSON}
                      className={`px-2 py-1 rounded-md text-[10px] font-bold font-mono transition-all hover:scale-105 cursor-pointer ${
                        theme === "dark" ? "bg-zinc-800 text-zinc-100 hover:bg-zinc-700" : "bg-slate-100/90 text-slate-700 hover:bg-slate-200"
                      }`}
                      title="Save source backup specification JSON"
                    >
                      JSON
                    </button>
                    <button
                      onClick={handleDownloadPDF}
                      className={`px-2 py-1.5 rounded-md text-[10px] font-bold font-mono transition-all hover:scale-105 cursor-pointer text-sky-500 bg-sky-50 dark:bg-sky-950/40 hover:bg-sky-100/30 ${
                        theme === "dark" ? "border border-sky-900/30" : "border border-sky-100"
                      }`}
                      title="Save as beautiful standalone HTML Report (Print to PDF)"
                    >
                      PDF
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Scrollable specs board */}
            <div className="flex-1 p-5 overflow-y-auto space-y-5 relative">
              
              {/* Suspense active loading overlay */}
              {loading && (
                <div className={`absolute inset-0 z-30 flex flex-col items-center justify-center p-6 ${
                  theme === "dark" ? "bg-zinc-950/98" : "bg-white/98"
                }`}>
                  <div className="w-[320px] max-w-full text-center flex flex-col items-center">
                    <div className="w-12 h-12 rounded-2xl bg-sky-500/10 flex items-center justify-center border border-sky-500/20 animate-spin mb-4">
                      <Sparkles className="w-6 h-6 text-sky-500" />
                    </div>
                    <h3 className="text-sm font-bold font-mono tracking-wider uppercase text-zinc-800 dark:text-zinc-100">
                      Generating Verification Cases
                    </h3>
                    <p className="text-[11px] text-sky-500 font-mono mt-2 uppercase tracking-wide animate-pulse">
                      {loadingStep}
                    </p>
                  </div>
                </div>
              )}

              {/* Errorboundary feed back */}
              {errorMsg && (
                <div className="p-4 bg-rose-50 dark:bg-rose-950/20 border border-rose-220 dark:border-rose-900/40 rounded-xl flex items-start gap-2.5">
                  <AlertCircle className="w-4.5 h-4.5 text-rose-500 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-rose-600 dark:text-rose-400 uppercase font-mono tracking-wider">
                      Failed to build verification cases
                    </h4>
                    <p className="text-xs text-rose-700 dark:text-rose-350 mt-1 leading-relaxed">{errorMsg}</p>
                  </div>
                </div>
              )}

              {/* No active suite view */}
              {!activeSuite && !loading && (
                <div className="h-full flex flex-col items-center justify-center text-center py-20 max-w-sm mx-auto">
                  <div className="w-14 h-14 rounded-2xl bg-sky-50 dark:bg-sky-950/20 border border-sky-100 dark:border-sky-900/30 flex items-center justify-center mb-5 text-sky-550">
                    <Sparkles className="w-7 h-7 animate-pulse" />
                  </div>
                  <h4 className="text-sm font-bold text-zinc-850 dark:text-zinc-200">No QA Specifications Loaded</h4>
                  <p className="text-xs text-zinc-455 mt-2 leading-relaxed">
                    Specify user stories or quality boundaries in the requirements board, or import an exported test specification backup file.
                  </p>
                  <button
                    type="button"
                    onClick={loadDemoRequirements}
                    className="mt-6 px-4 py-2 bg-sky-500/10 text-sky-600 hover:bg-sky-500/20 hover:text-sky-700 dark:text-sky-400 dark:hover:bg-sky-950/60 rounded-lg text-xs font-bold transition-all cursor-pointer"
                  >
                    Load Sandbox Demo
                  </button>
                </div>
              )}

              {/* Active Specifications renders */}
              {activeSuite && !loading && (
                <div className="space-y-6">
                  
                  {/* OVERALL TEST SYSTEM OBJECTIVES MODULE */}
                  <div className={`p-4 rounded-xl border transition-all duration-300 relative overflow-hidden ${
                    theme === "dark" 
                      ? "bg-zinc-950/40 border-zinc-800/80" 
                      : "bg-[#f8fafc]/60 border-slate-200 shadow-xs"
                  }`}>
                    {/* Glowing side accent line for rich UI look */}
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-sky-500 to-indigo-500" />
                    
                    <div className="flex items-center justify-between pb-2.5 border-b border-zinc-200/10 dark:border-zinc-800/40">
                      <div className="flex items-center gap-2 pl-1">
                        <CheckCircle2 className="w-4 h-4 text-sky-500" />
                        <h4 className="text-xs font-bold font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                          Overall Test Specification Objective
                        </h4>
                      </div>

                      <button
                        onClick={() => handleCopyText("objective-copy", activeSuite.testObjective)}
                        className={`p-1.5 rounded-lg border text-xs flex items-center gap-1 transition-all ${
                          theme === "dark" 
                            ? "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-100" 
                            : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
                        }`}
                        title="Copy overall objective text"
                      >
                        {copySuccessId === "objective-copy" ? (
                          <Check className="w-3.5 h-3.5 text-emerald-500" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                    
                    <div className="text-xs leading-relaxed font-sans prose dark:prose-invert max-w-none pt-3">
                      <MarkdownView content={activeSuite.testObjective} />
                    </div>
                  </div>

                  {/* ACTIVE VERIFICATIONS TRACK LIST */}
                  <div className="space-y-4">
                    
                    {/* Rich Scenario Type Case Count Distribution (6 Selections, 2 column of 3 rows each) */}
                    <div className="grid grid-cols-2 gap-3">
                      
                      {/* ROW 1 COLUMN 1: Total spec */}
                      <div className={`p-3.5 rounded-xl border flex flex-col justify-center relative overflow-hidden ${
                        theme === "dark" ? "bg-indigo-950/15 border-indigo-900/40" : "bg-indigo-50/20 border-indigo-100"
                      }`}>
                        <div className="absolute top-1 right-2 opacity-[0.25]">
                          <BookmarkCheck className="w-8 h-8 text-indigo-505 text-indigo-500" />
                        </div>
                        <span className="text-[9.5px] text-indigo-500 font-mono font-bold tracking-wider uppercase">
                          Total spec
                        </span>
                        <div className="flex items-baseline gap-1.5 mt-1.5">
                          <span className="text-lg font-mono font-bold text-indigo-600 dark:text-indigo-405 dark:text-indigo-400">
                            {totalCasesCount}
                          </span>
                          <span className="text-[10px] text-zinc-400">total</span>
                        </div>
                      </div>

                      {/* ROW 1 COLUMN 2: Happy path */}
                      <div className={`p-3.5 rounded-xl border flex flex-col justify-center relative overflow-hidden ${
                        theme === "dark" ? "bg-emerald-950/10 border-emerald-900/30" : "bg-emerald-50/20 border-emerald-100"
                      }`}>
                        <div className="absolute top-1 right-2 opacity-[0.25]">
                          <CheckCircle className="w-8 h-8 text-emerald-500" />
                        </div>
                        <span className="text-[9.5px] text-emerald-500 font-mono font-bold tracking-wider uppercase">
                          Happy path
                        </span>
                        <div className="flex items-baseline gap-1.5 mt-1.5">
                          <span className="text-lg font-mono font-bold text-emerald-600 dark:text-emerald-400">
                            {distributionCounts.happy}
                          </span>
                          <span className="text-[10px] text-zinc-400">cases</span>
                        </div>
                      </div>

                      {/* ROW 2 COLUMN 1: Boundary limits */}
                      <div className={`p-3.5 rounded-xl border flex flex-col justify-center relative overflow-hidden ${
                        theme === "dark" ? "bg-sky-950/10 border-sky-900/30" : "bg-sky-50/20 border-sky-100"
                      }`}>
                        <div className="absolute top-1 right-2 opacity-[0.25]">
                          <Sliders className="w-8 h-8 text-sky-505 text-sky-500" />
                        </div>
                        <span className="text-[9.5px] text-sky-500 font-mono font-bold tracking-wider uppercase">
                          Boundary limits
                        </span>
                        <div className="flex items-baseline gap-1.5 mt-1.5">
                          <span className="text-lg font-mono font-bold text-sky-600 dark:text-sky-400">
                            {distributionCounts.boundary}
                          </span>
                          <span className="text-[10px] text-zinc-400">cases</span>
                        </div>
                      </div>

                      {/* ROW 2 COLUMN 2: Edge Cases */}
                      <div className={`p-3.5 rounded-xl border flex flex-col justify-center relative overflow-hidden ${
                        theme === "dark" ? "bg-amber-950/15 border-amber-900/30" : "bg-amber-50/20 border-amber-100"
                      }`}>
                        <div className="absolute top-1 right-2 opacity-[0.25]">
                          <Sparkles className="w-8 h-8 text-amber-500" />
                        </div>
                        <span className="text-[9.5px] text-amber-500 font-mono font-bold tracking-wider uppercase">
                          Edge Cases
                        </span>
                        <div className="flex items-baseline gap-1.5 mt-1.5">
                          <span className="text-lg font-mono font-bold text-amber-600 dark:text-amber-400">
                            {distributionCounts.edge}
                          </span>
                          <span className="text-[10px] text-zinc-400">cases</span>
                        </div>
                      </div>

                      {/* ROW 3 COLUMN 1: Input Validation */}
                      <div className={`p-3.5 rounded-xl border flex flex-col justify-center relative overflow-hidden ${
                        theme === "dark" ? "bg-purple-950/15 border-purple-900/30" : "bg-purple-50/20 border-purple-100"
                      }`}>
                        <div className="absolute top-1 right-2 opacity-[0.25]">
                          <FileSpreadsheet className="w-8 h-8 text-purple-500" />
                        </div>
                        <span className="text-[9.5px] text-purple-500 font-mono font-bold tracking-wider uppercase">
                          Input Validation
                        </span>
                        <div className="flex items-baseline gap-1.5 mt-1.5">
                          <span className="text-lg font-mono font-bold text-purple-600 dark:text-purple-400">
                            {distributionCounts.inputValidation}
                          </span>
                          <span className="text-[10px] text-zinc-400">cases</span>
                        </div>
                      </div>

                      {/* ROW 3 COLUMN 2: Exception Flows */}
                      <div className={`p-3.5 rounded-xl border flex flex-col justify-center relative overflow-hidden ${
                        theme === "dark" ? "bg-orange-950/10 border-orange-900/30" : "bg-orange-50/20 border-orange-100"
                      }`}>
                        <div className="absolute top-1 right-2 opacity-[0.25]">
                          <ShieldAlert className="w-8 h-8 text-orange-550 text-orange-500" />
                        </div>
                        <span className="text-[9.5px] text-orange-500 font-mono font-bold tracking-wider uppercase">
                          Exception Flows
                        </span>
                        <div className="flex items-baseline gap-1.5 mt-1.5">
                          <span className="text-lg font-mono font-bold text-orange-600 dark:text-orange-400">
                            {distributionCounts.exception}
                          </span>
                          <span className="text-[10px] text-zinc-400">cases</span>
                        </div>
                      </div>

                    </div>

                    {/* Filter controls search bar */}
                    <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl border ${
                      theme === "dark" ? "bg-zinc-900/80 border-zinc-800" : "bg-white border-slate-200/90 shadow-xs"
                    }`}>
                      <div className="flex items-center gap-2 max-w-xs flex-1">
                        <Search className="w-4 h-4 text-zinc-400 shrink-0" />
                        <input
                          type="text"
                          value={testCaseSearch}
                          onChange={(e) => setTestCaseSearch(e.target.value)}
                          placeholder="Search steps, criteria limits, IDs..."
                          className={`w-full border rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-sky-500/50 transition-all ${
                            theme === "dark" 
                              ? "bg-zinc-950 border-zinc-850 text-zinc-100 placeholder:text-zinc-650" 
                              : "bg-slate-50 border-slate-205 text-zinc-800 placeholder:text-slate-400"
                          }`}
                        />
                        {testCaseSearch && (
                          <span className="text-[9px] font-mono shrink-0 bg-sky-50 dark:bg-sky-950 px-1.5 py-0.5 rounded border border-sky-200 text-sky-600">
                            {filteredTestCaseList.length} match
                          </span>
                        )}
                      </div>

                      {/* Scenario types filters and Accordion Toggles */}
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-zinc-400 font-bold uppercase font-mono">Filter Category:</span>
                          <select
                            value={scenarioFilter}
                            onChange={(e) => setScenarioFilter(e.target.value)}
                            className={`text-[11px] font-semibold px-2 py-1 rounded border focus:outline-none focus:border-sky-550 transition-all ${
                              theme === "dark" 
                                ? "bg-zinc-950 border-zinc-800 text-zinc-200" 
                                : "bg-slate-100 border-slate-205 text-slate-700"
                            }`}
                          >
                            {availableScenarios.map((sc) => (
                              <option key={sc} value={sc}>
                                {sc}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="h-4 w-px bg-zinc-200 dark:bg-zinc-800" />

                        <div className="flex items-center gap-2 font-mono text-[10.5px]">
                          <button
                            type="button"
                            onClick={() => toggleAllAccordions(true)}
                            className="text-sky-500 hover:text-sky-600 font-bold cursor-pointer"
                          >
                            Expand All
                          </button>
                          <span className="text-zinc-350 dark:text-zinc-700">|</span>
                          <button
                            type="button"
                            onClick={() => toggleAllAccordions(false)}
                            className="text-sky-500 hover:text-sky-605 text-sky-500 hover:text-sky-600 font-bold cursor-pointer"
                          >
                            Collapse
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Verifications List Loop */}
                    <div className="space-y-4">
                      {filteredTestCaseList.length === 0 ? (
                        <div className="text-center py-14 text-xs text-zinc-400 font-mono border border-dashed rounded-xl/80 dark:border-zinc-800">
                          No generated specifications match keywords "{testCaseSearch}" or scenario "{scenarioFilter}".
                        </div>
                      ) : (
                        filteredTestCaseList.map((tc) => {
                          const isOpen = !!expandedCaseIds[tc.id];
                          
                          const isHappy = tc.scenarioType.toLowerCase().includes("happy");
                          const isNegative = tc.scenarioType.toLowerCase().includes("exception") || tc.scenarioType.toLowerCase().includes("negative");
                          const isBoundary = tc.scenarioType.toLowerCase().includes("bound") || tc.scenarioType.toLowerCase().includes("limit");

                          return (
                            <div
                              key={tc.id}
                              className={`border rounded-xl overflow-hidden transition-all duration-200 ${
                                isOpen
                                  ? theme === "dark" 
                                    ? "bg-zinc-900 border-zinc-800 shadow-lg" 
                                    : "bg-white border-slate-250 shadow-md"
                                  : theme === "dark"
                                    ? "bg-zinc-900/40 border-zinc-850 hover:border-zinc-750"
                                    : "bg-white/80 border-slate-200 hover:border-slate-300"
                              }`}
                            >
                              {/* Accordion Trigger Panel header line */}
                              <div
                                onClick={() => toggleAccordion(tc.id)}
                                className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-3 cursor-pointer select-none transition-colors ${
                                  theme === "dark" ? "hover:bg-zinc-850/40" : "hover:bg-slate-50/50"
                                }`}
                              >
                                <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
                                  <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border leading-none shrink-0 ${
                                    theme === "dark" 
                                      ? "bg-zinc-800 border-zinc-700 text-zinc-300" 
                                      : "bg-slate-100 border-slate-205 text-slate-700"
                                  }`}>
                                    {tc.id}
                                  </span>

                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <h4 className={`text-xs sm:text-sm font-bold truncate ${
                                        theme === "dark" ? "text-zinc-100" : "text-slate-800"
                                      }`}>
                                        {highlightSearchMatch(tc.name, testCaseSearch)}
                                      </h4>
                                    </div>
                                    <div className="flex items-center gap-3 mt-1 text-[9.5px] text-zinc-400">
                                      <span className="font-mono flex items-center gap-1">
                                        Scenario: <strong className={
                                          theme === "dark" ? "text-zinc-300" : "text-slate-600"
                                        }>{tc.scenarioType}</strong>
                                      </span>
                                      <span>•</span>
                                      <span>{tc.testSteps.length} action sequences</span>
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                                  {/* Quick Action Copy item */}
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const stepsStr = tc.testSteps.map((step, idx) => `${idx + 1}. ${step}`).join("\n");
                                      const copyStr = `Test Case [${tc.id}] ${tc.name}\nScenario: ${tc.scenarioType}\nObjective: ${tc.testObjective}\nSteps:\n${stepsStr}\nExpected Result: ${tc.expectedOutput}`;
                                      handleCopyText(tc.id, copyStr);
                                    }}
                                    className={`p-1.5 rounded-lg border text-xs flex items-center gap-1 transition-all cursor-pointer ${
                                      theme === "dark"
                                        ? "bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-750"
                                        : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50 shadow-xs"
                                    }`}
                                    title="Copy this card data"
                                  >
                                    {copySuccessId === tc.id ? (
                                      <>
                                        <Check className="w-3.5 h-3.5 text-emerald-500 animate-bounce" />
                                        <span className="text-emerald-500 font-bold font-mono text-[9px]">Copied</span>
                                      </>
                                    ) : (
                                      <>
                                        <Copy className="w-3.5 h-3.5 text-zinc-450" />
                                        <span className="text-[10px] hidden sm:inline">Copy Spec Card</span>
                                      </>
                                    )}
                                  </button>

                                                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleAccordion(tc.id);
                                    }}
                                    className="p-1 hover:bg-zinc-200/50 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 rounded transition-colors cursor-pointer"
                                  >
                                    {isOpen ? <ChevronUp className="w-4.5 h-4.5" /> : <ChevronDown className="w-4.5 h-4.5" />}
                                  </button>
                                </div>
                              </div>

                              {/* Accordion Drawer detail list */}
                              {isOpen && (
                                <div className={`p-4 border-t space-y-4 ${
                                  theme === "dark" 
                                    ? "bg-zinc-950/60 border-zinc-800/80" 
                                    : "bg-slate-50/50 border-slate-205"
                                }`}>
                                  
                                  {/* Detailed objective target */}
                                  <div>
                                    <h5 className="text-[9.5px] font-bold tracking-wider text-zinc-400 uppercase font-mono mb-1">
                                      Target Objective & Isolation
                                    </h5>
                                    <p className={`text-xs leading-relaxed font-medium ${
                                      theme === "dark" ? "text-zinc-300" : "text-slate-700"
                                    }`}>
                                      {highlightSearchMatch(tc.testObjective, testCaseSearch)}
                                    </p>
                                  </div>

                                  {/* Detailed Action Steps Loop */}
                                  <div className="space-y-1.5">
                                    <h5 className="text-[9.5px] font-bold tracking-wider text-zinc-400 uppercase font-mono mb-2">
                                      Step-by-Step Executable Scenario
                                    </h5>
                                    <div className="space-y-2">
                                      {tc.testSteps.map((step, stepIdx) => (
                                        <div key={stepIdx} className="flex gap-2.5 text-xs leading-relaxed">
                                          <span className="font-mono font-bold shrink-0 select-none text-xs w-4 text-right text-zinc-500 dark:text-zinc-400">
                                            {stepIdx + 1}.
                                          </span>
                                          <span className={`self-start ${theme === "dark" ? "text-zinc-250" : "text-slate-650"}`}>
                                            {highlightSearchMatch(highlightKeywords(step.trim().replace(/^\d+\.\s*/, "")) as any, testCaseSearch)}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>

                                  {/* Expected Outcome with highlight block */}
                                  <div className={`p-4 rounded-xl border relative overflow-hidden transition-all pl-5 ${
                                    theme === "dark" 
                                      ? "bg-zinc-950/40 border-emerald-800/60 text-zinc-200" 
                                      : "bg-emerald-50/10 border-emerald-500/35 text-slate-800"
                                  }`}>
                                    {/* Green gradient left accent strip */}
                                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-emerald-500 to-teal-500" />
                                    
                                    <h5 className={`text-[9.5px] uppercase font-bold tracking-wider font-mono mb-1.5 flex items-center gap-1.5 ${
                                      theme === "dark" ? "text-emerald-400" : "text-emerald-700"
                                    }`}>
                                      <CheckCircle className="w-3.5 h-3.5 shrink-0 text-emerald-500" />
                                      Expected Validation Outcome
                                    </h5>
                                    <p className="text-xs font-semibold leading-relaxed font-sans">
                                      {highlightSearchMatch(tc.expectedOutput, testCaseSearch)}
                                    </p>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>

                    {/* Append custom verification button */}
                    <button
                      type="button"
                      onClick={triggerOpenManualModal}
                      className={`w-full py-3.5 border border-dashed rounded-xl flex items-center justify-center gap-2 text-xs font-bold transition-all cursor-pointer shadow-xs ${
                        theme === "dark"
                          ? "border-zinc-700 hover:border-zinc-500 hover:bg-zinc-800/40 text-zinc-300 bg-zinc-900/10"
                          : "border-slate-300 hover:border-slate-400 hover:bg-slate-50 text-slate-705 text-slate-705 text-slate-700 bg-slate-50/20"
                      }`}
                    >
                      <PlusCircle className="w-4.5 h-4.5 text-zinc-400 animate-bounce" />
                      <span>Append Manual Verification Case</span>
                    </button>

                  </div>
                </div>
              )}
            </div>

            {/* Overall metadata stats at result box footer */}
            {activeSuite && (
              <div className={`px-5 py-3 text-[9.5px] text-zinc-400 font-mono flex flex-wrap items-center justify-between shrink-0 gap-2 border-t ${
                theme === "dark" ? "bg-zinc-950/40 border-zinc-800" : "bg-slate-50 border-slate-200"
              }`}>
                <span className="font-semibold text-zinc-500 tracking-wider">TSG ACTIVE SPEC SHEETS</span>
                <div className="flex gap-4">
                  <span>CASES LISTED: {activeSuite.testCases.length}</span>
                  <span>BUILD RUNTIME: {activeSuite.timestamp}</span>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ===================================== RIGHT COLUMN: GENERATION LIBRARY ===================================== */}
        <section className="flex flex-col gap-4 overflow-visible">
          
          <div className={`border rounded-2xl p-5 shadow-md flex flex-col gap-3.5 max-h-[85vh] overflow-y-auto transition-all duration-300 ${
            theme === "dark" 
              ? "bg-zinc-900/50 border-zinc-800/80 backdrop-blur-md" 
              : "bg-white border-slate-201 border-slate-200/80 shadow-md shadow-slate-100/50"
          }`}>
            
            <div className="flex items-center justify-between pb-2 border-b border-zinc-200/10 dark:border-zinc-800/60 shrink-0">
              <div className="flex items-center gap-2">
                <History className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                <h3 className="text-[11.5px] font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 font-mono">
                  Spec History
                </h3>
              </div>
              <span className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded border transition-all ${
                theme === "dark" 
                  ? "bg-zinc-800/50 border-zinc-700/30 text-zinc-300" 
                  : "bg-slate-100 border-slate-201 text-slate-700"
              }`}>
                {suiteHistory.length} runs
              </span>
            </div>

            {/* Quick history search filter */}
            <div className="relative shrink-0 mb-1">
              <Search className="w-3 h-3 text-zinc-450 absolute top-2.5 left-2.5" />
              <input
                type="text"
                value={searchHistoryTerm}
                onChange={(e) => setSearchHistoryTerm(e.target.value)}
                placeholder="Search specs history..."
                className={`w-full border rounded-lg pl-7 pr-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-sky-500/30 transition-all ${
                  theme === "dark" 
                    ? "bg-zinc-950 border-zinc-850 text-zinc-100 placeholder:text-zinc-650" 
                    : "bg-slate-50 border-slate-201 text-zinc-850 placeholder:text-slate-400"
                }`}
              />
            </div>

            {/* Import specifications Backup button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className={`w-full py-2 border rounded-xl flex items-center justify-center gap-1.5 text-[11px] font-bold transition-all cursor-pointer ${
                theme === "dark"
                  ? "bg-zinc-950 border-zinc-800 text-zinc-300 hover:bg-zinc-850"
                  : "bg-slate-50 border-slate-205 text-slate-700 hover:bg-slate-100/80 shadow-xs"
              }`}
              title="Import local backup JSON files directly"
            >
              <FolderSync className="w-3.5 h-3.5 text-sky-500" />
              <span>Import Spec JSON Backup</span>
            </button>

            {/* Run Listing */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-[350px] lg:max-h-none">
              {filteredHistory.length === 0 ? (
                <div className="text-center py-12 text-xs text-zinc-400 font-mono">
                  No spec history logged.
                </div>
              ) : (
                filteredHistory.map((item) => {
                  const isActive = activeSuite?.id === item.id;
                  return (
                    <div
                      key={item.id}
                      onClick={() => {
                        setActiveSuite(item);
                        // Open all accordion folders
                        const expanded: Record<string, boolean> = {};
                        item.testCases.forEach((tc) => {
                          expanded[tc.id] = true;
                        });
                        setExpandedCaseIds(expanded);

                        // Load fields in active state inputs
                        setUserStory(item.userStory || item.description || "");
                        setAcceptanceCriteria(item.acceptanceCriteria || "");
                        setRequirementSpec(item.requirementSpec || "");
                        setCustomSpecs(item.customSpecs || "");
                      }}
                      className={`text-left p-3.5 rounded-xl border text-xs transition-all cursor-pointer relative group flex flex-col gap-1.5 ${
                        isActive
                          ? theme === "dark"
                            ? "bg-sky-950/20 border-sky-600/80 text-sky-200 shadow-md"
                            : "bg-sky-50/70 border-sky-500 text-sky-950 shadow-sm"
                          : theme === "dark"
                            ? "bg-zinc-950/50 border-zinc-805/80 text-zinc-300 hover:border-zinc-700"
                            : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50 shadow-xs"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-1.5">
                        <span className="font-mono text-[9px] text-zinc-400 flex items-center gap-1 shrink-0">
                          <Clock className="w-3 h-3 text-sky-500 shrink-0" />
                          {item.timestamp.split(",")[0] || item.timestamp}
                        </span>
                        
                        <button
                          type="button"
                          onClick={(e) => deleteHistorySuite(item.id, e)}
                          className="text-zinc-400 hover:text-rose-500 p-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer shrink-0"
                          title="Delete test specification suite"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <p className={`text-xs font-semibold line-clamp-2 leading-relaxed ${
                        isActive 
                          ? theme === "dark" ? "text-zinc-100" : "text-sky-900"
                          : theme === "dark" ? "text-zinc-200 hover:text-zinc-100" : "text-zinc-800"
                      }`}>
                        {item.description}
                      </p>

                      <div className="flex items-center justify-between text-[8.5px] font-mono text-zinc-400 mt-1.5">
                        <span className={`px-1.5 py-0.5 rounded border leading-none font-bold ${
                          theme === "dark" ? "bg-zinc-900 border-zinc-800" : "bg-slate-100 border-slate-200"
                        }`}>
                          {item.testCases.length} SCENARIOS
                        </span>
                        {item.attachments && item.attachments.length > 0 && (
                          <span className="text-sky-500 font-bold uppercase shrink-0">
                            📎 {item.attachments.length} ATTACHED
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </section>

      </main>

      {/* ===================================== DIALOG SYSTEM MODALS ===================================== */}
      {showAddManualModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-sm overflow-y-auto">
          <div className={`relative w-full max-w-lg rounded-2xl p-6 border shadow-2xl transition-all duration-300 ${
            theme === "dark" ? "bg-zinc-900 border-zinc-805 text-zinc-100" : "bg-white border-slate-205 text-zinc-900"
          }`}>
            <button
              onClick={() => setShowAddManualModal(false)}
              className="absolute top-4 right-4 p-1 rounded-md text-zinc-400 hover:text-rose-500 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-bold font-display uppercase tracking-wider text-sky-500 mb-4 flex items-center gap-2">
              <PlusCircle className="w-5 h-5 text-sky-500" />
              Append Manual Verification Scenario
            </h3>

            <form onSubmit={handleAddManualCase} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] uppercase font-bold tracking-wider text-zinc-400 font-mono block mb-1">
                    Scenario Case ID *
                  </label>
                  <input
                    type="text"
                    required
                    value={manualId}
                    onChange={(e) => setManualId(e.target.value)}
                    placeholder="e.g., TC-007"
                    className={`w-full border rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-sky-500 font-mono ${
                      theme === "dark" ? "bg-zinc-950 border-zinc-800 text-zinc-150" : "bg-slate-100 border-slate-200 text-zinc-800"
                    }`}
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold tracking-wider text-zinc-400 font-mono block mb-1">
                    Scenario Category *
                  </label>
                  <select
                    value={manualScenario}
                    onChange={(e) => setManualScenario(e.target.value)}
                    className={`w-full border rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-sky-500 font-mono ${
                      theme === "dark" ? "bg-zinc-950 border-zinc-800 text-zinc-150" : "bg-slate-100 border-slate-200 text-zinc-800"
                    }`}
                  >
                    <option value="Happy Path">Happy Path</option>
                    <option value="Boundary Limit">Boundary Limit</option>
                    <option value="Input Validation">Input Validation</option>
                    <option value="Exception Flow">Exception Flow</option>
                    <option value="Integration Check">Integration Check</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold tracking-wider text-zinc-400 font-mono block mb-1">
                  Scenario Verification Target *
                </label>
                <input
                  type="text"
                  required
                  value={manualName}
                  onChange={(e) => setManualName(e.target.value)}
                  placeholder="e.g., Verify disk checksum format algorithm triggers warnings at 85% exactly"
                  className={`w-full border rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-sky-500 ${
                    theme === "dark" ? "bg-zinc-950 border-zinc-800 text-zinc-150" : "bg-slate-100 border-slate-200 text-zinc-800"
                  }`}
                />
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold tracking-wider text-zinc-400 font-mono block mb-1">
                  Focus Isolation Objective
                </label>
                <input
                  type="text"
                  value={manualObjective}
                  onChange={(e) => setManualObjective(e.target.value)}
                  placeholder="What logic condition are we specifically isolating?"
                  className={`w-full border rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-sky-500 ${
                    theme === "dark" ? "bg-zinc-950 border-zinc-800 text-zinc-150" : "bg-slate-100 border-slate-200 text-zinc-800"
                  }`}
                />
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold tracking-wider text-zinc-400 font-mono block mb-1">
                  Action Steps Sequence (one step per line) *
                </label>
                <textarea
                  rows={4}
                  required
                  value={manualStepsText}
                  onChange={(e) => setManualStepsText(e.target.value)}
                  placeholder="1. Load administrator dashboard&#10;2. Confirm telemetry alerts parameters matches spec"
                  className={`w-full border rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-sky-500 font-mono ${
                    theme === "dark" ? "bg-zinc-950 border-zinc-800 text-zinc-150" : "bg-slate-100 border-slate-200 text-zinc-800"
                  }`}
                />
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold tracking-wider text-zinc-400 font-mono block mb-1">
                  Expected Output / Outcome *
                </label>
                <textarea
                  rows={2}
                  required
                  value={manualExpected}
                  onChange={(e) => setManualExpected(e.target.value)}
                  placeholder="Logs warning alerts payload and triggers download checks."
                  className={`w-full border rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-sky-500 font-mono ${
                    theme === "dark" ? "bg-zinc-950 border-zinc-800 text-zinc-150" : "bg-slate-100 border-slate-200 text-zinc-800"
                  }`}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddManualModal(false)}
                  className={`flex-1 py-2 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                    theme === "dark"
                      ? "border-zinc-800 hover:bg-zinc-805 text-zinc-400"
                      : "border-slate-200 hover:bg-slate-50 text-slate-700"
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 text-xs font-semibold rounded-lg bg-sky-600 hover:bg-sky-700 text-white transition-all cursor-pointer shadow-md shadow-sky-500/10"
                >
                  Create Scenario
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Center prominent Footer with links */}
      <footer className={`mt-auto border-t text-xs py-5 text-center flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 relative z-30 shrink-0 transition-all duration-310 ${
        theme === "dark" 
          ? "border-zinc-900 bg-zinc-950/90 text-zinc-500" 
          : "border-slate-200 bg-white text-zinc-500"
      }`}>
        <span className="flex items-center gap-1">
          Created by <strong className={`font-semibold font-display ${theme === "dark" ? "text-zinc-300" : "text-zinc-800"}`}>Aman Kumar</strong>
        </span>
        <span className="hidden sm:inline-block text-zinc-300 dark:text-zinc-800">|</span>
        <div className="flex items-center gap-3">
          <a
            href="https://www.linkedin.com/in/im-aman-kumar/"
            target="_blank"
            rel="noopener noreferrer"
            className={`hover:underline font-semibold flex items-center gap-1 ${
              theme === "dark" ? "text-zinc-400 hover:text-sky-400" : "text-slate-650 hover:text-sky-600"
            }`}
          >
            LinkedIn
            <ExternalLink className="w-2.5 h-2.5 opacity-60" />
          </a>
          <span className="text-zinc-300 dark:text-zinc-800">•</span>
          <a
            href="https://github.com/im-amankumar"
            target="_blank"
            rel="noopener noreferrer"
            className={`hover:underline font-semibold flex items-center gap-1 ${
              theme === "dark" ? "text-zinc-400 hover:text-sky-400" : "text-slate-650 hover:text-sky-600"
            }`}
          >
            GitHub
            <ExternalLink className="w-2.5 h-2.5 opacity-60" />
          </a>
        </div>
      </footer>
    </div>
  );
}
