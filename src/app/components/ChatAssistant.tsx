import { useEffect, useState } from 'react';
import { Send, Sparkles, HelpCircle, Wrench, Zap, AlertCircle } from 'lucide-react';
import {
  ApiRequestError,
  createChatSessionRequest,
  getChatMessagesRequest,
  sendChatMessageRequest,
  sendChatSessionMessageRequest,
} from '../api';
import { store, type ExplanationMode } from '../store';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'buddy';
  timestamp: Date;
}

export default function ChatAssistant() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: "Hi! I'm Debug Buddy, your friendly AI assistant. How can I help you with your code today?",
      sender: 'buddy',
      timestamp: new Date()
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [sessionFileId, setSessionFileId] = useState<number | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [explanationMode, setExplanationMode] = useState<ExplanationMode>(() => store.getExplanationMode());

  useEffect(() => {
    let cancelled = false;
    async function loadSession() {
      const currentFile = store.getCurrentFile();
      try {
        const session = await createChatSessionRequest(
          currentFile ? `Debugging ${currentFile.fileName}` : 'Debugging session',
          currentFile?.id,
        );
        if (cancelled) return;
        setSessionId(session.id);
        setSessionFileId(currentFile ? Number(currentFile.id) : null);
        const history = await getChatMessagesRequest(session.id);
        if (cancelled) return;
        if (history.length > 0) {
          setMessages(history.map((message) => ({
            id: message.id.toString(),
            text: message.message,
            sender: message.role === 'user' ? 'user' : 'buddy',
            timestamp: new Date(),
          })));
        }
      } catch {
        if (!cancelled) {
          setSessionId(null);
          setSessionFileId(null);
        }
      }
    }
    void loadSession();
    return () => {
      cancelled = true;
    };
  }, []);

  const quickActions = [
    { icon: HelpCircle, text: 'Explain Error', color: 'purple' },
    { icon: Wrench, text: 'Fix This', color: 'blue' },
    { icon: Zap, text: 'Optimize Code', color: 'green' },
    { icon: AlertCircle, text: 'Why Did This Fail?', color: 'red' }
  ];
  const actionStyles: Record<string, { button: string; icon: string }> = {
    purple: { button: 'border-purple-200 hover:border-purple-400', icon: 'text-purple-600' },
    blue: { button: 'border-blue-200 hover:border-blue-400', icon: 'text-blue-600' },
    green: { button: 'border-green-200 hover:border-green-400', icon: 'text-green-600' },
    red: { button: 'border-red-200 hover:border-red-400', icon: 'text-red-600' },
  };

  const handleQuickAction = (action: string) => {
    sendMessage(action);
  };

  const sendMessage = async (text: string) => {
    if (!text.trim() || isSending) return;
    setIsSending(true);

    const userMessage: Message = {
      id: Date.now().toString(),
      text,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');

    try {
      let currentFile = store.getCurrentFile();
      if (currentFile) {
        try {
          await store.refreshCurrentFileAnalysis(currentFile.id);
        } catch (error) {
          if (!(error instanceof ApiRequestError && error.status === 404)) throw error;
        }
        currentFile = store.getCurrentFile();
      }
      const currentFileId = currentFile ? Number(currentFile.id) : null;
      let activeSessionId = sessionId;
      if (activeSessionId !== null && sessionFileId !== currentFileId) {
        try {
          const session = await createChatSessionRequest(
            currentFile ? `Debugging ${currentFile.fileName}` : 'Debugging session',
            currentFile?.id,
          );
          activeSessionId = session.id;
          setSessionId(session.id);
          setSessionFileId(currentFileId);
        } catch {
          activeSessionId = null;
          setSessionId(null);
          setSessionFileId(null);
        }
      }
      const response = activeSessionId !== null
        ? await sendChatSessionMessageRequest(activeSessionId, text, explanationMode)
        : await sendChatMessageRequest(text, currentFile?.id, explanationMode);
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        text: response.message,
        sender: 'buddy',
        timestamp: new Date(),
      }]);
    } catch (error) {
      setMessages(prev => [...prev, {
        id: `error-${Date.now()}`,
        text: "Debug Buddy couldn't reach the server - try again",
        sender: 'buddy',
        timestamp: new Date(),
      }]);
    } finally {
      setIsSending(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(inputText);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-pink-500 p-6 text-white">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Debug Buddy</h2>
              <p className="text-sm text-white/90">Your AI debugging assistant</p>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="p-4 bg-gray-50 border-b">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <p className="text-sm text-gray-600">Quick Actions:</p>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <span>Explanation level</span>
              <select
                value={explanationMode}
                onChange={(event) => {
                  const mode = event.target.value as ExplanationMode;
                  setExplanationMode(mode);
                  store.setExplanationMode(mode);
                }}
                className="px-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </label>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {quickActions.map((action) => (
              <button
                key={action.text}
                onClick={() => handleQuickAction(action.text)}
                className={`flex items-center gap-2 px-3 py-2 bg-white rounded-lg hover:shadow-md transition-all border ${actionStyles[action.color].button}`}
              >
                <action.icon className={`w-4 h-4 ${actionStyles[action.color].icon}`} />
                <span className="text-sm font-medium text-gray-700">{action.text}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Messages */}
        <div className="p-6 space-y-4 min-h-[400px] max-h-[500px] overflow-y-auto">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl p-4 ${
                  message.sender === 'user'
                    ? 'bg-gradient-to-r from-purple-600 to-pink-500 text-white'
                    : 'bg-gray-100 text-gray-900'
                }`}
              >
                {message.sender === 'buddy' && (
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-4 h-4 text-purple-600" />
                    <span className="font-medium text-sm text-purple-600">Debug Buddy</span>
                  </div>
                )}
                <p className="whitespace-pre-line">{message.text}</p>
                <p className={`text-xs mt-2 ${
                  message.sender === 'user' ? 'text-white/70' : 'text-gray-500'
                }`}>
                  {message.timestamp.toLocaleTimeString()}
                </p>
              </div>
            </div>
          ))}
          {isSending && (
            <div className="flex justify-start" role="status" aria-live="polite">
              <div className="max-w-[80%] rounded-2xl bg-gray-100 text-gray-900 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-4 h-4 text-purple-600" />
                  <span className="font-medium text-sm text-purple-600">Debug Buddy</span>
                </div>
                <p>typing...</p>
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <form onSubmit={handleSubmit} className="p-4 bg-gray-50 border-t">
          <div className="flex gap-2">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Ask Debug Buddy anything..."
              className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <button
              type="submit"
              disabled={isSending}
              className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-500 text-white rounded-xl hover:shadow-lg transition-all flex items-center gap-2"
            >
              <Send className="w-5 h-5" />
              Send
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
