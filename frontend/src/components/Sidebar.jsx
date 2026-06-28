import React, { useState } from 'react';
import { Plus, Search, MessageSquare, Trash2, Menu, Sun, Moon, LogOut, ChevronLeft, Sparkles, User, Settings } from 'lucide-react';
import { useTheme } from './ThemeContext';
import { Logo } from './Logo';

export const Sidebar = ({ 
  chats, 
  activeChatId, 
  onSelectChat, 
  onNewChat, 
  onDeleteChat, 
  isOpen, 
  onToggleOpen,
  onSignOut,
  user
}) => {
  const { theme, toggleTheme } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');

  // Filter chats by search query
  const filteredChats = chats.filter(chat => 
    chat.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (chat.messages || []).some(m => m.content.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <>
      {/* Mobile Menu Trigger Header (only visible when sidebar is closed/hidden on mobile) */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-14 bg-white/85 dark:bg-neutral-950/80 backdrop-blur-md flex items-center justify-between px-4 z-30">
        <button
          onClick={onToggleOpen}
          className="p-2 rounded-lg text-neutral-600 dark:text-neutral-350 hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors"
        >
          <Menu size={20} />
        </button>
        <div className="flex items-center gap-1.5 font-display font-bold text-sm tracking-tight text-neutral-900 dark:text-white">
          <Logo size={24} />
          <span>talkwithme.in</span>
        </div>
        <button
          onClick={onNewChat}
          className="p-2 rounded-lg text-emerald-600 dark:text-emerald-450 hover:bg-emerald-500/10 transition-colors"
        >
          <Plus size={20} />
        </button>
      </div>

      {/* Mobile Overlay Background (dim screen when sidebar open) */}
      {isOpen && (
        <div 
          onClick={onToggleOpen}
          className="md:hidden fixed inset-0 bg-black/40 backdrop-blur-xs z-40"
        />
      )}

      {/* Sidebar Panel */}
      <aside 
        className={`fixed top-0 bottom-0 left-0 z-50 md:z-20 flex flex-col bg-neutral-50 dark:bg-neutral-950 transition-all duration-300 ${
          isOpen ? 'w-72 translate-x-0' : 'w-0 -translate-x-full md:translate-x-0 md:w-20'
        }`}
      >
        {/* Top Header Section */}
        <div className={`p-4 flex items-center justify-between h-16 ${!isOpen && 'md:justify-center'}`}>
          {isOpen ? (
            <div className="flex items-center gap-2.5 font-display font-bold text-lg tracking-tight text-neutral-900 dark:text-white select-none">
              <Logo size={28} />
              <span>talkwithme.in</span>
            </div>
          ) : (
            <div className="hidden md:flex items-center justify-center">
              <Logo size={28} />
            </div>
          )}

          {isOpen && (
            <button 
              onClick={onToggleOpen}
              className="p-1.5 rounded-lg text-neutral-400 dark:text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 hover:bg-neutral-200/50 dark:hover:bg-neutral-900 transition-all active:scale-95 cursor-pointer"
              title="Collapse sidebar"
            >
              <ChevronLeft size={18} />
            </button>
          )}
        </div>

        {/* Sidebar Controls */}
        <div className="p-3 flex flex-col gap-3">
          {/* New Chat Button */}
          {isOpen ? (
            <button
              onClick={onNewChat}
              className="flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl font-medium text-sm text-white bg-emerald-600 hover:bg-emerald-500 active:scale-98 transition-all shadow-md shadow-emerald-500/10 cursor-pointer"
            >
              <Plus size={16} />
              <span>New Chat</span>
            </button>
          ) : (
            <button
              onClick={onNewChat}
              className="hidden md:flex items-center justify-center w-12 h-12 mx-auto rounded-xl text-white bg-emerald-600 hover:bg-emerald-500 active:scale-98 transition-all shadow-md shadow-emerald-500/10 cursor-pointer"
              title="New Chat"
            >
              <Plus size={20} />
            </button>
          )}

          {/* Search Box */}
          {isOpen ? (
            <div className="relative flex items-center bg-neutral-100 dark:bg-neutral-900 rounded-xl px-3 py-2 border border-transparent focus-within:border-neutral-300 dark:focus-within:border-neutral-800 transition-colors">
              <Search size={16} className="text-neutral-400 dark:text-neutral-500 mr-2 flex-shrink-0" />
              <input
                type="text"
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent border-none text-xs text-neutral-800 dark:text-neutral-250 placeholder-neutral-400 dark:placeholder-neutral-550 focus:outline-none"
              />
            </div>
          ) : (
            <div className="hidden md:flex items-center justify-center w-12 h-12 mx-auto rounded-xl text-neutral-400 dark:text-neutral-500 bg-neutral-100 dark:bg-neutral-900 hover:bg-neutral-200 dark:hover:bg-neutral-855 transition-colors cursor-pointer" title="Search chats">
              <Search size={18} />
            </div>
          )}
        </div>

        {/* History List */}
        <div className="flex-grow overflow-y-auto custom-scrollbar px-2 py-1 space-y-1 select-none">
          {isOpen ? (
            filteredChats.length > 0 ? (
              filteredChats.map((chat) => {
                const isActive = chat.id === activeChatId;
                return (
                  <div
                    key={chat.id}
                    className={`group relative flex items-center justify-between px-3 py-2.5 rounded-xl text-sm transition-all cursor-pointer ${
                      isActive 
                        ? 'bg-emerald-50/70 dark:bg-emerald-950/20 text-emerald-650 dark:text-emerald-450 font-medium' 
                        : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200/50 dark:hover:bg-neutral-900 hover:text-neutral-900 dark:hover:text-white'
                    }`}
                    onClick={() => onSelectChat(chat.id)}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 mr-6">
                      <MessageSquare size={16} className="flex-shrink-0 opacity-70" />
                      <span className="truncate">{chat.title}</span>
                    </div>
                    {/* Delete button (visible on hover) */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteChat(chat.id);
                      }}
                      className="absolute right-2 opacity-0 group-hover:opacity-100 p-1 rounded-md text-neutral-400 dark:text-neutral-550 hover:text-rose-500 dark:hover:text-rose-450 hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-all cursor-pointer"
                      title="Delete chat"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                );
              })
            ) : (
              <p className="text-center text-xs text-neutral-400 dark:text-neutral-600 py-6">
                No chats found
              </p>
            )
          ) : (
            filteredChats.map((chat) => {
              const isActive = chat.id === activeChatId;
              return (
                <button
                  key={chat.id}
                  onClick={() => onSelectChat(chat.id)}
                  className={`hidden md:flex items-center justify-center w-12 h-12 mx-auto rounded-xl transition-all cursor-pointer ${
                    isActive 
                      ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' 
                      : 'text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-900 hover:text-neutral-900 dark:hover:text-white'
                  }`}
                  title={chat.title}
                >
                  <MessageSquare size={18} />
                </button>
              );
            })
          )}
        </div>

        {/* Footer Configuration Controls */}
        <div className="mt-auto p-3 space-y-2.5 bg-neutral-100/30 dark:bg-neutral-950/40">
          
          {/* Light/Dark Toggle */}
          <button
            onClick={toggleTheme}
            className={`flex items-center gap-3 w-full p-2.5 rounded-xl text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200/50 dark:hover:bg-neutral-900 hover:text-neutral-900 dark:hover:text-white transition-all cursor-pointer active:scale-95 ${!isOpen && 'md:justify-center'}`}
            title={theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
          >
            {theme === 'dark' ? (
              <>
                <Sun size={18} className="text-amber-500" />
                {isOpen && <span className="text-sm font-medium">Light Mode</span>}
              </>
            ) : (
              <>
                <Moon size={18} className="text-indigo-650 dark:text-indigo-400" />
                {isOpen && <span className="text-sm font-medium">Dark Mode</span>}
              </>
            )}
          </button>

          {/* User profile footer */}
          <div className={`flex items-center justify-between p-2 rounded-xl bg-neutral-200/40 dark:bg-neutral-900/40 ${!isOpen && 'md:justify-center md:bg-transparent md:p-0'}`}>
            <div className="flex items-center gap-2.5 min-w-0">
              {user?.photoURL ? (
                <img 
                  src={user.photoURL} 
                  alt={user.displayName || 'User'} 
                  className="w-8 h-8 rounded-full object-cover shadow-sm select-none flex-shrink-0"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-emerald-500 to-blue-650 flex items-center justify-center text-white text-xs font-semibold shadow-sm select-none flex-shrink-0">
                  {user?.displayName ? user.displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'U'}
                </div>
              )}
              {isOpen && (
                <div className="flex flex-col text-left min-w-0 select-none">
                  <span className="text-sm font-semibold text-neutral-800 dark:text-neutral-200 truncate">{user?.displayName || 'Active User'}</span>
                  <span className="text-[10px] text-neutral-400 dark:text-neutral-500 truncate">{user?.email || 'authenticated'}</span>
                </div>
              )}
            </div>
            {isOpen && (
              <button 
                onClick={onSignOut}
                className="p-1 rounded-md text-neutral-400 dark:text-neutral-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                title="Sign Out"
              >
                <LogOut size={15} />
              </button>
            )}
          </div>
        </div>

      </aside>
    </>
  );
};
