'use client';

import { useEffect, useRef, useState } from 'react';
import { X, Upload, ChevronRight, CheckCircle2, AlertTriangle, FileSpreadsheet, SkipForward } from 'lucide-react';
import { Job, JobStatus } from '@/lib/types';
import { db } from '@/lib/db';
import { newId, now } from '@/lib/utils';
import { awardPoints } from '@/lib/points';
import {
  FieldKey,
  ALL_FIELDS,
  FIELD_LABELS,
  REQUIRED_FIELDS,
  autoDetectMapping,
  normalizeStatus,
  parseImportDate,
  sortAppliedColumnAfterImport,
} from '@/lib/importJobs';

interface Props {
  open: boolean;
  onClose: () => void;
  onImported: () => void;
}

type Mapping = Record<FieldKey, string | null>;

const emptyMapping = (): Mapping =>
  Object.fromEntries(ALL_FIELDS.map((f) => [f, null])) as Mapping;

// ── Sub-components ────────────────────────────────────────────────────────────

function StepIndicator({ step }: { step: 1 | 2 | 3 }) {
  const labels = ['Upload', 'Map Columns', 'Review'];
  return (
    <div className="flex items-center gap-1 px-6 py-3 border-b border-stone-100">
      {labels.map((label, idx) => {
        const s = idx + 1;
        const done = step > s;
        const active = step === s;
        return (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold transition-colors ${
              done   ? 'bg-violet-500 text-white' :
              active ? 'bg-violet-100 text-violet-700 ring-2 ring-violet-400 ring-offset-1' :
                       'bg-stone-100 text-stone-400'
            }`}>
              {done ? '✓' : s}
            </div>
            <span className={`text-xs font-medium ${active ? 'text-stone-700' : 'text-stone-400'}`}>
              {label}
            </span>
            {s < 3 && <div className="w-6 h-px bg-stone-200 mx-1" />}
          </div>
        );
      })}
    </div>
  );
}

function UploadZone({
  parsing,
  fileName,
  error,
  fileRef,
  onDrop,
  onFilePicked,
}: {
  parsing: boolean;
  fileName: string;
  error: string | null;
  fileRef: React.RefObject<HTMLInputElement | null>;
  onDrop: (e: React.DragEvent) => void;
  onFilePicked: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  const [dragging, setDragging] = useState(false);

  return (
    <div className="space-y-4">
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { setDragging(false); onDrop(e); }}
        onClick={() => fileRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${
          dragging ? 'border-violet-400 bg-violet-50' : 'border-stone-200 hover:border-violet-300 hover:bg-stone-50'
        }`}
      >
        {parsing ? (
          <div className="flex flex-col items-center gap-2">
            <div className="w-6 h-6 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-stone-500">Parsing file…</p>
          </div>
        ) : fileName ? (
          <div className="flex flex-col items-center gap-2">
            <FileSpreadsheet size={28} className="text-violet-500" />
            <p className="text-sm font-medium text-stone-700">{fileName}</p>
            <p className="text-xs text-stone-400">Click to replace</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Upload size={28} className="text-stone-300" />
            <p className="text-sm font-medium text-stone-600">Drop a file here, or click to browse</p>
            <p className="text-xs text-stone-400">.csv, .xlsx, .xls supported</p>
          </div>
        )}
      </div>

      <input
        ref={fileRef}
        type="file"
        accept=".csv,.xlsx,.xls"
        className="hidden"
        onChange={onFilePicked}
      />

      {error && (
        <div className="flex items-center gap-2 text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 text-sm">
          <AlertTriangle size={14} className="shrink-0" />
          {error}
        </div>
      )}
    </div>
  );
}

function PreviewTable({ headers, rows }: { headers: string[]; rows: Record<string, string>[] }) {
  if (rows.length === 0) return null;
  const preview = rows.slice(0, 5);
  return (
    <div className="mt-4">
      <p className="text-xs font-medium text-stone-500 mb-2">
        Preview — first {preview.length} of {rows.length} row{rows.length !== 1 ? 's' : ''}
      </p>
      <div className="overflow-x-auto rounded-lg border border-stone-100">
        <table className="text-xs w-full">
          <thead className="bg-stone-50">
            <tr>
              {headers.map((h) => (
                <th key={h} className="text-left px-3 py-2 font-medium text-stone-500 whitespace-nowrap border-b border-stone-100">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {preview.map((row, i) => (
              <tr key={i} className="border-b border-stone-50 last:border-0">
                {headers.map((h) => (
                  <td key={h} className="px-3 py-2 text-stone-600 max-w-[160px] truncate whitespace-nowrap">
                    {row[h] ?? ''}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MappingStep({
  headers,
  mapping,
  setMapping,
}: {
  headers: string[];
  mapping: Mapping;
  setMapping: (m: Mapping) => void;
}) {
  return (
    <div className="space-y-1">
      <p className="text-xs text-stone-400 mb-4">
        Match your spreadsheet columns to job fields. Required fields are marked with <span className="text-red-500">*</span>.
      </p>
      <div className="divide-y divide-stone-50">
        {ALL_FIELDS.map((field) => {
          const required = REQUIRED_FIELDS.includes(field);
          return (
            <div key={field} className="flex items-center justify-between py-2.5 gap-4">
              <label className="text-sm font-medium text-stone-700 w-36 shrink-0">
                {FIELD_LABELS[field]}
                {required && <span className="text-red-500 ml-0.5">*</span>}
              </label>
              <select
                value={mapping[field] ?? ''}
                onChange={(e) => setMapping({ ...mapping, [field]: e.target.value || null })}
                className={`flex-1 text-sm border rounded-lg px-3 py-1.5 bg-white outline-none transition-colors ${
                  required && !mapping[field]
                    ? 'border-red-200 focus:border-red-400'
                    : 'border-stone-200 focus:border-violet-400'
                }`}
              >
                <option value="">— skip —</option>
                {headers.map((h) => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>
              {mapping[field] && (
                <div className="w-1.5 h-1.5 rounded-full bg-violet-400 shrink-0" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ReviewStep({
  rows,
  mapping,
  invalidIndices,
  duplicateRows,
  skipIndices,
  validCount,
  toggleSkip,
  skipAllDuplicates,
  keepAllDuplicates,
}: {
  rows: Record<string, string>[];
  mapping: Mapping;
  invalidIndices: Set<number>;
  duplicateRows: { row: Record<string, string>; i: number }[];
  skipIndices: Set<number>;
  validCount: number;
  toggleSkip: (i: number) => void;
  skipAllDuplicates: () => void;
  keepAllDuplicates: () => void;
}) {
  const [showInvalid, setShowInvalid] = useState(false);

  const invalidList = rows
    .map((row, i) => ({ row, i }))
    .filter(({ i }) => invalidIndices.has(i));

  return (
    <div className="space-y-4">
      {/* Ready count */}
      <div className={`flex items-center gap-3 rounded-xl px-4 py-3 ${
        validCount > 0 ? 'bg-violet-50 border border-violet-100' : 'bg-stone-50 border border-stone-100'
      }`}>
        <CheckCircle2 size={18} className={validCount > 0 ? 'text-violet-500' : 'text-stone-300'} />
        <div>
          <p className="text-sm font-semibold text-stone-800">
            {validCount > 0 ? `${validCount} job${validCount !== 1 ? 's' : ''} ready to import` : 'No valid rows found'}
          </p>
          <p className="text-xs text-stone-400">{rows.length} total rows in file</p>
        </div>
      </div>

      {/* Invalid rows */}
      {invalidList.length > 0 && (
        <div className="rounded-xl border border-amber-100 bg-amber-50 overflow-hidden">
          <button
            onClick={() => setShowInvalid((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-2.5 text-left"
          >
            <div className="flex items-center gap-2">
              <AlertTriangle size={14} className="text-amber-500 shrink-0" />
              <span className="text-xs font-medium text-amber-700">
                {invalidList.length} row{invalidList.length !== 1 ? 's' : ''} missing required fields — will be skipped
              </span>
            </div>
            <span className="text-xs text-amber-500">{showInvalid ? '▲' : '▼'}</span>
          </button>
          {showInvalid && (
            <div className="border-t border-amber-100 divide-y divide-amber-100">
              {invalidList.map(({ row, i }) => {
                const company = mapping.company ? row[mapping.company] ?? '' : '';
                const role = mapping.role ? row[mapping.role] ?? '' : '';
                return (
                  <div key={i} className="px-4 py-2 text-xs text-amber-700">
                    Row {i + 2}: {company || <em>no company</em>} — {role || <em>no role</em>}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Duplicate rows */}
      {duplicateRows.length > 0 && (
        <div className="rounded-xl border border-stone-200 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 bg-stone-50 border-b border-stone-100">
            <div className="flex items-center gap-2">
              <SkipForward size={14} className="text-stone-400" />
              <span className="text-xs font-medium text-stone-600">
                {duplicateRows.length} potential duplicate{duplicateRows.length !== 1 ? 's' : ''} found
              </span>
            </div>
            <div className="flex gap-2">
              <button onClick={keepAllDuplicates} className="text-[11px] text-violet-500 hover:text-violet-700 font-medium">Keep all</button>
              <span className="text-stone-300 text-xs">|</span>
              <button onClick={skipAllDuplicates} className="text-[11px] text-stone-500 hover:text-stone-700 font-medium">Skip all</button>
            </div>
          </div>
          <div className="divide-y divide-stone-50">
            {duplicateRows.map(({ row, i }) => {
              const company = mapping.company ? row[mapping.company] ?? '' : '';
              const role = mapping.role ? row[mapping.role] ?? '' : '';
              const skipped = skipIndices.has(i);
              return (
                <div key={i} className={`flex items-center justify-between px-4 py-2.5 ${skipped ? 'opacity-50' : ''}`}>
                  <div className="text-xs text-stone-600">
                    <span className="font-medium">{company}</span>
                    <span className="text-stone-400"> · </span>
                    {role}
                  </div>
                  <button
                    onClick={() => toggleSkip(i)}
                    className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg transition-colors ${
                      skipped
                        ? 'bg-stone-100 text-stone-500 hover:bg-stone-200'
                        : 'bg-violet-50 text-violet-600 hover:bg-violet-100'
                    }`}
                  >
                    {skipped ? 'Skipped' : 'Import'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function SuccessView({
  result,
  onClose,
}: {
  result: { success: number; skipped: number };
  onClose: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-8 gap-4 text-center">
      <div className="w-14 h-14 rounded-full bg-violet-100 flex items-center justify-center">
        <CheckCircle2 size={28} className="text-violet-500" />
      </div>
      <div>
        <p className="text-lg font-semibold text-stone-800">
          {result.success} job{result.success !== 1 ? 's' : ''} imported successfully
        </p>
        {result.skipped > 0 && (
          <p className="text-sm text-stone-400 mt-1">{result.skipped} row{result.skipped !== 1 ? 's' : ''} skipped</p>
        )}
      </div>
      <button
        onClick={onClose}
        className="mt-2 bg-gradient-to-r from-blue-500 to-violet-600 text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:from-blue-600 hover:to-violet-700 transition-all"
      >
        Done
      </button>
    </div>
  );
}

// ── Main modal ────────────────────────────────────────────────────────────────

export default function ImportJobsModal({ open, onClose, onImported }: Props) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<Mapping>(emptyMapping());
  const [skipIndices, setSkipIndices] = useState<Set<number>>(new Set());
  const [existingJobs, setExistingJobs] = useState<Job[]>([]);
  const [result, setResult] = useState<{ success: number; skipped: number } | null>(null);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (step === 3) {
      db.getJobs().then(setExistingJobs);
    }
  }, [step]);

  function reset() {
    setStep(1);
    setHeaders([]);
    setRows([]);
    setMapping(emptyMapping());
    setSkipIndices(new Set());
    setExistingJobs([]);
    setResult(null);
    setError(null);
    setFileName('');
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function handleFile(file: File) {
    setParsing(true);
    setError(null);
    try {
      const XLSX = await import('xlsx');
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: 'array', raw: false, dateNF: 'yyyy-mm-dd' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(ws, { defval: '', raw: false }) as Record<string, string>[];
      const nonEmpty = data.filter((row) => Object.values(row).some((v) => String(v).trim()));
      if (nonEmpty.length === 0) throw new Error('No data rows found in the file.');
      const hdrs = Object.keys(nonEmpty[0]);
      setFileName(file.name);
      setHeaders(hdrs);
      setRows(nonEmpty);
      setMapping(autoDetectMapping(hdrs));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not parse file. Try a .csv or .xlsx file.');
    } finally {
      setParsing(false);
    }
  }

  function onFilePicked(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
    e.target.value = '';
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }

  // ── Step 3 derived state ───────────────────────────────────────────────────

  const invalidIndices = new Set(
    rows
      .map((row, i) => ({ row, i }))
      .filter(({ row }) => {
        const company = (mapping.company ? row[mapping.company] ?? '' : '').trim();
        const role = (mapping.role ? row[mapping.role] ?? '' : '').trim();
        return !company || !role;
      })
      .map(({ i }) => i),
  );

  const duplicateRows = rows
    .map((row, i) => ({ row, i }))
    .filter(({ row, i }) => {
      if (invalidIndices.has(i)) return false;
      const company = (mapping.company ? row[mapping.company] ?? '' : '').trim().toLowerCase();
      const role = (mapping.role ? row[mapping.role] ?? '' : '').trim().toLowerCase();
      return existingJobs.some(
        (j) => j.company.toLowerCase() === company && j.role.toLowerCase() === role,
      );
    });

  const validCount = rows.filter((_, i) => !invalidIndices.has(i) && !skipIndices.has(i)).length;

  function toggleSkip(i: number) {
    setSkipIndices((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i); else next.add(i);
      return next;
    });
  }

  function skipAllDuplicates() {
    setSkipIndices((prev) => {
      const next = new Set(prev);
      duplicateRows.forEach(({ i }) => next.add(i));
      return next;
    });
  }

  function keepAllDuplicates() {
    setSkipIndices((prev) => {
      const next = new Set(prev);
      duplicateRows.forEach(({ i }) => next.delete(i));
      return next;
    });
  }

  async function doImport() {
    setImporting(true);
    const ts = now();
    let success = 0;
    let skipped = 0;
    const importedIds: string[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (invalidIndices.has(i) || skipIndices.has(i)) { skipped++; continue; }

      const company = (mapping.company ? row[mapping.company] ?? '' : '').trim();
      const role = (mapping.role ? row[mapping.role] ?? '' : '').trim();
      if (!company || !role) { skipped++; continue; }

      const rawStatus = mapping.status ? (row[mapping.status] ?? '') : '';
      const status: JobStatus = rawStatus ? normalizeStatus(rawStatus) : 'applied';

      const rawDateApplied = mapping.date_applied ? (row[mapping.date_applied] ?? '') : '';
      const parsedDateApplied = parseImportDate(rawDateApplied);

      const job: Job = {
        id: newId(),
        company,
        role,
        location:       mapping.location        ? (row[mapping.location]        ?? '').trim() || undefined : undefined,
        salary:         mapping.salary           ? (row[mapping.salary]          ?? '').trim() || undefined : undefined,
        status,
        dateApplied: parsedDateApplied ?? ts.split('T')[0],
        interviewDates: [],
        jobUrl:         mapping.job_url          ? (row[mapping.job_url]         ?? '').trim() || undefined : undefined,
        jobDescription: mapping.job_description  ? (row[mapping.job_description] ?? '').trim() || undefined : undefined,
        notes:          mapping.notes            ? (row[mapping.notes]           ?? '').trim() || undefined : undefined,
        createdAt: ts,
        updatedAt: ts,
      };

      await db.addJob(job);
      importedIds.push(job.id);
      await awardPoints('application_added', job.id);

      if (status === 'recruiter_screen') await awardPoints('status_recruiter_screen', job.id, `Recruiter screen earned for ${company}`);
      else if (status === 'interviewing') await awardPoints('status_interviewing', job.id);
      else if (status === 'offer')        await awardPoints('status_offer', job.id);
      else if (status === 'rejected')     await awardPoints('status_rejected', job.id);

      if (job.notes?.trim()) await awardPoints('notes_added', job.id);

      success++;
    }

    // Applied column sort_order: auto = full column by date; manual = prepend imported Applied rows.
    if (success > 0) await sortAppliedColumnAfterImport(importedIds);

    setImporting(false);
    setResult({ success, skipped });
    onImported();
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30" onClick={handleClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100 shrink-0">
          <div>
            <h2 className="text-base font-semibold text-stone-800">Import Jobs</h2>
            {!result && (
              <p className="text-xs text-stone-400 mt-0.5">
                {step === 1 && 'Upload a CSV or Excel file'}
                {step === 2 && 'Map spreadsheet columns to app fields'}
                {step === 3 && 'Review before importing'}
              </p>
            )}
          </div>
          <button onClick={handleClose} className="text-stone-400 hover:text-stone-600 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Step indicator */}
        {!result && <StepIndicator step={step} />}

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {result ? (
            <SuccessView result={result} onClose={handleClose} />
          ) : step === 1 ? (
            <>
              <UploadZone
                parsing={parsing}
                fileName={fileName}
                error={error}
                fileRef={fileRef}
                onDrop={onDrop}
                onFilePicked={onFilePicked}
              />
              {rows.length > 0 && <PreviewTable headers={headers} rows={rows} />}
            </>
          ) : step === 2 ? (
            <MappingStep headers={headers} mapping={mapping} setMapping={setMapping} />
          ) : (
            <ReviewStep
              rows={rows}
              mapping={mapping}
              invalidIndices={invalidIndices}
              duplicateRows={duplicateRows}
              skipIndices={skipIndices}
              validCount={validCount}
              toggleSkip={toggleSkip}
              skipAllDuplicates={skipAllDuplicates}
              keepAllDuplicates={keepAllDuplicates}
            />
          )}
        </div>

        {/* Footer */}
        {!result && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-stone-100 bg-stone-50 rounded-b-2xl shrink-0">
            <button
              onClick={step === 1 ? handleClose : () => setStep((s) => (s - 1) as 1 | 2 | 3)}
              className="text-sm text-stone-500 hover:text-stone-700 transition-colors"
            >
              {step === 1 ? 'Cancel' : '← Back'}
            </button>

            {step === 1 && (
              <button
                disabled={rows.length === 0}
                onClick={() => setStep(2)}
                className="flex items-center gap-1.5 bg-gradient-to-r from-blue-500 to-violet-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:from-blue-600 hover:to-violet-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                Next <ChevronRight size={14} />
              </button>
            )}
            {step === 2 && (
              <button
                disabled={!mapping.company || !mapping.role}
                onClick={() => { setSkipIndices(new Set()); setStep(3); }}
                className="flex items-center gap-1.5 bg-gradient-to-r from-blue-500 to-violet-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:from-blue-600 hover:to-violet-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                Next <ChevronRight size={14} />
              </button>
            )}
            {step === 3 && (
              <button
                disabled={validCount === 0 || importing}
                onClick={doImport}
                className="flex items-center gap-1.5 bg-gradient-to-r from-blue-500 to-violet-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:from-blue-600 hover:to-violet-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                {importing ? 'Importing…' : `Import ${validCount} Job${validCount !== 1 ? 's' : ''} →`}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
