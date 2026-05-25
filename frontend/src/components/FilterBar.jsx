import React, { useState, useEffect } from 'react';
import { X, Filter, RotateCcw, ChevronDown, ChevronUp } from 'lucide-react';

export default function FilterBar({
  filters,
  setFilters,
  sectors,
  industries,
  onReset,
  activeFilterCount,
  isOpen,
  setIsOpen
}) {
  const grades = ['A+', 'A', 'B', 'C', 'D', 'E', 'F', 'G'];
  const colors = [
    { name: 'Green', value: 'green', bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/30' },
    { name: 'Yellow', value: 'yellow', bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/30' },
    { name: 'Orange', value: 'orange', bg: 'bg-orange-500/20', text: 'text-orange-400', border: 'border-orange-500/30' },
    { name: 'Purple', value: 'purple', bg: 'bg-purple-500/20', text: 'text-purple-400', border: 'border-purple-500/30' },
    { name: 'Red', value: 'red', bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/30' },
    { name: 'Blue', value: 'blue', bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/30' }
  ];
  const stages = [1, 2, 3, 4];

  const [sectorDropdownOpen, setSectorDropdownOpen] = useState(false);
  const [industryDropdownOpen, setIndustryDropdownOpen] = useState(false);

  // Toggle multi-select items in array
  const toggleFilterItem = (field, value) => {
    const current = filters[field] || [];
    const updated = current.includes(value)
      ? current.filter(item => item !== value)
      : [...current, value];
    setFilters({ ...filters, [field]: updated });
  };

  return (
    <div className="w-full bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden backdrop-blur-md mb-6 shadow-xl">
      {/* Header bar / Toggle */}
      <div 
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-800/40 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-3">
          <Filter className="w-5 h-5 text-indigo-400" />
          <span className="font-semibold text-slate-200">Filters & Screening</span>
          {activeFilterCount > 0 && (
            <span className="flex items-center justify-center px-2 py-0.5 text-xs font-bold bg-indigo-500 text-white rounded-full">
              {activeFilterCount} active
            </span>
          )}
        </div>
        <div className="flex items-center gap-4">
          {activeFilterCount > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onReset();
              }}
              className="flex items-center gap-1.5 px-3 py-1 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset Filters
            </button>
          )}
          {isOpen ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
        </div>
      </div>

      {/* Filter Body */}
      {isOpen && (
        <div className="p-6 border-t border-slate-800/60 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 bg-slate-950/40">
          
          {/* Ticker Search Filter */}
          <div className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-slate-400">Search Tickers</span>
            <div className="relative">
              <input
                type="text"
                placeholder="e.g. AAPL, TSLA (comma/space sep)"
                value={filters.tickerQuery || ''}
                onChange={(e) => setFilters({ ...filters, tickerQuery: e.target.value })}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-300 placeholder-slate-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
              />
              {filters.tickerQuery && (
                <button
                  onClick={() => setFilters({ ...filters, tickerQuery: '' })}
                  className="absolute right-2.5 top-2.5 text-slate-500 hover:text-slate-300 transition-colors"
                  type="button"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* RTS Grade Filter */}
          <div className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-slate-400">RTS Grade</span>
            <div className="flex flex-wrap gap-2">
              {grades.map(grade => {
                const active = filters.grades.includes(grade);
                return (
                  <button
                    key={grade}
                    onClick={() => toggleFilterItem('grades', grade)}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all ${
                      active
                        ? 'bg-indigo-600 border-indigo-500 text-white shadow-md shadow-indigo-500/20 scale-105'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-300'
                    }`}
                  >
                    {grade}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Colour Band Filter */}
          <div className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-slate-400">Colour Band</span>
            <div className="flex flex-wrap gap-2">
              {colors.map(col => {
                const active = filters.colors.includes(col.value);
                return (
                  <button
                    key={col.value}
                    onClick={() => toggleFilterItem('colors', col.value)}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition-all flex items-center gap-1.5 ${
                      active
                        ? `${col.bg} ${col.text} ${col.border} ring-1 ring-offset-1 ring-indigo-500 ring-offset-slate-950 scale-105`
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${col.value === 'blue' ? 'bg-blue-500' : col.value === 'green' ? 'bg-green-500' : col.value === 'yellow' ? 'bg-yellow-500' : col.value === 'orange' ? 'bg-orange-500' : col.value === 'purple' ? 'bg-purple-500' : 'bg-red-500'}`} />
                    {col.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Stage Filter */}
          <div className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-slate-400">Stage Classification</span>
            <div className="flex flex-wrap gap-2">
              {stages.map(stage => {
                const active = filters.stages.includes(stage);
                return (
                  <button
                    key={stage}
                    onClick={() => toggleFilterItem('stages', stage)}
                    className={`px-4 py-1.5 text-xs font-bold rounded-lg border transition-all ${
                      active
                        ? 'bg-emerald-600 border-emerald-500 text-white shadow-md shadow-emerald-500/20 scale-105'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-300'
                    }`}
                  >
                    Stage {stage}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ATR Extension Slider */}
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-semibold text-slate-400">ATR Extension Range</span>
              <span className="text-xs font-mono text-indigo-400">
                {filters.minExtension} to {filters.maxExtension}
              </span>
            </div>
            <div className="flex gap-4 items-center">
              <div className="flex-1 flex flex-col gap-1">
                <span className="text-[10px] text-slate-500">Min Extension</span>
                <input
                  type="range"
                  min="-10"
                  max="20"
                  step="0.5"
                  value={filters.minExtension}
                  onChange={(e) => setFilters({ ...filters, minExtension: parseFloat(e.target.value) })}
                  className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
              </div>
              <div className="flex-1 flex flex-col gap-1">
                <span className="text-[10px] text-slate-500">Max Extension</span>
                <input
                  type="range"
                  min="-10"
                  max="20"
                  step="0.5"
                  value={filters.maxExtension}
                  onChange={(e) => setFilters({ ...filters, maxExtension: parseFloat(e.target.value) })}
                  className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Sector Selector */}
          <div className="flex flex-col gap-2 relative">
            <span className="text-sm font-semibold text-slate-400">Sector</span>
            <button
              onClick={() => {
                setSectorDropdownOpen(!sectorDropdownOpen);
                setIndustryDropdownOpen(false);
              }}
              className="flex items-center justify-between px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-300 hover:border-slate-700 transition-colors w-full text-left"
            >
              <span>
                {filters.sectors.length === 0
                  ? 'All Sectors'
                  : `${filters.sectors.length} Selected`}
              </span>
              <ChevronDown className="w-4 h-4 text-slate-400" />
            </button>
            {sectorDropdownOpen && (
              <div className="absolute top-[70px] left-0 right-0 bg-slate-900 border border-slate-800 rounded-lg shadow-xl z-35 max-h-60 overflow-y-auto p-2">
                <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 mb-1.5 px-2">
                  <span className="text-xs font-semibold text-indigo-400">Select Sectors</span>
                  {filters.sectors.length > 0 && (
                    <button 
                      onClick={() => setFilters({ ...filters, sectors: [] })}
                      className="text-[10px] text-slate-500 hover:text-slate-300"
                    >
                      Clear
                    </button>
                  )}
                </div>
                {sectors.map(sec => (
                  <label key={sec} className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-800/60 rounded cursor-pointer text-xs text-slate-300">
                    <input
                      type="checkbox"
                      checked={filters.sectors.includes(sec)}
                      onChange={() => toggleFilterItem('sectors', sec)}
                      className="rounded border-slate-800 text-indigo-600 bg-slate-950 focus:ring-indigo-500"
                    />
                    {sec}
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Industry Selector */}
          <div className="flex flex-col gap-2 relative">
            <span className="text-sm font-semibold text-slate-400">Industry</span>
            <button
              onClick={() => {
                setIndustryDropdownOpen(!industryDropdownOpen);
                setSectorDropdownOpen(false);
              }}
              className="flex items-center justify-between px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-300 hover:border-slate-700 transition-colors w-full text-left"
            >
              <span>
                {filters.industries.length === 0
                  ? 'All Industries'
                  : `${filters.industries.length} Selected`}
              </span>
              <ChevronDown className="w-4 h-4 text-slate-400" />
            </button>
            {industryDropdownOpen && (
              <div className="absolute top-[70px] left-0 right-0 bg-slate-900 border border-slate-800 rounded-lg shadow-xl z-35 max-h-60 overflow-y-auto p-2">
                <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 mb-1.5 px-2">
                  <span className="text-xs font-semibold text-indigo-400">Select Industries</span>
                  {filters.industries.length > 0 && (
                    <button 
                      onClick={() => setFilters({ ...filters, industries: [] })}
                      className="text-[10px] text-slate-500 hover:text-slate-300"
                    >
                      Clear
                    </button>
                  )}
                </div>
                {industries.length === 0 ? (
                  <span className="text-xs text-slate-500 p-2 block">No industries available</span>
                ) : (
                  industries.map(ind => (
                    <label key={ind} className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-800/60 rounded cursor-pointer text-xs text-slate-300">
                      <input
                        type="checkbox"
                        checked={filters.industries.includes(ind)}
                        onChange={() => toggleFilterItem('industries', ind)}
                        className="rounded border-slate-800 text-indigo-600 bg-slate-950 focus:ring-indigo-500"
                      />
                      {ind}
                    </label>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Numeric Inputs Group */}
          <div className="flex flex-col gap-2 col-span-1 md:col-span-2 lg:col-span-3 border-t border-slate-800/50 pt-4 mt-2">
            <span className="text-xs font-bold uppercase text-slate-500 tracking-wider">Liquidity & Price Floors</span>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-slate-400">Min Price ($)</label>
                <input
                  type="number"
                  min="0"
                  placeholder="e.g. 5"
                  value={filters.minPrice === 0 ? '' : filters.minPrice}
                  onChange={(e) => setFilters({ ...filters, minPrice: e.target.value === '' ? 0 : parseFloat(e.target.value) })}
                  className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-slate-400">Min ATR ($)</label>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  placeholder="e.g. 1.0"
                  value={filters.minATR === 0 ? '' : filters.minATR}
                  onChange={(e) => setFilters({ ...filters, minATR: e.target.value === '' ? 0 : parseFloat(e.target.value) })}
                  className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-slate-400">Min Avg Vol (50d)</label>
                <input
                  type="number"
                  min="0"
                  placeholder="e.g. 500000"
                  value={filters.minVolume === 0 ? '' : filters.minVolume}
                  onChange={(e) => setFilters({ ...filters, minVolume: e.target.value === '' ? 0 : parseInt(e.target.value) })}
                  className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                />
              </div>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
