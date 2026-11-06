"use client";

import { AudioLines, Download, ExternalLink } from "lucide-react";

export const isVideoUrl = (u: string, kind?: string) =>
  kind === "video" || /^data:video\//.test(u) || /\.(mp4|webm|mov|m4v)(\?|$)/i.test(u);

export const isAudioUrl = (u: string, kind?: string) =>
  kind === "audio" || /^data:audio\//.test(u) || /\.(mp3|wav|ogg|m4a|aac|flac)(\?|$)/i.test(u);

export function Media({ url, kind, className = "" }: { url: string; kind?: string; className?: string }) {
  if (isAudioUrl(url, kind)) {
    return (
      <div className={`flex h-full w-full flex-col items-center justify-center gap-3 bg-gradient-to-br from-[#1f2937] to-[#0f172a] p-3 ${className}`}>
        <AudioLines size={28} className="text-[#a5b4fc]" />
        <audio src={url} controls preload="metadata" className="w-full max-w-[320px]" />
      </div>
    );
  }
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
