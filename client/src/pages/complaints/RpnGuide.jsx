import { useState } from 'react';
import { ClipboardList, Check } from 'lucide-react';

export const PROBABILITY_OPTIONS = [
  {
    description: 'Highly improbable to occur',
    level: 'Extremely low',
    score: 2,
  },
  {
    description: 'Improbable to occur',
    level: 'Low',
    score: 4,
  },
  {
    description: 'Probable to occur',
    level: 'Moderate',
    score: 6,
  },
  {
    description: 'Highly probable to occur',
    level: 'High',
    score: 8,
  },
];

export const SEVERITY_OPTIONS = [
  {
    description: 'Minor GMP non-compliance; no possible impact on Personnel using the product, yield or on production capability.',
    level: 'Low',
    score: 2,
  },
  {
    description: 'Significant GMP non-compliance; possible impact on personnel using the product; moderate impact on yield or production capability.',
    level: 'Moderate',
    score: 4,
  },
  {
    description: 'Major GMP non-compliance; probable impact on personnel using the product; high impact on yield or production capability.',
    level: 'High',
    score: 6,
  },
  {
    description: 'Serious GMP non-compliance; Probable serious harm or death; critical impact on yield or production capability.',
    level: 'Critical',
    score: 54,
  },
];

export const DETECTABILITY_OPTIONS = [
  {
    description: 'Control systems are in place, has a high probability of detecting defects',
    level: 'High',
    score: 2,
  },
  {
    description: 'Control systems in place, could detect defects',
    level: 'Moderate',
    score: 4,
  },
  {
    description: 'Control systems in place, low probability to detect defects',
    level: 'Low',
    score: 6,
  },
  {
    description: 'No control system to detect the defect',
    level: 'Non-existent',
    score: 8,
  },
];

export const RPN_CATEGORIES = [
  {
    condition: 'RPN Value < 40',
    category: 'MINOR',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-300',
    activeClass: 'bg-emerald-50 font-bold text-emerald-900 border-l-4 border-l-emerald-600',
    test: (v) => v !== null && v !== '' && !isNaN(v) && Number(v) < 40,
  },
  {
    condition: 'RPN Value > 40 and < 216',
    category: 'MAJOR',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-300',
    activeClass: 'bg-amber-50 font-bold text-amber-900 border-l-4 border-l-amber-600',
    test: (v) => v !== null && v !== '' && !isNaN(v) && Number(v) >= 40 && Number(v) <= 216,
  },
  {
    condition: 'RPN Value > 216 or Any deviation having health implications for the personnel using the product or Regulatory implications',
    category: 'CRITICAL',
    badgeClass: 'bg-red-50 text-red-700 border-red-300',
    activeClass: 'bg-red-50 font-bold text-red-900 border-l-4 border-l-red-600',
    test: (v) => v !== null && v !== '' && !isNaN(v) && Number(v) > 216,
  },
];

export function getRpnCategory(rpnVal) {
  if (rpnVal === null || rpnVal === undefined || rpnVal === '' || isNaN(rpnVal)) return null;
  const num = Number(rpnVal);
  if (num < 40) return { category: 'MINOR', color: 'emerald' };
  if (num <= 216) return { category: 'MAJOR', color: 'amber' };
  return { category: 'CRITICAL', color: 'red' };
}

/**
 * Official RPN Guide component positioned in the Right Sidebar directly below Complaint History.
 * Matches exact Salesforce layout (media_1793265264314_341ae616.png):
 * 1. PROBABILITY
 * 2. SEVERITY
 * 3. DETECTABILITY
 * 4. RISK PRIORITIZATION NUMBER
 */
export function RpnGuide({
  selectedSeverity,
  selectedProbability,
  selectedDetectability,
  rpn,
  onSelectSeverity,
  onSelectProbability,
  onSelectDetectability,
  interactive = false,
  defaultOpen = false,
}) {
  const [open, setOpen] = useState(defaultOpen);

  const numRpn = rpn !== null && rpn !== '' && !isNaN(rpn) ? Number(rpn) : null;
  const activeCategory = getRpnCategory(numRpn);

  return (
    <div className="rounded border border-slate-200 bg-white shadow-2xs overflow-hidden">
      {/* Top Header Bar matching official Salesforce RPN Guide */}
      <div className={`flex items-center justify-between px-3.5 py-2.5 bg-white ${open ? 'border-b border-slate-200' : ''}`}>
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-600 text-white shadow-2xs">
            <ClipboardList className="h-4 w-4" />
          </div>
          <span className="text-sm font-bold text-slate-800 tracking-tight">RPN Guide</span>
          {activeCategory && (
            <span
              className={`ml-1 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                activeCategory.category === 'MINOR'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                  : activeCategory.category === 'MAJOR'
                  ? 'bg-amber-50 text-amber-700 border-amber-300'
                  : 'bg-red-50 text-red-700 border-red-300'
              }`}
            >
              RPN: {numRpn} — {activeCategory.category}
            </span>
          )}
        </div>

        {/* Toggle Switch matching screenshot */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setOpen((prev) => !prev)}
            className="flex flex-col items-center cursor-pointer select-none group focus:outline-none"
            aria-label={open ? 'Hide RPN Guide' : 'Show RPN Guide'}
          >
            <div
              className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out border ${
                open ? 'bg-[#0176d3] border-[#0176d3]' : 'bg-slate-300 border-slate-300'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out mt-0.5 ${
                  open ? 'translate-x-5' : 'translate-x-0.5'
                }`}
              />
            </div>
            <span className="text-[10px] font-medium text-slate-500 mt-0.5">
              {open ? 'Hide' : 'Show'}
            </span>
          </button>

          {/* Green circular checkmark badge next to toggle (shown when open) */}
          {open && (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-teal-600 text-white shadow-2xs">
              <Check className="h-3 w-3 stroke-[3]" />
            </span>
          )}
        </div>
      </div>

      {/* Guide Content: 4 Official Tables ordered exactly per screenshot */}
      {open && (
        <div className="p-3 bg-white space-y-3.5 animate-in fade-in duration-150">
          {interactive && (
            <p className="text-[11px] text-slate-500 italic">
              Tip: Click any row to automatically select its score.
            </p>
          )}

          {/* 1. PROBABILITY Table */}
          <div className="border border-black overflow-hidden bg-white">
            <div className="py-1 text-center font-bold text-xs text-black tracking-wider border-b border-black uppercase bg-white">
              PROBABILITY
            </div>
            <table className="w-full text-left text-[11px] border-collapse">
              <thead>
                <tr className="border-b border-black font-bold text-[10px] text-black uppercase">
                  <th className="px-2 py-1.5 border-r border-black">DESCRIPTION</th>
                  <th className="px-2 py-1.5 border-r border-black text-center w-24">PROBABILITY</th>
                  <th className="px-2 py-1.5 text-center w-20 leading-tight">P NUMBER VALUE</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black text-black">
                {PROBABILITY_OPTIONS.map((item) => {
                  const isSelected = Number(selectedProbability) === item.score;
                  return (
                    <tr
                      key={item.score}
                      onClick={() => interactive && onSelectProbability?.(item.score, item.level)}
                      className={`transition-colors ${
                        interactive ? 'cursor-pointer hover:bg-blue-50/80' : ''
                      } ${isSelected ? 'bg-blue-100/70 font-semibold text-blue-950' : 'hover:bg-slate-50/70'}`}
                    >
                      <td className="px-2 py-1.5 border-r border-black leading-snug">
                        {item.description}
                      </td>
                      <td className="px-2 py-1.5 border-r border-black text-center font-medium">
                        {item.level}
                      </td>
                      <td className="px-2 py-1.5 text-center font-bold">
                        {item.score}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* 2. SEVERITY Table */}
          <div className="border border-black overflow-hidden bg-white">
            <div className="py-1 text-center font-bold text-xs text-black tracking-wider border-b border-black uppercase bg-white">
              SEVERITY
            </div>
            <table className="w-full text-left text-[11px] border-collapse">
              <thead>
                <tr className="border-b border-black font-bold text-[10px] text-black uppercase">
                  <th className="px-2 py-1.5 border-r border-black">DESCRIPTION</th>
                  <th className="px-2 py-1.5 border-r border-black text-center w-20">SEVERITY</th>
                  <th className="px-2 py-1.5 text-center w-20 leading-tight">S NUMBER VALUE</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black text-black">
                {SEVERITY_OPTIONS.map((item) => {
                  const isSelected = Number(selectedSeverity) === item.score;
                  return (
                    <tr
                      key={item.score}
                      onClick={() => interactive && onSelectSeverity?.(item.score, item.level)}
                      className={`transition-colors ${
                        interactive ? 'cursor-pointer hover:bg-blue-50/80' : ''
                      } ${isSelected ? 'bg-blue-100/70 font-semibold text-blue-950' : 'hover:bg-slate-50/70'}`}
                    >
                      <td className="px-2 py-1.5 border-r border-black leading-snug">
                        {item.description}
                      </td>
                      <td className="px-2 py-1.5 border-r border-black text-center font-medium">
                        {item.level}
                      </td>
                      <td className="px-2 py-1.5 text-center font-bold">
                        {item.score}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* 3. DETECTABILITY Table */}
          <div className="border border-black overflow-hidden bg-white">
            <div className="py-1 text-center font-bold text-xs text-black tracking-wider border-b border-black uppercase bg-white">
              DETECTABILITY
            </div>
            <table className="w-full text-left text-[11px] border-collapse">
              <thead>
                <tr className="border-b border-black font-bold text-[10px] text-black uppercase">
                  <th className="px-2 py-1.5 border-r border-black">DESCRIPTION</th>
                  <th className="px-2 py-1.5 border-r border-black text-center w-24">DETECTABILITY</th>
                  <th className="px-2 py-1.5 text-center w-20 leading-tight">D NUMBER VALUE</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black text-black">
                {DETECTABILITY_OPTIONS.map((item) => {
                  const isSelected = Number(selectedDetectability) === item.score;
                  return (
                    <tr
                      key={item.score}
                      onClick={() => interactive && onSelectDetectability?.(item.score, item.level)}
                      className={`transition-colors ${
                        interactive ? 'cursor-pointer hover:bg-blue-50/80' : ''
                      } ${isSelected ? 'bg-blue-100/70 font-semibold text-blue-950' : 'hover:bg-slate-50/70'}`}
                    >
                      <td className="px-2 py-1.5 border-r border-black leading-snug">
                        {item.description}
                      </td>
                      <td className="px-2 py-1.5 border-r border-black text-center font-medium">
                        {item.level}
                      </td>
                      <td className="px-2 py-1.5 text-center font-bold">
                        {item.score}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* 4. RISK PRIORITIZATION NUMBER Table */}
          <div className="border border-black overflow-hidden bg-white">
            <div className="py-1 text-center font-bold text-xs text-black tracking-wider border-b border-black uppercase bg-white">
              RISK PRIORITIZATION NUMBER
            </div>
            <table className="w-full text-left text-[11px] border-collapse">
              <thead>
                <tr className="border-b border-black font-bold text-[10px] text-black uppercase">
                  <th className="px-2 py-1.5 border-r border-black">DESCRIPTION</th>
                  <th className="px-2 py-1.5 text-center w-28">DETECTABILITY</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black text-black">
                {RPN_CATEGORIES.map((cat) => {
                  const isActive = cat.test(numRpn);
                  return (
                    <tr
                      key={cat.category}
                      className={`transition-colors ${
                        isActive ? 'bg-amber-100/70 font-bold' : 'hover:bg-slate-50/70'
                      }`}
                    >
                      <td className="px-2 py-1.5 border-r border-black leading-snug">
                        {cat.condition}
                      </td>
                      <td className="px-2 py-1.5 text-center font-bold">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-bold border ${cat.badgeClass} ${
                            isActive ? 'ring-1 ring-slate-700 shadow-2xs scale-105' : ''
                          }`}
                        >
                          {cat.category}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
