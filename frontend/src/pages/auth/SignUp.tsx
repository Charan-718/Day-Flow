import { type FormEvent, useMemo, useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getRegistrationStatus, register } from '../../services/auth';
import { fileToBase64, validateImage } from '../../services/files';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../components/Toast';
import { Button } from '../../components/Button';
import { CloseIcon, UserPlusIcon } from '../../components/icons';
import { getApiError } from '../../api/client';

const inputClass =
  'w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-background-deep)] px-4 py-3 text-base text-[var(--color-text)] placeholder-[var(--color-text-muted)] outline-none transition duration-200 focus:border-[var(--color-powder-blue)] focus:ring-2 focus:ring-[var(--color-powder-blue)]/30';
const errorInputClass =
  'w-full rounded-xl border border-[var(--color-bordeaux-main)] bg-[var(--color-background-deep)] px-4 py-3 text-base text-[var(--color-text)] placeholder-[var(--color-text-muted)] outline-none transition duration-200 focus:border-[var(--color-bordeaux-main)] focus:ring-2 focus:ring-[var(--color-bordeaux-main)]/30';

interface FormState {
  companyName: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
}

const EMPTY: FormState = {
  companyName: '',
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  password: '',
  confirmPassword: '',
};

/** Mirrors the server's registerSchema so users see problems before a round trip. */
function validate(form: FormState): Partial<Record<keyof FormState, string>> {
  const e: Partial<Record<keyof FormState, string>> = {};
  if (form.companyName.trim().length < 2) e.companyName = 'Company name is required.';
  if (!form.firstName.trim()) e.firstName = 'First name is required.';
  if (!form.lastName.trim()) e.lastName = 'Last name is required.';
  if (!/^\S+@\S+\.\S+$/.test(form.email)) e.email = 'Enter a valid email address.';
  if (!/^[0-9+\-\s()]{7,20}$/.test(form.phone)) e.phone = 'Enter a valid phone number.';

  if (form.password.length < 12) e.password = 'At least 12 characters.';
  else if (!/[A-Z]/.test(form.password)) e.password = 'Include an uppercase letter.';
  else if (!/[a-z]/.test(form.password)) e.password = 'Include a lowercase letter.';
  else if (!/[0-9]/.test(form.password)) e.password = 'Include a number.';

  if (!form.confirmPassword) e.confirmPassword = 'Please confirm your password.';
  else if (form.password !== form.confirmPassword) e.confirmPassword = 'Passwords do not match.';
  return e;
}

function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-2 block font-semibold text-[var(--color-text-secondary)]">
        {label} {hint && <span className="font-normal text-[var(--color-text-muted)]">{hint}</span>}
      </span>
      {children}
      {error && (
        <span role="alert" className="mt-1.5 block text-xs font-semibold text-[#ff7b79]">
          {error}
        </span>
      )}
    </label>
  );
}

export function SignUpPage() {
  const navigate = useNavigate();
  const { applySession } = useAuth();
  const { showToast } = useToast();

  const status = useQuery({ queryKey: ['registration-status'], queryFn: getRegistrationStatus });

  const [form, setForm] = useState<FormState>(EMPTY);
  const [touched, setTouched] = useState<Partial<Record<keyof FormState, boolean>>>({});
  const [submitted, setSubmitted] = useState(false);
  const [logo, setLogo] = useState<{ file: File; preview: string } | null>(null);
  const [logoError, setLogoError] = useState('');
  const [serverError, setServerError] = useState('');
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const errors = useMemo(() => validate(form), [form]);
  const show = (k: keyof FormState) => (touched[k] || submitted ? errors[k] : undefined);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function onPickLogo(file?: File) {
    if (!file) return;
    const problem = validateImage(file);
    if (problem) {
      setLogoError(problem);
      return;
    }
    setLogoError('');
    setLogo({ file, preview: URL.createObjectURL(file) });
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    setServerError('');
    if (Object.keys(errors).length > 0) {
      document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
      return;
    }

    setBusy(true);
    try {
      const payload = {
        ...form,
        companyName: form.companyName.trim(),
        email: form.email.trim().toLowerCase(),
        ...(logo
          ? { companyLogoFileName: logo.file.name, companyLogoBase64: await fileToBase64(logo.file) }
          : {}),
      };
      const result = await register(payload);
      applySession(result.token, result.user);
      showToast('success', `Welcome to Dayflow — ${result.company.name} is ready`);
      navigate('/', { replace: true });
    } catch (err) {
      setServerError(getApiError(err).message);
    } finally {
      setBusy(false);
    }
  }

  if (status.isLoading) {
    return (
      <div className="landing-vibrant-card rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-8 text-center shadow-2xl">
        <div className="mx-auto h-10 w-10 animate-pulse rounded-lg bg-[var(--color-border)]" />
        <div className="mx-auto mt-4 h-4 w-40 animate-pulse rounded bg-[var(--color-border)]" />
      </div>
    );
  }

  // Employees can never self-register: once an organisation exists this screen closes.
  if (status.data && !status.data.open) {
    return (
      <div className="landing-vibrant-card rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-8 sm:p-10 text-center shadow-2xl">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-accent-cyan-alpha-12)] text-[var(--color-powder-blue)]">
          <UserPlusIcon size={24} />
        </div>
        <h1 className="text-xl font-bold text-[var(--color-heading)]">Sign-up is closed</h1>
        <p className="mx-auto mt-2 max-w-sm text-sm text-[var(--color-text-muted)] leading-relaxed">
          This workspace already has an organisation. Employee accounts are created by your HR
          Admin, who will share your Login ID and a temporary password.
        </p>
        <Link
          to="/login"
          className="landing-btn-primary mt-6 inline-flex justify-center px-6 py-2.5 text-sm font-bold shadow-[var(--shadow-md)]"
        >
          Go to sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="landing-vibrant-card relative flex min-h-[90vh] w-full flex-col justify-between overflow-hidden rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] p-8 sm:p-12 shadow-2xl">
      <div className="mb-8 text-center">
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--color-heading)] mb-2">
          Create your organisation
        </h1>
        <p className="mx-auto mt-1 max-w-sm text-sm font-medium text-[var(--color-text-muted)]">
          Sets up your company and your HR Admin account. You'll add employees from inside
          Dayflow — they don't sign up themselves.
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-5" noValidate>
        <fieldset className="space-y-4" disabled={busy}>
          <legend className="sr-only">Company</legend>

          <Field label="Company name" error={show('companyName')}>
            <input
              className={show('companyName') ? errorInputClass : inputClass}
              value={form.companyName}
              onChange={(e) => set('companyName', e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, companyName: true }))}
              aria-invalid={Boolean(show('companyName'))}
              autoComplete="organization"
            />
          </Field>

          <div>
            <span className="mb-1.5 block text-sm font-medium text-[var(--ink)]">
              Company logo <span className="font-normal text-[var(--muted)]">(optional)</span>
            </span>
            <div className="flex items-center gap-3">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-dashed border-[var(--border-control)] bg-[var(--bg)]">
                {logo ? (
                  <img src={logo.preview} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-xs text-[var(--muted)]">Logo</span>
                )}
              </div>
              <div className="min-w-0">
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  className="sr-only"
                  onChange={(e) => onPickLogo(e.target.files?.[0])}
                />
                <div className="flex flex-wrap items-center gap-2">
                  <Button type="button" size="sm" variant="secondary" onClick={() => fileRef.current?.click()}>
                    {logo ? 'Replace' : 'Upload logo'}
                  </Button>
                  {logo && (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setLogo(null);
                        if (fileRef.current) fileRef.current.value = '';
                      }}
                    >
                      <CloseIcon size={14} />
                      Remove
                    </Button>
                  )}
                </div>
                <p className="mt-1 text-xs text-[var(--muted)]">PNG, JPG, WEBP or GIF · max 2MB</p>
                {logoError && (
                  <p role="alert" className="mt-1 text-xs text-[var(--danger)]">
                    {logoError}
                  </p>
                )}
              </div>
            </div>
          </div>
        </fieldset>

        <fieldset className="space-y-4 border-t border-[var(--line)] pt-5" disabled={busy}>
          <legend className="sr-only">Your HR Admin account</legend>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="First name" error={show('firstName')}>
              <input
                className={show('firstName') ? errorInputClass : inputClass}
                value={form.firstName}
                onChange={(e) => set('firstName', e.target.value)}
                onBlur={() => setTouched((t) => ({ ...t, firstName: true }))}
                aria-invalid={Boolean(show('firstName'))}
                autoComplete="given-name"
              />
            </Field>
            <Field label="Last name" error={show('lastName')}>
              <input
                className={show('lastName') ? errorInputClass : inputClass}
                value={form.lastName}
                onChange={(e) => set('lastName', e.target.value)}
                onBlur={() => setTouched((t) => ({ ...t, lastName: true }))}
                aria-invalid={Boolean(show('lastName'))}
                autoComplete="family-name"
              />
            </Field>
          </div>

          <Field label="Work email" error={show('email')}>
            <input
              type="email"
              className={show('email') ? errorInputClass : inputClass}
              value={form.email}
              onChange={(e) => set('email', e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, email: true }))}
              aria-invalid={Boolean(show('email'))}
              autoComplete="email"
            />
          </Field>

          <Field label="Phone" error={show('phone')}>
            <input
              type="tel"
              className={show('phone') ? errorInputClass : inputClass}
              value={form.phone}
              onChange={(e) => set('phone', e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, phone: true }))}
              aria-invalid={Boolean(show('phone'))}
              autoComplete="tel"
            />
          </Field>

          <Field
            label="Password"
            hint="— min 12 chars, upper, lower and a number"
            error={show('password')}
          >
            <input
              type="password"
              className={show('password') ? errorInputClass : inputClass}
              value={form.password}
              onChange={(e) => set('password', e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, password: true }))}
              aria-invalid={Boolean(show('password'))}
              autoComplete="new-password"
            />
          </Field>

          <Field label="Confirm password" error={show('confirmPassword')}>
            <input
              type="password"
              className={show('confirmPassword') ? errorInputClass : inputClass}
              value={form.confirmPassword}
              onChange={(e) => set('confirmPassword', e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, confirmPassword: true }))}
              aria-invalid={Boolean(show('confirmPassword'))}
              autoComplete="new-password"
            />
          </Field>
        </fieldset>

        {serverError && (
          <div
            role="alert"
            className="break-words rounded-xl border border-[var(--color-bordeaux-main)]/40 bg-[var(--color-bordeaux-alpha-15)] p-4 text-sm font-medium text-[#ff7b79]"
          >
            {serverError}
          </div>
        )}

        <button type="submit" className="landing-btn-primary w-full justify-center py-3.5 text-base font-bold shadow-[var(--shadow-md)] cursor-pointer" disabled={busy}>
          {busy ? 'Creating organisation…' : 'Create organisation'}
        </button>
      </form>

      <p className="mt-8 text-center text-sm text-[var(--color-text-muted)]">
        Already have an account?{' '}
        <Link
          to="/login"
          className="font-bold text-[var(--color-powder-blue)] hover:underline transition-colors"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
