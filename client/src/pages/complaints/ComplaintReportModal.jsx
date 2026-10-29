import { useEffect, useState } from 'react';
import { X, Download, FileText, Loader2 } from 'lucide-react';
import { generateComplaintReport } from '../../lib/generateReportPdf.js';
import { d3Api } from '../../api/endpoints.js';

export function ComplaintReportModal({ open, complaint, onClose }) {
  const [blobUrl, setBlobUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [reportResult, setReportResult] = useState(null);

  useEffect(() => {
    let active = true;
    let createdUrl = null;

    if (open && complaint) {
      setLoading(true);
      setError(null);

      (async () => {
        try {
          const d3Data = await d3Api.get(complaint._id).catch(() => null);
          if (!active) return;

          const result = generateComplaintReport(complaint, d3Data);
          createdUrl = result.getBlobUrl();
          setBlobUrl(createdUrl);
          setReportResult(result);
        } catch (err) {
          if (!active) return;
          setError(err?.message || 'Failed to generate PDF report.');
        } finally {
          if (active) setLoading(false);
        }
      })();
    } else {
      setBlobUrl(null);
      setReportResult(null);
    }

    return () => {
      active = false;
      if (createdUrl) {
        URL.revokeObjectURL(createdUrl);
      }
    };
  }, [open, complaint]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-2 sm:p-4 animate-in fade-in duration-150">
      <div className="flex flex-col w-full max-w-5xl h-[92vh] rounded-md border border-slate-300 bg-white shadow-2xl overflow-hidden">
        {/* Header matching Salesforce standard SOP preview dialog */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 bg-white shrink-0">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded bg-red-100 text-red-600">
              <FileText className="h-3.5 w-3.5" />
            </span>
            <h2 className="text-base font-bold text-slate-800">
              Complaint Management Report
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer transition-colors"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* PDF Document Area */}
        <div className="flex-1 min-h-0 bg-slate-800 relative">
          {loading ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-slate-300">
              <Loader2 className="h-8 w-8 animate-spin text-[#0176d3]" />
              <p className="text-sm font-medium">Generating Complaint Management Report...</p>
            </div>
          ) : error ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-slate-100 p-6 text-center">
              <p className="text-sm text-red-400 font-semibold">{error}</p>
              <button
                type="button"
                onClick={onClose}
                className="rounded border border-slate-400 px-4 py-1.5 text-xs text-white hover:bg-slate-700"
              >
                Close
              </button>
            </div>
          ) : blobUrl ? (
            <iframe
              src={blobUrl}
              title="Complaint Management Report"
              className="w-full h-full border-0"
            />
          ) : null}
        </div>

        {/* Footer with standard Salesforce actions */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-slate-200 bg-[#f8fafc] shrink-0">
          <div className="text-2xs text-slate-500 font-medium">
            Format: NR/QAD/SOP/001-F01/04 • Natural Remedies Quality Assurance
          </div>
          <div className="flex items-center gap-2.5">
            {reportResult && (
              <button
                type="button"
                onClick={() => reportResult.save()}
                className="inline-flex items-center gap-1.5 rounded-sm border border-[#0176d3] bg-white px-3.5 py-1.5 text-xs font-semibold text-[#0176d3] hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <Download className="h-3.5 w-3.5" />
                Download PDF
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded-sm border border-slate-300 bg-white px-4 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

