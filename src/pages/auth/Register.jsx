import { useState, useEffect, useRef } from 'react';
import { useRegister, STEPS, STEP_LABELS, ROLES } from '../../hooks/useRegister';
import StepAccount from '../../components/auth/StepAccount';
import StepBusiness from '../../components/auth/StepBusiness';
import StepLocation from '../../components/auth/StepLocation';
import StepPhoto from '../../components/auth/StepPhoto';
import StepDone from '../../components/auth/StepDone';
import { useNavigate } from 'react-router-dom';
import logo from "../../assets/kraal-logo-black.svg";
import './Register.css';

export default function Register() {
  const navigate = useNavigate();
  const {
    step, form, loading, error,
    update, toggleLivestock,
    submitAccount, nextStep, prevStep, submitFinal,
    setError,
  } = useRegister();

  const isDone = step === STEPS.DONE;

  // Redirect to the right dashboard after registration completes
  const handleDone = () => {
    if (form.role === 'transporter') navigate('/driver', { replace: true });
    else if (form.role === 'buyer')  navigate('/buyer', { replace: true });
    else if (form.role === 'vet')  navigate('/vet', { replace: true });
    else if (form.role === 'seller')  navigate('/seller/dashboard', { replace: true });
    else                              navigate('/marketplace', { replace: true });
  };

  return (
    <div className="register-page">
     
      <div className="register-form-panel">
        {!isDone && (
          <div className="progress-bar">
            {STEP_LABELS.map((label, i) => (
              <div
                key={label}
                className={`progress-step ${i < step ? 'done' : i === step ? 'active' : ''}`}
              >
                <div className="progress-dot">
                  {i < step ? '✓' : i + 1}
                </div>
                <span>{label}</span>
              </div>
            ))}
          </div>
        )}

        <div className="form-card">
          {step === STEPS.ACCOUNT && (
            <>
              {/* ── Role selector — shown above the account fields ── */}
              <RoleSelector
                selected={form.role}
                onSelect={(role) => { update({ role }); setError(null); }}
              />

              <StepAccount
                form={form}
                update={update}
                onSubmit={submitAccount}
                loading={loading}
                error={error}
              />
            </>
          )}

          {step === STEPS.BUSINESS && (
            <StepBusiness
              form={form}
              update={update}
              toggleLivestock={toggleLivestock}
              onNext={nextStep}
              onBack={prevStep}
              error={error}
            />
          )}

          {step === STEPS.LOCATION && (
            <StepLocation
              form={form}
              update={update}
              onNext={nextStep}
              onBack={prevStep}
              error={error}
            />
          )}

          {step === STEPS.PHOTO && (
            <StepPhoto
              form={form}
              update={update}
              onSubmit={submitFinal}
              onBack={prevStep}
              loading={loading}
              error={error}
              setError={setError}
            />
          )}

          {step === STEPS.DONE && (
            <StepDone role={form.role} onContinue={handleDone} />
          )}
        </div>
      </div>
    </div>
  );
}

function RoleSelector({ selected, onSelect }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const current = ROLES.find((r) => r.value === selected);

  // close on outside click or Escape
  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('touchstart', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('touchstart', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="role-selector" ref={wrapRef}>
      <p className="role-selector-label" id="role-label">I want to join Kraal as a</p>

      <button
        type="button"
        className={`role-trigger ${open ? 'is-open' : ''} ${current ? '' : 'is-empty'}`}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-labelledby="role-label"
      >
        {current ? (
          <>
           
            <span className="role-trigger-text">
              <span className="role-card-label">{current.label}</span>
              <span className="role-card-desc">{current.desc}</span>
            </span>
          </>
        ) : (
          <span className="role-trigger-placeholder">Select your role…</span>
        )}
        <span className="role-chevron" aria-hidden="true">▾</span>
      </button>

      {open && (
        <ul className="role-menu" role="listbox" aria-labelledby="role-label">
          {ROLES.map(({ value, label, emoji, desc }) => (
            <li key={value} role="option" aria-selected={selected === value}>
              <button
                type="button"
                className={`role-option ${selected === value ? 'role-option--active' : ''}`}
                onClick={() => { onSelect(value); setOpen(false); }}
              >
                <span className="role-card-emoji">{emoji}</span>
                <span className="role-trigger-text">
                  <span className="role-card-label">{label}</span>
                  <span className="role-card-desc">{desc}</span>
                </span>
                {selected === value && <span className="role-card-check">✓</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

