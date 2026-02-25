import { useEffect, useMemo, useRef, useState } from "react";
import { InspectorSection } from "../inspector-section";
import { CopyButton } from "../../shared";
import {
  getStatebagLabel,
  isHiddenByDefault,
  isComplexValue,
  STATUS_CHIP_KEYS,
} from "@/lib/statebag-labels";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// ============================================================================
// Statebag Section — flat property list with tiered ordering
// ============================================================================

interface StatebagSectionProps {
  statebag: Record<string, string>;
}

const LS_KEY = "traceflow.statebag.showRawKeys";

function useShowRawKeys() {
  const [raw, setRaw] = useState(() => {
    try {
      return localStorage.getItem(LS_KEY) === "true";
    } catch {
      return false;
    }
  });
  const toggle = () =>
    setRaw((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(LS_KEY, String(next));
      } catch {
        /* noop */
      }
      return next;
    });
  return [raw, toggle] as const;
}

/** Try to pretty-print JSON; falls back to raw string. */
function formatComplex(value: string): string {
  try {
    return JSON.stringify(JSON.parse(value), null, 2);
  } catch {
    return value;
  }
}

// ── Row sub-components ───────────────────────────────────────────────────────

function ComplexRow({ value }: { value: string }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="py-1">
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="text-xs font-mono truncate text-left text-accent-foreground hover:underline cursor-pointer"
      >
        {expanded ? "▾ collapse" : `${value.slice(0, 48)}…`}
      </button>
      {expanded && (
        <pre className="text-xs font-mono whitespace-pre-wrap mt-1 pl-1 border-l-2 border-muted">
          {formatComplex(value)}
        </pre>
      )}
    </div>
  );
}

function SimpleRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="group grid grid-cols-[minmax(120px,auto)_1fr] gap-x-3 items-center py-1">
      <span className="text-xs font-mono text-muted-foreground flex items-center gap-1">
        {label}
        <CopyButton value={value} label={label} />
      </span>
      <span className="text-xs font-mono truncate max-w-[60%]">
        {value || "(empty)"}
      </span>
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

export function StatebagSection({ statebag }: StatebagSectionProps) {
  const [showRaw, toggleRaw] = useShowRawKeys();
  const [showHidden, setShowHidden] = useState(false);
  const prevRef = useRef(statebag);

  useEffect(() => {
    if (prevRef.current !== statebag) {
      setShowHidden(false);
      prevRef.current = statebag;
    }
  }, [statebag]);

  const { chips, visible, hidden } = useMemo(() => {
    const keys = Object.keys(statebag);
    const chipSet = new Set(STATUS_CHIP_KEYS);
    const c: string[] = [];
    const v: string[] = [];
    const h: string[] = [];

    for (const k of keys) {
      if (chipSet.has(k)) c.push(k);
      else if (isHiddenByDefault(k)) h.push(k);
      else v.push(k);
    }

    c.sort((a, b) => STATUS_CHIP_KEYS.indexOf(a) - STATUS_CHIP_KEYS.indexOf(b));
    v.sort((a, b) => a.localeCompare(b));
    h.sort((a, b) => a.localeCompare(b));

    return { chips: c, visible: v, hidden: h };
  }, [statebag]);

  const keys = Object.keys(statebag);
  if (keys.length === 0) {
    return (
      <InspectorSection title="Statebag">
        <p className="text-xs text-muted-foreground italic">
          No statebag entries at this step
        </p>
      </InspectorSection>
    );
  }

  const displayLabel = (key: string) => (showRaw ? key : getStatebagLabel(key));

  const renderTableRow = (key: string) => {
    return (
      <TableRow key={key} className="group">
        <TableCell className="text-xs font-mono text-muted-foreground p-1">
          {displayLabel(key)}
        </TableCell>
        <TableCell className="p-1">
          {isComplexValue(key) ? (
            <ComplexRow value={statebag[key]} />
          ) : (
            <span className="text-xs font-mono truncate max-w-[60%]">
              {statebag[key] || "(empty)"}
            </span>
          )}
        </TableCell>
        <TableCell className="p-1">
          <CopyButton value={statebag[key]} className="opacity-0 group-hover:opacity-100 transition-opacity" />
        </TableCell>
      </TableRow>
    );
  };

  const allVisible = [...chips, ...visible];

  return (
    <InspectorSection title="Statebag" count={keys.length}>
      <label className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={showRaw}
          onChange={toggleRaw}
          className="accent-primary size-3"
        />
        Show raw keys
      </label>

      <Table className="w-full text-xs">
        <TableHeader>
          <tr>
            <TableHead className="text-left font-semibold w-[30%] px-0">
              Key
            </TableHead>
            <TableHead className="text-left font-semibold w-[70%] px-0">
              Value
            </TableHead>
          </tr>
        </TableHeader>
        <TableBody>{allVisible.map(renderTableRow)}</TableBody>
      </Table>

      {hidden.length > 0 && (
        <>
          <button
            type="button"
            onClick={() => setShowHidden((s) => !s)}
            className="text-xs text-muted-foreground hover:text-foreground mt-2 cursor-pointer"
          >
            {showHidden ? "▾ Hide" : "▸ Show"} {hidden.length} hidden{" "}
            {hidden.length === 1 ? "entry" : "entries"} (internal engine keys)
          </button>
          {showHidden && (
            <Table className="w-full text-xs mt-1">
              <thead>
                <tr>
                  <th className="w-[30%]" />
                  <th className="w-[70%]" />
                </tr>
              </thead>
              <TableBody>{hidden.map(renderTableRow)}</TableBody>
            </Table>
          )}
        </>
      )}
    </InspectorSection>
  );
}
