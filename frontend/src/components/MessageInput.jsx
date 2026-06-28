import React, { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, Mic, StopCircle, Camera, Monitor, Clock, FileText } from 'lucide-react';

export const MessageInput = ({ onSend, isGenerating, onStop, onAttach }) => {
  const [input, setInput] = useState('');
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const recognitionRef = useRef(null);
  const menuRef = useRef(null);

  // Close menu on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowAttachmentMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Initialize Speech Recognition
  useEffect(() => {
    if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;

      recognitionRef.current.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInput(prev => prev + (prev ? ' ' : '') + transcript);
      };

      recognitionRef.current.onerror = (event) => {
        console.error("Speech recognition error", event.error);
        setIsVoiceActive(false);
      };

      recognitionRef.current.onend = () => {
        setIsVoiceActive(false);
      };
    }
  }, []);

  // Auto-expand textarea height based on content
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      if (!input) {
        textarea.style.height = 'auto';
      } else {
        textarea.style.height = 'auto';
        textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
      }
    }
  }, [input]);

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    if (input.trim() && !isGenerating) {
      onSend(input.trim());
      setInput('');
      // Reset height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e) => {
    // Submit on Enter, line break on Shift+Enter
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const toggleVoice = () => {
    if (!recognitionRef.current) {
      alert("Speech recognition is not supported in this browser.");
      return;
    }

    if (isVoiceActive) {
      recognitionRef.current.stop();
      setIsVoiceActive(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsVoiceActive(true);
      } catch (err) {
        console.error("Failed to start speech recognition:", err);
      }
    }
  };

  const handleAttachmentClick = () => {
    setShowAttachmentMenu(!showAttachmentMenu);
  };

  const handleAddFiles = () => {
    fileInputRef.current?.click();
    setShowAttachmentMenu(false);
  };

  const handleTakeScreenshot = () => {
    alert("Take a screenshot functionality triggered.");
    setShowAttachmentMenu(false);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (onAttach) {
        onAttach(file);
      } else {
        // Fallback if no onAttach handler provided
        alert(`File selected: ${file.name}`);
      }
      // Reset input so the same file can be selected again
      e.target.value = '';
    }
  };

  return (
    <div className="relative w-full max-w-3xl mx-auto px-4 md:px-0">
      
      {/* Main Input Box */}
      <form 
        onSubmit={handleSubmit}
        className="relative flex items-end gap-2 p-1.5 rounded-2xl bg-white dark:bg-neutral-950/80 backdrop-blur-md shadow-2xl focus-within:ring-2 focus-within:ring-emerald-500/20 transition-all"
      >
        {/* Hidden file input */}
        <input 
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
        />

        {/* Attachment button and menu wrapper */}
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={handleAttachmentClick}
            className={`p-3.5 rounded-xl transition-colors cursor-pointer active:scale-95 ${
              showAttachmentMenu 
                ? 'bg-neutral-100 dark:bg-neutral-900 text-neutral-800 dark:text-neutral-200' 
                : 'text-neutral-400 dark:text-neutral-500 hover:text-neutral-600 dark:hover:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-900'
            }`}
            title="Add attachment"
          >
            <Paperclip size={18} />
          </button>

          {/* Popup Menu */}
          {showAttachmentMenu && (
            <div className="absolute bottom-full left-0 mb-2 w-56 bg-white dark:bg-[#2F2F2F] text-neutral-800 dark:text-neutral-200 rounded-xl shadow-lg overflow-hidden z-50">
              <div className="p-1.5 flex flex-col gap-0.5">
                <button
                  type="button"
                  onClick={handleAddFiles}
                  className="flex items-center gap-3 w-full px-3 py-2 text-sm text-left hover:bg-neutral-100 dark:hover:bg-neutral-700/50 rounded-lg transition-colors"
                >
                  <Paperclip size={16} className="text-neutral-500 dark:text-neutral-400" />
                  <span className="flex-grow">Add files or photos</span>
                  <span className="text-xs text-neutral-400 dark:text-neutral-500">Ctrl+U</span>
                </button>
                <button
                  type="button"
                  onClick={handleTakeScreenshot}
                  className="flex items-center gap-3 w-full px-3 py-2 text-sm text-left hover:bg-neutral-100 dark:hover:bg-neutral-700/50 rounded-lg transition-colors"
                >
                  <Camera size={16} className="text-neutral-500 dark:text-neutral-400" />
                  <span>Take a screenshot</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Message AI Assistant..."
          rows={1}
          className="flex-grow py-3 px-2 bg-transparent text-neutral-800 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500 text-sm md:text-base resize-none focus:outline-none max-h-[200px] overflow-y-auto custom-scrollbar"
        />

        {/* Speech input */}
        <button
          type="button"
          onClick={toggleVoice}
          className={`p-3.5 rounded-xl transition-all cursor-pointer active:scale-95 ${
            isVoiceActive 
              ? 'bg-rose-500/10 text-rose-500 animate-pulse border border-rose-500/20' 
              : 'text-neutral-400 dark:text-neutral-500 hover:text-neutral-600 dark:hover:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-900'
          }`}
          title={isVoiceActive ? "Listening..." : "Voice input"}
        >
          <Mic size={18} />
        </button>

        {/* Send or Stop button */}
        {isGenerating ? (
          <button
            type="button"
            onClick={onStop}
            className="p-3.5 rounded-xl font-medium shadow-md transition-all active:scale-95 bg-rose-600 hover:bg-rose-500 text-white shadow-rose-500/20 cursor-pointer"
            title="Stop generating"
          >
            <StopCircle size={18} className="animate-pulse" />
          </button>
        ) : (
          <button
            type="submit"
            disabled={!input.trim()}
            className={`p-3.5 rounded-xl font-medium shadow-md transition-all active:scale-95 ${
              input.trim()
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-500/20'
                : 'bg-neutral-100 dark:bg-neutral-900 text-neutral-400 dark:text-neutral-600 cursor-not-allowed'
            }`}
            title="Send message"
          >
            <Send size={18} />
          </button>
        )}
      </form>
      
      {/* Footer Disclaimer */}
      <p className="text-center text-[11px] text-neutral-400 dark:text-neutral-600 mt-2 select-none">
        AI Assistant can make mistakes. Verify important info.
      </p>
    </div>
  );
};
