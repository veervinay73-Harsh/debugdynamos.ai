import React, { useState } from 'react';
import { ThumbsUp, ThumbsDown, Copy, Check, RotateCcw, Share2, Sparkles, User, Edit2, X } from 'lucide-react';
import { CodeBlock } from './CodeBlock';
import { Logo } from './Logo';
import { auth, db } from '../firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { AssistantIndicator } from './AssistantIndicator';

export const MessageItem = ({ message, isStreaming = false, onRegenerate, dbChatId, onEditUser, onEditAi }) => {
  const [liked, setLiked] = useState(message.liked || false);
  const [disliked, setDisliked] = useState(message.disliked || false);
  const [copied, setCopied] = useState(false);
  
  // Edit state
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(message.content);

  const isUser = message.role === 'user';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy message:', err);
    }
  };

  const handleLike = async () => {
    const nextLiked = !liked;
    setLiked(nextLiked);
    if (disliked) setDisliked(false);

    if (!auth.currentUser || !dbChatId) return;

    try {
      const msgRef = doc(db, 'users', auth.currentUser.uid, 'conversations', dbChatId, 'messages', message.id);
      await updateDoc(msgRef, {
        liked: nextLiked,
        disliked: false
      });
    } catch (err) {
      console.error('Failed to submit like feedback to Firestore:', err);
    }
  };

  const handleDislike = async () => {
    const nextDisliked = !disliked;
    setDisliked(nextDisliked);
    if (liked) setLiked(false);

    if (!auth.currentUser || !dbChatId) return;

    try {
      const msgRef = doc(db, 'users', auth.currentUser.uid, 'conversations', dbChatId, 'messages', message.id);
      await updateDoc(msgRef, {
        liked: false,
        disliked: nextDisliked
      });
    } catch (err) {
      console.error('Failed to submit dislike feedback to Firestore:', err);
    }
  };

  const handleSaveEdit = () => {
    if (editValue.trim() === message.content.trim()) {
      setIsEditing(false);
      return;
    }
    
    if (isUser && onEditUser) {
      onEditUser(message.id, editValue.trim());
    } else if (!isUser && onEditAi) {
      onEditAi(message.id, editValue.trim());
    }
    setIsEditing(false);
  };

  // Helper to parse markdown-like text
  const parseMarkdown = (text, isUser = false) => {
    if (!text) return null;

    const textColor = isUser ? 'text-white' : 'text-neutral-800 dark:text-neutral-200';
    const headingColor = isUser ? 'text-white' : 'text-neutral-900 dark:text-white';

    // Split text by code blocks ```
    const segments = text.split(/```/);
    
    return segments.map((segment, index) => {
      // If index is odd, it's a code block
      if (index % 2 === 1) {
        // Find language
        const firstLineEnd = segment.indexOf('\n');
        let language = 'javascript';
        let code = segment;
        
        if (firstLineEnd !== -1) {
          const possibleLang = segment.substring(0, firstLineEnd).trim();
          if (possibleLang) {
            language = possibleLang;
            code = segment.substring(firstLineEnd + 1);
          }
        }
        return <CodeBlock key={index} code={code} language={language} />;
      }

      // If even, parse paragraphs, lists, bold text, inline code
      const lines = segment.split('\n');
      let currentList = [];
      let listType = null; // 'ul' or 'ol'
      const parsedElements = [];

      const flushList = (key) => {
        if (currentList.length > 0) {
          if (listType === 'ul') {
            parsedElements.push(
              <ul key={`ul-${key}`} className={`list-disc pl-6 mb-4 space-y-1 ${textColor}`}>
                {currentList}
              </ul>
            );
          } else {
            parsedElements.push(
              <ol key={`ol-${key}`} className={`list-decimal pl-6 mb-4 space-y-1 ${textColor}`}>
                {currentList}
              </ol>
            );
          }
          currentList = [];
          listType = null;
        }
      };

      lines.forEach((line, lineIdx) => {
        const trimmed = line.trim();

        // Header parsing
        if (trimmed.startsWith('### ')) {
          flushList(lineIdx);
          parsedElements.push(
            <h4 key={lineIdx} className={`text-base font-semibold mt-4 mb-2 font-display ${headingColor}`}>
              {parseInlineMarkdown(trimmed.substring(4), isUser)}
            </h4>
          );
          return;
        }
        if (trimmed.startsWith('## ')) {
          flushList(lineIdx);
          parsedElements.push(
            <h3 key={lineIdx} className={`text-lg font-bold mt-5 mb-2 font-display ${headingColor}`}>
              {parseInlineMarkdown(trimmed.substring(3), isUser)}
            </h3>
          );
          return;
        }
        if (trimmed.startsWith('# ')) {
          flushList(lineIdx);
          parsedElements.push(
            <h2 key={lineIdx} className={`text-xl font-extrabold mt-6 mb-3 font-display ${headingColor}`}>
              {parseInlineMarkdown(trimmed.substring(2), isUser)}
            </h2>
          );
          return;
        }

        // Bullet lists
        if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          if (listType !== 'ul') {
            flushList(lineIdx);
            listType = 'ul';
          }
          currentList.push(
            <li key={`li-${lineIdx}`} className="text-sm md:text-base leading-relaxed">
              {parseInlineMarkdown(trimmed.substring(2), isUser)}
            </li>
          );
          return;
        }

        // Numbered lists
        const matchNum = trimmed.match(/^(\d+)\.\s(.*)/);
        if (matchNum) {
          if (listType !== 'ol') {
            flushList(lineIdx);
            listType = 'ol';
          }
          currentList.push(
            <li key={`li-${lineIdx}`} className="text-sm md:text-base leading-relaxed">
              {parseInlineMarkdown(matchNum[2], isUser)}
            </li>
          );
          return;
        }

        // Regular text or empty line
        if (trimmed === '') {
          flushList(lineIdx);
          // Add a spacing line
          parsedElements.push(<div key={`space-${lineIdx}`} className="h-2" />);
        } else {
          flushList(lineIdx);
          parsedElements.push(
            <p key={lineIdx} className={`text-sm md:text-base leading-relaxed mb-3 ${textColor}`}>
              {parseInlineMarkdown(line, isUser)}
            </p>
          );
        }
      });

      flushList(lines.length);
      return <React.Fragment key={index}>{parsedElements}</React.Fragment>;
    });
  };

  // Helper to parse bold (**bold**) and inline code (`code`)
  const parseInlineMarkdown = (text, isUser = false) => {
    if (!text) return '';

    // Regex split by bold "**" or inline code "`"
    const regex = /(\*\*.*?\*\*|`.*?`)/g;
    const tokens = text.split(regex);

    return tokens.map((token, idx) => {
      if (token.startsWith('**') && token.endsWith('**')) {
        return (
          <strong key={idx} className={`font-semibold ${isUser ? 'text-white' : 'text-neutral-950 dark:text-white'}`}>
            {token.slice(2, -2)}
          </strong>
        );
      }
      if (token.startsWith('`') && token.endsWith('`')) {
        return (
          <code key={idx} className={`px-1.5 py-0.5 rounded font-mono text-xs font-medium border ${
            isUser 
              ? 'bg-black/30 text-emerald-400 border-neutral-750' 
              : 'bg-neutral-100 dark:bg-neutral-850 text-emerald-600 dark:text-emerald-400 border-neutral-200 dark:border-neutral-800/80'
          }`}>
            {token.slice(1, -1)}
          </code>
        );
      }
      return token;
    });
  };

  return (
    <div className={`group flex w-full gap-4 py-6 px-4 md:px-6 rounded-2xl transition-all duration-300 hover:bg-neutral-50 dark:hover:bg-neutral-800/30 ${
      isUser ? 'justify-end' : 'justify-start'
    }`}>
      <div className={`flex max-w-[85%] md:max-w-[75%] gap-4 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
        
        {/* Avatar */}
        <div className="flex-shrink-0 w-8 h-8 select-none">
          {isUser ? (
            <div className="w-full h-full rounded-full flex items-center justify-center bg-gradient-to-tr from-neutral-700 to-neutral-550 text-white font-semibold text-sm shadow-md">
              <User size={16} />
            </div>
          ) : (
            <div className="w-full h-full rounded-full flex items-center justify-center bg-white dark:bg-neutral-950 shadow-md">
              <Logo size={20} />
            </div>
          )}
        </div>

        {/* Message body */}
        <div className="flex flex-col space-y-1 w-full min-w-0">
          {/* Header name & timestamp */}
          <div className={`flex items-center gap-2 mb-1.5 text-xs text-neutral-400 dark:text-neutral-500 ${isUser ? 'justify-end' : 'justify-start'}`}>
            {isStreaming && !isUser && (
               <AssistantIndicator />
            )}
            <span className="font-semibold text-neutral-700 dark:text-neutral-300 font-display">
              {isUser ? 'You' : 'DD'}
            </span>
            <span>•</span>
            <span>{message.timestamp}</span>
          </div>

          {/* Text Bubble */}
          <div className={`relative px-4 py-3 rounded-2xl shadow-sm leading-relaxed text-sm md:text-base ${
            isUser
              ? 'bg-gradient-to-br from-neutral-800 to-neutral-900 dark:from-neutral-850 dark:to-neutral-950 text-white'
              : 'bg-white dark:bg-neutral-900/60 text-neutral-850 dark:text-neutral-150'
          }`}>
            
            {/* Edit Icon for User messages */}
            {isUser && !isEditing && (
              <button 
                onClick={() => setIsEditing(true)}
                className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 p-1.5 rounded-lg bg-black/20 hover:bg-black/40 text-neutral-300 hover:text-white transition-all transform translate-y-1 group-hover:translate-y-0"
                title="Edit message"
              >
                <Edit2 size={14} />
              </button>
            )}

            {isEditing ? (
              <div className="flex flex-col gap-2 w-full min-w-[250px]">
                <textarea 
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className={`w-full bg-transparent p-2 rounded-lg resize-none focus:outline-none border ${isUser ? 'border-neutral-600 text-white' : 'border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100'}`}
                  rows={4}
                  autoFocus
                />
                <div className="flex justify-end gap-2 mt-2">
                  <button onClick={() => setIsEditing(false)} className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${isUser ? 'border-neutral-600 hover:bg-neutral-700 text-neutral-300' : 'border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-400'}`}>
                    Cancel
                  </button>
                  <button onClick={handleSaveEdit} className="px-3 py-1.5 rounded-lg text-sm font-medium bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-500/20 transition-colors flex items-center gap-1.5">
                    <Check size={14} /> Save
                  </button>
                </div>
              </div>
            ) : (
              <div className="prose dark:prose-invert max-w-none pr-8">
                {parseMarkdown(message.content, isUser)}
                
                {/* Dynamic typing cursor */}
                {isStreaming && (
                  <span className="inline-flex ml-1 items-center">
                    <span className="w-2 h-4 bg-emerald-500 dark:bg-emerald-400 animate-pulse rounded-sm"></span>
                  </span>
                )}
              </div>
            )}
          </div>

          {/* User Message Action Toolbar */}
          {isUser && !isEditing && (
            <div className="flex items-center gap-1.5 mt-2 justify-end px-1 text-neutral-450 dark:text-neutral-500 opacity-0 group-hover:opacity-100 transition-opacity">
              <button 
                onClick={handleCopy} 
                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-transparent hover:bg-neutral-200 dark:hover:bg-neutral-800 text-xs font-medium hover:text-neutral-800 dark:hover:text-white transition-all active:scale-95 cursor-pointer"
                title="Copy message"
              >
                {copied ? (
                  <>
                    <Check size={12} className="text-emerald-500" />
                    <span className="text-emerald-500">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy size={12} />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* AI Message Action Toolbar */}
          {!isUser && !isStreaming && !isEditing && (
            <div className="flex items-center gap-1.5 mt-2.5 pl-1 text-neutral-400 dark:text-neutral-500 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0">
              <button 
                onClick={handleLike} 
                className={`p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-700 dark:hover:text-neutral-300 transition-colors active:scale-90 ${liked ? 'text-emerald-500 dark:text-emerald-400' : ''}`}
                title="Helpful response"
              >
                <ThumbsUp size={14} className={liked ? 'fill-current' : ''} />
              </button>
              <button 
                onClick={handleDislike} 
                className={`p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-700 dark:hover:text-neutral-300 transition-colors active:scale-90 ${disliked ? 'text-rose-500 dark:text-rose-450' : ''}`}
                title="Not helpful response"
              >
                <ThumbsDown size={14} className={disliked ? 'fill-current' : ''} />
              </button>
              <button 
                onClick={handleCopy} 
                className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-700 dark:hover:text-neutral-300 transition-colors active:scale-90"
                title="Copy response"
              >
                {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
              </button>
              <button 
                onClick={() => setIsEditing(true)} 
                className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-700 dark:hover:text-neutral-300 transition-colors active:scale-90"
                title="Edit response"
              >
                <Edit2 size={14} />
              </button>
              <button 
                onClick={onRegenerate} 
                className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-700 dark:hover:text-neutral-300 transition-colors active:scale-90"
                title="Regenerate response"
              >
                <RotateCcw size={14} />
              </button>
              <button 
                className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-700 dark:hover:text-neutral-300 transition-colors active:scale-90"
                title="Share conversation"
              >
                <Share2 size={14} />
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
