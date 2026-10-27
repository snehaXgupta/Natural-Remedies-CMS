import { useState } from 'react';
import {
  Settings,
  Plus,
  Clock,
  ShieldAlert,
  Mail,
  List,
  Save,
  Check,
  Eye,
  X,
} from 'lucide-react';
import { lookupApi, settingsApi } from '../../api/endpoints.js';
import { readError } from '../../api/client.js';
import { useAsync } from '../../lib/useAsync.js';
import { Button } from '../../components/Button.jsx';
import { Loading, ErrorState } from '../../components/States.jsx';
import { useToast } from '../../components/Toast.jsx';

/* ---------------- TAB 1: Minimalist Picklist Manager ---------------- */

function PicklistsTab({ data, reload }) {
  const notify = useToast();
  const definitions = data?.definitions || {};
  const lists = data?.lists || {};
  const [selectedKey, setSelectedKey] = useState('sbu');
  const [newValue, setNewValue] = useState('');
  const [parentVal, setParentVal] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);

  const def = definitions[selectedKey] || {};
  const rows = lists[selectedKey] || [];
  const needsParent = Boolean(def.parentList);
  const parentRows = needsParent ? (lists[def.parentList] || []).filter((p) => p.active) : [];

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newValue.trim()) return;
    setSaving(true);
    try {
      await lookupApi.create({
        list: selectedKey,
        value: newValue.trim(),
        parent: needsParent ? parentVal : undefined,
      });
      notify(`Added "${newValue.trim()}"`);
      setNewValue('');
      reload();
    } catch (err) {
      notify(readError(err).message, 'bad');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (r) => {
    try {
      await lookupApi.update(r._id, { active: !r.active });
      notify(r.active ? `Deactivated "${r.value}"` : `Reactivated "${r.value}"`);
      reload();
    } catch (err) {
      notify(readError(err).message, 'bad');
    }
  };

  const handleRename = async (id) => {
    if (!editValue.trim()) return;
    try {
      await lookupApi.update(id, { value: editValue.trim() });
      notify('Updated.');
      setEditingId(null);
      reload();
    } catch (err) {
      notify(readError(err).message, 'bad');
    }
  };

  return (
    <div className="space-y-3">
      {/* Selector & Add Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Picklist:</label>
          <select
            value={selectedKey}
            onChange={(e) => {
              setSelectedKey(e.target.value);
              setNewValue('');
              setParentVal('');
              setEditingId(null);
            }}
            className="h-8 rounded border border-slate-300 bg-white px-2.5 text-xs font-semibold text-slate-800 focus:border-blue-500 focus:outline-none"
          >
            {Object.entries(definitions).map(([k, d]) => (
              <option key={k} value={k}>
                {d.label} ({(lists[k] || []).length})
              </option>
            ))}
          </select>
        </div>

        {/* Quick Add Input */}
        <form onSubmit={handleAdd} className="flex items-center gap-1.5 text-xs">
          {needsParent && (
            <select
              value={parentVal}
              onChange={(e) => setParentVal(e.target.value)}
              className="h-8 rounded border border-slate-300 bg-white px-2 text-xs text-slate-700 focus:border-blue-500 focus:outline-none"
            >
              <option value="">Choose {definitions[def.parentList]?.label || 'Parent'}...</option>
              {parentRows.map((p) => (
                <option key={p._id} value={p.value}>{p.value}</option>
              ))}
            </select>
          )}
          <input
            type="text"
            placeholder="New value..."
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            className="h-8 w-44 sm:w-56 rounded border border-slate-300 bg-white px-2.5 text-xs text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:outline-none"
          />
          <button
            type="submit"
            disabled={saving || !newValue.trim() || (needsParent && !parentVal)}
            className="h-8 px-3 rounded bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold text-xs flex items-center gap-1 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" /> Add
          </button>
        </form>
      </div>

      {/* Minimalist Data Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border border-slate-200 rounded overflow-hidden">
          <thead className="bg-[#f8fafc] border-b border-slate-200 text-slate-600 font-semibold">
            <tr>
              <th className="px-3.5 py-2">Value</th>
              {needsParent && <th className="px-3.5 py-2">Parent ({def.parentList})</th>}
              <th className="px-3.5 py-2 w-24">Status</th>
              <th className="px-3.5 py-2 w-28 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={needsParent ? 4 : 3} className="px-3.5 py-6 text-center text-slate-400 italic">
                  No values configured yet.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r._id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="px-3.5 py-2 font-medium text-slate-800">
                    {editingId === r._id ? (
                      <div className="flex items-center gap-1.5">
                        <input
                          type="text"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="h-7 rounded border border-slate-300 px-2 text-xs focus:border-blue-500 focus:outline-none"
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={() => handleRename(r._id)}
                          className="text-blue-600 hover:underline font-semibold"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="text-slate-400 hover:text-slate-600"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <span className={r.active ? 'text-slate-800' : 'text-slate-400 line-through'}>
                        {r.value}
                      </span>
                    )}
                  </td>
                  {needsParent && (
                    <td className="px-3.5 py-2 text-slate-600">{r.parent || '—'}</td>
                  )}
                  <td className="px-3.5 py-2">
                    <span
                      className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                        r.active
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-slate-100 text-slate-500 border border-slate-200'
                      }`}
                    >
                      {r.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-3.5 py-2 text-right space-x-2">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(r._id);
                        setEditValue(r.value);
                      }}
                      className="text-blue-600 hover:underline font-medium"
                    >
                      Rename
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggle(r)}
                      className="text-slate-500 hover:text-slate-800"
                    >
                      {r.active ? 'Deactivate' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ---------------- TAB 2: Minimalist SLA Configuration ---------------- */

function SlaTab({ initialSla }) {
  const notify = useToast();
  const [saving, setSaving] = useState(false);
  const [sla, setSla] = useState(initialSla || {
    d1TargetHours: 24,
    d2TargetHours: 72,
    d3TargetHours: 360,
    d4TargetHours: 1440,
    maxExtensionHours: 72,
    warningThresholdPercent: 80,
    businessHoursOnly: true,
    autoEscalateOverdue: true,
  });

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await settingsApi.update('sla', sla);
      notify('SLA configuration saved.');
    } catch (err) {
      notify(readError(err).message, 'bad');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 text-xs">
        <div>
          <label className="block text-slate-700 font-medium mb-1">
            D1 Acknowledgement Target (Hours)
          </label>
          <input
            type="number"
            min="1"
            className="w-full h-8 rounded border border-slate-300 px-2.5 text-xs text-slate-800 focus:border-blue-500 focus:outline-none"
            value={sla.d1TargetHours}
            onChange={(e) => setSla({ ...sla, d1TargetHours: Number(e.target.value) })}
          />
        </div>

        <div>
          <label className="block text-slate-700 font-medium mb-1">
            D2 Investigation Target (Hours)
          </label>
          <input
            type="number"
            min="1"
            className="w-full h-8 rounded border border-slate-300 px-2.5 text-xs text-slate-800 focus:border-blue-500 focus:outline-none"
            value={sla.d2TargetHours}
            onChange={(e) => setSla({ ...sla, d2TargetHours: Number(e.target.value) })}
          />
        </div>

        <div>
          <label className="block text-slate-700 font-medium mb-1">
            D3 RCA & CAPA Submission Target (Hours)
          </label>
          <input
            type="number"
            min="1"
            className="w-full h-8 rounded border border-slate-300 px-2.5 text-xs text-slate-800 focus:border-blue-500 focus:outline-none"
            value={sla.d3TargetHours}
            onChange={(e) => setSla({ ...sla, d3TargetHours: Number(e.target.value) })}
          />
        </div>

        <div>
          <label className="block text-slate-700 font-medium mb-1">
            D4 Effectiveness Review Target (Hours)
          </label>
          <input
            type="number"
            min="1"
            className="w-full h-8 rounded border border-slate-300 px-2.5 text-xs text-slate-800 focus:border-blue-500 focus:outline-none"
            value={sla.d4TargetHours}
            onChange={(e) => setSla({ ...sla, d4TargetHours: Number(e.target.value) })}
          />
        </div>

        <div>
          <label className="block text-slate-700 font-medium mb-1">
            Max Allowable Extension (Hours)
          </label>
          <input
            type="number"
            min="1"
            className="w-full h-8 rounded border border-slate-300 px-2.5 text-xs text-slate-800 focus:border-blue-500 focus:outline-none"
            value={sla.maxExtensionHours}
            onChange={(e) => setSla({ ...sla, maxExtensionHours: Number(e.target.value) })}
          />
        </div>

        <div>
          <label className="block text-slate-700 font-medium mb-1">
            Early Warning Threshold (%)
          </label>
          <input
            type="number"
            min="50"
            max="95"
            className="w-full h-8 rounded border border-slate-300 px-2.5 text-xs text-slate-800 focus:border-blue-500 focus:outline-none"
            value={sla.warningThresholdPercent}
            onChange={(e) => setSla({ ...sla, warningThresholdPercent: Number(e.target.value) })}
          />
        </div>
      </div>

      <div className="pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-col sm:flex-row gap-4">
          <label className="flex items-center gap-1.5 cursor-pointer text-slate-700">
            <input
              type="checkbox"
              checked={sla.businessHoursOnly}
              onChange={(e) => setSla({ ...sla, businessHoursOnly: e.target.checked })}
              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <span>Business hours only (exclude weekends)</span>
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer text-slate-700">
            <input
              type="checkbox"
              checked={sla.autoEscalateOverdue}
              onChange={(e) => setSla({ ...sla, autoEscalateOverdue: e.target.checked })}
              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <span>Auto-escalate overdue complaints</span>
          </label>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="px-4 py-1.5 rounded bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold text-xs flex items-center gap-1.5 transition-colors"
        >
          <Save className="h-3.5 w-3.5" /> Save SLA
        </button>
      </div>
    </form>
  );
}

/* ---------------- TAB 3: Minimalist Risk Matrix (RPN) ---------------- */

function RiskMatrixTab({ initialRisk }) {
  const notify = useToast();
  const [saving, setSaving] = useState(false);
  const [risk, setRisk] = useState(initialRisk || {
    formula: 'SEVERITY_OCCURRENCE_DETECTION',
    lowRiskMax: 20,
    mediumRiskMax: 60,
    severityLevels: [
      { score: 1, label: 'Minor', description: 'Cosmetic blemish' },
      { score: 2, label: 'Moderate', description: 'Minor defect' },
      { score: 3, label: 'Significant', description: 'Performance affected' },
      { score: 4, label: 'Critical', description: 'Standard violation' },
      { score: 5, label: 'Catastrophic', description: 'Safety hazard' },
    ],
    occurrenceLevels: [
      { score: 1, label: 'Rare (<0.1%)' },
      { score: 2, label: 'Unlikely (0.1–0.5%)' },
      { score: 3, label: 'Moderate (0.5–2%)' },
      { score: 4, label: 'Frequent (2–5%)' },
      { score: 5, label: 'Persistent (>5%)' },
    ],
    detectionLevels: [
      { score: 1, label: 'In-line' },
      { score: 2, label: 'Routine QA' },
      { score: 3, label: 'Moderate' },
      { score: 4, label: 'Low' },
      { score: 5, label: 'Undetectable' },
    ],
  });

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await settingsApi.update('riskMatrix', risk);
      notify('Risk matrix thresholds saved.');
    } catch (err) {
      notify(readError(err).message, 'bad');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-4 text-xs">
      {/* Formula & Boundaries in one clean row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 border-b border-slate-200 pb-4">
        <div className="bg-slate-50 border border-slate-200 rounded p-2.5">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Formula</span>
          <span className="font-bold text-slate-800 text-xs mt-0.5 block">RPN = Severity × Occurrence × Detection</span>
        </div>

        <div>
          <label className="block font-medium text-slate-700 mb-1">
            Low Risk Max Cutoff
          </label>
          <input
            type="number"
            min="1"
            max="50"
            className="w-full h-8 rounded border border-slate-300 px-2.5 text-xs text-slate-800 focus:border-blue-500 focus:outline-none"
            value={risk.lowRiskMax}
            onChange={(e) => setRisk({ ...risk, lowRiskMax: Number(e.target.value) })}
          />
        </div>

        <div>
          <label className="block font-medium text-slate-700 mb-1">
            Medium Risk Max Cutoff
          </label>
          <input
            type="number"
            min="21"
            max="100"
            className="w-full h-8 rounded border border-slate-300 px-2.5 text-xs text-slate-800 focus:border-blue-500 focus:outline-none"
            value={risk.mediumRiskMax}
            onChange={(e) => setRisk({ ...risk, mediumRiskMax: Number(e.target.value) })}
          />
        </div>
      </div>

      {/* Clean 3-Column Rating Reference */}
      <div>
        <h4 className="font-semibold text-slate-700 mb-2">FMEA Rating Scale Reference (1–5)</h4>
        <div className="grid grid-cols-3 gap-3">
          {/* Severity */}
          <div className="border border-slate-200 rounded overflow-hidden">
            <div className="bg-[#f8fafc] border-b border-slate-200 px-3 py-1.5 font-semibold text-slate-700">
              Severity
            </div>
            <ul className="divide-y divide-slate-100 bg-white">
              {(risk.severityLevels || []).map((lvl) => (
                <li key={lvl.score} className="px-3 py-1.5 flex justify-between">
                  <span className="font-medium text-slate-800">{lvl.score}. {lvl.label}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Occurrence */}
          <div className="border border-slate-200 rounded overflow-hidden">
            <div className="bg-[#f8fafc] border-b border-slate-200 px-3 py-1.5 font-semibold text-slate-700">
              Occurrence
            </div>
            <ul className="divide-y divide-slate-100 bg-white">
              {(risk.occurrenceLevels || []).map((lvl) => (
                <li key={lvl.score} className="px-3 py-1.5 flex justify-between">
                  <span className="font-medium text-slate-800">{lvl.score}. {lvl.label}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Detection */}
          <div className="border border-slate-200 rounded overflow-hidden">
            <div className="bg-[#f8fafc] border-b border-slate-200 px-3 py-1.5 font-semibold text-slate-700">
              Detection
            </div>
            <ul className="divide-y divide-slate-100 bg-white">
              {(risk.detectionLevels || []).map((lvl) => (
                <li key={lvl.score} className="px-3 py-1.5 flex justify-between">
                  <span className="font-medium text-slate-800">{lvl.score}. {lvl.label}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="pt-3 border-t border-slate-200 flex justify-end">
        <button
          type="submit"
          disabled={saving}
          className="px-4 py-1.5 rounded bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold text-xs flex items-center gap-1.5 transition-colors"
        >
          <Save className="h-3.5 w-3.5" /> Save Risk Matrix
        </button>
      </div>
    </form>
  );
}

/* ---------------- TAB 4: Minimalist Email Templates ---------------- */

function EmailTemplatesTab({ initialTemplates }) {
  const notify = useToast();
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [tmpl, setTmpl] = useState(initialTemplates || {
    d1Subject: 'Complaint Acknowledgement for D1 Stage- {{complaintNumber}}',
    d1Greeting: 'Dear {{recipientName}},',
    d1Message: 'Thank you for bringing this matter to our attention. We have received your complaint {{complaintNumber}} and our team is reviewing it. We will update you on the progress shortly.',
    d1Signoff: 'Customer Relationship Management Team\nNatural Remedies Quality Assurance',
    footnote: 'Note: This is an auto-generated email. Please do not reply to this email.',
  });

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await settingsApi.update('emailTemplates', tmpl);
      notify('Email template saved.');
    } catch (err) {
      notify(readError(err).message, 'bad');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-3 text-xs">
      <div>
        <label className="block font-medium text-slate-700 mb-1">Subject</label>
        <input
          type="text"
          value={tmpl.d1Subject}
          onChange={(e) => setTmpl({ ...tmpl, d1Subject: e.target.value })}
          className="w-full h-8 rounded border border-slate-300 px-2.5 text-xs text-slate-800 focus:border-blue-500 focus:outline-none"
        />
      </div>

      <div>
        <label className="block font-medium text-slate-700 mb-1">Salutation</label>
        <input
          type="text"
          value={tmpl.d1Greeting}
          onChange={(e) => setTmpl({ ...tmpl, d1Greeting: e.target.value })}
          className="w-full h-8 rounded border border-slate-300 px-2.5 text-xs text-slate-800 focus:border-blue-500 focus:outline-none"
        />
      </div>

      <div>
        <label className="block font-medium text-slate-700 mb-1">Body Message</label>
        <textarea
          rows={3}
          value={tmpl.d1Message}
          onChange={(e) => setTmpl({ ...tmpl, d1Message: e.target.value })}
          className="w-full rounded border border-slate-300 p-2 text-xs text-slate-800 focus:border-blue-500 focus:outline-none"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block font-medium text-slate-700 mb-1">Sign-off</label>
          <textarea
            rows={2}
            value={tmpl.d1Signoff}
            onChange={(e) => setTmpl({ ...tmpl, d1Signoff: e.target.value })}
            className="w-full rounded border border-slate-300 p-2 text-xs text-slate-800 focus:border-blue-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="block font-medium text-slate-700 mb-1">Footnote</label>
          <textarea
            rows={2}
            value={tmpl.footnote}
            onChange={(e) => setTmpl({ ...tmpl, footnote: e.target.value })}
            className="w-full rounded border border-slate-300 p-2 text-xs text-slate-800 focus:border-blue-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Action Footer */}
      <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setShowPreview(!showPreview)}
          className="text-xs font-semibold text-blue-600 hover:underline flex items-center gap-1"
        >
          <Eye className="h-3.5 w-3.5" />
          <span>{showPreview ? 'Hide Preview' : 'Show Preview'}</span>
        </button>

        <button
          type="submit"
          disabled={saving}
          className="px-4 py-1.5 rounded bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold text-xs flex items-center gap-1.5 transition-colors"
        >
          <Save className="h-3.5 w-3.5" /> Save Template
        </button>
      </div>

      {/* Optional Inline Preview */}
      {showPreview && (
        <div className="mt-3 p-4 bg-slate-50 border border-slate-200 rounded text-slate-800 space-y-2">
          <div className="text-[11px] text-slate-500 border-b border-slate-200 pb-2">
            <div><strong>Subject:</strong> {tmpl.d1Subject.replace('{{complaintNumber}}', 'AHP-26-3-169')}</div>
          </div>
          <p>{tmpl.d1Greeting.replace('{{recipientName}}', 'Naveen K S')}</p>
          <p>{tmpl.d1Message.replace('{{complaintNumber}}', 'AHP-26-3-169')}</p>
          <p className="whitespace-pre-line font-medium">{tmpl.d1Signoff}</p>
          {tmpl.footnote && <p className="text-[10px] text-slate-400 italic pt-1">{tmpl.footnote}</p>}
        </div>
      )}
    </form>
  );
}

/* ---------------- Main Settings Page (Salesforce Setup Console) ---------------- */

const SETUP_ITEMS = [
  { key: 'picklists', label: 'Picklists & Master Data', icon: List },
  { key: 'sla', label: 'SLA Milestones', icon: Clock },
  { key: 'risk', label: 'Risk Engine (FMEA)', icon: ShieldAlert },
  { key: 'emails', label: 'Email Templates', icon: Mail },
];

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState('picklists');
  const lookupQuery = useAsync(() => lookupApi.all(true), []);
  const settingsQuery = useAsync(() => settingsApi.get(), []);

  const loading = lookupQuery.loading && !lookupQuery.data;
  const error = lookupQuery.error || settingsQuery.error;

  return (
    <div className="space-y-3">
      {/* Salesforce Minimalist Setup Header */}
      <div className="bg-white border border-slate-200 rounded-md p-3.5 shadow-2xs flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded bg-[#0176d3] text-white">
            <Settings className="h-4.5 w-4.5" />
          </div>
          <div>
            <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Setup
            </span>
            <h1 className="text-base font-bold text-slate-900 leading-tight">
              eQMS Settings & Customization
            </h1>
          </div>
        </div>
      </div>

      {/* Salesforce 2-Column Minimalist Setup Panel */}
      <div className="grid gap-3 md:grid-cols-[13rem_minmax(0,1fr)]">
        {/* Left Navigation Tree */}
        <aside className="bg-white border border-slate-200 rounded-md shadow-2xs p-1.5 h-fit">
          <nav className="space-y-0.5 text-xs">
            {SETUP_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = activeTab === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setActiveTab(item.key)}
                  className={`w-full flex items-center gap-2 px-2.5 py-2 rounded text-left transition-colors font-medium ${
                    active
                      ? 'bg-blue-50 text-blue-700 font-semibold'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Right Content Panel */}
        <main className="bg-white border border-slate-200 rounded-md p-4 shadow-2xs">
          {loading ? (
            <div className="py-12 flex justify-center">
              <Loading label="Loading settings..." />
            </div>
          ) : error ? (
            <ErrorState message={error} onRetry={() => { lookupQuery.reload(); settingsQuery.reload(); }} />
          ) : (
            <div>
              {activeTab === 'picklists' && (
                <PicklistsTab data={lookupQuery.data} reload={lookupQuery.reload} />
              )}
              {activeTab === 'sla' && (
                <SlaTab initialSla={settingsQuery.data?.sla} />
              )}
              {activeTab === 'risk' && (
                <RiskMatrixTab initialRisk={settingsQuery.data?.riskMatrix} />
              )}
              {activeTab === 'emails' && (
                <EmailTemplatesTab initialTemplates={settingsQuery.data?.emailTemplates} />
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
