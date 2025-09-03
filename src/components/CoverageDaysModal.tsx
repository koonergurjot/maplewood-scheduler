import React, { useState, useEffect, useRef } from "react";
import { getDatesInRange, applyPreset, formatCoverageSummary, getDayOfWeekShort } from "../utils/date";
import { formatDateLong } from "../lib/dates";

interface CoverageDaysModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (selectedDates: string[]) => void;
  startDate: string;
  endDate: string;
  initialSelection?: string[];
  title?: string;
}

export default function CoverageDaysModal({
  open,
  onClose,
  onSave,
  startDate,
  endDate,
  initialSelection = [],
  title = "Select Coverage Days"
}: CoverageDaysModalProps) {
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const modalRef = useRef<HTMLDivElement>(null);
  const firstFocusableRef = useRef<HTMLButtonElement>(null);

  const allDates = getDatesInRange(startDate, endDate);
  const isMultiDay = allDates.length > 1;

  // Initialize selection when modal opens
  useEffect(() => {
    if (open) {
      setSelectedDates(initialSelection.length > 0 ? [...initialSelection] : [...allDates]);
    }
  }, [open, initialSelection, allDates]);

  // Focus management for accessibility
  useEffect(() => {
    if (open && firstFocusableRef.current) {
      firstFocusableRef.current.focus();
    }
  }, [open]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  const toggleDate = (date: string) => {
    setSelectedDates(prev => 
      prev.includes(date)
        ? prev.filter(d => d !== date)
        : [...prev, date].sort()
    );
  };

  const handlePreset = (pattern: "all" | "weekdays" | "4-on-2-off" | "5-on-2-off" | "clear") => {
    if (pattern === "clear") {
      setSelectedDates([]);
    } else {
      const presetDates = applyPreset(pattern, startDate, endDate);
      setSelectedDates(presetDates);
    }
  };

  const handleSave = () => {
    onSave([...selectedDates]);
    onClose();
  };

  const summaryText = formatCoverageSummary(selectedDates, allDates);

  if (!open) return null;

  return (
    <div
      className="modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="coverage-modal-title"
      ref={modalRef}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000
      }}
    >
      <div
        style={{
          backgroundColor: "white",
          borderRadius: 8,
          padding: 24,
          maxWidth: 600,
          width: "90%",
          maxHeight: "80vh",
          overflow: "auto",
          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)"
        }}
      >
        <h2 id="coverage-modal-title" style={{ marginTop: 0, marginBottom: 16 }}>
          {title}
        </h2>

        <div style={{ marginBottom: 16 }}>
          <p>
            <strong>Date Range:</strong> {formatDateLong(startDate)} to {formatDateLong(endDate)}
            {isMultiDay && (
              <span style={{ marginLeft: 8, fontWeight: "normal" }}>
                ({allDates.length} days)
              </span>
            )}
          </p>
        </div>

        {isMultiDay && (
          <div style={{ marginBottom: 20 }}>
            <h3 style={{ marginBottom: 12 }}>Quick Presets</h3>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button
                ref={firstFocusableRef}
                className="btn btn-sm"
                onClick={() => handlePreset("all")}
                aria-label="Select all days"
              >
                All days
              </button>
              <button
                className="btn btn-sm"
                onClick={() => handlePreset("weekdays")}
                aria-label="Select weekdays only"
              >
                Weekdays only
              </button>
              <button
                className="btn btn-sm"
                onClick={() => handlePreset("4-on-2-off")}
                aria-label="Apply 4 days on, 2 days off pattern"
              >
                4-on/2-off pattern
              </button>
              <button
                className="btn btn-sm"
                onClick={() => handlePreset("5-on-2-off")}
                aria-label="Apply 5 days on, 2 days off pattern"
              >
                5-on/2-off pattern
              </button>
              <button
                className="btn btn-sm"
                onClick={() => handlePreset("clear")}
                aria-label="Clear all selections"
              >
                Clear selection
              </button>
            </div>
          </div>
        )}

        <div style={{ marginBottom: 20 }}>
          <h3 style={{ marginBottom: 12 }}>Select Days</h3>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
              gap: 8,
              maxHeight: 300,
              overflowY: "auto",
              padding: 8,
              border: "1px solid #e5e5e5",
              borderRadius: 4
            }}
          >
            {allDates.map(date => (
              <label
                key={date}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: 8,
                  cursor: "pointer",
                  borderRadius: 4,
                  backgroundColor: selectedDates.includes(date) ? "#f0f9ff" : "transparent",
                  border: selectedDates.includes(date) ? "1px solid #0ea5e9" : "1px solid transparent"
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    toggleDate(date);
                  }
                }}
              >
                <input
                  type="checkbox"
                  checked={selectedDates.includes(date)}
                  onChange={() => toggleDate(date)}
                  aria-describedby={`date-${date}-desc`}
                />
                <span>
                  <strong>{getDayOfWeekShort(date)}</strong>
                  <br />
                  <span id={`date-${date}-desc`} style={{ fontSize: "0.9em", color: "#666" }}>
                    {formatDateLong(date)}
                  </span>
                </span>
              </label>
            ))}
          </div>
        </div>

        <div
          style={{
            padding: 12,
            backgroundColor: "#f8f9fa",
            borderRadius: 4,
            marginBottom: 20,
            textAlign: "center"
          }}
          aria-live="polite"
        >
          <strong>Coverage Summary:</strong> {summaryText}
        </div>

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button
            className="btn"
            onClick={onClose}
            aria-label="Cancel and close dialog"
          >
            Cancel
          </button>
          <button
            className="btn"
            onClick={handleSave}
            style={{
              backgroundColor: "#0ea5e9",
              color: "white",
              border: "1px solid #0ea5e9"
            }}
            aria-label={`Save coverage selection: ${summaryText}`}
          >
            Save Selection
          </button>
        </div>
      </div>
    </div>
  );
}