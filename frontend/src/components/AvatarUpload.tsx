import { useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { uploadFile, validateImage } from '../services/files';
import { updateEmployee } from '../services/employees';
import { useToast } from './Toast';
import { getApiError } from '../api/client';
import { CloseIcon, UserIcon } from './icons';

interface AvatarUploadProps {
  employeeId: string;
  currentUrl?: string | null;
  firstName?: string;
  lastName?: string;
  /** False for viewers who may not edit this profile — renders a plain avatar. */
  editable?: boolean;
  size?: number;
  onUpdated?: (url: string | null) => void;
}

/**
 * Profile picture with an inline edit affordance. Optimistically previews the chosen file
 * so the new image appears immediately, then reconciles with the server response.
 */
export function AvatarUpload({
  employeeId,
  currentUrl,
  firstName = '',
  lastName = '',
  editable = false,
  size = 96,
  onUpdated,
}: AvatarUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState('');
  const { showToast } = useToast();
  const qc = useQueryClient();

  const initials =
    `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase().trim() || undefined;

  const save = useMutation({
    mutationFn: async (file: File | null) => {
      const url = file ? await uploadFile(file, { imagesOnly: true }) : '';
      await updateEmployee(employeeId, { profilePictureUrl: url });
      return url || null;
    },
    onSuccess: (url) => {
      setPreview(null);
      setError('');
      showToast('success', url ? 'Profile picture updated' : 'Profile picture removed');
      void qc.invalidateQueries({ queryKey: ['employee', employeeId] });
      void qc.invalidateQueries({ queryKey: ['employees'] });
      void qc.invalidateQueries({ queryKey: ['auth-me'] });
      onUpdated?.(url);
    },
    onError: (err) => {
      setPreview(null);
      const message = getApiError(err).message;
      setError(message);
      showToast('error', message);
    },
  });

  function onPick(file?: File) {
    if (!file) return;
    const problem = validateImage(file);
    if (problem) {
      setError(problem);
      return;
    }
    setError('');
    setPreview(URL.createObjectURL(file)); // immediate feedback
    save.mutate(file);
  }

  const shown = preview ?? currentUrl ?? null;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <div
          className="flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-[var(--accent-soft)] text-xl font-semibold text-[var(--accent)] ring-2 ring-white"
          style={{ fontSize: Math.max(14, size / 4) }}
        >
          {shown ? (
            <img src={shown} alt="" className="h-full w-full object-cover" />
          ) : initials ? (
            initials
          ) : (
            <UserIcon size={Math.round(size / 2.5)} />
          )}
        </div>

        {save.isPending && (
          <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40">
            <svg className="h-5 w-5 animate-spin text-white" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" opacity="0.3" />
              <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
            </svg>
          </div>
        )}

        {editable && !save.isPending && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            aria-label={shown ? 'Change profile picture' : 'Upload profile picture'}
            className="absolute -bottom-0.5 -right-0.5 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border-2 border-white bg-[var(--accent)] text-white shadow-md transition hover:bg-[var(--accent-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2"
          >
            <CameraGlyph />
          </button>
        )}
      </div>

      {editable && (
        <>
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            className="sr-only"
            onChange={(e) => {
              onPick(e.target.files?.[0]);
              e.target.value = '';
            }}
          />
          {shown && !save.isPending && (
            <button
              type="button"
              onClick={() => save.mutate(null)}
              className="inline-flex cursor-pointer items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium text-[var(--muted)] hover:text-[var(--danger)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
            >
              <CloseIcon size={12} />
              Remove photo
            </button>
          )}
          {error && (
            <p role="alert" className="max-w-[200px] text-center text-xs text-[var(--danger)]">
              {error}
            </p>
          )}
        </>
      )}
    </div>
  );
}

function CameraGlyph() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 8.5h3l1.4-2h7.2L17 8.5h3v10H4z" />
      <circle cx="12" cy="13" r="3.2" />
    </svg>
  );
}
