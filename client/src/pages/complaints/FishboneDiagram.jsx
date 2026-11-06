import { useState, useRef, useEffect } from 'react';
import {
  RotateCw,
  Edit2,
  X,
  Plus,
  Trash2,
  Check,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { d3Api } from '../../api/endpoints.js';
import { readError } from '../../api/client.js';
import { useToast } from '../../components/Toast.jsx';

// 6 Categories matching Salesforce QEQMS documentation
const CATEGORIES = [
  { key: 'Manpower', label: 'Man Power', badgeLabel: 'MANPOWER', color: '#ff9800', borderColor: '#ff9800', pillW: 105, half: 'top', col: 0 },
  { key: 'Method', label: 'Method', badgeLabel: 'METHOD', color: '#e91e63', borderColor: '#e91e63', pillW: 95, half: 'top', col: 1 },
  { key: 'Machine', label: 'Machine', badgeLabel: 'MACHINE', color: '#9c27b0', borderColor: '#9c27b0', pillW: 95, half: 'top', col: 2 },
  { key: 'Material', label: 'Material', badgeLabel: 'MATERIAL', color: '#673ab7', borderColor: '#673ab7', pillW: 105, half: 'bottom', col: 0 },
  { key: 'Mother Nature', label: 'Environment', badgeLabel: 'Milieu / Environmental', color: '#00bcd4', borderColor: '#00bcd4', pillW: 145, half: 'bottom', col: 1, alias: 'Environment' },
  { key: 'Measurement', label: 'Measurement', badgeLabel: 'MEASUREMENT', color: '#4caf50', borderColor: '#4caf50', pillW: 120, half: 'bottom', col: 2 },
];

function wrapSvgText(text, maxChars = 20) {
  if (!text) return [];
  const words = String(text).split(' ');
  const lines = [];
  let current = '';
  for (const w of words) {
    if (!current) {
      current = w;
    } else if ((current + ' ' + w).length <= maxChars) {
      current += ' ' + w;
    } else {
      lines.push(current);
      current = w;
    }
  }
  if (current) lines.push(current);
  return lines.length > 0 ? lines : [String(text)];
}

export function FishboneDiagram({
  tree = {},
  problem = '',
  complaintNumber = '',
  complaintId,
  analysis,
  canEdit = true,
  onReload,
}) {
  const notify = useToast();
  const svgRef = useRef(null);
  const [reloading, setReloading] = useState(false);
  const [busy, setBusy] = useState(false);

  // Helper to extract causes list for a category key
  const getCauses = (cat) => {
    const direct = tree[cat.key] || [];
    if (direct.length > 0) return direct;
    if (cat.alias && tree[cat.alias]?.length > 0) return tree[cat.alias];
    return [];
  };

  // Check if there are already causes or problem saved
  const hasExistingData =
    Boolean(problem) ||
    CATEGORIES.some((cat) => getCauses(cat).length > 0);

  // If there's existing data, show the diagram first. If empty, show the input form!
  const [isEditing, setIsEditing] = useState(!hasExistingData);

  // Form State matching Screenshot 2
  const [rootCauseName, setRootCauseName] = useState(problem || 'Test1');
  const [activeCheckboxes, setActiveCheckboxes] = useState({
    Manpower: true,
    Machine: false,
    Material: false,
    Method: false,
    Measurement: false,
    'Mother Nature': false,
  });

  // Local causes cache: { [catKey]: string[] }
  const [localCauses, setLocalCauses] = useState({});
  const [inputTexts, setInputTexts] = useState({});

  // Sync state when tree or problem changes
  useEffect(() => {
    const initialCauses = {};
    const initialChecks = {};
    CATEGORIES.forEach((cat) => {
      const serverCauses = getCauses(cat).map((c) => (typeof c === 'string' ? c : c.text));
      initialCauses[cat.key] = serverCauses;
      if (serverCauses.length > 0) {
        initialChecks[cat.key] = true;
      }
    });

    // If no categories are checked, default Manpower to checked (as shown in documentation)
    if (!Object.values(initialChecks).some(Boolean)) {
      initialChecks.Manpower = true;
    }

    setLocalCauses(initialCauses);
    setActiveCheckboxes((prev) => ({ ...prev, ...initialChecks }));
    setRootCauseName(problem || 'Test1');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tree, problem]);

  const handleToggleCheckbox = (catKey) => {
    setActiveCheckboxes((prev) => ({
      ...prev,
      [catKey]: !prev[catKey],
    }));
  };

  const handleAddDescription = (catKey) => {
    const text = (inputTexts[catKey] || '').trim();
    if (!text) return;

    const currentList = localCauses[catKey] || [];
    // Rule e: Maximum 3 descriptions per category (PDF Page 8 item e & Page 9)
    if (currentList.length >= 3) {
      notify('Limit reached: You can add up to 3 descriptions for this category.', 'bad');
      return;
    }

    setLocalCauses((prev) => ({
      ...prev,
      [catKey]: [...(prev[catKey] || []), text],
    }));

    setInputTexts((prev) => ({
      ...prev,
      [catKey]: '',
    }));
  };

  const handleRemoveDescription = (catKey, indexToRemove) => {
    setLocalCauses((prev) => ({
      ...prev,
      [catKey]: (prev[catKey] || []).filter((_, i) => i !== indexToRemove),
    }));
  };

  const handleSaveForm = async () => {
    if (!complaintId) {
      setIsEditing(false);
      return;
    }
    setBusy(true);

    try {
      // 1. Save problem statement / root cause name (Fish Head)
      await d3Api.updateAnalysis(complaintId, {
        ...(analysis?.__v !== undefined ? { version: analysis.__v } : {}),
        problemStatement: rootCauseName || problem || 'Test1',
        methods: ['FISHBONE'],
      });

      // 2. Sync causes with backend:
      for (const cat of CATEGORIES) {
        const targetList = activeCheckboxes[cat.key] ? localCauses[cat.key] || [] : [];
        const existingServerCauses = getCauses(cat);

        // Delete server causes not in targetList
        for (const sc of existingServerCauses) {
          if (!targetList.includes(sc.text)) {
            await d3Api.deleteCause(complaintId, sc._id);
          }
        }

        // Add new causes not yet on server
        const existingTexts = existingServerCauses.map((c) => c.text);
        for (const t of targetList) {
          if (!existingTexts.includes(t)) {
            await d3Api.addCause(complaintId, { category: cat.key, text: t });
          }
        }
      }

      notify('Fishbone analysis saved successfully.');
      if (onReload) await onReload();
      setIsEditing(false);
    } catch (err) {
      notify(readError(err).message || 'Failed to save fishbone analysis.', 'bad');
    } finally {
      setBusy(false);
    }
  };

  const handleReload = async () => {
    setReloading(true);
    try {
      if (onReload) await onReload();
      notify('Fishbone data refreshed.');
    } catch {
      notify('Failed to refresh data.', 'bad');
    } finally {
      setTimeout(() => setReloading(false), 400);
    }
  };

  // SVG Geometry constants with generous spacing between categories and causes
  const W = 1100;
  const H = 600;
  const spineY = 300;
  const spineStartX = 40;
  const spineEndX = 830;

  const cols = [
    { xRib: 320, xPillTop: 145, xPillBottom: 145 },
    { xRib: 550, xPillTop: 375, xPillBottom: 375 },
    { xRib: 780, xPillTop: 605, xPillBottom: 605 },
  ];

  const getTopYLevel = (idx, total) => {
    if (total <= 1) return 180;
    if (total === 2) return idx === 0 ? 135 : 225;
    const levels = [115, 180, 245];
    return levels[idx] || 180;
  };

  const getBottomYLevel = (idx, total) => {
    if (total <= 1) return 420;
    if (total === 2) return idx === 0 ? 465 : 375;
    const levels = [485, 420, 355];
    return levels[idx] || 420;
  };

  return (
    <div className="w-full bg-white rounded-md border border-slate-200 shadow-2xs overflow-hidden">
      {isEditing ? (
        /* ------------------ FORM VIEW (Screenshot 2: Entry Form) ------------------ */
        <div className="p-5 sm:p-6 space-y-5 text-xs text-slate-800">
          {/* *Identified of Rootcause */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              <span className="text-red-600 mr-0.5">*</span>Identified of Rootcause
            </label>
            <input
              type="text"
              value={rootCauseName}
              onChange={(e) => setRootCauseName(e.target.value)}
              placeholder="Enter identified root cause (e.g. Test1)..."
              className="w-full rounded border border-blue-400 bg-blue-50/20 px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
            />
          </div>

          {/* 6 Category Checkboxes and Sub-inputs */}
          <div className="space-y-4 pt-1">
            {CATEGORIES.map((cat) => {
              const isChecked = Boolean(activeCheckboxes[cat.key]);
              const causes = localCauses[cat.key] || [];

              return (
                <div key={cat.key} className="space-y-2 border-b border-slate-100 pb-3 last:border-b-0">
                  {/* Category Checkbox */}
                  <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => handleToggleCheckbox(cat.key)}
                      className="h-4 w-4 rounded border-slate-300 text-[#0176d3] focus:ring-blue-500"
                    />
                    <span className="text-xs font-semibold text-slate-800">
                      {cat.label}
                    </span>
                  </label>

                  {/* If Checked: Show Description Input, [Add] Button, and Chips */}
                  {isChecked && (
                    <div className="pl-6 space-y-2.5 pt-1">
                      <div>
                        <label className="block text-[11px] text-slate-500 font-medium mb-1">
                          {cat.label} Description
                        </label>
                        <div className="flex gap-2 max-w-2xl">
                          <input
                            type="text"
                            value={inputTexts[cat.key] || ''}
                            onChange={(e) =>
                              setInputTexts({ ...inputTexts, [cat.key]: e.target.value })
                            }
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddDescription(cat.key);
                              }
                            }}
                            placeholder={`Enter ${cat.label} description...`}
                            className="flex-1 rounded border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 focus:border-blue-500 focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => handleAddDescription(cat.key)}
                            className="rounded bg-[#0176d3] px-4 py-1.5 text-xs font-semibold text-white hover:bg-[#015ba5] shadow-2xs transition-colors"
                          >
                            Add
                          </button>
                        </div>
                      </div>

                      {/* Added Description Chips (e.g. Test2 X, Test3 X) */}
                      {causes.length > 0 && (
                        <div className="flex flex-wrap gap-2 pt-1">
                          {causes.map((desc, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center gap-1.5 rounded border border-slate-300 bg-white px-3 py-1 text-xs text-slate-800 shadow-2xs font-medium"
                            >
                              <span>{desc}</span>
                              <button
                                type="button"
                                onClick={() => handleRemoveDescription(cat.key, idx)}
                                className="text-slate-400 hover:text-red-600 transition-colors"
                                title="Remove description"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Form Action Buttons: [ Save ] and [ Cancel ] */}
          <div className="flex items-center gap-2 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={handleSaveForm}
              disabled={busy}
              className="rounded bg-[#0176d3] px-6 py-1.5 text-xs font-semibold text-white hover:bg-[#015ba5] shadow-2xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              {busy ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>Save</span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="rounded border border-slate-300 bg-white px-5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        /* ------------------ DIAGRAM VIEW (Screenshot 1: Visual Fishbone) ------------------ */
        <div>
          {/* Card Header matching Salesforce Screenshot */}
          <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between bg-white">
            <h3 className="text-sm font-bold text-slate-800 tracking-tight">
              Fishbone Analysis
            </h3>

            {canEdit && (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="rounded bg-[#0176d3] px-4 py-1 text-xs font-semibold text-white shadow-2xs hover:bg-[#015ba5] transition-colors flex items-center gap-1.5"
              >
                <Edit2 className="h-3 w-3" />
                <span>Edit</span>
              </button>
            )}
          </div>

          {/* Sub-bar: Reload Data Button */}
          <div className="px-5 pt-3 flex items-center justify-between">
            <button
              type="button"
              onClick={handleReload}
              disabled={reloading}
              className="rounded border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-700 shadow-2xs hover:bg-slate-50 transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              <RotateCw className={`h-3 w-3 text-slate-500 ${reloading ? 'animate-spin' : ''}`} />
              <span>Reload Data</span>
            </button>

            <div className="text-[11px] text-slate-400">
              6M Ishikawa Root Cause Analysis
            </div>
          </div>

          {/* SVG Canvas matching Salesforce QEQMS screenshot */}
          <div className="p-4 sm:p-6 overflow-x-auto flex justify-center">
            <svg
              ref={svgRef}
              viewBox={`0 0 ${W} ${H}`}
              className="w-full max-w-5xl h-auto select-none"
              style={{ minWidth: '850px', fontFamily: 'system-ui, -apple-system, sans-serif' }}
            >
              {/* Background */}
              <rect x="0" y="0" width={W} height={H} fill="#ffffff" />

              {/* MAIN HORIZONTAL SPINE */}
              <line
                x1={spineStartX}
                y1={spineY}
                x2={spineEndX}
                y2={spineY}
                stroke="#52525b"
                strokeWidth="3"
                strokeLinecap="round"
              />

              {/* TOP 3 CATEGORIES (MANPOWER, METHOD, MACHINE) */}
              {[
                { cat: CATEGORIES[0], colIdx: 0, defaultText: 'Test2' },
                { cat: CATEGORIES[1], colIdx: 1, defaultText: 'Test6' },
                { cat: CATEGORIES[2], colIdx: 2, defaultText: 'Test3' },
              ].map(({ cat, colIdx, defaultText }) => {
                const col = cols[colIdx];
                const pillX = col.xPillTop;
                const pillY = 50;
                const ribStartX = pillX;
                const ribStartY = 63;
                const ribEndX = col.xRib;
                const ribEndY = spineY;

                const rawCauses = (localCauses[cat.key]?.length ? localCauses[cat.key] : getCauses(cat).map((c) => (typeof c === 'string' ? c : c.text)));
                const displayCauses = rawCauses.length > 0 ? rawCauses : [defaultText];

                return (
                  <g key={cat.key}>
                    {/* Diagonal Rib Line */}
                    <line
                      x1={ribStartX}
                      y1={ribStartY}
                      x2={ribEndX}
                      y2={ribEndY}
                      stroke="#52525b"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    />

                    {/* Category Pill / Capsule Badge at top */}
                    <rect
                      x={pillX - cat.pillW / 2}
                      y={pillY - 13}
                      width={cat.pillW}
                      height="26"
                      rx="13"
                      fill={cat.color}
                      stroke={cat.borderColor}
                      strokeWidth="1"
                    />
                    <text
                      x={pillX}
                      y={pillY + 4}
                      textAnchor="middle"
                      fill="#ffffff"
                      fontSize="11.5"
                      fontWeight="700"
                      letterSpacing="0.3px"
                    >
                      {cat.badgeLabel}
                    </text>

                    {/* Sub-cause Horizontal Boxes along the diagonal rib */}
                    {displayCauses.slice(0, 3).map((textVal, idx) => {
                      const boxY = getTopYLevel(idx, displayCauses.length);
                      const frac = (boxY - ribStartY) / (ribEndY - ribStartY);
                      const ribIntersectX = ribStartX + frac * (ribEndX - ribStartX);
                      const lines = wrapSvgText(textVal, 20);
                      const maxLineLen = Math.max(...lines.map((l) => l.length));
                      const boxW = Math.max(90, Math.min(160, maxLineLen * 6.5 + 16));
                      const boxH = Math.max(26, lines.length * 12 + 10);
                      const boxX = ribIntersectX - boxW - 10;

                      return (
                        <g key={idx}>
                          <title>{textVal}</title>
                          <line
                            x1={boxX + boxW}
                            y1={boxY}
                            x2={ribIntersectX}
                            y2={boxY}
                            stroke="#52525b"
                            strokeWidth="1.5"
                          />
                          <rect
                            x={boxX}
                            y={boxY - boxH / 2}
                            width={boxW}
                            height={boxH}
                            rx="4"
                            fill="#ffffff"
                            stroke={cat.borderColor}
                            strokeWidth="1.5"
                          />
                          <text
                            x={boxX + boxW / 2}
                            y={boxY - ((lines.length - 1) * 6) + 4}
                            textAnchor="middle"
                            fill="#334155"
                            fontSize={lines.length > 2 ? '9' : '10.5'}
                            fontWeight="600"
                          >
                            {lines.map((ln, i) => (
                              <tspan key={i} x={boxX + boxW / 2} dy={i === 0 ? 0 : 13}>
                                {ln}
                              </tspan>
                            ))}
                          </text>
                        </g>
                      );
                    })}
                  </g>
                );
              })}

              {/* BOTTOM 3 CATEGORIES (MATERIAL, MILIEU / ENVIRONMENTAL, MEASUREMENT) */}
              {[
                { cat: CATEGORIES[3], colIdx: 0, defaultText: 'Test4' },
                { cat: CATEGORIES[4], colIdx: 1, defaultText: 'Test7' },
                { cat: CATEGORIES[5], colIdx: 2, defaultText: 'Test8' },
              ].map(({ cat, colIdx, defaultText }) => {
                const col = cols[colIdx];
                const pillX = col.xPillBottom;
                const pillY = 550;
                const ribStartX = pillX;
                const ribStartY = 537;
                const ribEndX = col.xRib;
                const ribEndY = spineY;

                const rawCauses = (localCauses[cat.key]?.length ? localCauses[cat.key] : getCauses(cat).map((c) => (typeof c === 'string' ? c : c.text)));
                const displayCauses = rawCauses.length > 0 ? rawCauses : [defaultText];

                return (
                  <g key={cat.key}>
                    {/* Diagonal Rib Line */}
                    <line
                      x1={ribStartX}
                      y1={ribStartY}
                      x2={ribEndX}
                      y2={ribEndY}
                      stroke="#52525b"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    />

                    {/* Category Pill / Capsule Badge at bottom */}
                    <rect
                      x={pillX - cat.pillW / 2}
                      y={pillY - 13}
                      width={cat.pillW}
                      height="26"
                      rx="13"
                      fill={cat.color}
                      stroke={cat.borderColor}
                      strokeWidth="1"
                    />
                    <text
                      x={pillX}
                      y={pillY + 4}
                      textAnchor="middle"
                      fill="#ffffff"
                      fontSize="11.5"
                      fontWeight="700"
                      letterSpacing="0.3px"
                    >
                      {cat.badgeLabel}
                    </text>

                    {/* Sub-cause Horizontal Boxes along the diagonal rib */}
                    {displayCauses.slice(0, 3).map((textVal, idx) => {
                      const boxY = getBottomYLevel(idx, displayCauses.length);
                      const frac = (ribStartY - boxY) / (ribStartY - ribEndY);
                      const ribIntersectX = ribStartX + frac * (ribEndX - ribStartX);
                      const lines = wrapSvgText(textVal, 20);
                      const maxLineLen = Math.max(...lines.map((l) => l.length));
                      const boxW = Math.max(90, Math.min(160, maxLineLen * 6.5 + 16));
                      const boxH = Math.max(26, lines.length * 12 + 10);
                      const boxX = ribIntersectX - boxW - 10;

                      return (
                        <g key={idx}>
                          <title>{textVal}</title>
                          <line
                            x1={boxX + boxW}
                            y1={boxY}
                            x2={ribIntersectX}
                            y2={boxY}
                            stroke="#52525b"
                            strokeWidth="1.5"
                          />
                          <rect
                            x={boxX}
                            y={boxY - boxH / 2}
                            width={boxW}
                            height={boxH}
                            rx="4"
                            fill="#ffffff"
                            stroke={cat.borderColor}
                            strokeWidth="1.5"
                          />
                          <text
                            x={boxX + boxW / 2}
                            y={boxY - ((lines.length - 1) * 6) + 4}
                            textAnchor="middle"
                            fill="#334155"
                            fontSize={lines.length > 2 ? '9' : '10.5'}
                            fontWeight="600"
                          >
                            {lines.map((ln, i) => (
                              <tspan key={i} x={boxX + boxW / 2} dy={i === 0 ? 0 : 13}>
                                {ln}
                              </tspan>
                            ))}
                          </text>
                        </g>
                      );
                    })}
                  </g>
                );
              })}

              {/* THE FISH HEAD (ORGANIC PEBBLE / EGG SHAPE IN BRIGHT MAGENTA) */}
              <g>
                <path
                  d="M 825,300 C 815,190 885,150 970,195 C 1055,240 1065,360 980,405 C 895,450 815,410 825,300 Z"
                  fill="#e91e63"
                  stroke="#d81b60"
                  strokeWidth="2"
                />
                {(() => {
                  const headLines = wrapSvgText(rootCauseName || 'Identified Problem', 16).slice(0, 4);
                  const startY = 300 - ((headLines.length - 1) * 8.5) + 5;
                  const fSize = headLines.length > 3 ? '11' : (headLines.length > 2 ? '12.5' : '14');
                  return (
                    <text
                      x="945"
                      y={startY}
                      textAnchor="middle"
                      fill="#ffffff"
                      fontSize={fSize}
                      fontWeight="700"
                    >
                      {headLines.map((ln, i) => (
                        <tspan key={i} x="945" dy={i === 0 ? 0 : 17}>
                          {ln}
                        </tspan>
                      ))}
                    </text>
                  );
                })()}
              </g>
            </svg>
          </div>
        </div>
      )}
    </div>
  );
}
