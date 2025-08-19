import { useState } from "react";

export default function CopyButton({ text, label = "Copy" }) {
  const [copied, setCopied] = useState(false);

  const doCopy = async () => {
    try {
      await navigator.clipboard.writeText(String(text || ""));
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {}
  };

  return (
    <button
      onClick={doCopy}
      className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs
                 bg-white text-gray-900 hover:bg-gray-100
                 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700 dark:hover:bg-gray-700
                 focus:outline-none focus:ring-2 focus:ring-blue-400"
      title={String(text || "")}
    >
      {copied ? "Copied!" : label}
    </button>
  );
}
