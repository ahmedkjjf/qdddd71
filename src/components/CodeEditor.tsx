import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Search, CornerDownLeft, ArrowUp, ArrowDown, Check, Clock, AlertCircle } from 'lucide-react';

interface CodeEditorProps {
  code: string;
  onChange: (value: string) => void;
  newLinesIndices: Set<number>;
  highlightRedNewLines: boolean;
  saveStatus?: 'saved' | 'saving' | 'unsaved';
  onSave?: () => void;
}

const LINE_HEIGHT = 24; // 24px per line (matching leading-6 and text-xs)
const PADDING_TOP = 16; // 16px (matching p-4)

export const CodeEditor: React.FC<CodeEditorProps> = ({
  code,
  onChange,
  newLinesIndices,
  highlightRedNewLines,
  saveStatus = 'saved',
  onSave,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const gutterRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(550);
  const [jumpLineInput, setJumpLineInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [searchResults, setSearchResults] = useState<number[]>([]);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);

  const lines = code.split('\n');
  const lineCount = lines.length;
  const totalGutterHeight = lineCount * LINE_HEIGHT + PADDING_TOP * 2;

  // Track viewport height on resize
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setViewportHeight(entry.contentRect.height);
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Handle scrolling and update virtual window
  const handleScroll = useCallback(() => {
    if (!textareaRef.current) return;
    const currentScrollTop = textareaRef.current.scrollTop;
    setScrollTop(currentScrollTop);
    if (gutterRef.current) {
      gutterRef.current.scrollTop = currentScrollTop;
    }
  }, []);

  // Virtualization calculations: only render lines visible in viewport (+ buffer)
  const buffer = 15;
  const startLineIndex = Math.max(0, Math.floor((scrollTop - PADDING_TOP) / LINE_HEIGHT) - buffer);
  const endLineIndex = Math.min(lineCount, Math.ceil((scrollTop + viewportHeight) / LINE_HEIGHT) + buffer);

  const visibleLineNumbers: number[] = [];
  for (let i = startLineIndex; i < endLineIndex; i++) {
    visibleLineNumbers.push(i + 1);
  }

  // Jump to specific line
  const handleJumpToLine = (targetLineNum?: number) => {
    const target = targetLineNum !== undefined ? targetLineNum : parseInt(jumpLineInput, 10);
    if (!target || isNaN(target)) return;
    const clampedLine = Math.max(1, Math.min(lineCount, target));
    
    if (textareaRef.current) {
      const scrollPos = (clampedLine - 1) * LINE_HEIGHT;
      textareaRef.current.scrollTop = scrollPos;
      setScrollTop(scrollPos);
      if (gutterRef.current) {
        gutterRef.current.scrollTop = scrollPos;
      }
    }
    setJumpLineInput('');
  };

  // Search feature inside code
  const performSearch = (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults([]);
      setCurrentMatchIndex(0);
      return;
    }

    const matches: number[] = [];
    const lowerQuery = query.toLowerCase();
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].toLowerCase().includes(lowerQuery)) {
        matches.push(i + 1);
      }
    }
    setSearchResults(matches);
    setCurrentMatchIndex(0);
    if (matches.length > 0) {
      handleJumpToLine(matches[0]);
    }
  };

  const handleNextSearch = () => {
    if (searchResults.length === 0) return;
    const nextIdx = (currentMatchIndex + 1) % searchResults.length;
    setCurrentMatchIndex(nextIdx);
    handleJumpToLine(searchResults[nextIdx]);
  };

  const handlePrevSearch = () => {
    if (searchResults.length === 0) return;
    const prevIdx = (currentMatchIndex - 1 + searchResults.length) % searchResults.length;
    setCurrentMatchIndex(prevIdx);
    handleJumpToLine(searchResults[prevIdx]);
  };

  // Keyboard shortcuts (Tab for 2-space indent, Ctrl+S for save, Ctrl+F for search)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Ctrl+S / Cmd+S save
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      if (onSave) onSave();
      return;
    }

    // Ctrl+F / Cmd+F search
    if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
      e.preventDefault();
      setShowSearch(true);
      return;
    }

    // Tab key
    if (e.key === 'Tab') {
      e.preventDefault();
      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;

      const updatedCode = code.substring(0, start) + '  ' + code.substring(end);
      onChange(updatedCode);

      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 2;
      }, 0);
    }
  };

  return (
    <div className="flex flex-col w-full bg-[#070709] border border-zinc-800 rounded-xl overflow-hidden shadow-2xl shadow-black/80">
      {/* Editor Top Bar */}
      <div className="flex flex-wrap items-center justify-between px-3 py-2 bg-[#0d0d11] border-b border-zinc-800/80 gap-2 select-none text-xs">
        {/* Left side: Stats & Line Jump */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-zinc-400 font-mono text-[11px] bg-zinc-900/90 px-2.5 py-1 rounded-md border border-zinc-800">
            <span className="text-zinc-200 font-bold">{lineCount.toLocaleString('ar-EG')}</span>
            <span>سطر</span>
            <span className="text-zinc-600">•</span>
            <span>{(code.length / 1024).toFixed(1)} KB</span>
          </div>

          {/* Quick Jump to Line */}
          <div className="flex items-center gap-1 bg-zinc-900/80 border border-zinc-800 rounded-md px-2 py-0.5">
            <span className="text-zinc-500 text-[10px]">سطر:</span>
            <input
              type="number"
              min="1"
              max={lineCount}
              value={jumpLineInput}
              onChange={(e) => setJumpLineInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleJumpToLine();
              }}
              placeholder={`1-${lineCount}`}
              className="w-14 bg-transparent text-zinc-200 font-mono text-xs focus:outline-none text-center"
            />
            <button
              onClick={() => handleJumpToLine()}
              title="انتقل للسطر المحدد"
              className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-purple-400 transition-colors cursor-pointer"
            >
              <CornerDownLeft className="w-3 h-3" />
            </button>
          </div>

          {/* Jump to bottom / top shortcuts */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => handleJumpToLine(1)}
              title="الذهاب للبداية (السطر 1)"
              className="px-2 py-0.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-zinc-200 rounded text-[10px] font-mono transition-colors cursor-pointer"
            >
              الأول
            </button>
            <button
              onClick={() => handleJumpToLine(lineCount)}
              title={`الذهاب للنهاية (السطر ${lineCount})`}
              className="px-2 py-0.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-zinc-200 rounded text-[10px] font-mono transition-colors cursor-pointer"
            >
              الأخير
            </button>
          </div>
        </div>

        {/* Right side: Search Toggle & Auto-Save Indicator */}
        <div className="flex items-center gap-2">
          {/* Search Bar Toggle */}
          <button
            onClick={() => setShowSearch(!showSearch)}
            className={`px-2.5 py-1 rounded-md text-[11px] font-medium border transition-colors flex items-center gap-1.5 cursor-pointer ${
              showSearch
                ? 'bg-purple-950/80 border-purple-600/50 text-purple-300'
                : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
            }`}
            title="البحث في الكود (Ctrl+F)"
          >
            <Search className="w-3 h-3" />
            <span>بحث</span>
          </button>

          {/* Cloud Auto-Save Status Badge */}
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium border ${
              saveStatus === 'saved'
                ? 'bg-emerald-950/40 border-emerald-800/40 text-emerald-400'
                : saveStatus === 'saving'
                ? 'bg-amber-950/40 border-amber-800/40 text-amber-300 animate-pulse'
                : 'bg-orange-950/40 border-orange-800/40 text-orange-300'
            }`}
          >
            {saveStatus === 'saved' && <Check className="w-3 h-3" />}
            {saveStatus === 'saving' && <Clock className="w-3 h-3 animate-spin" />}
            {saveStatus === 'unsaved' && <AlertCircle className="w-3 h-3" />}
            <span>
              {saveStatus === 'saved'
                ? 'محفوظ سحابياً ✓'
                : saveStatus === 'saving'
                ? 'جاري الحفظ...'
                : 'تعديلات غير محفوظة'}
            </span>
          </div>
        </div>
      </div>

      {/* Floating In-Editor Search Box */}
      {showSearch && (
        <div className="flex items-center gap-2 px-4 py-2 bg-[#121217] border-b border-zinc-800 text-xs select-none">
          <Search className="w-3.5 h-3.5 text-zinc-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => performSearch(e.target.value)}
            placeholder="اكتب للبحث داخل الكود..."
            className="flex-1 bg-zinc-900 border border-zinc-700/80 rounded px-2.5 py-1 text-zinc-100 placeholder:text-zinc-500 font-mono text-xs focus:outline-none focus:border-purple-500"
            autoFocus
          />
          {searchResults.length > 0 ? (
            <span className="text-[11px] font-mono text-zinc-400 px-1">
              {currentMatchIndex + 1} من {searchResults.length}
            </span>
          ) : searchQuery.trim() ? (
            <span className="text-[11px] text-zinc-500 px-1">لا توجد نتائج</span>
          ) : null}

          <div className="flex items-center gap-1">
            <button
              onClick={handlePrevSearch}
              disabled={searchResults.length === 0}
              className="p-1 hover:bg-zinc-800 disabled:opacity-30 rounded text-zinc-300 cursor-pointer"
              title="السابق"
            >
              <ArrowUp className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleNextSearch}
              disabled={searchResults.length === 0}
              className="p-1 hover:bg-zinc-800 disabled:opacity-30 rounded text-zinc-300 cursor-pointer"
              title="التالي"
            >
              <ArrowDown className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => {
                setShowSearch(false);
                setSearchQuery('');
                setSearchResults([]);
              }}
              className="text-zinc-500 hover:text-zinc-300 px-2 py-0.5 text-xs rounded hover:bg-zinc-800 cursor-pointer"
            >
              إغلاق
            </button>
          </div>
        </div>
      )}

      {/* Main Editor Body: STRICTLY LTR to prevent line-number inversion */}
      <div
        ref={containerRef}
        dir="ltr"
        className="flex overflow-hidden h-[540px] max-h-[700px] relative font-mono text-xs leading-6 bg-[#060608] text-left"
      >
        {/* Virtualized Line Numbers Column on the LEFT */}
        <div
          ref={gutterRef}
          aria-hidden="true"
          className="bg-[#0a0a0d] border-r border-zinc-800/90 text-right select-none w-14 shrink-0 overflow-hidden relative shadow-inner"
        >
          {/* Spacer to match total scroll height */}
          <div style={{ height: `${totalGutterHeight}px`, position: 'relative' }}>
            {visibleLineNumbers.map((num) => {
              const isNew = highlightRedNewLines && newLinesIndices.has(num);
              const topOffset = PADDING_TOP + (num - 1) * LINE_HEIGHT;
              return (
                <div
                  key={num}
                  style={{
                    position: 'absolute',
                    top: `${topOffset}px`,
                    left: 0,
                    right: 0,
                    height: `${LINE_HEIGHT}px`,
                  }}
                  className={`pr-2.5 pl-1 flex items-center justify-end font-mono text-[11px] leading-6 transition-colors ${
                    isNew
                      ? 'text-red-300 font-extrabold bg-red-950/80 border-r-2 border-red-500'
                      : 'text-zinc-600 hover:text-zinc-400'
                  }`}
                  title={isNew ? 'سطر جديد مضاف 🔴' : undefined}
                >
                  {isNew && <span className="text-[8px] mr-1 text-red-400">🔴</span>}
                  <span>{num}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Textarea Container with 1:1 Synchronized Line Height & wrap="off" */}
        <div className="relative flex-1 h-full overflow-hidden bg-[#060608]">
          <textarea
            ref={textareaRef}
            value={code}
            onChange={(e) => onChange(e.target.value)}
            onScroll={handleScroll}
            onKeyDown={handleKeyDown}
            wrap="off"
            dir="ltr"
            spellCheck="false"
            autoCapitalize="off"
            autoComplete="off"
            autoCorrect="off"
            placeholder="// اكتب أو ألصق كود البوت هنا..."
            className="w-full h-full p-4 font-mono text-xs leading-6 bg-[#060608] text-zinc-100 caret-purple-400 focus:outline-none resize-none overflow-auto whitespace-pre tab-size-2 text-left selection:bg-purple-600/40 selection:text-white"
            style={{
              lineHeight: `${LINE_HEIGHT}px`,
              fontSize: '12px',
              tabSize: 2,
            }}
          />
        </div>
      </div>
    </div>
  );
};
