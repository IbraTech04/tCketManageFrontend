import { useEffect, useRef, useState } from 'react';
import Icon from './Icon';
import Button from './Button';
import Spinner from './Spinner';
import LogoMark from '../LogoMark';

/* Shared chrome for the multi-step modals (create event, import attendees).
   Owns the frame, the step rail, the slide transition between steps and the
   blocked-primary-action shake, so every wizard behaves identically. */

// Rail geometry, shared by the step chips and the progress spine drawn behind
// them. Keep these in sync rather than hard-coding the same numbers twice.
const RAIL = {
  padY: 20,
  gap: 4,
  rowPadY: 9,
  rowPadX: 10,
  chip: 22,
  get rowH() { return this.chip + this.rowPadY * 2 + this.gap; },
  get chipCenterX() { return 16 + this.rowPadX + this.chip / 2; },
};

function StepRail({ steps, current, title }) {
  return (
    <div style={{
      width: 210, background: 'var(--rail-bg)', borderRight: '1px solid var(--rail-border)',
      display: 'flex', flexDirection: 'column', padding: '28px 0',
      flexShrink: 0, position: 'relative', overflow: 'hidden',
    }}>
      {/* Brand silhouette, bleeding off the bottom-left corner of the rail */}
      <div
        className="wiz-watermark"
        aria-hidden="true"
        style={{
          position: 'absolute', left: -52, bottom: -46,
          pointerEvents: 'none', userSelect: 'none', zIndex: 0,
        }}
      >
        <LogoMark size={200} color="rgba(255,106,26,0.12)" />
      </div>

      <div style={{ padding: '0 20px 24px', borderBottom: '1px solid var(--rail-border)', position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <LogoMark size={26} />
          <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--rail-text)', letterSpacing: '-0.02em' }}>
            {title}
          </span>
        </div>
      </div>

      <div style={{ padding: `${RAIL.padY}px 16px`, display: 'flex', flexDirection: 'column', gap: RAIL.gap, position: 'relative', zIndex: 1 }}>
        {/* Progress spine behind the step chips — the fill height animates as
            you move between screens. Geometry is derived from RAIL so the line
            stays glued to the chip centres. */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute', width: 2, borderRadius: 1,
            left: RAIL.chipCenterX - 1,
            top: RAIL.padY + RAIL.rowPadY + RAIL.chip / 2,
            height: (steps.length - 1) * RAIL.rowH,
            background: 'var(--rail-chip)',
          }}
        >
          <div style={{
            width: '100%', borderRadius: 1,
            height: `${(current / (steps.length - 1)) * 100}%`,
            background: 'linear-gradient(180deg, var(--green-fill), var(--orange))',
            transition: 'height .34s cubic-bezier(.16,1,.3,1)',
          }} />
        </div>

        {steps.map((s, i) => {
          const done = current > i;
          const active = current === i;
          return (
            <div key={s.id ?? i} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: `${RAIL.rowPadY}px ${RAIL.rowPadX}px`, borderRadius: 8,
              background: active ? 'rgba(255,106,26,0.14)' : 'transparent',
              transition: 'background .22s ease',
              position: 'relative',
            }}>
              <div style={{
                width: RAIL.chip, height: RAIL.chip, borderRadius: 6,
                background: done ? 'var(--green-fill)' : active ? 'var(--orange)' : 'var(--rail-chip)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                transition: 'background .22s ease, box-shadow .22s ease, transform .22s cubic-bezier(.16,1,.3,1)',
                transform: active ? 'scale(1.08)' : 'none',
                boxShadow: active ? '0 0 0 4px rgba(255,106,26,0.16)' : 'none',
              }}>
                {done
                  ? <Icon name="check" size={12} color="#fff" stroke={2.5} />
                  : <Icon name={s.icon} size={12} color={active ? '#fff' : 'var(--rail-text-3)'} stroke={2} />
                }
              </div>
              <div style={{
                fontSize: 12.5, fontWeight: 500,
                color: active ? 'var(--rail-text)' : done ? 'var(--rail-text-2)' : 'var(--rail-text-3)',
                transition: 'color .15s',
              }}>
                {s.label}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── step-content primitives ─────────────────────────────────────────── */

// Blocking warning shown on a step that can't be completed yet. Same shape on
// every step so "you can't continue" always looks the same.
export function Warning({ children }) {
  return (
    <div style={{
      padding: '14px 16px', background: 'var(--amber-soft)',
      border: '1px solid var(--amber-border)', borderRadius: 'var(--r)',
      fontSize: 12.5, color: 'var(--amber)', lineHeight: 1.5,
      display: 'flex', alignItems: 'flex-start', gap: 9,
    }}>
      <Icon name="alert" size={14} color="var(--amber)" style={{ marginTop: 1, flexShrink: 0 }} />
      <div>{children}</div>
    </div>
  );
}

// Card that groups the inputs for adding one item, with the add action pinned
// to its footer. Every "add a thing" in the app looks the same.
export function Composer({ title, hint, children, footer }) {
  return (
    <div style={{
      border: '1px solid var(--border)', borderRadius: 'var(--r-lg)',
      background: 'var(--surface-2)', overflow: 'hidden',
    }}>
      <div style={{ padding: '13px 16px 0' }}>
        <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text)' }}>{title}</div>
        {hint && <div style={{ fontSize: 11.5, color: 'var(--text-3)', marginTop: 3 }}>{hint}</div>}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '13px 16px' }}>
        {children}
      </div>
      {footer && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
          padding: '11px 16px', borderTop: '1px solid var(--border)',
          background: 'var(--surface-3)',
        }}>
          {footer}
        </div>
      )}
    </div>
  );
}

// Header above a list or table of what has been built so far.
export function SectionHead({ title, count, hint }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
      <span style={{
        fontSize: 11, fontWeight: 600, color: 'var(--text-3)',
        textTransform: 'uppercase', letterSpacing: '.06em',
      }}>
        {title}
      </span>
      {count !== undefined && (
        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)' }}>{count}</span>
      )}
      {hint && <span style={{ fontSize: 11.5, color: 'var(--text-3)', marginLeft: 'auto' }}>{hint}</span>}
    </div>
  );
}

// Inline note under a composer field — why the add button won't fire.
export function InlineNote({ tone = 'error', children }) {
  const color = tone === 'error' ? 'var(--red)' : 'var(--text-3)';
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, color }}>
      <Icon name={tone === 'error' ? 'alert' : 'info'} size={12} color={color} />
      {children}
    </span>
  );
}

export function Field({ label, required, children, hint }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <label style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 4 }}>
        {label}
        {required && <span style={{ color: 'var(--red)' }}>*</span>}
      </label>
      {children}
      {hint && <div style={{ fontSize: 11.5, color: 'var(--text-3)' }}>{hint}</div>}
    </div>
  );
}

// Title + one-line description at the top of a step body.
export function StepHeading({ title, children }) {
  return (
    <div>
      <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 6 }}>{title}</div>
      {children && <div style={{ fontSize: 13, color: 'var(--text-2)' }}>{children}</div>}
    </div>
  );
}

/* ── the shell ───────────────────────────────────────────────────────── */

/**
 * Modal frame for a step-based flow.
 *
 * The caller owns `step` and the step bodies; the shell owns the frame, the
 * rail, the slide-in transition and the footer. The primary action is blocked
 * rather than disabled when `canContinue` is false, so clicking it can shake
 * and point at the reason instead of silently doing nothing.
 *
 * `primary` overrides the default Continue button: { label, icon, iconRight,
 * onClick, busy, busyLabel }. Omit it and the shell advances a step.
 */
export default function WizardShell({
  title,
  steps,
  step,
  onStepChange,
  onClose,
  canContinue = true,
  primary,
  error,
  children,
}) {
  // +1 when moving forward, -1 when moving back — decides which way the step
  // body slides in.
  const [dir, setDir] = useState(1);
  const [shaking, setShaking] = useState(false);
  const scrollRef = useRef(null);
  const busy = !!primary?.busy;

  // Each step starts at the top; without this a long step leaves the next one
  // scrolled halfway down.
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [step]);

  // Track direction whenever the caller moves the step, including moves the
  // shell did not initiate (e.g. auto-advancing after a file is picked).
  const prevStep = useRef(step);
  useEffect(() => {
    if (step !== prevStep.current) {
      setDir(step > prevStep.current ? 1 : -1);
      prevStep.current = step;
    }
  }, [step]);

  // Dropping the class first lets a repeat click restart the animation.
  function reject() {
    setShaking(false);
    requestAnimationFrame(() => setShaking(true));
  }

  function handlePrimary() {
    if (!canContinue) {
      reject();
      return;
    }
    if (primary?.onClick) primary.onClick();
    else onStepChange(step + 1);
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 50,
      background: 'var(--overlay)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px',
    }}
      onClick={onClose}
    >
      <div
        className="pop-in"
        onClick={(e) => e.stopPropagation()}
        style={{
          display: 'flex', width: '100%', maxWidth: 820,
          height: 560, maxHeight: '90vh',
          background: 'var(--surface)',
          borderRadius: 'var(--r-xl)',
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow-pop)',
          overflow: 'hidden',
        }}
      >
        <StepRail steps={steps} current={step} title={title} />

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '16px 24px', borderBottom: '1px solid var(--border)', flexShrink: 0,
          }}>
            <div style={{ fontSize: 12.5, color: 'var(--text-3)', fontWeight: 500 }}>
              Step {step + 1} of {steps.length}
            </div>
            <Button variant="subtle" icon="x" onClick={onClose} />
          </div>

          <div ref={scrollRef} className="tm-scroll" style={{ flex: 1, overflowY: 'auto', padding: '28px 28px' }}>
            {/* Keyed on `step` so React remounts the wrapper and the slide-in
                animation replays on every transition. */}
            <div key={step} className={`wiz-step${dir < 0 ? ' wiz-step-back' : ''}`}>
              {children}
            </div>
          </div>

          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '14px 24px', borderTop: '1px solid var(--border)', flexShrink: 0,
            background: 'var(--surface-2)',
          }}>
            <Button
              variant="ghost"
              icon="arrowleft"
              onClick={() => onStepChange(Math.max(0, step - 1))}
              disabled={step === 0 || busy}
            >
              Back
            </Button>

            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              {error && (
                <span style={{ fontSize: 12.5, color: 'var(--red)', maxWidth: 260 }}>{error}</span>
              )}
              <Button
                variant="primary"
                icon={busy ? undefined : primary?.icon}
                iconRight={busy ? undefined : (primary ? primary.iconRight : 'arrowright')}
                className={[canContinue ? '' : 'btn-blocked', shaking ? 'shake' : ''].filter(Boolean).join(' ')}
                aria-disabled={canContinue ? undefined : true}
                disabled={busy}
                onClick={handlePrimary}
                onAnimationEnd={() => setShaking(false)}
              >
                {busy
                  ? <><Spinner size={14} /> {primary?.busyLabel ?? 'Working…'}</>
                  : (primary?.label ?? 'Continue')}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
