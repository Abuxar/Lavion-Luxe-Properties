/**
 * A full-viewport hero gives no hint that inventory follows. This is the cue —
 * CSS only, no JS, and it disappears under prefers-reduced-motion because a
 * looping nudge is exactly what that setting exists to stop.
 */
export function ScrollCue({ label = "See what is available" }: { label?: string }) {
  return (
    /*
      The backdrop fades to var(--color-paper) at its foot, so this sits on the
      page background rather than on the photograph. It needs the theme-aware
      ink, not the fixed light grey the hero uses higher up — that was a
      leftover from when only the dark theme existed, and in the light theme it
      put pale grey on a pale background.
    */
    <a
      href="#overview"
      className="group absolute inset-x-0 bottom-6 z-10 mx-auto flex w-fit flex-col items-center gap-2 text-ink-faint transition-colors hover:text-brass"
    >
      <span className="label !text-[11px] !text-current">{label}</span>
      <span
        aria-hidden
        className="block h-8 w-px bg-current opacity-50 motion-safe:animate-[cue_2.4s_ease-in-out_infinite]"
      />
    </a>
  );
}
