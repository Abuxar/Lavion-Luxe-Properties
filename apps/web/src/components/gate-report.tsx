import type { GateResult } from "@lavion/schema";

/**
 * Renders why a listing is held. Blocking and warning are visually distinct
 * because they mean different things: blocking is "advertising this would be
 * unlawful", warning is "this is a compliance gap we should chase".
 */
export function GateReport({ gates }: { gates: GateResult }) {
  const blocking = gates.failures.filter((f) => f.severity === "blocking");
  const warnings = gates.failures.filter((f) => f.severity === "warning");

  if (!gates.failures.length) {
    return (
      <div className="border border-line bg-surface p-5">
        <p className="label !text-brass">Clear to publish</p>
        <p className="mt-2 text-sm text-ink-soft">
          All required disclosures for this market are present.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {blocking.length > 0 && (
        <div className="border border-signal/40 bg-signal-wash p-5">
          <p className="label" style={{ color: "var(--color-signal)" }}>
            Blocked · cannot publish
          </p>
          <ul className="mt-4 flex flex-col gap-4">
            {blocking.map((f) => (
              <li key={f.code}>
                <p className="text-sm font-medium">{f.message}</p>
                <p className="label mt-1.5 !normal-case !tracking-normal">
                  <code className="text-[11px]">{f.field}</code> · {f.authority}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {warnings.length > 0 && (
        <div className="border border-line bg-surface p-5">
          <p className="label">Compliance gaps · publishable</p>
          <ul className="mt-4 flex flex-col gap-3">
            {warnings.map((f) => (
              <li key={f.code}>
                <p className="text-sm text-ink-soft">{f.message}</p>
                <p className="label mt-1 !normal-case !tracking-normal">
                  <code className="text-[11px]">{f.field}</code>
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export function GateChip({ gates }: { gates: GateResult }) {
  const blocking = gates.failures.filter((f) => f.severity === "blocking").length;
  const warnings = gates.failures.filter((f) => f.severity === "warning").length;

  if (blocking > 0) {
    return (
      <span
        className="label border px-2 py-1"
        style={{
          color: "var(--color-signal)",
          borderColor: "color-mix(in srgb, var(--color-signal) 40%, transparent)",
          background: "var(--color-signal-wash)",
        }}
      >
        {blocking} blocking
      </span>
    );
  }
  if (warnings > 0) {
    return <span className="label border border-line px-2 py-1">{warnings} gap</span>;
  }
  return (
    <span className="label border border-brass/40 bg-brass-wash px-2 py-1 !text-brass">Ready</span>
  );
}
