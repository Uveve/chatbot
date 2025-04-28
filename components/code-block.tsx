'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { CopyIcon } from './icons';
import { toast } from 'sonner';

interface CodeBlockProps {
  node: any;
  inline: boolean;
  className: string;
  children: any;
}

export function CodeBlock({
  node,
  inline,
  className,
  children,
  ...props
}: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const language = className?.replace('language-', '') || 'text';

  const onCopy = async () => {
    await navigator.clipboard.writeText(children);
    setCopied(true);
    toast.success('Kode berhasil disalin!');
    setTimeout(() => setCopied(false), 2000);
  };

  if (!inline) {
    return (
      <div className="not-prose flex flex-col">
        <div className="flex items-center justify-between px-4 py-2 bg-zinc-800 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-t-xl">
          <span className="text-xs text-zinc-400">{language}</span>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 hover:bg-zinc-700"
            onClick={onCopy}
          >
            <CopyIcon size={16} />
          </Button>
        </div>
        <pre
          {...props}
          className="text-sm w-full overflow-x-auto dark:bg-zinc-900 p-4 border border-zinc-200 dark:border-zinc-700 rounded-b-xl dark:text-zinc-50 text-zinc-900 font-mono"
        >
          <code className="whitespace-pre-wrap break-words">{children}</code>
        </pre>
      </div>
    );
  } else {
    return (
      <code
        className={`${className} text-sm bg-zinc-100 dark:bg-zinc-800 py-0.5 px-1 rounded-md`}
        {...props}
      >
        {children}
      </code>
    );
  }
}
