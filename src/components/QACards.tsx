import React, { useState, useMemo, useEffect, useRef } from 'react';
import { HelpCircle, Search, ChevronDown, ChevronUp, MessageSquare, Lightbulb, RefreshCw, AlertCircle, Sparkles, Sliders, Type } from 'lucide-react';

interface QACardsProps {
  columns: string[];
  rows: Record<string, any>[];
  onRefresh: () => void;
  isRefreshing: boolean;
}

export default function QACards({ columns, rows, onRefresh, isRefreshing }: QACardsProps) {
  const [qColumn, setQColumn] = useState<string>('');
  const [aColumn, setAColumn] = useState<string>('');
  const [categoryColumn, setCategoryColumn] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCards, setExpandedCards] = useState<Record<number, boolean>>({});
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [textSize, setTextSize] = useState<'sm' | 'base' | 'lg' | 'xl'>('base');
  
  // Real-time synchronization states
  const [isAutoSync, setIsAutoSync] = useState(true);
  const [countdown, setCountdown] = useState(30);
  const [lastSynced, setLastSynced] = useState<Date>(new Date());
  const [showConfig, setShowConfig] = useState(false);

  // Stable refresh reference
  const onRefreshRef = useRef(onRefresh);
  useEffect(() => {
    onRefreshRef.current = onRefresh;
  }, [onRefresh]);

  // Sync state update when actual network refresh completes
  useEffect(() => {
    if (!isRefreshing) {
      setLastSynced(new Date());
      setCountdown(30);
    }
  }, [isRefreshing]);

  // Auto synchronization polling timer (30 seconds)
  useEffect(() => {
    if (!isAutoSync) return;

    const timer = setInterval(() => {
      setCountdown(prev => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [isAutoSync]);

  // Trigger refresh when countdown hits 0
  useEffect(() => {
    if (!isAutoSync) return;
    if (countdown <= 0) {
      onRefreshRef.current();
      setCountdown(30);
    }
  }, [countdown, isAutoSync]);

  // Intelligent column auto-detection
  useEffect(() => {
    if (columns.length > 0) {
      // Find Question column
      const qKeywords = ['질문', 'question', 'q', '예상질문', '제목', '주제', 'title'];
      const detectedQ = columns.find(col =>
        qKeywords.some(keyword => col.toLowerCase().includes(keyword))
      ) || columns[0];
      setQColumn(detectedQ);

      // Find Answer column
      const aKeywords = ['답변', 'answer', 'a', '예상답변', '내용', '설명', 'content', 'body'];
      const detectedA = columns.find(col =>
        col !== detectedQ && aKeywords.some(keyword => col.toLowerCase().includes(keyword))
      ) || columns[1] || columns[0];
      setAColumn(detectedA);

      // Find Category column
      const catKeywords = ['카테고리', '분류', 'category', 'tag', '태그', '구분', 'type'];
      const detectedCat = columns.find(col =>
        col !== detectedQ && col !== detectedA && catKeywords.some(keyword => col.toLowerCase().includes(keyword))
      ) || '';
      setCategoryColumn(detectedCat);
    }
  }, [columns]);

  // Expand or collapse helper
  const handleToggleExpand = (index: number) => {
    setExpandedCards(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  // Extract all unique categories
  const categories = useMemo(() => {
    if (!categoryColumn) return [];
    const set = new Set<string>();
    rows.forEach(row => {
      // Ignore rows with blank questions
      const question = String(row[qColumn] || '').trim();
      if (!question) return;

      const val = row[categoryColumn];
      if (val !== undefined && val !== null && String(val).trim() !== '') {
        set.add(String(val).trim());
      }
    });
    return Array.from(set);
  }, [rows, qColumn, categoryColumn]);

  // Count of all questions that are not empty
  const validQuestionsCount = useMemo(() => {
    if (!qColumn) return 0;
    return rows.filter(row => String(row[qColumn] || '').trim() !== '').length;
  }, [rows, qColumn]);

  // Define text size class mappings based on textSize state
  const questionSizeClass = useMemo(() => {
    switch (textSize) {
      case 'sm': return 'text-xs';
      case 'lg': return 'text-base sm:text-lg';
      case 'xl': return 'text-lg sm:text-xl';
      case 'base':
      default:
        return 'text-sm sm:text-base';
    }
  }, [textSize]);

  const answerSizeClass = useMemo(() => {
    switch (textSize) {
      case 'sm': return 'text-[11px]';
      case 'lg': return 'text-sm sm:text-base';
      case 'xl': return 'text-base sm:text-lg';
      case 'base':
      default:
        return 'text-xs sm:text-sm';
    }
  }, [textSize]);

  // Filter rows by search query & category selection
  const filteredQAs = useMemo(() => {
    if (!qColumn || !aColumn) return [];

    return rows.filter((row) => {
      const question = String(row[qColumn] || '').trim();
      
      // Automatically hide cards with empty or whitespace-only questions
      if (!question) return false;

      const answer = String(row[aColumn] || '');
      const category = categoryColumn ? String(row[categoryColumn] || '') : '';

      const matchesSearch =
        question.toLowerCase().includes(searchQuery.toLowerCase()) ||
        answer.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategory =
        selectedCategory === 'all' ||
        category.trim() === selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }, [rows, qColumn, aColumn, categoryColumn, searchQuery, selectedCategory]);

  return (
    <div className="space-y-6" id="qa-dashboard-container">
      {/* Header and Sync Control Area */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2 font-sans">
            <MessageSquare className="w-5 h-5 text-indigo-600 shrink-0" />
            실시간 Q&A 카드 익스플로러
          </h2>
          <p className="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-1.5">
            <span>구글 스프레드시트의 질문과 답변 목록을 실시간 동기화하여 시각화합니다.</span>
            <span className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded-md font-bold">
              <Sparkles className="w-3 h-3 text-indigo-500" />
              컬럼 자동 감지 적용됨
            </span>
          </p>
        </div>

        {/* Sync Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Last Synced & Countdown Info */}
          <div className="text-right hidden md:block">
            <p className="text-[10px] text-slate-400 font-medium">
              마지막 동기화: {lastSynced.toLocaleTimeString()}
            </p>
            {isAutoSync ? (
              <p className="text-xs text-indigo-600 font-bold flex items-center gap-1 justify-end font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-ping"></span>
                {countdown}초 후 자동 갱신
              </p>
            ) : (
              <p className="text-xs text-slate-400 font-bold">자동 갱신 꺼짐</p>
            )}
          </div>

          {/* Toggle Switches */}
          <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-xl">
            <button
              onClick={() => setIsAutoSync(!isAutoSync)}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                isAutoSync ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-500'
              }`}
            >
              자동 {isAutoSync ? 'ON' : 'OFF'}
            </button>
            <button
              onClick={() => {
                setCountdown(30);
                onRefresh();
              }}
              disabled={isRefreshing}
              className="p-1 text-slate-600 hover:text-slate-900 disabled:opacity-50 cursor-pointer"
              title="지금 동기화"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Text Size Controls */}
          <div className="flex items-center gap-1 bg-slate-100 p-1.5 rounded-xl">
            <div className="p-1 text-slate-500 flex items-center justify-center" title="글자 크기">
              <Type className="w-3.5 h-3.5" />
            </div>
            <button
              onClick={() => setTextSize('sm')}
              className={`px-2 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                textSize === 'sm' ? 'bg-white text-indigo-600 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              작게
            </button>
            <button
              onClick={() => setTextSize('base')}
              className={`px-2 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                textSize === 'base' ? 'bg-white text-indigo-600 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              보통
            </button>
            <button
              onClick={() => setTextSize('lg')}
              className={`px-2 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                textSize === 'lg' ? 'bg-white text-indigo-600 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              크게
            </button>
            <button
              onClick={() => setTextSize('xl')}
              className={`px-2 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                textSize === 'xl' ? 'bg-white text-indigo-600 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              더크게
            </button>
          </div>

          <button
            onClick={() => setShowConfig(!showConfig)}
            className={`flex items-center gap-1 px-3 py-1.5 border rounded-xl text-xs font-bold transition-all cursor-pointer ${
              showConfig ? 'border-indigo-600 bg-indigo-50 text-indigo-600' : 'border-slate-200 hover:bg-slate-50 text-slate-700'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            컬럼 설정
          </button>
        </div>
      </div>

      {/* Interactive Column Mapper Drawer / Accordion */}
      {showConfig && (
        <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block font-sans">
              질문 컬럼 (Question)
            </label>
            <select
              value={qColumn}
              onChange={(e) => setQColumn(e.target.value)}
              className="w-full bg-white border border-slate-200 hover:border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-700 font-sans focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all cursor-pointer"
            >
              {columns.map(col => (
                <option key={col} value={col}>{col}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block font-sans">
              답변 컬럼 (Answer)
            </label>
            <select
              value={aColumn}
              onChange={(e) => setAColumn(e.target.value)}
              className="w-full bg-white border border-slate-200 hover:border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-700 font-sans focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all cursor-pointer"
            >
              {columns.map(col => (
                <option key={col} value={col}>{col}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block font-sans">
              카테고리 분류 컬럼 (선택)
            </label>
            <select
              value={categoryColumn}
              onChange={(e) => setCategoryColumn(e.target.value)}
              className="w-full bg-white border border-slate-200 hover:border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-700 font-sans focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all cursor-pointer"
            >
              <option value="">-- 없음 --</option>
              {columns.map(col => (
                <option key={col} value={col}>{col}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Filter and Search Panel */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-4">
        {/* Search Input */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="질문 또는 답변 내용으로 실시간 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 hover:bg-slate-50/75 focus:bg-white border border-slate-200 hover:border-slate-300 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-700 font-sans focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
          />
        </div>

        {/* Category Pills */}
        {categories.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                selectedCategory === 'all'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-600'
              }`}
            >
              전체 분류 ({validQuestionsCount})
            </button>
            {categories.map((cat) => {
              const count = rows.filter(r => {
                const question = String(r[qColumn] || '').trim();
                return question && String(r[categoryColumn] || '').trim() === cat;
              }).length;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    selectedCategory === cat
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-600'
                  }`}
                >
                  {cat} ({count})
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* QA Grid layout */}
      {filteredQAs.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-slate-200 flex flex-col items-center justify-center min-h-[300px]">
          <AlertCircle className="w-8 h-8 text-slate-300 mb-3" />
          <p className="text-sm text-slate-500 font-bold">검색 결과가 존재하지 않습니다.</p>
          <p className="text-xs text-slate-400 mt-1">필터를 초기화하거나 다른 검색어로 검색해보세요.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredQAs.map((row, idx) => {
            const rowIndex = row._index as number || idx;
            const isExpanded = !!expandedCards[rowIndex];
            const question = String(row[qColumn] || 'Untitled Question');
            const answer = String(row[aColumn] || 'No answer provided.');
            const category = categoryColumn ? String(row[categoryColumn] || '') : '';

            return (
              <div
                key={rowIndex}
                className={`bg-white rounded-2xl border border-slate-200 hover:border-slate-300 hover:shadow-xs transition-all overflow-hidden flex flex-col justify-between ${
                  isExpanded ? 'shadow-md ring-1 ring-indigo-500/5' : 'shadow-2xs'
                }`}
              >
                <div className="p-6 space-y-4">
                  {/* Category and Index Badge */}
                  <div className="flex justify-between items-center gap-2">
                    <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-indigo-600 font-display bg-indigo-50 px-2 py-0.5 rounded-md">
                      <HelpCircle className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                      Q&A {idx + 1}
                    </span>
                    {category && (
                      <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-sans">
                        {category}
                      </span>
                    )}
                  </div>

                  {/* Question Header */}
                  <h4 className={`${questionSizeClass} font-bold text-slate-900 leading-relaxed font-sans`}>
                    {question}
                  </h4>

                  {/* Aesthetic Separation Line */}
                  <div className="border-t border-slate-100 my-2" />

                  {/* Answer Container */}
                  <div className="space-y-1.5">
                    <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-emerald-600 font-display">
                      <Lightbulb className="w-3.5 h-3.5 text-emerald-500" />
                      답변 내용
                    </span>
                    <p
                      className={`${answerSizeClass} text-slate-600 leading-relaxed font-sans transition-all duration-300 ${
                        isExpanded ? '' : 'line-clamp-3'
                      }`}
                      style={{ whiteSpace: 'pre-line' }}
                    >
                      {answer}
                    </p>
                  </div>
                </div>

                {/* Expansion Footer bar */}
                <div className="px-6 py-3 bg-slate-50/50 border-t border-slate-100 flex justify-end">
                  <button
                    onClick={() => handleToggleExpand(rowIndex)}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-all flex items-center gap-1 cursor-pointer"
                  >
                    {isExpanded ? (
                      <>
                        답변 접기
                        <ChevronUp className="w-4 h-4" />
                      </>
                    ) : (
                      <>
                        전체 답변 읽기
                        <ChevronDown className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
