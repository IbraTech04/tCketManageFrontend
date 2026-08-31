import { useState, useRef, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { eventsApi } from '../api/events';
import Icon from './ui/Icon';
import Button from './ui/Button';
import WizardShell, { Field, SectionHead, StepHeading, Warning } from './ui/Wizard';

const STEPS = [
  { id: 0, label: 'Upload',          icon: 'upload' },
  { id: 1, label: 'Map Columns',     icon: 'grid' },
  { id: 2, label: 'Review & Import', icon: 'check' },
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

// Shared <select> chrome — the native control with the app's input styling and
// a chevron, since `appearance: none` drops the platform arrow.
function Select({ value, onChange, children }) {
  return (
    <div style={{ position: 'relative' }}>
      <select
        value={value}
        onChange={onChange}
        style={{
          appearance: 'none', font: 'inherit', fontSize: 12.5,
          width: '100%', height: 34, padding: '0 30px 0 10px',
          border: '1px solid var(--border-2)', borderRadius: 'var(--r)',
          background: 'var(--surface)', color: 'var(--text)', cursor: 'pointer',
        }}
      >
        {children}
      </select>
      <span style={{
        position: 'absolute', right: 9, top: '50%', transform: 'translateY(-50%)',
        pointerEvents: 'none', color: 'var(--text-3)', display: 'flex',
      }}>
        <Icon name="chevdown" size={13} />
      </span>
    </div>
  );
}

// Step 0: Upload
function StepUpload({ file, rowCount, onFile }) {
  const [drag, setDrag] = useState(false);
  const inputRef = useRef(null);

  function handleDrop(e) {
    e.preventDefault();
    setDrag(false);
    const f = e.dataTransfer.files?.[0];
    if (f) onFile(f);
  }

  function useSample() {
    const blob = new Blob([SAMPLE_CSV], { type: 'text/csv' });
    onFile(new File([blob], 'sample.csv', { type: 'text/csv' }));
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <StepHeading title="Upload">Pick a CSV of attendees. You will map its columns on the next step.</StepHeading>

      <div
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        style={{
          width: '100%', border: `2px dashed ${drag ? 'var(--orange)' : 'var(--border-2)'}`,
          borderRadius: 'var(--r-lg)', padding: '36px 24px',
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
          onChange={(e) => onFile(e.target.files?.[0])}
        />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
        <div style={{ height: 1, flex: 1, background: 'var(--border)' }} />
        <span style={{ fontSize: 12, color: 'var(--text-3)' }}>or</span>
        <div style={{ height: 1, flex: 1, background: 'var(--border)' }} />
      </div>

      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <Button variant="ghost" icon="download" onClick={useSample}>
          Use sample file
        </Button>
      </div>

      {file && rowCount === 0 && (
        <Warning>
          <strong style={{ fontWeight: 600 }}>Nothing to read in {file.name}.</strong> The file
          parsed to zero rows — check it isn't empty, and that it's comma-separated.
        </Warning>
      )}

      {file && rowCount > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 12px', background: 'var(--green-soft)',
          border: '1px solid var(--green-border)', borderRadius: 'var(--r)',
        }}>
          <Icon name="check" size={14} color="var(--green)" />
          <span style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>{file.name}</span>
          <span style={{ fontSize: 11.5, color: 'var(--text-3)' }}>
            {rowCount} row{rowCount !== 1 ? 's' : ''} parsed
          </span>
        </div>
      )}

      <div style={{
        background: 'var(--surface-3)', border: '1px solid var(--border)',
        borderRadius: 'var(--r)', padding: '10px 14px', fontSize: 12, color: 'var(--text-3)',
        lineHeight: 1.6,
      }}>
        Expected columns (in any order): <strong>First Name</strong>, <strong>Last Name</strong>, <strong>Email</strong>, <strong>Ticket Type</strong>.
        A header row is recommended.
      </div>
    </div>
  );
}

// Step 1: Map Columns
function StepMapColumns({ rows, mapping, setMapping, hasHeader, setHasHeader, ticketTypes, defaultTypeId, setDefaultTypeId, missing }) {
  const headers = hasHeader && rows.length > 0 ? rows[0] : rows[0]?.map((_, i) => `Column ${i + 1}`) ?? [];
  const colOptions = headers.map((h, i) => [String(i), h || `Col ${i + 1}`]);

  const FIELDS = [
    { key: 'firstNameColumn',  label: 'First Name', icon: 'user' },
    { key: 'lastNameColumn',   label: 'Last Name',  icon: 'user' },
    { key: 'emailColumn',      label: 'Email',      icon: 'mail' },
    { key: 'ticketTypeColumn', label: 'Ticket Type', icon: 'ticket', optional: true },
  ];

  const preview = hasHeader ? rows.slice(1, 4) : rows.slice(0, 4);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <StepHeading title="Map Columns">Tell us which column holds which field. We guessed from your header row.</StepHeading>

      {missing.length > 0 && (
        <Warning>
          <strong style={{ fontWeight: 600 }}>
            {missing.join(' and ')} {missing.length > 1 ? 'are' : 'is'} not mapped.
          </strong>{' '}
          Every attendee needs a name and an email address, so these have to point at a column.
        </Warning>
      )}

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

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
        {FIELDS.map(({ key, label, icon, optional }) => (
          <Field
            key={key}
            label={<><Icon name={icon} size={13} color="var(--text-3)" />{label}</>}
            required={!optional}
            hint={optional ? 'Optional — falls back to the default below.' : undefined}
          >
            <Select
              value={mapping[key] === undefined ? '' : String(mapping[key])}
              onChange={(e) => setMapping((m) => ({ ...m, [key]: e.target.value === '' ? undefined : Number(e.target.value) }))}
            >
              <option value="">{optional ? '(skip)' : 'Select column'}</option>
              {colOptions.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
          </Field>
        ))}
      </div>

      <Field label="Default ticket type" hint="Used when the ticket type column is blank or unmapped.">
        <Select value={defaultTypeId} onChange={(e) => setDefaultTypeId(e.target.value)}>
          <option value="">None</option>
          {ticketTypes.map((tt) => (
            <option key={tt.id} value={tt.id}>{tt.name} — ${Number(tt.price).toFixed(2)}</option>
          ))}
        </Select>
      </Field>

      {preview.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <SectionHead title="Preview" hint="First rows of your file" />
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
  const errorCount = Object.keys(errors).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <StepHeading title="Review &amp; Import">Check what will be created. Rows with errors are skipped, not imported.</StepHeading>

      {validRows.length === 0 && (
        <Warning>
          <strong style={{ fontWeight: 600 }}>No rows are importable.</strong> Every row failed
          validation — go back and check the column mapping, or fix the file and upload it again.
        </Warning>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Stat
          value={validRows.length}
          label="Ready to import"
          icon="check"
          color="var(--green)"
          bg="var(--green-soft)"
        />
        <Stat
          value={errorCount}
          label={errorCount === 1 ? 'Row skipped' : 'Rows skipped'}
          icon={errorCount > 0 ? 'alert' : 'check'}
          color={errorCount > 0 ? 'var(--red)' : 'var(--text-3)'}
          bg={errorCount > 0 ? 'var(--red-soft)' : 'var(--surface-3)'}
        />
      </div>

      {errorCount > 0 && (
        <div style={{
          background: 'var(--red-soft)', border: '1px solid var(--red-border)',
          borderRadius: 'var(--r)', padding: '12px 14px',
        }}>
          <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--red)', marginBottom: 6 }}>
            Validation errors
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {Object.entries(errors).slice(0, 8).map(([idx, msg]) => (
              <div key={idx} style={{ fontSize: 12.5, color: 'var(--red)' }}>
                Row {Number(idx) + 1 + (hasHeader ? 1 : 0)}: {msg}
              </div>
            ))}
            {errorCount > 8 && (
              <div style={{ fontSize: 12, color: 'var(--red)', opacity: 0.7 }}>
                …and {errorCount - 8} more
              </div>
            )}
          </div>
        </div>
      )}

      {validRows.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <SectionHead
            title="Attendees"
            count={validRows.length}
            hint={validRows.length > 10 ? 'Showing the first 10' : undefined}
          />
          <div style={{ overflowX: 'auto', borderRadius: 'var(--r)', border: '1px solid var(--border)' }}>
            <table className="tbl" style={{ fontSize: 12 }}>
              <thead>
                <tr>
                  <th style={{ width: 36 }}>#</th>
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
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ value, label, icon, color, bg }) {
  return (
    <div className="card" style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 11 }}>
      <div style={{
        width: 32, height: 32, borderRadius: 8, background: bg,
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <Icon name={icon} size={16} color={color} />
      </div>
      <div>
        <div style={{ fontSize: 18, fontWeight: 700 }}>{value}</div>
        <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{label}</div>
      </div>
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

  // Fetch ticket types for the mapping step.
  useEffect(() => {
    if (!eventId) return;
    eventsApi.getTicketTypes(eventId)
      .then((data) => setTicketTypes(data ?? []))
      .catch(() => {});
  }, [eventId]);

  function handleFile(f) {
    if (!f) return;
    setFile(f);
    const reader = new FileReader();
    reader.onload = (e) => {
      const parsed = parseCsv(e.target.result);
      setRows(parsed);
      // Guess the mapping from the header row so the next step opens filled in.
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

  // Named for the warning on the mapping step.
  const missing = [
    mapping.firstNameColumn === undefined && 'First Name',
    mapping.lastNameColumn === undefined && 'Last Name',
    mapping.emailColumn === undefined && 'Email',
  ].filter(Boolean);

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

  function canContinue() {
    if (step === 0) return rows.length > 0;
    if (step === 1) return missing.length === 0;
    if (step === 2) return validCount > 0;
    return true;
  }

  return (
    <WizardShell
      title="Import Attendees"
      steps={STEPS}
      step={step}
      onStepChange={(next) => { setStep(next); setImportError(''); }}
      onClose={onClose}
      canContinue={canContinue()}
      error={importError}
      primary={step === 2 ? {
        label: `Import ${validCount} attendee${validCount !== 1 ? 's' : ''}`,
        icon: 'upload',
        onClick: handleImport,
        busy: importing,
        busyLabel: 'Importing…',
      } : undefined}
    >
      {step === 0 && <StepUpload file={file} rowCount={rows.length} onFile={handleFile} />}
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
          missing={missing}
        />
      )}
      {step === 2 && (
        <StepReview rows={rows} mapping={mapping} hasHeader={hasHeader} errors={errors} />
      )}
    </WizardShell>
  );
}
