"use client";

import { useRef, useState } from "react";
import { Dices, Loader2, Upload, X } from "lucide-react";
import type { Field } from "@/lib/catalog";
import { upload } from "@/lib/client";

type Values = Record<string, unknown>;

export function initialValues(fields: Field[]): Values {
  const v: Values = {};
  for (const f of fields) v[f.name] = f.default ?? (f.type === "images" ? [] : "");
  return v;
}

function UploadButton({ onUrl }: { onUrl: (u: string) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  return (
    <>
      <input
        ref={ref}
        type="file"
        accept="image/*,video/*"
        className="hidden"
        onChange={async (e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (!f) return;
          setBusy(true);
          setErr("");
          try {
            onUrl(await upload(f));
          } catch (x) {
            setErr(x instanceof Error ? x.message : "Upload failed");
          } finally {
            setBusy(false);
          }
        }}
      />
      <button type="button" className="btn shrink-0" onClick={() => ref.current?.click()} disabled={busy}>
        {busy ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />} Upload
      </button>
      {err && <span className="text-xs text-[#ff9592]">{err}</span>}
    </>
  );
}

function Thumb({ url, onRemove }: { url: string; onRemove: () => void }) {
  return (
    <div className="relative h-16 w-16 overflow-hidden rounded-lg border border-line bg-panel-2">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt="" className="h-full w-full object-cover" />
      <button type="button" onClick={onRemove} className="absolute right-0.5 top-0.5 rounded bg-black/70 p-0.5" aria-label="Remove">
        <X size={12} />
      </button>
    </div>
  );
}

export function FieldInput({ field: f, value, onChange }: { field: Field; value: unknown; onChange: (v: unknown) => void }) {
  const [draft, setDraft] = useState("");
  const label = (
    <label className="mb-1.5 flex items-center justify-between text-sm">
      <span className="font-medium">
        {f.label}
        {f.required && <span className="text-[#ff9592]"> *</span>}
      </span>
      {f.help && <span className="text-xs text-dim">{f.help}</span>}
    </label>
  );

  switch (f.type) {
    case "textarea":
      return (
        <div>
          {label}
          <textarea className="input min-h-[110px] resize-y" value={String(value ?? "")} onChange={(e) => onChange(e.target.value)} placeholder={f.name === "prompt" ? "Describe the image or video…" : ""} />
        </div>
      );
    case "select":
      return (
        <div>
          {label}
          <select className="input" value={String(value ?? "")} onChange={(e) => onChange(e.target.value)}>
            {f.options?.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </div>
      );
    case "boolean":
      return (
        <label className="flex cursor-pointer items-center justify-between rounded-lg border border-line px-3 py-2.5 text-sm">
          <span className="font-medium">{f.label}</span>
          <input type="checkbox" checked={value === true || value === "true"} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 accent-white" />
        </label>
      );
    case "number":
      return (
        <div>
          {label}
          <div className="flex items-center gap-3">
            {f.min !== undefined && f.max !== undefined && (
              <input type="range" min={f.min} max={f.max} step={f.step ?? 1} value={Number(value ?? f.default ?? 0)} onChange={(e) => onChange(Number(e.target.value))} className="flex-1 accent-white" />
            )}
            <input type="number" className="input w-28" value={String(value ?? "")} min={f.min} max={f.max} step={f.step ?? 1} onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))} />
          </div>
        </div>
      );
    case "seed":
      return (
        <div>
          {label}
          <div className="flex gap-2">
            <input type="number" className="input" value={String(value ?? -1)} onChange={(e) => onChange(Number(e.target.value))} />
            <button type="button" className="btn" onClick={() => onChange(Math.floor(Math.random() * 2 ** 31))} title="Random seed">
              <Dices size={14} />
            </button>
          </div>
        </div>
      );
    case "image":
      return (
        <div>
          {label}
          <div className="flex flex-wrap items-center gap-2">
            <input className="input min-w-0 flex-1" value={String(value ?? "")} onChange={(e) => onChange(e.target.value)} placeholder="https://… image URL" />
            <UploadButton onUrl={onChange} />
          </div>
          {typeof value === "string" && value && (
            <div className="mt-2">
              <Thumb url={value} onRemove={() => onChange("")} />
            </div>
          )}
        </div>
      );
    case "images": {
      const list = Array.isArray(value) ? (value as string[]) : [];
      const add = (u: string) => u && onChange([...list, u].slice(0, f.max ?? 14));
      return (
        <div>
          {label}
          <div className="flex flex-wrap items-center gap-2">
            <input
              className="input min-w-0 flex-1"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  add(draft.trim());
                  setDraft("");
                }
              }}
              onBlur={() => {
                if (draft.trim()) {
                  add(draft.trim());
                  setDraft("");
                }
              }}
              placeholder="Paste an image URL and press Enter"
            />
            <UploadButton onUrl={add} />
          </div>
          {list.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {list.map((u, i) => (
                <Thumb key={i} url={u} onRemove={() => onChange(list.filter((_, j) => j !== i))} />
              ))}
            </div>
          )}
        </div>
      );
    }
    default:
      return (
        <div>
          {label}
          <input className="input" value={String(value ?? "")} onChange={(e) => onChange(e.target.value)} />
        </div>
      );
  }
}
