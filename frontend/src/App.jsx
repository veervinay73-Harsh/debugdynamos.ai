import React, { useState, useEffect, useRef } from 'react';
import { Sidebar } from './components/Sidebar';
import { WelcomeScreen } from './components/WelcomeScreen';
import { MessageItem } from './components/MessageItem';
import { MessageInput } from './components/MessageInput';
import { Logo } from './components/Logo';
import { Menu, Sparkles, AlertCircle } from 'lucide-react';
import { auth, db, googleProvider } from './firebase';
import { 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged 
} from 'firebase/auth';
import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  updateDoc, 
  query, 
  orderBy, 
  onSnapshot, 
  serverTimestamp 
} from 'firebase/firestore';

const API_URL = import.meta.env.VITE_API_URL;

if (typeof window !== 'undefined') {
  window.db = db;
  window.doc = doc;
  window.setDoc = setDoc;
  window.auth = auth;
}

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState('');

  const [chats, setChats] = useState([]);
  const [activeChatId, setActiveChatId] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [streamContent, setStreamContent] = useState('');
  const [streamMsgId, setStreamMsgId] = useState('');
  
  const abortControllerRef = useRef(null);
  const chatEndRef = useRef(null);

  // 1. Firebase Authentication State Listener
  useEffect(() => {
    if (!auth || !db) {
      setLoading(false);
      setAuthError('Firebase SDK failed to initialize. Please verify your credentials configuration inside frontend/.env.');
      return;
    }
    // Safety timeout: If Firebase auth observer hangs (common with invalid project/auth domain iframe lookups), force resolve
    const safetyTimeout = setTimeout(() => {
      console.warn('Firebase Auth state observer timed out. Forcing load completion.');
      setLoading(false);
      setAuthError('Authentication initialization is taking longer than expected. Please check your Firebase credentials configuration or network connection.');
    }, 4500);

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      clearTimeout(safetyTimeout);
      if (currentUser) {
        setUser(currentUser);
        setAuthError('');
        // Sync user profile to Firestore asynchronously (non-blocking)
        const userDocRef = doc(db, 'users', currentUser.uid);
        setDoc(userDocRef, {
          uid: currentUser.uid,
          displayName: currentUser.displayName,
          email: currentUser.email,
          photoURL: currentUser.photoURL,
          lastLogin: serverTimestamp()
        }, { merge: true }).catch((err) => {
          console.error('Failed to sync user profile to Firestore:', err);
        });
      } else {
        setUser(null);
      }
      setLoading(false);
    }, (error) => {
      clearTimeout(safetyTimeout);
      console.error('Auth state listener error:', error);
      setAuthError('Authentication error occurred. Please refresh.');
      setLoading(false);
    });

    return () => {
      clearTimeout(safetyTimeout);
      unsubscribe();
    };
  }, []);

  // 2. Subscribe to user conversations in real-time
  useEffect(() => {
    if (!user || !db) {
      setChats([]);
      setActiveChatId('');
      return;
    }

    const convsQuery = query(
      collection(db, 'users', user.uid, 'conversations'),
      orderBy('updatedAt', 'desc')
    );

    const unsubscribe = onSnapshot(convsQuery, (snapshot) => {
      const conversationsList = [];
      snapshot.forEach((docSnap) => {
        conversationsList.push({
          id: docSnap.id,
          ...docSnap.data()
        });
      });
      setChats(conversationsList);

      // Handle active chat resolution
      if (conversationsList.length > 0) {
        setActiveChatId((prevId) => {
          const stillExists = conversationsList.some(c => c.id === prevId);
          if (stillExists) return prevId;

          const savedActiveId = localStorage.getItem(`talkwithme-active-id-${user.uid}`);
          const match = conversationsList.find(c => c.id === savedActiveId);
          return match ? match.id : conversationsList[0].id;
        });
      } else {
        setActiveChatId('');
      }
    }, (error) => {
      console.error('Firestore conversations subscription error:', error);
    });

    return unsubscribe;
  }, [user]);

  // 3. Subscribe to active chat messages in real-time
  useEffect(() => {
    if (!user || !activeChatId || !db) return;

    localStorage.setItem(`talkwithme-active-id-${user.uid}`, activeChatId);

    const msgsQuery = query(
      collection(db, 'users', user.uid, 'conversations', activeChatId, 'messages'),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(msgsQuery, (snapshot) => {
      const messagesList = [];
      snapshot.forEach((docSnap) => {
        messagesList.push({
          id: docSnap.id,
          ...docSnap.data()
        });
      });

      setChats((prev) =>
        prev.map((c) => {
          if (c.id === activeChatId) {
            return { ...c, messages: messagesList };
          }
          return c;
        })
      );
    }, (error) => {
      console.error('Firestore messages subscription error:', error);
    });

    return unsubscribe;
  }, [user, activeChatId]);

  // Adjust sidebar state on window resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setSidebarOpen(false);
      } else {
        setSidebarOpen(true);
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Scroll to bottom on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chats, isGenerating]);

  const activeChatRaw = chats.find(c => c.id === activeChatId) || { id: '', title: 'New Conversation', messages: [] };
  const activeChat = {
    ...activeChatRaw,
    messages: activeChatRaw.messages || []
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setAuthError('');
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      console.error('Google Sign-In Error:', err);
      setAuthError(err.message || 'Google Sign-In failed. Please try again.');
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    stopGeneration();
    try {
      await signOut(auth);
    } catch (err) {
      console.error('Sign-Out Error:', err);
    }
  };

  const handleSelectChat = (id) => {
    stopGeneration();
    setActiveChatId(id);
    if (window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  };

  const handleNewChat = () => {
    if (!user) return;
    stopGeneration();
    
    const newChatId = `chat-${Date.now()}`;
    setDoc(doc(db, 'users', user.uid, 'conversations', newChatId), {
      id: newChatId,
      title: 'New Conversation',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }).catch((err) => {
      console.error('Failed to create new conversation in Firestore:', err);
    });
    setActiveChatId(newChatId);
    if (window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  };

  const handleDeleteChat = (id) => {
    if (!user) return;
    if (id === activeChatId) {
      stopGeneration();
    }

    deleteDoc(doc(db, 'users', user.uid, 'conversations', id)).catch((err) => {
      console.error('Failed to delete conversation:', err);
    });
  };

  const stopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsGenerating(false);
  };

  const handleSendMessage = async (text) => {
    if (isGenerating || !user) return;

    let chatId = activeChatId;
    const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // 1. Auto-create conversation if none is active
    if (!chatId) {
      chatId = `chat-${Date.now()}`;
      setDoc(doc(db, 'users', user.uid, 'conversations', chatId), {
        id: chatId,
        title: text.length > 28 ? `${text.substring(0, 25)}...` : text,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }).catch((err) => {
        console.error('Failed to auto-create conversation in Firestore:', err);
      });
      setActiveChatId(chatId);
    }

    const userMsgId = `msg-${Date.now()}-user`;
    const userMsgDocRef = doc(db, 'users', user.uid, 'conversations', chatId, 'messages', userMsgId);

    // 2. Save user message to Firestore (non-blocking)
    setDoc(userMsgDocRef, {
      id: userMsgId,
      role: 'user',
      content: text,
      timestamp: currentTime,
      createdAt: serverTimestamp()
    }).catch((err) => {
      console.error('Failed to write user message to Firestore:', err);
    });

    // Update conversation title if default
    const currentChatObj = chats.find(c => c.id === chatId);
    const isDefaultTitle = !currentChatObj || currentChatObj.title === 'New Conversation' || !currentChatObj.title;
    const updatedTitle = isDefaultTitle 
      ? (text.length > 28 ? `${text.substring(0, 25)}...` : text) 
      : currentChatObj.title;

    updateDoc(doc(db, 'users', user.uid, 'conversations', chatId), {
      title: updatedTitle,
      updatedAt: serverTimestamp()
    }).catch((err) => {
      console.error('Failed to update conversation in Firestore:', err);
    });

    setIsGenerating(true);

    // 3. Render AI Response placeholder in UI locally while streaming
    const assistantMsgId = `msg-${Date.now() + 1}-ai`;
    
    // Save placeholder to Firestore so onSnapshot picks it up immediately
    setDoc(doc(db, 'users', user.uid, 'conversations', chatId, 'messages', assistantMsgId), {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      timestamp: currentTime,
      createdAt: serverTimestamp()
    }).catch((err) => console.error('Failed to save AI placeholder to Firestore:', err));

    setStreamMsgId(assistantMsgId);
    setStreamContent('');

    try {
      const controller = new AbortController();
      abortControllerRef.current = controller;
      
      // 45-second timeout in case backend hangs completely
      const timeoutId = setTimeout(() => {
        controller.abort(new Error('Request timed out after 45 seconds'));
      }, 45000);

      // Extract current conversation history for context
      const chatObj = chats.find(c => c.id === chatId);
      const historyList = chatObj ? (chatObj.messages || []) : [];
      
      const payloadMessages = [
        ...historyList.map(m => ({ role: m.role, content: m.content })),
        { role: 'user', content: text }
      ].slice(-20); // Keep last 20 messages for context window limit

      const response = await fetch(`${API_URL}/api/chat/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: payloadMessages }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error('Failed to stream response');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let done = false;
      let buffer = '';
      let finalContent = '';

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        if (value || done) {
          if (value) {
            buffer += decoder.decode(value, { stream: !done });
          }
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';
          
          if (done && buffer.trim()) {
            lines.push(buffer);
            buffer = '';
          }

          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith('data: ')) {
              try {
                const parsed = JSON.parse(trimmed.slice(6));
                
                if (parsed.error) {
                  finalContent = `**Error:** ${parsed.error}`;
                  setStreamContent(finalContent);
                } else {
                  finalContent = parsed.content !== undefined ? parsed.content : finalContent;
                  setStreamContent(finalContent);
                }

                if (parsed.done) {
                  setIsGenerating(false);
                  setStreamMsgId('');
                  abortControllerRef.current = null;

                  // 4. Save completed AI message to Firestore (non-blocking)
                  setDoc(doc(db, 'users', user.uid, 'conversations', chatId, 'messages', assistantMsgId), {
                    id: assistantMsgId,
                    role: 'assistant',
                    content: finalContent,
                    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    createdAt: serverTimestamp()
                  }).catch((err) => {
                    console.error('Failed to save AI message to Firestore:', err);
                  });
                }
              } catch (e) {
                console.error('Failed to parse SSE JSON:', e);
              }
            }
          }
        }
      }
      
      // Cleanup guaranteed if loop exits
      setIsGenerating(false);
      setStreamMsgId('');
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        console.log('Streaming request aborted.');
      } else {
        console.error('Failed to stream from API:', err);
      }
      setIsGenerating(false);
      setStreamMsgId('');

      // On error or abort, write accumulated text to Firestore as backup (non-blocking)
      const activeObj = chats.find(c => c.id === chatId);
      const aiPlaceholder = activeObj ? (activeObj.messages || []).find(m => m.id === assistantMsgId) : null;
      const fallbackContent = aiPlaceholder ? aiPlaceholder.content : 'Failed to generate response.';

      setDoc(doc(db, 'users', user.uid, 'conversations', chatId, 'messages', assistantMsgId), {
        id: assistantMsgId,
        role: 'assistant',
        content: fallbackContent || 'Request stopped.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        createdAt: serverTimestamp()
      }).catch((dbErr) => {
        console.error('Failed to save fallback AI message:', dbErr);
      });
    }
  };

  const handleRegenerateResponse = () => {
    if (isGenerating || activeChat.messages.length < 2 || !user) return;

    const activeMessages = [...activeChat.messages];
    let lastUserQuery = '';
    let lastAssistantMsgId = '';
    
    for (let i = activeMessages.length - 1; i >= 0; i--) {
      if (activeMessages[i].role === 'user') {
        lastUserQuery = activeMessages[i].content;
        break;
      }
    }

    if (!lastUserQuery) return;

    const lastMsg = activeMessages[activeMessages.length - 1];
    if (lastMsg.role === 'assistant') {
      lastAssistantMsgId = lastMsg.id;
    }

    if (lastAssistantMsgId) {
      deleteDoc(doc(db, 'users', user.uid, 'conversations', activeChatId, 'messages', lastAssistantMsgId)).catch((err) => {
        console.error('Failed to delete old response for regeneration:', err);
      });
    }
    
    setTimeout(() => {
      handleSendMessage(lastUserQuery);
    }, 100);
  };

  const handleEditAiMessage = async (messageId, newContent) => {
    if (!user) return;
    const msgRef = doc(db, 'users', user.uid, 'conversations', activeChatId, 'messages', messageId);
    await updateDoc(msgRef, { content: newContent }).catch((err) => {
      console.error('Failed to update AI message:', err);
    });
  };

  const handleEditUserMessage = async (messageId, newContent) => {
    if (isGenerating || !user) return;

    const activeMessages = [...activeChat.messages];
    const msgIndex = activeMessages.findIndex(m => m.id === messageId);
    if (msgIndex === -1) return;

    // Delete the original message and all subsequent messages
    const msgsToDelete = activeMessages.slice(msgIndex);
    msgsToDelete.forEach(msg => {
      deleteDoc(doc(db, 'users', user.uid, 'conversations', activeChatId, 'messages', msg.id)).catch(console.error);
    });
    
    // Resend as a new message which naturally triggers a new AI response
    setTimeout(() => {
      handleSendMessage(newContent);
    }, 100);
  };

  // Render Loader during authentication boot
  if (loading) {
    return (
      <div className="flex items-center justify-center w-screen h-screen bg-neutral-950 text-white select-none">
        <div className="flex flex-col items-center gap-4">
          <Logo size={60} className="animate-pulse" />
          <p className="text-xs font-semibold tracking-widest text-neutral-500 font-display animate-pulse uppercase">talkwithme.in initializing...</p>
        </div>
      </div>
    );
  }

  // Render Login Card if User is not logged in
  if (!user) {
    return (
      <div className="relative flex items-center justify-center w-screen h-screen overflow-hidden bg-neutral-950 text-white font-sans select-none">
        {/* Animated background gradient orbs */}
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-emerald-500/10 blur-[120px] pointer-events-none animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-blue-500/10 blur-[120px] pointer-events-none animate-pulse" style={{ animationDelay: '2s' }} />

        {/* Diagonal Grid overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f0f15_1px,transparent_1px),linear-gradient(to_bottom,#0f0f15_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-35 [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />

        {/* Login Card */}
        <div className="relative z-10 w-full max-w-md p-8 mx-4 rounded-3xl bg-neutral-900/60 backdrop-blur-xl border border-white/5 shadow-2xl flex flex-col items-center text-center">
          
          {/* Logo */}
          <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center shadow-lg mb-6 relative group overflow-hidden">
            <Logo size={40} />
          </div>

          <h1 className="text-3xl font-extrabold tracking-tight text-white font-display mb-2 flex items-center gap-2">
            <span>talkwithme.in</span>
            <Sparkles size={18} className="text-emerald-400 animate-pulse" />
          </h1>
          <p className="text-sm text-neutral-450 max-w-xs mb-8">
            Access your premium conversational AI assistant, powered by OpenAI.
          </p>

          {authError && (
            <div className="w-full flex items-center gap-2.5 p-3.5 rounded-xl border border-rose-500/20 bg-rose-500/5 text-rose-400 text-xs text-left mb-6">
              <AlertCircle size={16} className="flex-shrink-0" />
              <span>{authError}</span>
            </div>
          )}

          {/* Google Sign-In Trigger */}
          <button
            onClick={handleGoogleSignIn}
            className="flex items-center justify-center gap-3 w-full py-4 px-6 rounded-2xl font-semibold text-sm text-neutral-900 bg-white hover:bg-neutral-100 active:scale-98 transition-all shadow-xl shadow-white/5 cursor-pointer font-display"
          >
            {/* Google Vector Icon */}
            <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            <span>Continue with Google</span>
          </button>

          <div className="mt-8 text-[10px] text-neutral-600 select-none leading-relaxed">
            By signing in, you agree to our Terms of Service<br/>and Privacy Policy.
          </div>
        </div>
      </div>
    );
  }

  // Main chat UI layout
  return (
    <div className="flex w-full h-screen overflow-hidden bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 transition-colors duration-300">
      
      {/* Sidebar Navigation */}
      <Sidebar 
        chats={chats}
        activeChatId={activeChat.id}
        onSelectChat={handleSelectChat}
        onNewChat={handleNewChat}
        onDeleteChat={handleDeleteChat}
        isOpen={sidebarOpen}
        onToggleOpen={() => setSidebarOpen(!sidebarOpen)}
        onSignOut={handleSignOut}
        user={user}
      />

      {/* Main Workspace Frame */}
      <div className={`flex flex-col flex-1 h-full min-w-0 transition-all duration-300 relative ${
        sidebarOpen ? 'md:pl-72' : 'md:pl-20'
      }`}>
        
        {/* Top bar */}
        <header className="hidden md:flex items-center justify-between px-4 h-16 bg-white/70 dark:bg-neutral-900/60 backdrop-blur-md z-10 select-none">
          <div className="flex items-center gap-3">
            {!sidebarOpen && (
              <button
                onClick={() => setSidebarOpen(true)}
                className="p-2 rounded-xl text-neutral-500 hover:text-neutral-800 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all active:scale-95 cursor-pointer"
                title="Expand sidebar"
              >
                <Menu size={18} />
              </button>
            )}
            <span className="text-sm font-semibold font-display text-neutral-850 dark:text-neutral-300">
              {activeChat.title}
            </span>
          </div>
        </header>

        {/* Chat Feed Scroll Area */}
        <div className="flex-1 overflow-y-auto custom-scrollbar pt-16 md:pt-4 pb-32 px-4 md:px-8">
          <div className="min-h-full flex flex-col">
            <div className="flex-1"></div>
            {activeChat.messages.length === 0 ? (
              <WelcomeScreen user={user} onSelectPrompt={handleSendMessage} />
            ) : (
              <div className="w-full max-w-3xl mx-auto divide-y divide-neutral-150 dark:divide-neutral-800/40">
                {activeChat.messages.map((message, index) => {
                  const isLastMsg = index === activeChat.messages.length - 1;
                  return (
                    <MessageItem 
                      key={message.id}
                      message={{
                        ...message,
                        content: message.id === streamMsgId ? streamContent : message.content
                      }}
                      isStreaming={message.id === streamMsgId}
                      onRegenerate={handleRegenerateResponse}
                      dbChatId={activeChatId}
                      onEditUser={handleEditUserMessage}
                      onEditAi={handleEditAiMessage}
                    />
                  );
                })}
                <div ref={chatEndRef} />
              </div>
            )}
            <div className="flex-1"></div>
          </div>
        </div>

        {/* Floating Input Box Bottom Container */}
        <div className="absolute bottom-0 left-0 right-0 py-6 bg-gradient-to-t from-white via-white/95 to-transparent dark:from-neutral-900 dark:via-neutral-900/95 dark:to-transparent z-10">
          <MessageInput 
            onSend={handleSendMessage}
            isGenerating={isGenerating}
            onStop={stopGeneration}
          />
        </div>

      </div>
    </div>
  );
}
