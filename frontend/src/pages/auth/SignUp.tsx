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
  'w-full rounded-md border border-[var(--border-control)] px-3 py-2.5 text-base outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2';
const errorInputClass =
  'w-full rounded-md border border-[var(--danger)] px-3 py-2.5 text-base outline-none focus-visible:ring-2 focus-visible:ring-[var(--danger)] focus-visible:ring-offset-2';

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
      <span className="mb-1.5 block font-medium text-[var(--ink)]">
        {label} {hint && <span className="font-normal text-[var(--muted)]">{hint}</span>}
      </span>
      {children}
      {error && (
        <span role="alert" className="mt-1 block text-xs text-[var(--danger)]">
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
      <div className="rounded-xl border border-[var(--line)] bg-white p-8 shadow-[var(--shadow)]">
        <div className="mx-auto h-10 w-10 animate-pulse rounded-lg bg-[var(--line)]/60" />
        <div className="mx-auto mt-4 h-4 w-40 animate-pulse rounded bg-[var(--line)]/60" />
      </div>
    );
  }

  // Employees can never self-register: once an organisation exists this screen closes.
  if (status.data && !status.data.open) {
    return (
      <div className="rounded-xl border border-[var(--line)] bg-white p-8 text-center shadow-[var(--shadow)]">
        <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-[var(--info-soft)] text-[var(--info)]">
          <UserPlusIcon size={20} />
        </div>
        <h1 className="text-lg font-semibold text-[var(--ink)]">Sign-up is closed</h1>
        <p className="mx-auto mt-2 max-w-sm text-sm text-[var(--muted)]">
          This workspace already has an organisation. Employee accounts are created by your HR
          Admin, who will share your Login ID and a temporary password.
        </p>
        <Link
          to="/login"
          className="mt-5 inline-flex h-10 items-center rounded-md bg-[var(--accent)] px-4 text-sm font-medium text-white hover:bg-[var(--accent-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2"
        >
          Go to sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[var(--line)] bg-white p-6 shadow-[var(--shadow)] sm:p-8">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--ink)]">
          Create your organisation
        </h1>
        <p className="mx-auto mt-1 max-w-sm text-sm text-[var(--muted)]">
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
          <p
            role="alert"
            className="break-words rounded-md bg-[var(--danger-soft)] px-3 py-2 text-sm text-[var(--danger)]"
          >
            {serverError}
          </p>
        )}

        <Button type="submit" size="lg" className="w-full" loading={busy}>
          Create organisation
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-[var(--muted)]">
        Already have an account?{' '}
        <Link
          to="/login"
          className="rounded font-medium text-[var(--accent)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
