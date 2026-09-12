interface Props {
  code: string;
  onDismiss: () => void;
}

/**
 * Shown once, immediately after joining, and dismissed with one tap.
 *
 * The code is the only way back to a ticket from another device, and a
 * customer who skips it has to ask the shop to re-link them by name. Worth one
 * prompt; not worth nagging.
 */
export function ResumeCodePrompt({ code, onDismiss }: Props) {
  return (
    <div className="dialog" role="dialog" aria-modal="true" aria-label="Your resume code">
      <div className="dialog-body">
        <h2>You&rsquo;re in the queue</h2>
        <p>
          Keep this code. It gets your place back if you lose your phone or
          switch to another one.
        </p>
        <p className="code big">{code}</p>
        <p className="hint">
          Without it, you would have to ask the shop to find you by name.
        </p>
        <button type="button" onClick={onDismiss}>
          Got it
        </button>
      </div>
    </div>
  );
}
