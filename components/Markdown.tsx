"use client";

import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

// Agent replies are Markdown. Raw HTML is never rendered (react-markdown escapes it by default).
const components: Components = {
  p: ({ children }) => <p className="my-2 first:mt-0 last:mb-0">{children}</p>,
  strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  h1: ({ children }) => <h3 className="mb-2 mt-4 text-lg font-semibold text-white first:mt-0">{children}</h3>,
  h2: ({ children }) => <h3 className="mb-2 mt-4 text-base font-semibold text-white first:mt-0">{children}</h3>,
  h3: ({ children }) => <h4 className="mb-1.5 mt-3 font-semibold text-white first:mt-0">{children}</h4>,
  ul: ({ children }) => <ul className="my-2 list-disc space-y-1 pl-5 marker:text-dim">{children}</ul>,
  ol: ({ children }) => <ol className="my-2 list-decimal space-y-1 pl-5 marker:text-dim">{children}</ol>,
  li: ({ children }) => <li className="pl-0.5">{children}</li>,
  a: ({ href, children }) => (
    <a href={href} target="_blank" rel="noreferrer noopener" className="text-white underline decoration-line-2 underline-offset-2 hover:decoration-white">
      {children}
    </a>
  ),
  blockquote: ({ children }) => <blockquote className="my-2 border-l-2 border-line-2 pl-3 text-muted">{children}</blockquote>,
  hr: () => <hr className="my-3 border-line" />,
  code: ({ className, children }) =>
    className ? (
      <code className={`${className} font-mono text-[12.5px]`}>{children}</code>
    ) : (
      <code className="rounded bg-panel-2 px-1.5 py-0.5 font-mono text-[12.5px] text-zinc-200">{children}</code>
    ),
  pre: ({ children }) => <pre className="my-2 overflow-x-auto rounded-lg border border-line bg-[#0c0c0e] p-3 text-[12.5px] leading-relaxed">{children}</pre>,
  table: ({ children }) => (
    <div className="my-2 overflow-x-auto">
      <table className="w-full border-collapse text-[13px]">{children}</table>
    </div>
  ),
  th: ({ children }) => <th className="border-b border-line-2 px-2.5 py-1.5 text-left font-semibold text-white">{children}</th>,
  td: ({ children }) => <td className="border-b border-line px-2.5 py-1.5 align-top">{children}</td>,
  img: () => null, // media is shown by the chat UI, not inline
};

export function Markdown({ children }: { children: string }) {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={components} skipHtml>
      {children}
    </ReactMarkdown>
  );
}
