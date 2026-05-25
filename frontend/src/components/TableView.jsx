import React, { useState, useMemo, useRef, useEffect } from 'react';
import { ChevronUp, ChevronDown, Eye, EyeOff } from 'lucide-react';
import StockDetail from './StockDetail';

export default function TableView({
  data,
  sortConfig,
  onSort,
  expandedStock,
  setExpandedStock,
  colorMap
}) {
  const [insightsOpen, setInsightsOpen] = useState(false);
  const insightsRef = useRef(null);

  // Click outside listener for insights dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      if (insightsRef.current && !insightsRef.current.contains(event.target)) {
        setInsightsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Compute sector/industry distribution dynamically based on data
  const distribution = useMemo(() => {
    const sectors = {};
    const industries = {};
    data.forEach(stock => {
      const s = stock.sector || 'Unknown';
      const ind = stock.industry || 'Unknown';
      sectors[s] = (sectors[s] || 0) + 1;
      industries[ind] = (industries[ind] || 0) + 1;
    });

    const sortedSectors = Object.entries(sectors)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    const sortedIndustries = Object.entries(industries)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    return { sectors: sortedSectors, industries: sortedIndustries };
  }, [data]);

  // Columns definitions: key, label, alwaysVisible
  const columnsList = [
    { key: 'ticker', label: 'Ticker', alwaysVisible: true },
    { key: 'name', label: 'Company Name', alwaysVisible: false },
    { key: 'rts_grade', label: 'RTS Grade', alwaysVisible: true },
    { key: 'close', label: 'Price', alwaysVisible: true },
    { key: 'atr_extension', label: 'ATR Ext.', alwaysVisible: true },
    { key: 'rs_score', label: 'RS Score', alwaysVisible: true },
    { key: 'rs_percentile', label: 'RS Pct.', alwaysVisible: false },
    { key: 'trend_strength', label: 'Trend Str.', alwaysVisible: false },
    { key: 'stage', label: 'Stage', alwaysVisible: true },
    { key: 'atr14', label: 'ATR (14)', alwaysVisible: false },
    { key: 'sma50', label: 'SMA 50', alwaysVisible: false },
    { key: 'sma200', label: 'SMA 200', alwaysVisible: false },
    { key: 'market_cap', label: 'Market Cap', alwaysVisible: false },
    { key: 'avg_volume_50d', label: 'Avg Vol (50d)', alwaysVisible: false },
    { key: 'pct_from_52w_high', label: '% from 52w High', alwaysVisible: false },
    { key: 'sector', label: 'Sector', alwaysVisible: false },
    { key: 'industry', label: 'Industry', alwaysVisible: false }
  ];

  // Column visibility state
  const [visibleColumns, setVisibleColumns] = useState(
    columnsList.reduce((acc, col) => {
      acc[col.key] = col.alwaysVisible || ['name', 'rs_percentile', 'trend_strength', 'pct_from_52w_high'].includes(col.key);
      return acc;
    }, {})
  );

  const [colSelectorOpen, setColSelectorOpen] = useState(false);

  const toggleColumn = (key) => {
    setVisibleColumns(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const getSortIcon = (columnKey) => {
    if (sortConfig.key !== columnKey) return null;
    return sortConfig.direction === 'asc' 
      ? <ChevronUp className="w-4 h-4 ml-1 inline text-indigo-400" />
      : <ChevronDown className="w-4 h-4 ml-1 inline text-indigo-400" />;
  };

  // Formatting helpers
  const formatVolume = (val) => {
    if (val >= 1e6) return `${(val / 1e6).toFixed(1)}M`;
    if (val >= 1e3) return `${(val / 1e3).toFixed(0)}K`;
    return val;
  };

  const formatMarketCap = (val) => {
    if (!val) return '-';
    if (val >= 1e12) return `$${(val / 1e12).toFixed(2)}T`;
    if (val >= 1e9) return `$${(val / 1e9).toFixed(1)}B`;
    if (val >= 1e6) return `$${(val / 1e6).toFixed(0)}M`;
    return `$${val}`;
  };

  const formatPercentage = (val) => {
    if (val === undefined || isNaN(val)) return '-';
    return `${val > 0 ? '+' : ''}${val.toFixed(1)}%`;
  };

  return (
    <div className="w-full bg-slate-900/40 border border-slate-800 rounded-xl overflow-hidden shadow-xl backdrop-blur-md">
      {/* Table Toolbar */}
      <div className="p-4 border-b border-slate-800/60 flex flex-wrap justify-between items-center bg-slate-900/60 gap-4">
        <div className="flex items-center flex-wrap gap-4">
          <span className="text-xs font-semibold text-slate-400">
            Showing <span className="text-white font-bold">{data.length}</span> Stocks
          </span>

          {data.length > 0 && (
            <>
              {/* Inline Top 2 Sectors Summary */}
              <div className="hidden md:flex items-center gap-1.5 text-[11px] text-slate-500 border-l border-slate-800 pl-4">
                <span className="font-semibold uppercase tracking-wider text-[10px] text-slate-500">Top Sectors:</span>
                {distribution.sectors.slice(0, 2).map(sec => (
                  <span key={sec.name} className="bg-slate-800/60 border border-slate-700/30 text-indigo-300 px-2 py-0.5 rounded-md font-bold font-mono">
                    {sec.name} ({sec.count})
                  </span>
                ))}
                {distribution.sectors.length > 2 && (
                  <span className="text-[10px] text-slate-500 font-semibold italic">
                    +{distribution.sectors.length - 2} more
                  </span>
                )}
              </div>

              {/* Insights Dropdown */}
              <div className="relative" ref={insightsRef}>
                <button
                  onClick={() => setInsightsOpen(!insightsOpen)}
                  className="px-2.5 py-1 text-[10px] font-extrabold bg-indigo-600/10 hover:bg-indigo-600/20 border border-indigo-500/20 text-indigo-400 hover:text-indigo-300 rounded-lg transition-all flex items-center gap-1 shadow-md shadow-indigo-900/10"
                  type="button"
                >
                  <span>Detailed Insights</span>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${insightsOpen ? 'rotate-180' : ''}`} />
                </button>

                {insightsOpen && (
                  <div className="absolute left-0 mt-2 w-80 md:w-96 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl z-40 p-4 backdrop-blur-md">
                    <div className="flex justify-between items-center border-b border-slate-800 pb-2 mb-3">
                      <span className="text-xs font-bold text-white uppercase tracking-wider">Sector & Industry Distribution</span>
                      <span className="text-[10px] font-mono text-slate-400">{data.length} stocks shown</span>
                    </div>

                    <div className="grid grid-cols-2 gap-4 max-h-[300px] overflow-y-auto pr-1">
                      {/* Sectors Column */}
                      <div className="flex flex-col gap-2">
                        <span className="text-[10px] font-black text-indigo-400 uppercase tracking-wider block border-b border-slate-800/40 pb-1">Sectors</span>
                        <div className="flex flex-col gap-1.5">
                          {distribution.sectors.map(sec => (
                            <div key={sec.name} className="flex justify-between items-center text-[11px] gap-2">
                              <span className="text-slate-300 truncate" title={sec.name}>{sec.name}</span>
                              <span className="text-indigo-400 font-bold font-mono bg-indigo-500/15 px-1.5 py-0.2 rounded-md border border-indigo-500/10">{sec.count}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Industries Column */}
                      <div className="flex flex-col gap-2">
                        <span className="text-[10px] font-black text-emerald-400 uppercase tracking-wider block border-b border-slate-800/40 pb-1">Top Industries</span>
                        <div className="flex flex-col gap-1.5">
                          {distribution.industries.slice(0, 10).map(ind => (
                            <div key={ind.name} className="flex justify-between items-center text-[11px] gap-2">
                              <span className="text-slate-300 truncate" title={ind.name}>{ind.name}</span>
                              <span className="text-emerald-400 font-bold font-mono bg-emerald-500/15 px-1.5 py-0.2 rounded-md border border-emerald-500/10">{ind.count}</span>
                            </div>
                          ))}
                          {distribution.industries.length > 10 && (
                            <span className="text-[9px] text-slate-500 italic font-semibold mt-1">
                              +{distribution.industries.length - 10} more
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
        
        {/* Column Visibility Selector */}
        <div className="relative">
          <button
            onClick={() => setColSelectorOpen(!colSelectorOpen)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-lg transition-colors"
          >
            <Eye className="w-3.5 h-3.5" />
            Toggle Columns
          </button>
          
          {colSelectorOpen && (
            <div className="absolute right-0 top-9 bg-slate-950 border border-slate-800 rounded-lg shadow-xl z-30 w-52 p-3 max-h-80 overflow-y-auto">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2 px-1">
                Visible Columns
              </span>
              <div className="flex flex-col gap-1.5">
                {columnsList.map(col => {
                  if (col.alwaysVisible) return null;
                  return (
                    <label key={col.key} className="flex items-center justify-between text-xs text-slate-300 hover:bg-slate-900 px-2 py-1 rounded cursor-pointer transition-colors">
                      <span>{col.label}</span>
                      <input
                        type="checkbox"
                        checked={!!visibleColumns[col.key]}
                        onChange={() => toggleColumn(col.key)}
                        className="rounded border-slate-800 text-indigo-600 focus:ring-indigo-500 bg-slate-900"
                      />
                    </label>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Table */}
      <div className="w-full overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-950/60 border-b border-slate-800 text-slate-400 text-xs font-bold uppercase tracking-wider">
              {columnsList.map(col => {
                if (!col.alwaysVisible && !visibleColumns[col.key]) return null;
                return (
                  <th
                    key={col.key}
                    onClick={() => onSort(col.key)}
                    className="p-4 cursor-pointer hover:bg-slate-800/40 select-none transition-colors"
                  >
                    <div className="flex items-center">
                      {col.label}
                      {getSortIcon(col.key)}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {data.length === 0 ? (
              <tr>
                <td colSpan={columnsList.length} className="text-center p-8 text-slate-500 text-sm">
                  No stocks match the current filter criteria.
                </td>
              </tr>
            ) : (
              data.map(stock => {
                const isExpanded = expandedStock === stock.ticker;
                const band = colorMap[stock.colour_band] || colorMap['default'];
                
                return (
                  <React.Fragment key={stock.ticker}>
                    {/* Main Row */}
                    <tr 
                      onClick={() => setExpandedStock(isExpanded ? null : stock.ticker)}
                      className={`hover:bg-slate-800/20 cursor-pointer transition-all ${
                        isExpanded ? 'bg-slate-800/30' : ''
                      }`}
                    >
                      {/* Ticker */}
                      <td className="p-4 font-bold text-sm" style={{ color: band.font }}>
                        {stock.ticker}
                      </td>
                      
                      {/* Name */}
                      {visibleColumns.name && (
                        <td className="p-4 text-xs font-medium text-slate-300 max-w-[150px] truncate">
                          {stock.name}
                        </td>
                      )}
                      
                      {/* RTS Grade */}
                      <td className="p-4">
                        <span 
                          className="px-2 py-0.5 text-xs font-bold rounded"
                          style={{ backgroundColor: band.badgeBg, color: band.font }}
                        >
                          {stock.rts_grade}
                        </span>
                      </td>
                      
                      {/* Close Price */}
                      <td className="p-4 text-sm font-semibold font-mono text-slate-200">
                        ${stock.close.toFixed(2)}
                      </td>
                      
                      {/* ATR Extension */}
                      <td className={`p-4 text-sm font-mono font-semibold ${
                        stock.atr_extension >= 0 ? 'text-indigo-400' : 'text-slate-500'
                      }`}>
                        {stock.atr_extension >= 0 ? '+' : ''}{stock.atr_extension.toFixed(2)}x
                      </td>
                      
                      {/* RS Score */}
                      <td className={`p-4 text-sm font-mono font-semibold ${
                        stock.rs_score >= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}>
                        {stock.rs_score >= 0 ? '+' : ''}{stock.rs_score.toFixed(1)}%
                      </td>

                      {/* RS Percentile */}
                      {visibleColumns.rs_percentile && (
                        <td className="p-4 text-sm font-mono font-medium text-slate-300">
                          {stock.rs_percentile.toFixed(0)}
                        </td>
                      )}
                      
                      {/* Trend Strength */}
                      {visibleColumns.trend_strength && (
                        <td className="p-4 text-sm font-mono font-medium text-slate-300">
                          {stock.trend_strength.toFixed(0)}
                        </td>
                      )}

                      {/* Stage */}
                      <td className="p-4">
                        <span className={`px-2 py-0.5 text-[11px] font-bold rounded-full ${
                          stock.stage === 2
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : stock.stage === 4
                            ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            : 'bg-slate-800 text-slate-400 border border-slate-700'
                        }`}>
                          Stage {stock.stage}
                        </span>
                      </td>

                      {/* ATR 14 */}
                      {visibleColumns.atr14 && (
                        <td className="p-4 text-sm font-mono text-slate-400">
                          ${stock.atr14.toFixed(2)}
                        </td>
                      )}

                      {/* SMA 50 */}
                      {visibleColumns.sma50 && (
                        <td className="p-4 text-sm font-mono text-slate-400">
                          ${stock.sma50.toFixed(2)}
                        </td>
                      )}

                      {/* SMA 200 */}
                      {visibleColumns.sma200 && (
                        <td className="p-4 text-sm font-mono text-slate-400">
                          ${stock.sma200.toFixed(2)}
                        </td>
                      )}

                      {/* Market Cap */}
                      {visibleColumns.market_cap && (
                        <td className="p-4 text-xs font-mono text-slate-400">
                          {formatMarketCap(stock.market_cap)}
                        </td>
                      )}

                      {/* Avg Volume */}
                      {visibleColumns.avg_volume_50d && (
                        <td className="p-4 text-xs font-mono text-slate-400">
                          {formatVolume(stock.avg_volume_50d)}
                        </td>
                      )}

                      {/* % from 52w High */}
                      {visibleColumns.pct_from_52w_high && (
                        <td className="p-4 text-sm font-mono text-rose-400">
                          {formatPercentage(stock.pct_from_52w_high)}
                        </td>
                      )}

                      {/* Sector */}
                      {visibleColumns.sector && (
                        <td className="p-4 text-xs text-slate-400 truncate max-w-[120px]">
                          {stock.sector}
                        </td>
                      )}

                      {/* Industry */}
                      {visibleColumns.industry && (
                        <td className="p-4 text-xs text-slate-400 truncate max-w-[120px]">
                          {stock.industry}
                        </td>
                      )}
                    </tr>
                    
                    {/* Expandable Chart Panel */}
                    {isExpanded && (
                      <tr>
                        <td colSpan={18} className="p-0 bg-slate-950/80 border-y border-slate-800">
                          <StockDetail 
                            stock={stock}
                            onClose={() => setExpandedStock(null)}
                            colorInfo={band}
                          />
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
