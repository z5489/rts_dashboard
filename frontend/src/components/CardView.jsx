import React, { useState } from 'react';
import StockDetail from './StockDetail';
import { Maximize2, X } from 'lucide-react';

export default function CardView({
  data,
  colorMap
}) {
  const [modalStock, setModalStock] = useState(null);

  const formatMarketCap = (val) => {
    if (!val) return '-';
    if (val >= 1e12) return `$${(val / 1e12).toFixed(2)}T`;
    if (val >= 1e9) return `$${(val / 1e9).toFixed(1)}B`;
    return `$${(val / 1e6).toFixed(0)}M`;
  };

  return (
    <div className="w-full">
      {/* Grid of Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {data.length === 0 ? (
          <div className="col-span-full text-center p-8 bg-slate-900/40 border border-slate-800 rounded-xl text-slate-500 text-sm">
            No stocks match the current filter criteria.
          </div>
        ) : (
          data.map(stock => {
            const band = colorMap[stock.colour_band] || colorMap['default'];
            
            return (
              <div
                key={stock.ticker}
                onClick={() => setModalStock(stock)}
                className="bg-slate-900/40 hover:bg-slate-800/40 border border-slate-800/80 rounded-xl p-5 shadow-xl hover:shadow-2xl transition-all cursor-pointer transform hover:-translate-y-1 flex flex-col justify-between group relative overflow-hidden backdrop-blur-md"
                style={{ borderLeftWidth: '4px', borderLeftColor: band.accent }}
              >
                {/* Maximize Icon on Hover */}
                <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Maximize2 className="w-4 h-4 text-slate-500 hover:text-indigo-400" />
                </div>

                <div>
                  {/* Top row: Ticker & Grade */}
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-extrabold text-lg tracking-wide font-mono" style={{ color: band.font }}>
                        {stock.ticker}
                      </h3>
                      <span className="text-[10px] text-slate-500 uppercase font-semibold">
                        {stock.exchange}
                      </span>
                    </div>
                    <span 
                      className="px-2.5 py-0.5 text-xs font-black rounded"
                      style={{ backgroundColor: band.badgeBg, color: band.font }}
                    >
                      {stock.rts_grade}
                    </span>
                  </div>

                  {/* Name */}
                  <p className="text-xs font-semibold text-slate-300 mb-4 line-clamp-1">
                    {stock.name}
                  </p>
                  
                  {/* Core Metrics */}
                  <div className="grid grid-cols-2 gap-3 mb-4 bg-slate-950/20 p-2.5 rounded-lg border border-slate-800/40">
                    <div className="flex flex-col">
                      <span className="text-[10px] text-slate-500 font-bold uppercase">Price</span>
                      <span className="text-sm font-semibold text-slate-200 font-mono">
                        ${stock.close.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] text-slate-500 font-bold uppercase">ATR Ext</span>
                      <span className={`text-sm font-semibold font-mono ${stock.atr_extension >= 0 ? 'text-indigo-400' : 'text-slate-500'}`}>
                        {stock.atr_extension >= 0 ? '+' : ''}{stock.atr_extension.toFixed(2)}x
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] text-slate-500 font-bold uppercase">RS Score</span>
                      <span className={`text-sm font-semibold font-mono ${stock.rs_score >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {stock.rs_score >= 0 ? '+' : ''}{stock.rs_score.toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] text-slate-500 font-bold uppercase">Stage</span>
                      <span className={`text-xs font-extrabold ${
                        stock.stage === 2 ? 'text-emerald-400' : stock.stage === 4 ? 'text-rose-400' : 'text-slate-400'
                      }`}>
                        Stage {stock.stage}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Footer details */}
                <div className="border-t border-slate-800/40 pt-3 flex justify-between items-center text-[10px] text-slate-500">
                  <span className="truncate max-w-[120px]">{stock.sector}</span>
                  <span className="font-mono">{formatMarketCap(stock.market_cap)}</span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal Detail Overlay */}
      {modalStock && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-4xl rounded-2xl overflow-hidden shadow-2xl relative">
            
            {/* Close Button */}
            <button 
              onClick={() => setModalStock(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1.5 hover:bg-slate-800 rounded-full transition-colors z-50"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Body */}
            <div className="p-6">
              <StockDetail 
                stock={modalStock} 
                onClose={() => setModalStock(null)} 
                colorInfo={colorMap[modalStock.colour_band] || colorMap['default']}
              />
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
