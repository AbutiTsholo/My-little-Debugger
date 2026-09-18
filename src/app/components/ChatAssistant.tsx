import { useEffect, useState } from 'react';
import { Send, Sparkles, HelpCircle, Wrench, Zap, AlertCircle } from 'lucide-react';
import {
  ApiRequestError,
  createChatSessionRequest,
  getChatMessagesRequest,
  sendChatMessageRequest,
  sendChatSessionMessageRequest,
} from '../api';
import { store } from '../store';

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
  const [isLoading, setIsLoading] = useState(true);
  const [explanationMode, setExplanationMode] = useState<'beginner' | 'intermediate' | 'advanced'>('beginner');

  useEffect(() => {
    let cancelled = false;
    async function loadSession() {
      const currentFile = store.getCurrentFile();
      try {
        const session = await createChatSessionRequest(
          currentFile ? `Debugging ${currentFile.fileName}` : 'Debugging session',
          currentFile?.id,
        );
        const history = await getChatMessagesRequest(session.id);
        if (cancelled) return;
        setSessionId(session.id);
        if (history.length > 0) {
          setMessages(history.map((message) => ({
            id: message.id.toString(),
            text: message.message,
            sender: message.role === 'user' ? 'user' : 'buddy',
            timestamp: new Date(),
          })));
        }
      } catch {
        // Keep the local welcome message when the API is unavailable.
      } finally {
        if (!cancelled) setIsLoading(false);
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

  const handleQuickAction = (action: string) => {
    sendMessage(action);
  };

  const sendMessage = async (text: string) => {
    if (!text.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');

    try {
      const response = sessionId
        ? await sendChatSessionMessageRequest(sessionId, text, explanationMode)
        : await sendChatMessageRequest(text, store.getCurrentFile()?.id, explanationMode);
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        text: response.message,
        sender: 'buddy',
        timestamp: new Date(),
      }]);
      return;
    } catch (error) {
      if (error instanceof ApiRequestError) return;
    }

    // Keep the prototype response available when the API is offline.
    const responses: Record<string, string> = {
        'Explain Error': "Based on your code, I found a syntax error on line 3. In Java, every statement must end with a semicolon (;). This is a common mistake for beginners! The semicolon tells Java where one statement ends and another begins.",
        'Fix This': "Here's how to fix it:\n\n1. Go to line 3 in your code\n2. Add a semicolon at the end: int x = 10;\n3. Save your file\n4. Run it again!\n\nWould you like me to explain why semicolons are important?",
        'Optimize Code': "Your code looks good! Here are some tips:\n\n• Consider adding comments to explain complex logic\n• Use meaningful variable names\n• Break long methods into smaller functions\n• Add error handling for user input",
        'Why Did This Fail?': "Your code failed because of a syntax error. Java is a compiled language, which means it checks all the syntax rules before running. When it found the missing semicolon, it stopped and reported an error. Think of it like writing a sentence - you need proper punctuation for it to make sense!"
    };

      const buddyMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: responses[text] || "I understand you're asking about: " + text + ". Let me help you with that! Could you provide more details about what you'd like to know?",
        sender: 'buddy',
        timestamp: new Date()
      };

    setMessages(prev => [...prev, buddyMessage]);
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
                onChange={(event) => setExplanationMode(event.target.value as typeof explanationMode)}
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
                className={`flex items-center gap-2 px-3 py-2 bg-white rounded-lg hover:shadow-md transition-all border border-${action.color}-200 hover:border-${action.color}-400`}
              >
                <action.icon className={`w-4 h-4 text-${action.color}-600`} />
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
              disabled={isLoading || !inputText.trim()}
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
