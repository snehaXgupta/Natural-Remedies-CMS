import { useRef, useState, useEffect } from 'react';
import { Upload, FileText, Image as ImageIcon, Download, Eye, X, Loader2 } from 'lucide-react';
import { complaintApi } from '../../api/endpoints.js';
import { api, readError } from '../../api/client.js';
import { useAsync } from '../../lib/useAsync.js';
import { formatDateTime } from '../../lib/format.js';
import { formatBytes } from '../../lib/complaints.js';
import { Button } from '../../components/Button.jsx';
import { Badge } from '../../components/Badge.jsx';
import { Loading, ErrorState, EmptyState } from '../../components/States.jsx';
import { useToast } from '../../components/Toast.jsx';

const ACCEPT = '.pdf,.png,.jpg,.jpeg,.webp,.docx,.xlsx,.csv,.txt';

function FilePreviewModal({ complaintId, file, onClose }) {
  const [blobUrl, setBlobUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    let url = null;
    setLoading(true);
    setError(null);

    api
      .get(`/complaints/${complaintId}/attachments/${file._id}/download?inline=1`, {
        responseType: 'blob',
      })
      .then((res) => {
        if (!active) return;
        url = URL.createObjectURL(res.data);
        setBlobUrl(url);
        setLoading(false);
      })
      .catch((err) => {
        if (!active) return;
        const msg = readError(err).message || 'This file could not be loaded from storage.';
        setError(msg);
        setLoading(false);
      });

    return () => {
      active = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [complaintId, file._id]);

  const isImage = file.mimeType.startsWith('image/');
  const isPdf = file.mimeType === 'application/pdf';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="flex flex-col w-full max-w-4xl max-h-[92vh] rounded-lg bg-white shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-slate-50">
          <div className="min-w-0 flex-1 pr-3">
            <h3 className="font-semibold text-slate-900 text-sm truncate" title={file.originalName}>
              {file.originalName}
            </h3>
            <p className="text-xs text-slate-500">
              {formatBytes(file.sizeBytes)} • {file.mimeType} • Stage: {file.stage || 'SYNCED'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {blobUrl && (
              <a
                href={blobUrl}
                download={file.originalName}
                className="px-3 py-1.5 text-xs font-semibold rounded bg-[#0176d3] text-white hover:bg-blue-700 transition-colors flex items-center gap-1.5 shadow-xs"
              >
                <Download className="h-3.5 w-3.5" /> Download
              </a>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-auto p-4 flex items-center justify-center min-h-[380px] bg-slate-900/5">
          {loading ? (
            <div className="flex flex-col items-center gap-2 text-slate-500">
              <Loader2 className="h-6 w-6 animate-spin text-[#0176d3]" />
              <span className="text-xs font-medium">Loading file preview...</span>
            </div>
          ) : error ? (
            <div className="text-center p-6 space-y-2 max-w-md bg-white rounded-lg border border-slate-200 shadow-xs">
              <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto font-bold text-lg">!</div>
              <p className="font-semibold text-slate-800 text-sm">{error}</p>
              <p className="text-xs text-slate-500 leading-relaxed">
                The file was not found in storage. On ephemeral server containers, files uploaded prior to the latest deployment may have been reset. Re-uploading the file will persist it permanently to database storage.
              </p>
            </div>
          ) : isImage ? (
            <img
              src={blobUrl}
              alt={file.originalName}
              className="max-h-[75vh] max-w-full rounded object-contain shadow-md"
            />
          ) : isPdf ? (
            <iframe
              src={blobUrl}
              title={file.originalName}
              className="w-full h-[75vh] rounded border border-slate-300"
            />
          ) : (
            <div className="text-center p-6 space-y-3 bg-white rounded-lg border border-slate-200 shadow-xs">
              <FileText className="h-12 w-12 text-slate-400 mx-auto" />
              <p className="text-sm font-semibold text-slate-800">Preview not available for this file type</p>
              <p className="text-xs text-slate-500">Click the Download button above to view this file on your device.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function FilesTab({ complaint, canUpload, onChange }) {
  const notify = useToast();
  const files = useAsync(() => complaintApi.attachments(complaint._id), [complaint._id]);
  const input = useRef(null);
  const [stage, setStage] = useState(complaint.stage === 'CLOSED' ? 'D4' : complaint.stage);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState([]);
  const [dragging, setDragging] = useState(false);
  const [previewFile, setPreviewFile] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);
  const closed = complaint.status === 'CLOSED';

  const send = async (list) => {
    if (!list.length) return;
    setBusy(true);
    setErrors([]);
    try {
      const res = await complaintApi.upload(complaint._id, [...list], stage);
      notify(res.data.length === 1 ? `${res.data[0].originalName} uploaded.` : `${res.data.length} files uploaded.`);
      files.reload();
      onChange?.();
    } catch (err) {
      const e = readError(err);
      const details = err.response?.data?.error?.details?.map((d) => d.message);
      setErrors(details?.length ? details : [e.message]);
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  };

  const handleDownload = async (file) => {
    try {
      setDownloadingId(file._id);
      const res = await api.get(`/complaints/${complaint._id}/attachments/${file._id}/download`, {
        responseType: 'blob',
      });
      const blobUrl = URL.createObjectURL(res.data);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = file.originalName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 10_000);
    } catch (err) {
      notify('Unable to download file: ' + readError(err).message, 'bad');
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="space-y-4">
      {canUpload && !closed && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            send(e.dataTransfer.files);
          }}
          className={`flex flex-wrap items-center justify-between gap-3 rounded border border-dashed px-4 py-3 ${dragging ? 'border-brand bg-brand-soft' : 'border-line-strong'}`}
        >
          <div>
            <p className="font-medium text-xs sm:text-sm text-slate-800">Add evidence or supporting documents</p>
            <p className="text-xs text-slate-500">Drop files here or choose them. Images, PDF, Word, Excel, CSV or text; up to 5 files of 10 MB each.</p>
          </div>
          <div className="flex items-center gap-2">
            <label className="sr-only" htmlFor="upload-stage">Attach to stage</label>
            <select id="upload-stage" className="field-input w-auto text-xs" value={stage} onChange={(e) => setStage(e.target.value)}>
              {['SYNCED', 'D1', 'D2', 'D3', 'D4'].map((s) => (
                <option key={s} value={s}>{s === 'SYNCED' ? 'General' : s}</option>
              ))}
            </select>
            <input ref={input} type="file" multiple accept={ACCEPT} className="hidden" onChange={(e) => send(e.target.files)} />
            <Button icon={Upload} loading={busy} onClick={() => input.current?.click()} size="sm">Choose files</Button>
          </div>
        </div>
      )}
      {errors.length > 0 && (
        <ul className="rounded border border-bad/20 bg-bad-soft px-3 py-2 text-xs text-bad" role="alert">
          {errors.map((m) => <li key={m}>{m}</li>)}
        </ul>
      )}

      {files.loading && !files.data ? (
        <Loading label="Loading files" />
      ) : files.error ? (
        <ErrorState message={files.error} onRetry={files.reload} />
      ) : files.data.length === 0 ? (
        <EmptyState title="No files yet">
          {canUpload && !closed ? 'Photos of the product, invoices and test reports help the investigation.' : 'Files added to this complaint will appear here.'}
        </EmptyState>
      ) : (
        <ul className="divide-y divide-slate-100 rounded border border-slate-200 bg-white">
          {files.data.map((f) => {
            const Icon = f.mimeType.startsWith('image/') ? ImageIcon : FileText;
            const viewable = /^(image\/|application\/pdf$)/.test(f.mimeType);
            const isDownloading = downloadingId === f._id;
            return (
              <li key={f._id} className="flex flex-wrap items-center gap-3 px-3.5 py-2.5 hover:bg-slate-50/70 transition-colors">
                <div
                  onClick={() => viewable && setPreviewFile(f)}
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded border ${viewable ? 'bg-blue-50/60 border-blue-200 text-[#0176d3] cursor-pointer hover:bg-blue-100/60' : 'bg-slate-50 border-slate-200 text-slate-500'}`}
                  title={viewable ? 'Click to preview' : undefined}
                >
                  <Icon className="h-4 w-4" aria-hidden />
                </div>
                <div className="min-w-0 flex-1">
                  {viewable ? (
                    <button
                      type="button"
                      onClick={() => setPreviewFile(f)}
                      className="block truncate font-medium text-xs text-[#0176d3] hover:underline text-left cursor-pointer"
                    >
                      {f.originalName}
                    </button>
                  ) : (
                    <span className="block truncate font-medium text-xs text-slate-800">{f.originalName}</span>
                  )}
                  <span className="text-[11px] text-slate-500">
                    {formatBytes(f.sizeBytes)}, {f.source === 'whatsapp' ? 'from WhatsApp' : `by ${f.uploadedBy?.name || 'unknown'}`}, {formatDateTime(f.createdAt)}
                  </span>
                </div>
                <Badge>{f.stage === 'SYNCED' ? 'General' : f.stage}</Badge>
                {viewable && (
                  <button
                    type="button"
                    onClick={() => setPreviewFile(f)}
                    className="rounded p-1.5 text-slate-500 hover:bg-slate-200/60 hover:text-slate-800 transition-colors cursor-pointer"
                    title={`Preview ${f.originalName}`}
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleDownload(f)}
                  disabled={isDownloading}
                  className="rounded p-1.5 text-slate-500 hover:bg-slate-200/60 hover:text-slate-800 transition-colors cursor-pointer disabled:opacity-50"
                  title={`Download ${f.originalName}`}
                >
                  {isDownloading ? <Loader2 className="h-4 w-4 animate-spin text-[#0176d3]" /> : <Download className="h-4 w-4" />}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {/* In-App File Preview Modal */}
      {previewFile && (
        <FilePreviewModal
          complaintId={complaint._id}
          file={previewFile}
          onClose={() => setPreviewFile(null)}
        />
      )}
    </div>
  );
}
