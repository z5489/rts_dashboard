import React, { useState, useEffect, useRef } from 'react';
// Trigger Vercel redeployment
import Papa from 'papaparse';
import FilterBar from './components/FilterBar';
import LegendPanel from './components/LegendPanel';
import TableView from './components/TableView';
import CardView from './components/CardView';
import { LayoutGrid, Table, Calendar, AlertCircle, RefreshCw, TrendingUp, Download, ChevronDown } from 'lucide-react';

const COLOR_MAP = {
  green: { name: 'Green', font: '#4ade80', accent: '#22c55e', badgeBg: 'rgba(34, 197, 94, 0.15)' },
  yellow: { name: 'Yellow', font: '#facc15', accent: '#eab308', badgeBg: 'rgba(234, 179, 8, 0.15)' },
  orange: { name: 'Orange', font: '#fb923c', accent: '#f97316', badgeBg: 'rgba(249, 115, 22, 0.15)' },
  purple: { name: 'Purple', font: '#c084fc', accent: '#a855f7', badgeBg: 'rgba(168, 85, 247, 0.15)' },
  red: { name: 'Red', font: '#f87171', accent: '#ef4444', badgeBg: 'rgba(239, 68, 68, 0.15)' },
  blue: { name: 'Blue', font: '#60a5fa', accent: '#3b82f6', badgeBg: 'rgba(59, 130, 246, 0.15)' },
  default: { name: 'None', font: '#94a3b8', accent: '#475569', badgeBg: 'rgba(71, 85, 105, 0.15)' }
};

const DEFAULT_FILTERS = {
  grades: [],
  colors: [],
  minExtension: -10,
  maxExtension: 20,
  sectors: [],
  industries: [],
  minPrice: 0,
  minATR: 0,
  minVolume: 0,
  stages: [],
  tickerQuery: ''
};

export default function App() {
  const [dates, setDates] = useState([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // View mode: 'table' or 'card'
  const [viewMode, setViewMode] = useState('table');
  
  // Filter settings
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);
  
  // Sorting settings
  const [sortConfig, setSortConfig] = useState({ key: 'rts_grade_rank', direction: 'asc' });
  const [expandedStock, setExpandedStock] = useState(null);
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false);
  const exportRef = useRef(null);

  // Click outside listener for export dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      if (exportRef.current && !exportRef.current.contains(event.target)) {
        setExportDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const exportToCSV = (exportType) => {
    if (!sortedData || sortedData.length === 0) return;

    let csvContent = "";
    let filename = "";

    if (exportType === 'full') {
      const headers = Object.keys(sortedData[0]);
      csvContent += headers.join(",") + "\n";
      
      sortedData.forEach(row => {
        const values = headers.map(header => {
          const val = row[header];
          if (typeof val === 'string' && (val.includes(',') || val.includes('"') || val.includes('\n'))) {
            return `"${val.replace(/"/g, '""')}"`;
          }
          return val !== undefined && val !== null ? val : '';
        });
        csvContent += values.join(",") + "\n";
      });
      filename = `rts_export_full_${selectedDate || 'data'}.csv`;
    } else if (exportType === 'tickers') {
      csvContent += "ticker\n";
      sortedData.forEach(row => {
        if (row.ticker) {
          csvContent += `${row.ticker}\n`;
        }
      });
      filename = `rts_export_tickers_${selectedDate || 'data'}.csv`;
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Sector and Industry lists
  const [allSectors, setAllSectors] = useState([]);
  const [allIndustries, setAllIndustries] = useState([]);

  // Fetch available dates on mount
  useEffect(() => {
    const fetchDates = async () => {
      try {
        const response = await fetch('/data/manifest.json');
        if (!response.ok) {
          throw new Error('Manifest file not found.');
        }
        const datesList = await response.json();
        setDates(datesList);
        if (datesList && datesList.length > 0) {
          setSelectedDate(datesList[0]);
        } else {
          setError("No RTS data files available in data directory.");
          setLoading(false);
        }
      } catch (err) {
        console.error("Failed to load dates manifest:", err);
        setError("No manifest.json found. Run the data pipeline first to generate data.");
        setLoading(false);
      }
    };
    fetchDates();
  }, []);

  // Fetch CSV data for the selected date
  useEffect(() => {
    if (!selectedDate) return;
    
    let active = true;
    setLoading(true);
    setError(null);
    setExpandedStock(null);

    const loadData = () => {
      const csvUrl = `/data/rts_${selectedDate}.csv`;
      Papa.parse(csvUrl, {
        download: true,
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        complete: (results) => {
          if (!active) return;
          
          const parsed = results.data
            .filter(row => row.ticker && row.rts_grade !== undefined)
            .map(row => ({
              ...row,
              // Convert fields to guarantee numbers
              close: parseFloat(row.close),
              atr14: parseFloat(row.atr14),
              sma50: parseFloat(row.sma50),
              sma200: parseFloat(row.sma200),
              atr_extension: parseFloat(row.atr_extension),
              rs_3m: parseFloat(row.rs_3m),
              rs_6m: parseFloat(row.rs_6m),
              rs_12m: parseFloat(row.rs_12m),
              rs_score: parseFloat(row.rs_score),
              rs_percentile: parseFloat(row.rs_percentile),
              trend_strength: parseFloat(row.trend_strength),
              stage: parseInt(row.stage),
              '52w_high': parseFloat(row['52w_high']),
              '52w_low': parseFloat(row['52w_low']),
              pct_from_52w_high: parseFloat(row.pct_from_52w_high),
              rts_composite: parseFloat(row.rts_composite),
              rts_grade_rank: parseInt(row.rts_grade_rank),
              colour_band: row.colour_band ? String(row.colour_band).trim() : ''
            }));
            
          setData(parsed);
          
          // Compute unique sectors
          const sectors = sortedUnique(parsed.map(s => s.sector));
          setAllSectors(sectors);
          
          setLoading(false);
        },
        error: (err) => {
          if (!active) return;
          console.error("Error parsing CSV:", err);
          setError(`Failed to load data for date ${selectedDate}`);
          setLoading(false);
        }
      });
    };

    loadData();
    return () => {
      active = false;
    };
  }, [selectedDate]);

  // Compute industries whenever sectors filter or data changes
  useEffect(() => {
    if (data.length === 0) return;
    
    let filteredData = data;
    if (filters.sectors.length > 0) {
      filteredData = data.filter(s => filters.sectors.includes(s.sector));
    }
    const industries = sortedUnique(filteredData.map(s => s.industry));
    setAllIndustries(industries);
    
    // Clear any selected industry that is no longer in the list
    if (filters.industries.length > 0) {
      const valid = filters.industries.filter(ind => industries.includes(ind));
      if (valid.length !== filters.industries.length) {
        setFilters(prev => ({ ...prev, industries: valid }));
      }
    }
  }, [data, filters.sectors]);

  const sortedUnique = (arr) => {
    return Array.from(new Set(arr.filter(Boolean))).sort();
  };

  // Helper to count active filters
  const getActiveFilterCount = () => {
    let count = 0;
    if (filters.grades.length > 0) count++;
    if (filters.colors.length > 0) count++;
    if (filters.minExtension !== DEFAULT_FILTERS.minExtension) count++;
    if (filters.maxExtension !== DEFAULT_FILTERS.maxExtension) count++;
    if (filters.sectors.length > 0) count++;
    if (filters.industries.length > 0) count++;
    if (filters.minPrice > 0) count++;
    if (filters.minATR > 0) count++;
    if (filters.minVolume > 0) count++;
    if (filters.stages.length > 0) count++;
    if (filters.tickerQuery && filters.tickerQuery.trim() !== '') count++;
    return count;
  };

  const handleResetFilters = () => {
    setFilters(DEFAULT_FILTERS);
  };

  // Sort Handler
  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Filter Data
  const filteredData = data.filter(stock => {
    if (filters.tickerQuery && filters.tickerQuery.trim() !== '') {
      const tokens = filters.tickerQuery
        .split(/[\s,]+/)
        .map(t => t.trim().toUpperCase())
        .filter(Boolean);
      if (tokens.length > 0) {
        const matches = tokens.some(t => stock.ticker && stock.ticker.toUpperCase().includes(t));
        if (!matches) return false;
      }
    }
    if (filters.grades.length > 0 && !filters.grades.includes(stock.rts_grade)) return false;
    if (filters.colors.length > 0 && !filters.colors.includes(stock.colour_band)) return false;
    if (stock.atr_extension < filters.minExtension || stock.atr_extension > filters.maxExtension) return false;
    if (filters.sectors.length > 0 && !filters.sectors.includes(stock.sector)) return false;
    if (filters.industries.length > 0 && !filters.industries.includes(stock.industry)) return false;
    if (stock.close < filters.minPrice) return false;
    if (stock.atr14 < filters.minATR) return false;
    if (stock.avg_volume_50d < filters.minVolume) return false;
    if (filters.stages.length > 0 && !filters.stages.includes(stock.stage)) return false;
    return true;
  });

  // Sort Data
  const sortedData = [...filteredData].sort((a, b) => {
    let valA = a[sortConfig.key];
    let valB = b[sortConfig.key];

    // Tie-breaker for default Grade rank sorting: RS score descending
    if (valA === valB && sortConfig.key === 'rts_grade_rank') {
      return b.rs_score - a.rs_score;
    }

    if (valA === undefined || valA === null) return 1;
    if (valB === undefined || valB === null) return -1;

    if (typeof valA === 'string') {
      return sortConfig.direction === 'asc' 
        ? valA.localeCompare(valB) 
        : valB.localeCompare(valA);
    } else {
      return sortConfig.direction === 'asc' 
        ? valA - valB 
        : valB - valA;
    }
  });

  const activeFilterCount = getActiveFilterCount();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      
      {/* Top Navbar */}
      <header className="border-b border-slate-800/80 bg-slate-900/40 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-xl text-white shadow-lg shadow-indigo-600/30">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tight text-white m-0 leading-none">RTS Dashboard</h1>
              <span className="text-[10px] text-slate-500 font-semibold tracking-wider uppercase">Steve Jacobs System</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Date Pick Picker */}
            {dates.length > 0 && (
              <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 gap-2 shadow-inner">
                <Calendar className="w-4 h-4 text-indigo-400" />
                <select
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-transparent border-none text-slate-200 text-xs font-bold outline-none cursor-pointer focus:ring-0"
                >
                  {dates.map(d => {
                    // Format YYYYMMDD to YYYY-MM-DD
                    const formatted = `${d.substring(0, 4)}-${d.substring(4, 6)}-${d.substring(6, 8)}`;
                    return (
                      <option key={d} value={d} className="bg-slate-900 text-slate-200 font-sans">
                        {formatted}
                      </option>
                    );
                  })}
                </select>
              </div>
            )}

            {/* Export Dropdown */}
            <div className="relative" ref={exportRef}>
              <button
                onClick={() => setExportDropdownOpen(!exportDropdownOpen)}
                className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl hover:border-slate-700 text-slate-300 hover:text-slate-100 transition-all font-semibold text-xs shadow-inner"
              >
                <Download className="w-4 h-4 text-indigo-400" />
                <span>Export</span>
                <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${exportDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              {exportDropdownOpen && (
                <div className="absolute right-0 mt-2 w-44 bg-slate-900 border border-slate-800 rounded-xl shadow-xl z-50 p-1.5">
                  <button
                    onClick={() => {
                      exportToCSV('full');
                      setExportDropdownOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg text-xs font-semibold text-slate-300 hover:bg-indigo-600 hover:text-white transition-colors"
                  >
                    Full CSV
                  </button>
                  <button
                    onClick={() => {
                      exportToCSV('tickers');
                      setExportDropdownOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg text-xs font-semibold text-slate-300 hover:bg-indigo-600 hover:text-white transition-colors mt-1"
                  >
                    Only Ticker
                  </button>
                </div>
              )}
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl p-1 gap-1 shadow-inner">
              <button
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-lg transition-colors ${
                  viewMode === 'table' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Table View"
              >
                <Table className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('card')}
                className={`p-1.5 rounded-lg transition-colors ${
                  viewMode === 'card' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Grid Card View"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Loading State */}
        {loading && (
          <div className="flex-1 flex flex-col items-center justify-center py-20 gap-3">
            <RefreshCw className="w-10 h-10 text-indigo-500 animate-spin" />
            <span className="text-sm font-semibold text-slate-400 font-mono">Loading RTS metrics...</span>
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <div className="max-w-md mx-auto my-12 bg-slate-900/60 border border-slate-800 rounded-2xl p-6 text-center shadow-xl backdrop-blur-md">
            <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
            <h2 className="text-base font-bold text-white mb-2">Error Loading Data</h2>
            <p className="text-xs text-slate-400 font-mono mb-6">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-indigo-600/20 transition-all"
            >
              Retry
            </button>
          </div>
        )}

        {/* Filters and Views */}
        {!loading && !error && (
          <div className="animate-fade-in">
            {/* Legend Reference guide */}
            <LegendPanel colorMap={COLOR_MAP} />

            {/* Filter Component */}
            <FilterBar
              filters={filters}
              setFilters={setFilters}
              sectors={allSectors}
              industries={allIndustries}
              onReset={handleResetFilters}
              activeFilterCount={activeFilterCount}
              isOpen={filterPanelOpen}
              setIsOpen={setFilterPanelOpen}
            />

            {/* View Toolbar (Grid card view sorting) */}
            {viewMode === 'card' && (
              <div className="flex justify-end mb-4 items-center gap-3">
                <span className="text-xs text-slate-500 font-semibold">Sort By:</span>
                <select
                  value={sortConfig.key}
                  onChange={(e) => setSortConfig({ key: e.target.value, direction: 'asc' })}
                  className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-300 outline-none cursor-pointer focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="rts_grade_rank">RTS Grade</option>
                  <option value="rs_score">RS Score</option>
                  <option value="atr_extension">ATR Extension</option>
                  <option value="close">Price</option>
                  <option value="avg_volume_50d">Average Volume</option>
                </select>
              </div>
            )}

            {/* View rendering */}
            {viewMode === 'table' ? (
              <TableView
                data={sortedData}
                sortConfig={sortConfig}
                onSort={handleSort}
                expandedStock={expandedStock}
                setExpandedStock={setExpandedStock}
                colorMap={COLOR_MAP}
              />
            ) : (
              <CardView
                data={sortedData}
                colorMap={COLOR_MAP}
              />
            )}
          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-6 text-center text-[10px] text-slate-600">
        <div className="max-w-7xl mx-auto px-4">
          <p>© {new Date().getFullYear()} RTS Dashboard. All rights reserved.</p>
          <p className="mt-1 font-mono">Calculated using yfinance relative price strength scoring vs SPY.</p>
        </div>
      </footer>

    </div>
  );
}
