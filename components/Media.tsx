"use client";

import { Download, ExternalLink } from "lucide-react";

export const isVideoUrl = (u: string, kind?: string) =>
  kind === "video" || /^data:video\//.test(u) || /\.(mp4|webm|mov|m4v)(\?|$)/i.test(u);

export function Media({ url, kind, className = "" }: { url: string; kind?: string; className?: string }) {
  if (isVideoUrl(url, kind)) {
    return <video src={url} controls autoPlay loop muted playsInline className={`h-full w-full object-contain ${className}`} />;
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt="" className={`h-full w-full object-contain ${className}`} />;
}

export function MediaActions({ url }: { url: string }) {
  return (
    <div className="flex gap-2">
      <a href={url} target="_blank" rel="noreferrer" className="btn">
        <ExternalLink size={14} /> Open
      </a>
      <a href={url} download className="btn">
        <Download size={14} /> Download
      </a>
    </div>
  );
}
