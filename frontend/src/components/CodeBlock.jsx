import React, { useState } from 'react';
import { Check, Copy } from 'lucide-react';

export const CodeBlock = ({ code, language = 'javascript' }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  // Basic custom syntax highlighter function
  const highlightToken = (token) => {
    // Comments
    if (token.startsWith('//') || token.startsWith('#') || token.startsWith('/*')) {
      return <span className="text-neutral-500 italic dark:text-neutral-450">{token}</span>;
    }

    // String literals
    if ((token.startsWith('"') && token.endsWith('"')) || 
        (token.startsWith("'") && token.endsWith("'")) ||
        (token.startsWith('`') && token.endsWith('`'))) {
      return <span className="text-emerald-500 dark:text-emerald-400">{token}</span>;
    }

    // Keywords
    const keywords = [
      'const', 'let', 'var', 'function', 'return', 'import', 'export', 'default',
      'from', 'class', 'extends', 'super', 'new', 'this', 'def', 'import', 'as',
      'if', 'else', 'for', 'while', 'do', 'try', 'catch', 'finally', 'throw',
      'async', 'await', 'nil', 'null', 'true', 'false', 'boolean', 'string', 'number',
      'void', 'interface', 'implements', 'public', 'private', 'protected', 'package', 'static'
    ];
    
    const word = token.replace(/[^\w]/g, '');
    if (keywords.includes(word)) {
      return <span className="text-rose-500 dark:text-rose-400 font-semibold">{token}</span>;
    }

    // Functions calling/definition (e.g. hello() or functionName)
    if (/^[a-zA-Z_]\w*(?=\()/.test(token)) {
      return <span className="text-blue-600 dark:text-sky-400">{token}</span>;
    }

    // Numbers
    if (/^\d+$/.test(word)) {
      return <span className="text-amber-600 dark:text-amber-400">{token}</span>;
    }

    return <span>{token}</span>;
  };

  // Simple tokenizing by scanning for string matches, word boundaries, operators, etc.
  const parseCodeLine = (line) => {
    if (!line) return ' ';
    
    // Check if whole line is comment
    const trimmed = line.trim();
    if (trimmed.startsWith('//') || trimmed.startsWith('#') || trimmed.startsWith('/*')) {
      return highlightToken(line);
    }

    // Regexp to split string literals, words, comments, etc.
    const regex = /(\/\/.*|#.*|"(?:\\"|[^"])*"|'(?:\\'|[^'])*'|`(?:\\`|[^`])*`|\b\w+\b|[^\w\s])/g;
    const tokens = line.split(regex);

    return tokens.map((token, idx) => {
      if (!token) return null;
      return <React.Fragment key={idx}>{highlightToken(token)}</React.Fragment>;
    });
  };

  const lines = code.trim().split('\n');

  return (
    <div className="relative my-4 overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 shadow-lg">
      {/* Code Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-950/80 backdrop-blur-sm text-xs font-mono text-neutral-500 dark:text-neutral-400 select-none">
        <span>{language.toLowerCase()}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2 py-1 rounded-md text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-200 dark:hover:bg-neutral-800/60 transition-all active:scale-95"
          title="Copy code"
        >
          {copied ? (
            <>
              <Check size={14} className="text-emerald-500" />
              <span className="text-emerald-500 font-medium">Copied!</span>
            </>
          ) : (
            <>
              <Copy size={14} />
              <span>Copy code</span>
            </>
          )}
        </button>
      </div>

      {/* Code Area */}
      <div className="overflow-x-auto custom-scrollbar font-mono text-sm leading-relaxed p-4 text-neutral-800 dark:text-neutral-200 bg-neutral-50 dark:bg-neutral-900/40">
        <table className="border-collapse w-full">
          <tbody>
            {lines.map((line, index) => (
              <tr key={index} className="hover:bg-neutral-200/30 dark:hover:bg-neutral-800/20">
                <td className="w-8 pr-4 text-right text-xs text-neutral-400 dark:text-neutral-600 select-none font-mono border-r border-neutral-200 dark:border-neutral-800/50">
                  {index + 1}
                </td>
                <td className="pl-4 whitespace-pre font-mono">
                  {parseCodeLine(line)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
