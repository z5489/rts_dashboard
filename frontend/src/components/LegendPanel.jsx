import React, { useState } from 'react';
import { HelpCircle, ChevronDown, ChevronUp, Info, Palette, Award } from 'lucide-react';

export default function LegendPanel({ colorMap }) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('colors'); // 'colors' or 'grades'

  const colorItems = [
    {
      key: 'green',
      name: 'Green',
      range: '0x to 4x',
      interpretation: 'Non-extended, actionable uptrend',
      implication: 'Primary watchlist / entry candidates',
    },
    {
      key: 'yellow',
      name: 'Yellow',
      range: '4x to 5x',
      interpretation: 'Mildly extended',
      implication: 'Cautious entry; tighten stops',
    },
    {
      key: 'orange',
      name: 'Orange',
      range: '5x to 7x',
      interpretation: 'Moderately extended',
      implication: 'Avoid new entries; hold existing',
    },
    {
      key: 'purple',
      name: 'Purple',
      range: '7x to 11x',
      interpretation: 'Extended, due for consolidation',
      implication: 'Reduce size; watch for pullbacks',
    },
    {
      key: 'red',
      name: 'Red',
      range: '> 11x',
      interpretation: 'Over-extended, high pullback risk',
      implication: 'Exit signal; do not enter',
    },
    {
      key: 'blue',
      name: 'Blue',
      range: 'Any (ATR < Median)',
      interpretation: 'Low volatility - less swing-tradeable',
      implication: 'Skip or monitor only',
    },
    {
      key: 'default',
      name: 'Neutral (Gray)',
      range: 'Below SMA50',
      interpretation: 'Stock trading below 50-day moving average',
      implication: 'Avoid or watch for base building',
    }
  ];

  const gradeItems = [
    { grade: 'A+', score: '92 – 100', pct: '~5%', desc: 'Highest RS + strongest, cleanest trend; top momentum leaders', badgeBg: 'bg-emerald-500/10 text-emerald-400' },
    { grade: 'A', score: '82 – 91', pct: '~8%', desc: 'Excellent RS and trend; primary focus stocks', badgeBg: 'bg-teal-500/10 text-teal-400' },
    { grade: 'B', score: '68 – 81', pct: '~15%', desc: 'Above-average RS and trend; solid watchlist candidates', badgeBg: 'bg-indigo-500/10 text-indigo-400' },
    { grade: 'C', score: '52 – 67', pct: '~20%', desc: 'Average; moderate RS or trend weakness', badgeBg: 'bg-blue-500/10 text-blue-400' },
    { grade: 'D', score: '38 – 51', pct: '~20%', desc: 'Below average; avoid for long swing trades', badgeBg: 'bg-yellow-500/10 text-yellow-400' },
    { grade: 'E', score: '26 – 37', pct: '~14%', desc: 'Weak; trending lower or underperforming market', badgeBg: 'bg-orange-500/10 text-orange-400' },
    { grade: 'F', score: '14 – 25', pct: '~10%', desc: 'Poor; significant underperformance', badgeBg: 'bg-rose-500/10 text-rose-400' },
    { grade: 'G', score: '0 – 13', pct: '~8%', desc: 'Weakest; worst RS and trend quality', badgeBg: 'bg-slate-800 text-slate-450' }
  ];

  return (
    <div className="w-full bg-slate-900/40 border border-slate-800 rounded-xl overflow-hidden backdrop-blur-md mb-6 shadow-xl">
      {/* Legend Toggle Header */}
      <div 
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-800/40 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-3">
          <HelpCircle className="w-5 h-5 text-indigo-400" />
          <span className="font-semibold text-slate-200">System Reference Guide</span>
          <span className="text-[10px] text-slate-500 font-medium bg-slate-950 px-2 py-0.5 rounded-full border border-slate-800">
            Legend & Guidelines
          </span>
        </div>
        <div>
          {isOpen ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
        </div>
      </div>

      {/* Legend Body */}
      {isOpen && (
        <div className="border-t border-slate-800/60 bg-slate-950/20">
          
          {/* Tab Bar */}
          <div className="flex border-b border-slate-800/60 bg-slate-950/40 p-1 gap-1">
            <button
              onClick={() => setActiveTab('colors')}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-colors ${
                activeTab === 'colors' 
                  ? 'bg-slate-800 text-white border border-slate-700' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/20'
              }`}
            >
              <Palette className="w-3.5 h-3.5" />
              Color Bands (Extension)
            </button>
            <button
              onClick={() => setActiveTab('grades')}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-colors ${
                activeTab === 'grades' 
                  ? 'bg-slate-800 text-white border border-slate-700' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/20'
              }`}
            >
              <Award className="w-3.5 h-3.5" />
              RTS Grades (Strength)
            </button>
          </div>

          <div className="p-5">
            {activeTab === 'colors' ? (
              <div>
                <div className="flex items-start gap-2.5 bg-indigo-500/5 border border-indigo-500/20 rounded-xl p-3.5 mb-4">
                  <Info className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-indigo-300 leading-relaxed font-medium">
                    The color band logic evaluates volatility (ATR14) and trend extension. If volatility is below the universe median, it defaults to **Blue** (low volatility). Otherwise, it measures how many ATR multiples the price is extended above its **50-day moving average (SMA50)**.
                  </p>
                </div>

                <div className="w-full overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-800/80 text-slate-500 font-bold uppercase tracking-wider">
                        <th className="pb-3 pr-4 pl-1">Colour Band</th>
                        <th className="pb-3 px-4">ATR extension range</th>
                        <th className="pb-3 px-4">Market Interpretation</th>
                        <th className="pb-3 px-4">Trading Rule & Implication</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/40">
                      {colorItems.map((item) => {
                        const mapInfo = colorMap[item.key] || colorMap['default'];
                        
                        return (
                          <tr key={item.key} className="hover:bg-slate-900/10 transition-colors">
                            <td className="py-3 pr-4 pl-1 font-semibold flex items-center gap-2">
                              <span 
                                className="w-2.5 h-2.5 rounded-full shrink-0" 
                                style={{ backgroundColor: mapInfo.accent }}
                              />
                              <span style={{ color: mapInfo.font }} className="font-bold">
                                {item.name}
                              </span>
                            </td>
                            <td className="py-3 px-4 font-mono font-medium text-slate-300">
                              {item.range}
                            </td>
                            <td className="py-3 px-4 font-semibold text-slate-200">
                              {item.interpretation}
                            </td>
                            <td className="py-3 px-4 text-slate-400 font-medium">
                              {item.implication}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div>
                <div className="flex items-start gap-2.5 bg-indigo-500/5 border border-indigo-500/20 rounded-xl p-3.5 mb-4">
                  <Info className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-indigo-300 leading-relaxed font-medium">
                    RTS grades are computed via a composite score: **$60\%$ Relative Strength Percentile** (price performance vs SPY over 3M, 6M, and 12M periods) and **$40\%$ Trend Strength Score** (sub-components mapping price positions, SMA slopes, and daily green close consistency).
                  </p>
                </div>

                <div className="w-full overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-800/80 text-slate-500 font-bold uppercase tracking-wider">
                        <th className="pb-3 pr-4 pl-1">RTS Grade</th>
                        <th className="pb-3 px-4">Composite Score Range</th>
                        <th className="pb-3 px-4">Approx. Universe %</th>
                        <th className="pb-3 px-4">Trend & Momentum Characteristics</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/40">
                      {gradeItems.map((item) => (
                        <tr key={item.grade} className="hover:bg-slate-900/10 transition-colors">
                          <td className="py-3 pr-4 pl-1">
                            <span className={`px-2 py-0.5 font-bold rounded ${item.badgeBg}`}>
                              {item.grade}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-mono font-medium text-slate-300">
                            {item.score}
                          </td>
                          <td className="py-3 px-4 text-slate-300 font-semibold">
                            {item.pct}
                          </td>
                          <td className="py-3 px-4 text-slate-400 font-medium">
                            {item.desc}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
}
