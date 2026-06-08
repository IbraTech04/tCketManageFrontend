import { useState, useRef, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { eventsApi } from '../api/events';
import Icon from './ui/Icon';
import Button from './ui/Button';
import Spinner from './ui/Spinner';

const STEPS = [
  { id: 0, label: 'Upload' },
  { id: 1, label: 'Map Columns' },
  { id: 2, label: 'Review & Import' },
];

// Parse raw CSV text → string[][]
function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  return lines.map((line) => {
    const cols = [];
    let cur = '', inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        inQ = !inQ;
      } else if (ch === ',' && !inQ) {
        cols.push(cur);
        cur = '';
      } else {
        cur += ch;
      }
    }
    cols.push(cur);
    return cols;
  });
}

const SAMPLE_CSV = `First Name,Last Name,Email,Ticket Type
Alice,Smith,alice@example.com,General Admission
Bob,Jones,bob@example.com,VIP
Carol,Lee,carol@example.com,General Admission`;

function StepRailHoriz({ current }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 28 }}>
      {STEPS.map((s, i) => {
        const done = current > s.id;
        const active = current === s.id;
        return (
          <div key={s.id} style={{ display: 'flex', alignItems: 'center', flex: i < STEPS.length - 1 ? 1 : 'none' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
              <div style={{
                width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
                background: done ? 'var(--green)' : active ? 'var(--orange)' : 'var(--surface-3)',
                border: `2px solid ${done ? 'var(--green)' : active ? 'var(--orange)' : 'var(--border-2)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all .15s',
              }}>
                {done
                  ? <Icon name="check" size={12} color="#fff" stroke={2.5} />
                  : <span style={{ fontSize: 11, fontWeight: 700, color: active ? '#fff' : 'var(--text-3)' }}>{s.id + 1}</span>
                }
              </div>
              <span style={{ fontSize: 11.5, fontWeight: 500, color: active ? 'var(--text)' : 'var(--text-3)', whiteSpace: 'nowrap' }}>
                {s.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div style={{
                flex: 1, height: 2, margin: '0 10px', marginBottom: 16,
                background: done ? 'var(--green)' : 'var(--border)',
                transition: 'background .2s',
              }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// Step 0: Upload
function StepUpload({ onFile }) {
  const [drag, setDrag] = useState(false);
  const inputRef = useRef(null);

  function handleFile(file) {
    if (!file) return;
    onFile(file);
  }

  function handleDrop(e) {
    e.preventDefault();
    setDrag(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }

  function useSample() {
    const blob = new Blob([SAMPLE_CSV], { type: 'text/csv' });
    const file = new File([blob], 'sample.csv', { type: 'text/csv' });
    onFile(file);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center' }}>
      <div
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        style={{
          width: '100%', border: `2px dashed ${drag ? 'var(--orange)' : 'var(--border-2)'}`,
          borderRadius: 'var(--r-lg)', padding: '40px 24px',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
          cursor: 'pointer', background: drag ? 'var(--orange-softer)' : 'var(--surface-2)',
          transition: 'border-color .15s, background .15s',
        }}
      >
        <div style={{
          width: 48, height: 48, borderRadius: 12, background: 'var(--orange-soft)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon name="upload" size={22} color="var(--orange)" />
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Drop a CSV file here</div>
          <div style={{ fontSize: 12.5, color: 'var(--text-3)' }}>or click to browse — .csv files only</div>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          style={{ display: 'none' }}
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ height: 1, width: 80, background: 'var(--border)' }} />
        <span style={{ fontSize: 12, color: 'var(--text-3)' }}>or</span>
        <div style={{ height: 1, width: 80, background: 'var(--border)' }} />
      </div>
      <Button variant="ghost" icon="download" onClick={useSample}>
        Use sample file
      </Button>
      <div style={{
        background: 'var(--surface-3)', border: '1px solid var(--border)',
        borderRadius: 'var(--r)', padding: '10px 14px', fontSize: 12, color: 'var(--text-3)',
        lineHeight: 1.6, width: '100%',
      }}>
        Expected columns (in any order): <strong>First Name</strong>, <strong>Last Name</strong>, <strong>Email</strong>, <strong>Ticket Type</strong>.
        A header row is recommended.
      </div>
    </div>
  );
}

// Step 1: Map Columns
function StepMapColumns({ rows, mapping, setMapping, hasHeader, setHasHeader, ticketTypes, defaultTypeId, setDefaultTypeId }) {
  const headers = hasHeader && rows.length > 0 ? rows[0] : rows[0]?.map((_, i) => `Column ${i + 1}`) ?? [];
  const colOptions = headers.map((h, i) => [String(i), h || `Col ${i + 1}`]);

  const FIELDS = [
    { key: 'firstNameColumn',  label: 'First Name', icon: 'user' },
    { key: 'lastNameColumn',   label: 'Last Name',  icon: 'user' },
    { key: 'emailColumn',      label: 'Email',      icon: 'mail' },
    { key: 'ticketTypeColumn', label: 'Ticket Type (optional)', icon: 'ticket', optional: true },
  ];

  const preview = hasHeader ? rows.slice(1, 4) : rows.slice(0, 4);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header toggle */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '10px 14px', background: 'var(--surface-3)',
        border: '1px solid var(--border)', borderRadius: 'var(--r)',
      }}>
        <input
          type="checkbox"
          id="hdr-toggle"
          checked={hasHeader}
          onChange={(e) => setHasHeader(e.target.checked)}
          style={{ accentColor: 'var(--orange)', width: 15, height: 15, cursor: 'pointer' }}
        />
        <label htmlFor="hdr-toggle" style={{ fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
          First row is a header
        </label>
      </div>

      {/* Field mapping */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {FIELDS.map(({ key, label, icon, optional }) => (
          <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <label style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 5 }}>
              <Icon name={icon} size={13} color="var(--text-3)" />
              {label}
              {!optional && <span style={{ color: 'var(--red)' }}>*</span>}
            </label>
            <div style={{ position: 'relative' }}>
              <select
                value={mapping[key] === undefined ? '' : String(mapping[key])}
                onChange={(e) => setMapping((m) => ({ ...m, [key]: e.target.value === '' ? undefined : Number(e.target.value) }))}
                style={{
                  appearance: 'none', font: 'inherit', fontSize: 12.5,
                  width: '100%', height: 34, padding: '0 30px 0 10px',
                  border: '1px solid var(--border-2)', borderRadius: 'var(--r)',
                  background: 'var(--surface)', color: 'var(--text)', cursor: 'pointer',
                }}
              >
                <option value="">{optional ? '(skip)' : 'Select column'}</option>
                {colOptions.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
              <span style={{ position: 'absolute', right: 9, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-3)', display: 'flex' }}>
                <Icon name="chevdown" size={13} />
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Default ticket type */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        <label style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 5 }}>
          <Icon name="ticket" size={13} color="var(--text-3)" />
          Default ticket type
          <span style={{ color: 'var(--text-3)', fontWeight: 400, fontSize: 11.5 }}>(used when type column is blank)</span>
        </label>
        <div style={{ position: 'relative' }}>
          <select
            value={defaultTypeId}
            onChange={(e) => setDefaultTypeId(e.target.value)}
            style={{
              appearance: 'none', font: 'inherit', fontSize: 12.5,
              width: '100%', height: 34, padding: '0 30px 0 10px',
              border: '1px solid var(--border-2)', borderRadius: 'var(--r)',
              background: 'var(--surface)', color: 'var(--text)', cursor: 'pointer',
            }}
          >
            <option value="">None</option>
            {ticketTypes.map((tt) => <option key={tt.id} value={tt.id}>{tt.name} — ${Number(tt.price).toFixed(2)}</option>)}
          </select>
          <span style={{ position: 'absolute', right: 9, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-3)', display: 'flex' }}>
            <Icon name="chevdown" size={13} />
          </span>
        </div>
      </div>

      {/* Preview */}
      {preview.length > 0 && (
        <div>
          <div style={{ fontSize: 11.5, fontWeight: 500, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 7 }}>
            Preview (first rows)
          </div>
          <div style={{ overflowX: 'auto', borderRadius: 'var(--r)', border: '1px solid var(--border)' }}>
            <table className="tbl" style={{ fontSize: 12 }}>
              <thead>
                <tr>
                  {(hasHeader && rows[0] ? rows[0] : rows[0]?.map((_, i) => `Col ${i + 1}`) ?? []).map((h, i) => (
                    <th key={i}>{h || `Col ${i + 1}`}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.map((row, ri) => (
                  <tr key={ri}>
                    {row.map((cell, ci) => <td key={ci}>{cell}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// Step 2: Review
function StepReview({ rows, mapping, hasHeader, errors }) {
  const dataRows = hasHeader ? rows.slice(1) : rows;
  const validRows = dataRows.filter((_, i) => !errors[i]);
  const errorRows = dataRows.map((_, i) => errors[i]).filter(Boolean);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', gap: 10 }}>
        <div className="card" style={{ flex: 1, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--green-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="check" size={16} color="var(--green)" />
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700 }}>{validRows.length}</div>
            <div style={{ fontSize: 12, color: 'var(--text-3)' }}>Ready to import</div>
          </div>
        </div>
        <div className="card" style={{ flex: 1, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: errorRows.length > 0 ? 'var(--red-soft)' : 'var(--surface-3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon name={errorRows.length > 0 ? 'alert' : 'check'} size={16} color={errorRows.length > 0 ? 'var(--red)' : 'var(--text-3)'} />
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700 }}>{errorRows.length}</div>
            <div style={{ fontSize: 12, color: 'var(--text-3)' }}>Errors</div>
          </div>
        </div>
      </div>

      {errorRows.length > 0 && (
        <div style={{
          background: 'var(--red-soft)', border: '1px solid rgba(220,38,38,0.2)',
          borderRadius: 'var(--r)', padding: '12px 14px',
        }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--red)', marginBottom: 6 }}>Validation errors</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {Object.entries(errors).slice(0, 8).map(([idx, msg]) => (
              <div key={idx} style={{ fontSize: 12.5, color: 'var(--red)' }}>Row {Number(idx) + 1 + (hasHeader ? 1 : 0)}: {msg}</div>
            ))}
            {Object.keys(errors).length > 8 && (
              <div style={{ fontSize: 12, color: 'var(--red)', opacity: 0.7 }}>…and {Object.keys(errors).length - 8} more</div>
            )}
          </div>
        </div>
      )}

      {validRows.length > 0 && (
        <div style={{ overflowX: 'auto', borderRadius: 'var(--r)', border: '1px solid var(--border)' }}>
          <table className="tbl" style={{ fontSize: 12 }}>
            <thead>
              <tr>
                <th>#</th>
                <th>First Name</th>
                <th>Last Name</th>
                <th>Email</th>
              </tr>
            </thead>
            <tbody>
              {validRows.slice(0, 10).map((row, i) => (
                <tr key={i}>
                  <td style={{ color: 'var(--text-3)' }}>{i + 1}</td>
                  <td>{mapping.firstNameColumn !== undefined ? row[mapping.firstNameColumn] || '' : '—'}</td>
                  <td>{mapping.lastNameColumn !== undefined ? row[mapping.lastNameColumn] || '' : '—'}</td>
                  <td>{mapping.emailColumn !== undefined ? row[mapping.emailColumn] || '' : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {validRows.length > 10 && (
            <div style={{ padding: '8px 14px', fontSize: 12, color: 'var(--text-3)', borderTop: '1px solid var(--border)' }}>
              …and {validRows.length - 10} more rows
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ImportWizard({ onClose, onDone }) {
  const { eventId } = useParams();
  const [step, setStep] = useState(0);
  const [file, setFile] = useState(null);
  const [rows, setRows] = useState([]);
  const [hasHeader, setHasHeader] = useState(true);
  const [mapping, setMapping] = useState({
    firstNameColumn: 0,
    lastNameColumn: 1,
    emailColumn: 2,
    ticketTypeColumn: 3,
  });
  const [defaultTypeId, setDefaultTypeId] = useState('');
  const [ticketTypes, setTicketTypes] = useState([]);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState('');

  // Fetch ticket types for mapping step
  useEffect(() => {
    if (!eventId) return;
    eventsApi.getTicketTypes(eventId)
      .then((data) => setTicketTypes(data ?? []))
      .catch(() => {});
  }, [eventId]);

  function handleFile(f) {
    setFile(f);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      const parsed = parseCsv(text);
      setRows(parsed);
      // Auto-detect header and set mapping
      if (parsed.length > 0) {
        const hdr = parsed[0].map((h) => h.toLowerCase().trim());
        const fnIdx = hdr.findIndex((h) => h.includes('first'));
        const lnIdx = hdr.findIndex((h) => h.includes('last'));
        const emIdx = hdr.findIndex((h) => h.includes('email') || h.includes('mail'));
        const ttIdx = hdr.findIndex((h) => h.includes('ticket') || h.includes('type'));
        setMapping({
          firstNameColumn: fnIdx >= 0 ? fnIdx : 0,
          lastNameColumn: lnIdx >= 0 ? lnIdx : 1,
          emailColumn: emIdx >= 0 ? emIdx : 2,
          ticketTypeColumn: ttIdx >= 0 ? ttIdx : undefined,
        });
      }
      setStep(1);
    };
    reader.readAsText(f);
  }

  // Validate rows
  const errors = (() => {
    const dataRows = hasHeader ? rows.slice(1) : rows;
    const errs = {};
    dataRows.forEach((row, i) => {
      const email = mapping.emailColumn !== undefined ? (row[mapping.emailColumn] || '').trim() : '';
      const first = mapping.firstNameColumn !== undefined ? (row[mapping.firstNameColumn] || '').trim() : '';
      const last = mapping.lastNameColumn !== undefined ? (row[mapping.lastNameColumn] || '').trim() : '';
      if (!email) {
        errs[i] = 'Missing email';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        errs[i] = `Invalid email: ${email}`;
      } else if (!first && !last) {
        errs[i] = 'Missing name';
      }
    });
    return errs;
  })();

  const dataRowCount = hasHeader ? Math.max(0, rows.length - 1) : rows.length;
  const validCount = dataRowCount - Object.keys(errors).length;

  async function handleImport() {
    if (!file || !eventId) return;
    setImporting(true);
    setImportError('');
    try {
      const config = {
        firstNameColumn: mapping.firstNameColumn ?? 0,
        lastNameColumn: mapping.lastNameColumn ?? 1,
        emailColumn: mapping.emailColumn ?? 2,
        hasHeaderRow: hasHeader,
        ...(mapping.ticketTypeColumn !== undefined ? { ticketTypeColumn: mapping.ticketTypeColumn } : {}),
        ...(defaultTypeId ? { defaultTicketTypeId: defaultTypeId } : {}),
      };
      await eventsApi.importAttendees(eventId, file, config);
      onDone(validCount);
    } catch (ex) {
      setImportError(ex.message || 'Import failed');
    } finally {
      setImporting(false);
    }
  }

  const canProceed = () => {
    if (step === 1) {
      return mapping.firstNameColumn !== undefined &&
        mapping.lastNameColumn !== undefined &&
        mapping.emailColumn !== undefined;
    }
    if (step === 2) return validCount > 0;
    return true;
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 50,
      background: 'rgba(20,20,24,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px',
    }}
      onClick={onClose}
    >
      <div
        className="pop-in"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--r-xl)',
          boxShadow: 'var(--shadow-pop)',
          width: '100%', maxWidth: 620,
          maxHeight: '90vh',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '18px 22px', borderBottom: '1px solid var(--border)', flexShrink: 0,
        }}>
          <div>
            <div style={{ fontSize: 15.5, fontWeight: 600 }}>Import Attendees</div>
            <div style={{ fontSize: 12.5, color: 'var(--text-3)', marginTop: 2 }}>Upload a CSV to add attendees in bulk</div>
          </div>
          <button
            style={{ all: 'unset', cursor: 'pointer', display: 'flex', color: 'var(--text-3)', padding: 6, borderRadius: 7 }}
            onClick={onClose}
          >
            <Icon name="x" size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="tm-scroll" style={{ flex: 1, overflowY: 'auto', padding: '22px 24px' }}>
          <StepRailHoriz current={step} />

          {step === 0 && <StepUpload onFile={handleFile} />}
          {step === 1 && (
            <StepMapColumns
              rows={rows}
              mapping={mapping}
              setMapping={setMapping}
              hasHeader={hasHeader}
              setHasHeader={setHasHeader}
              ticketTypes={ticketTypes}
              defaultTypeId={defaultTypeId}
              setDefaultTypeId={setDefaultTypeId}
            />
          )}
          {step === 2 && (
            <StepReview
              rows={rows}
              mapping={mapping}
              hasHeader={hasHeader}
              errors={errors}
            />
          )}
        </div>

        {/* Footer */}
        {step > 0 && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '14px 22px', borderTop: '1px solid var(--border)', flexShrink: 0,
            background: 'var(--surface-2)',
          }}>
            <Button
              variant="ghost"
              icon="arrowleft"
              onClick={() => { setStep((s) => Math.max(0, s - 1)); setImportError(''); }}
              disabled={importing}
            >
              Back
            </Button>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              {importError && (
                <span style={{ fontSize: 12.5, color: 'var(--red)', maxWidth: 240 }}>{importError}</span>
              )}
              {step === 1 && (
                <Button
                  variant="primary"
                  iconRight="arrowright"
                  onClick={() => setStep(2)}
                  disabled={!canProceed()}
                >
                  Review
                </Button>
              )}
              {step === 2 && (
                <Button
                  variant="primary"
                  icon={importing ? undefined : 'upload'}
                  onClick={handleImport}
                  disabled={importing || validCount === 0}
                >
                  {importing
                    ? <><Spinner size={14} /> Importing…</>
                    : `Import ${validCount} attendee${validCount !== 1 ? 's' : ''}`
                  }
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
