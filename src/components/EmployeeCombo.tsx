import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useId,
  KeyboardEvent,
} from "react";
import type { Employee } from "../App";

function matchText(q: string, label: string) {
  return q
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((p) => label.toLowerCase().includes(p));
}

export default function EmployeeCombo({
  employees,
  onSelect,
}: {
  employees: Employee[];
  onSelect: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [highlight, setHighlight] = useState(0);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();

  const list = useMemo(
    () =>
      employees
        .filter((e) =>
          matchText(q, `${e.firstName} ${e.lastName} ${e.id}`)
        )
        .slice(0, 50),
    [q, employees]
  );

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!wrapperRef.current) return;
      if (!wrapperRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  useEffect(() => {
    if (highlight >= list.length) {
      setHighlight(Math.max(0, list.length - 1));
    }
  }, [list.length, highlight]);

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!open) {
        setOpen(true);
        setHighlight(0);
      } else {
        setHighlight((h) => Math.min(h + 1, list.length - 1));
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (!open) {
        setOpen(true);
        setHighlight(list.length - 1);
      } else {
        setHighlight((h) => Math.max(h - 1, 0));
      }
    } else if (e.key === "Enter") {
      if (!open) return;
      e.preventDefault();
      const item = list[highlight];
      if (item) {
        onSelect(item.id);
        setQ(`${item.firstName} ${item.lastName} (${item.id})`);
        setOpen(false);
        inputRef.current?.focus();
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      inputRef.current?.focus();
    }
  };

  return (
    <div className="dropdown" ref={wrapperRef}>
      <input
        ref={inputRef}
        role="combobox"
        aria-controls={`${listId}-listbox`}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-autocomplete="list"
        aria-activedescendant={
          open && list[highlight]
            ? `${listId}-option-${list[highlight].id}`
            : undefined
        }
        placeholder="Type name or ID…"
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
          setHighlight(0);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
      />
      {open && (
        <div className="menu" role="listbox" id={`${listId}-listbox`}>
          {list.map((e, idx) => (
            <div
              key={e.id}
              role="option"
              id={`${listId}-option-${e.id}`}
              className={`item${idx === highlight ? " active" : ""}`}
              aria-selected={idx === highlight}
              onMouseDown={(ev) => {
                ev.preventDefault();
                onSelect(e.id);
                setQ(`${e.firstName} ${e.lastName} (${e.id})`);
                setOpen(false);
                inputRef.current?.focus();
              }}
            >
              {e.firstName} {e.lastName}{" "}
              <span className="pill" style={{ marginLeft: 6 }}>
                {e.classification} {e.status}
              </span>
            </div>
          ))}
          {!list.length && (
            <div className="item" style={{ opacity: 0.7 }}>
              No matches
            </div>
          )}
        </div>
      )}
    </div>
  );
}

