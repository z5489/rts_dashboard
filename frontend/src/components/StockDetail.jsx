import React, { useState, useEffect } from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, Legend, Line, CartesianGrid } from 'recharts';
import { X, TrendingUp, DollarSign, Award, Percent, Layers, BarChart3, AlertCircle } from 'lucide-react';

export default function StockDetail({ stock, onClose, colorInfo }) {
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    // Fetch 1 year of daily history to calculate SMA50 and SMA200 accurately
    const fetchHistory = async () => {
      try {
        const url = `/api/yahoo/v8/finance/chart/${stock.ticker}?range=1y&interval=1d`;
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        
        if (!data.chart || !data.chart.result || data.chart.result.length === 0) {
          throw new Error("No chart data returned from Yahoo Finance");
        }

        const result = data.chart.result[0];
        const timestamps = result.timestamp || [];
        const quote = result.indicators.quote[0];
        const closes = quote.close || [];

        if (timestamps.length === 0) {
          throw new Error("Empty history returned for this ticker.");
        }

        // Map and clean data
        const mappedData = timestamps.map((ts, idx) => {
          const val = closes[idx];
          return {
            timestamp: ts,
            date: new Date(ts * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            close: val !== null && val !== undefined ? parseFloat(val.toFixed(2)) : null
          };
        }).filter(item => item.close !== null);

        // Calculate SMAs dynamically
        for (let i = 0; i < mappedData.length; i++) {
          // SMA 50
          if (i >= 49) {
            let sum = 0;
            for (let j = i - 49; j <= i; j++) {
              sum += mappedData[j].close;
            }
            mappedData[i].sma50 = parseFloat((sum / 50).toFixed(2));
          } else {
            mappedData[i].sma50 = null;
          }

          // SMA 200
          if (i >= 199) {
            let sum = 0;
            for (let j = i - 199; j <= i; j++) {
              sum += mappedData[j].close;
            }
            mappedData[i].sma200 = parseFloat((sum / 200).toFixed(2));
          } else {
            mappedData[i].sma200 = null;
          }
        }

        // Slice to last 6 months (approx 126 trading days)
        const slicedData = mappedData.slice(-126);

        if (active) {
          setChartData(slicedData);
          setLoading(false);
        }
      } catch (err) {
        console.error("Failed to load chart data:", err);
        if (active) {
          setError(err.message || "Failed to fetch stock history.");
          setLoading(false);
        }
      }
    };

    fetchHistory();

    return () => {
      active = false;
    };
  }, [stock.ticker]);

  // Format Helper
  const formatMarketCap = (val) => {
    if (!val) return '-';
    if (val >= 1e12) return `$${(val / 1e12).toFixed(2)}T`;
    if (val >= 1e9) return `$${(val / 1e9).toFixed(1)}B`;
    return `$${(val / 1e6).toFixed(0)}M`;
  };

  const formatVolume = (val) => {
    if (!val) return '-';
    if (val >= 1e6) return `${(val / 1e6).toFixed(1)}M`;
    if (val >= 1e3) return `${(val / 1e3).toFixed(0)}K`;
    return val.toString();
  };

  // Custom tooltip
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-950 border border-slate-800 p-3.5 rounded-xl shadow-2xl font-mono text-xs text-slate-300">
          <p className="font-sans font-bold text-slate-400 mb-1">{data.date}</p>
          <p className="text-white flex items-center justify-between gap-4">
            <span>Price:</span> 
            <span className="font-bold">${data.close.toFixed(2)}</span>
          </p>
          {data.sma50 && (
            <p className="text-amber-400 flex items-center justify-between gap-4">
              <span>SMA 50:</span> 
              <span className="font-bold">${data.sma50.toFixed(2)}</span>
            </p>
          )}
          {data.sma200 && (
            <p className="text-fuchsia-400 flex items-center justify-between gap-4">
              <span>SMA 200:</span> 
              <span className="font-bold">${data.sma200.toFixed(2)}</span>
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full p-6 text-slate-200">
      
      {/* Detail Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-800 pb-6 mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-black font-sans tracking-tight" style={{ color: colorInfo.font }}>
              {stock.ticker}
            </h2>
            <span className="px-2 py-0.5 text-xs font-bold rounded bg-slate-800 border border-slate-700 text-slate-400">
              {stock.exchange}
            </span>
            <span 
              className="px-2.5 py-0.5 text-xs font-black rounded"
              style={{ backgroundColor: colorInfo.badgeBg, color: colorInfo.font }}
            >
              RTS Grade {stock.rts_grade}
            </span>
          </div>
          <p className="text-sm font-semibold text-slate-300 mt-1">{stock.name}</p>
          <div className="text-xs text-slate-500 mt-1 flex items-center gap-2">
            <span>{stock.sector}</span>
            <span>•</span>
            <span>{stock.industry}</span>
          </div>
        </div>
        
        {onClose && (
          <button 
            onClick={onClose} 
            className="md:hidden flex items-center justify-center p-2 border border-slate-800 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Main Grid: Chart & Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Cols: Chart */}
        <div className="lg:col-span-2 bg-slate-950/40 border border-slate-800/80 rounded-xl p-5 shadow-inner">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-indigo-400" />
              6-Month Price & Moving Averages
            </h3>
            <div className="flex gap-4 text-[10px] font-mono text-slate-400">
              <span className="flex items-center gap-1"><span className="w-2.5 h-0.5 bg-indigo-500 block"></span>Price</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-0.5 bg-amber-400 border-t border-dashed block"></span>SMA 50</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-0.5 bg-fuchsia-400 border-t border-dashed block"></span>SMA 200</span>
            </div>
          </div>

          <div className="h-72 w-full">
            {loading ? (
              <div className="h-full flex items-center justify-center flex-col gap-2">
                <div className="w-8 h-8 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin"></div>
                <span className="text-xs text-slate-500 font-mono">Loading chart...</span>
              </div>
            ) : error ? (
              <div className="h-full flex items-center justify-center flex-col gap-2 border border-dashed border-slate-800 rounded-xl p-4">
                <AlertCircle className="w-8 h-8 text-rose-500/70" />
                <span className="text-xs font-semibold text-rose-400">Failed to fetch chart data</span>
                <span className="text-[10px] text-slate-500 text-center max-w-sm font-mono mt-1">
                  {error}. If offline or running locally, CORS restrictions might block live Yahoo Finance loads.
                </span>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                  <defs>
                    <linearGradient id="colorClose" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.3} />
                  <XAxis 
                    dataKey="date" 
                    stroke="#475569" 
                    fontSize={10} 
                    fontFamily="monospace"
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis 
                    stroke="#475569" 
                    fontSize={10} 
                    fontFamily="monospace"
                    domain={['auto', 'auto']}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="close" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#colorClose)" />
                  <Line type="monotone" dataKey="sma50" stroke="#fbbf24" strokeWidth={1.5} strokeDasharray="4 4" dot={false} activeDot={false} />
                  <Line type="monotone" dataKey="sma200" stroke="#e879f9" strokeWidth={1.5} strokeDasharray="4 4" dot={false} activeDot={false} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Right 1 Col: Metrics */}
        <div className="flex flex-col gap-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <BarChart3 className="w-4 h-4 text-emerald-400" />
            Key Indicators
          </h3>

          <div className="grid grid-cols-2 gap-4 bg-slate-950/20 border border-slate-800/80 rounded-xl p-4.5">
            <div className="flex flex-col border-b border-slate-800/40 pb-2">
              <span className="text-[10px] text-slate-500 font-bold uppercase flex items-center gap-1"><DollarSign className="w-3 h-3 text-slate-400" />Price</span>
              <span className="text-sm font-semibold font-mono text-slate-200 mt-1">${stock.close.toFixed(2)}</span>
            </div>
            
            <div className="flex flex-col border-b border-slate-800/40 pb-2">
              <span className="text-[10px] text-slate-500 font-bold uppercase flex items-center gap-1"><Award className="w-3 h-3 text-indigo-400" />RTS Grade</span>
              <span className="text-sm font-bold mt-1" style={{ color: colorInfo.font }}>{stock.rts_grade} ({stock.rts_composite.toFixed(0)})</span>
            </div>

            <div className="flex flex-col border-b border-slate-800/40 pb-2">
              <span className="text-[10px] text-slate-500 font-bold uppercase flex items-center gap-1"><TrendingUp className="w-3 h-3 text-indigo-400" />ATR Extension</span>
              <span className={`text-sm font-semibold font-mono mt-1 ${stock.atr_extension >= 0 ? 'text-indigo-400' : 'text-slate-500'}`}>
                {stock.atr_extension >= 0 ? '+' : ''}{stock.atr_extension.toFixed(2)}x
              </span>
            </div>

            <div className="flex flex-col border-b border-slate-800/40 pb-2">
              <span className="text-[10px] text-slate-500 font-bold uppercase flex items-center gap-1"><Percent className="w-3 h-3 text-emerald-400" />RS Score</span>
              <span className={`text-sm font-semibold font-mono mt-1 ${stock.rs_score >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {stock.rs_score >= 0 ? '+' : ''}{stock.rs_score.toFixed(1)}%
              </span>
            </div>

            <div className="flex flex-col border-b border-slate-800/40 pb-2">
              <span className="text-[10px] text-slate-500 font-bold uppercase flex items-center gap-1"><Percent className="w-3 h-3 text-emerald-400" />RS Percentile</span>
              <span className="text-sm font-semibold font-mono text-slate-200 mt-1">{stock.rs_percentile.toFixed(0)}</span>
            </div>

            <div className="flex flex-col border-b border-slate-800/40 pb-2">
              <span className="text-[10px] text-slate-500 font-bold uppercase flex items-center gap-1"><Layers className="w-3 h-3 text-emerald-400" />Stage</span>
              <span className="text-sm font-bold text-slate-200 mt-1">Stage {stock.stage}</span>
            </div>

            <div className="flex flex-col col-span-2 border-b border-slate-800/40 pb-2">
              <span className="text-[10px] text-slate-500 font-bold uppercase">52-Week Range</span>
              <span className="text-xs font-semibold font-mono text-slate-300 mt-1 flex justify-between">
                <span>Low: ${stock['52w_low'].toFixed(2)}</span>
                <span>High: ${stock['52w_high'].toFixed(2)}</span>
              </span>
              <span className="text-[10px] text-rose-400 mt-1 font-mono">
                {stock.pct_from_52w_high.toFixed(1)}% from 52-week High
              </span>
            </div>

            <div className="flex flex-col">
              <span className="text-[10px] text-slate-500 font-bold uppercase">ATR (14)</span>
              <span className="text-xs font-semibold font-mono text-slate-300 mt-1">${stock.atr14.toFixed(2)}</span>
            </div>

            <div className="flex flex-col">
              <span className="text-[10px] text-slate-500 font-bold uppercase">Avg Volume (50d)</span>
              <span className="text-xs font-semibold font-mono text-slate-300 mt-1">{formatVolume(stock.avg_volume_50d)}</span>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
