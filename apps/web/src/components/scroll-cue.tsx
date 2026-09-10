/**
 * A full-viewport hero gives no hint that inventory follows. This is the cue —
 * CSS only, no JS, and it disappears under prefers-reduced-motion because a
 * looping nudge is exactly what that setting exists to stop.
 */
export function ScrollCue({ label = "See what is available" }: { label?: string }) {
  return (
    <a
      href="#overview"
      className="group absolute inset-x-0 bottom-6 z-10 mx-auto flex w-fit flex-col items-center gap-2 text-[#c7cfcb] transition-colors hover:text-brass"
    >
      <span className="label !text-[11px]">{label}</span>
      <span
        aria-hidden
        className="block h-8 w-px bg-current opacity-50 motion-safe:animate-[cue_2.4s_ease-in-out_infinite]"
      />
    </a>
  );
}
