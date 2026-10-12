import { useEffect, useRef, useState } from "react";
import {
  Send,
  Sparkles,
  HelpCircle,
  Wrench,
  Zap,
  AlertCircle,
  RotateCcw,
} from "lucide-react";
import {
  ApiRequestError,
  createChatSessionRequest,
  getChatMessagesRequest,
  getChatSessionsRequest,
  sendChatSessionMessageRequest,
  type ApiChatSession,
} from "../api";
import { store, type ExplanationMode } from "../store";

interface Message {
  id: string;
  text: string;
  sender: "user" | "buddy";
  timestamp: Date;
}

const SESSION_STORAGE_KEY = "debug-buddy-active-session-id";

const defaultWelcomeMessage =
  "Hi! I'm Debug Buddy, a rule-based programming assistant. I can explain code, diagnose likely bugs, suggest fixes, and keep your conversation history in the database.";

const quickActions = [
  { icon: HelpCircle, text: "Explain Error", color: "purple" },
  { icon: Wrench, text: "Fix This", color: "blue" },
  { icon: Zap, text: "Optimize Code", color: "green" },
  { icon: AlertCircle, text: "Why Did This Fail?", color: "red" },
];

export default function ChatAssistant({
  embedded = false,
}: {
  embedded?: boolean;
}) {
  const thread = useRef<HTMLDivElement>(null);
  const [showAbout, setShowAbout] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      text: defaultWelcomeMessage,
      sender: "buddy",
      timestamp: new Date(),
    },
  ]);
  const [inputText, setInputText] = useState("");
  const [activeSessionId, setActiveSessionId] = useState<number | null>(null);
  const [sessionList, setSessionList] = useState<ApiChatSession[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [explanationMode, setExplanationMode] = useState<ExplanationMode>(() =>
    store.getExplanationMode(),
  );

  const syncStoredSession = (sessionId: number | null) => {
    if (sessionId === null) {
      localStorage.removeItem(SESSION_STORAGE_KEY);
      return;
    }
    localStorage.setItem(SESSION_STORAGE_KEY, String(sessionId));
  };

  const loadSessionHistory = async (sessionId: number) => {
    const history = await getChatMessagesRequest(sessionId);
    setMessages(
      history.length > 0
        ? history.map((message) => ({
            id: message.id.toString(),
            text: message.message,
            sender: message.role === "user" ? "user" : "buddy",
            timestamp: new Date(),
          }))
        : [
            {
              id: "welcome",
              text: defaultWelcomeMessage,
              sender: "buddy",
              timestamp: new Date(),
            },
          ],
    );
  };

  useEffect(() => {
    let cancelled = false;

    async function loadExistingSessions() {
      setIsLoadingSessions(true);
      try {
        const sessions = await getChatSessionsRequest();
        if (cancelled) return;
        setSessionList(sessions);

        const cachedSessionId =
          Number(localStorage.getItem(SESSION_STORAGE_KEY) ?? "0") || null;
        const matchingStored = embedded
          ? (sessions.find(
              (session) =>
                session.file_id === Number(store.getCurrentFile()?.id),
            )?.id ?? null)
          : cachedSessionId &&
              sessions.some((session) => session.id === cachedSessionId)
            ? cachedSessionId
            : (sessions[0]?.id ?? null);

        if (matchingStored) {
          setActiveSessionId(matchingStored);
          syncStoredSession(matchingStored);
          const history = await getChatMessagesRequest(matchingStored);
          if (cancelled) return;
          setMessages(
            history.length > 0
              ? history.map((message) => ({
                  id: message.id.toString(),
                  text: message.message,
                  sender: message.role === "user" ? "user" : "buddy",
                  timestamp: new Date(),
                }))
              : [
                  {
                    id: "welcome",
                    text: defaultWelcomeMessage,
                    sender: "buddy",
                    timestamp: new Date(),
                  },
                ],
          );
        }
      } catch {
        if (!cancelled) {
          setErrorMessage("I could not load your saved conversations.");
        }
      } finally {
        if (!cancelled) setIsLoadingSessions(false);
      }
    }

    void loadExistingSessions();
    return () => {
      cancelled = true;
    };
  }, [embedded]);

  useEffect(() => {
    if (thread.current) thread.current.scrollTop = thread.current.scrollHeight;
  }, [messages, isSending]);

  const handleQuickAction = (action: string) => {
    void sendMessage(action);
  };

  const ensureSession = async () => {
    let sessionId = activeSessionId;
    if (sessionId !== null) return sessionId;

    const currentFile = store.getCurrentFile();
    const created = await createChatSessionRequest(
      currentFile ? `Debugging ${currentFile.fileName}` : "Debugging session",
      currentFile?.id,
    );
    setSessionList((previous) => [created, ...previous]);
    setActiveSessionId(created.id);
    syncStoredSession(created.id);
    return created.id;
  };

  const handleNewConversation = async () => {
    setErrorMessage(null);
    setIsLoadingSessions(true);
    const currentFile = store.getCurrentFile();
    try {
      const created = await createChatSessionRequest(
        currentFile ? `Debugging ${currentFile.fileName}` : "Debugging session",
        currentFile?.id,
      );
      setActiveSessionId(created.id);
      setSessionList((previous) => [
        created,
        ...previous.filter((session) => session.id !== created.id),
      ]);
      syncStoredSession(created.id);
      setMessages([
        {
          id: "welcome",
          text: defaultWelcomeMessage,
          sender: "buddy",
          timestamp: new Date(),
        },
      ]);
    } catch {
      setErrorMessage("A new conversation could not be created.");
    } finally {
      setIsLoadingSessions(false);
    }
  };

  const handleSessionSelect = async (sessionId: number) => {
    setErrorMessage(null);
    setIsLoadingSessions(true);
    try {
      await loadSessionHistory(sessionId);
      setActiveSessionId(sessionId);
      syncStoredSession(sessionId);
    } catch {
      setErrorMessage("The selected conversation could not be reopened.");
    } finally {
      setIsLoadingSessions(false);
    }
  };

  const sendMessage = async (text: string) => {
    if (!text.trim() || isSending || isLoadingSessions) return;

    const trimmedText = text.trim();
    setErrorMessage(null);
    setIsSending(true);

    const userMessage: Message = {
      id: Date.now().toString(),
      text: trimmedText,
      sender: "user",
      timestamp: new Date(),
    };

    setMessages((previous) => [...previous, userMessage]);
    setInputText("");

    try {
      const sessionId = await ensureSession();
      const response = await sendChatSessionMessageRequest(
        sessionId,
        trimmedText,
        explanationMode,
      );
      setMessages((previous) => [
        ...previous,
        {
          id: (Date.now() + 1).toString(),
          text: response.message,
          sender: "buddy",
          timestamp: new Date(),
        },
      ]);
      try {
        setSessionList(await getChatSessionsRequest());
      } catch {
        /* The reply is already saved. */
      }
      if (!activeSessionId) {
        setActiveSessionId(sessionId);
        syncStoredSession(sessionId);
      }
    } catch (error) {
      const fallbackMessage =
        error instanceof ApiRequestError
          ? error.message
          : "Debug Buddy could not send the request. Please try again.";
      setMessages((previous) => [
        ...previous,
        {
          id: `error-${Date.now()}`,
          text: `Debug Buddy could not complete that request: ${fallbackMessage}`,
          sender: "buddy",
          timestamp: new Date(),
        },
      ]);
      setInputText(trimmedText);
      setErrorMessage(
        "The request could not be completed. Your draft is available below to retry.",
      );
    } finally {
      setIsSending(false);
    }
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    void sendMessage(inputText);
  };

  const busy = isSending || isLoadingSessions;
  const activeSession = sessionList.find(
    (session) => session.id === activeSessionId,
  );

  return (
    <div className={`chat-page ${embedded ? "chat-embedded" : ""}`}>
      {!embedded && (
        <div className="page-eyebrow">
          <span className="accent-dot" /> A LITTLE MORE CLARITY
        </div>
      )}
      <div className="chat-heading">
        <h1>
          <button
            className="buddy-logo"
            aria-label="About Debug Buddy"
            aria-expanded={showAbout}
            onClick={() => setShowAbout(!showAbout)}
          >
            <Sparkles size={25} />
          </button>{" "}
          Debug Buddy
        </h1>
        <p className="muted">Your space to think through the code.</p>
        {showAbout && (
          <p className="brand-about-inline">
            Ask about an error, explore a suggestion, or choose an explanation
            level. Conversations are saved to your account.
          </p>
        )}
      </div>
      <section className="panel chat-surface">
        <div className="chat-session-bar">
          <label className="session-picker">
            Conversation
            <select
              className="field"
              aria-label="Conversation"
              value={activeSessionId ?? ""}
              disabled={busy}
              onChange={(event) =>
                void handleSessionSelect(Number(event.target.value))
              }
            >
              <option value="" disabled>
                {isLoadingSessions
                  ? "Loading conversations…"
                  : "Start a conversation"}
              </option>
              {sessionList
                .filter(
                  (session) =>
                    !embedded ||
                    session.file_id === Number(store.getCurrentFile()?.id),
                )
                .map((session) => (
                  <option key={session.id} value={session.id}>
                    {session.title || "Debugging session"} · {session.id}
                  </option>
                ))}
            </select>
          </label>
          <button
            className="button secondary"
            disabled={busy}
            onClick={() => void handleNewConversation()}
          >
            <RotateCcw size={15} /> New chat
          </button>
        </div>
        <p className="chat-context">
          {activeSession?.file_id
            ? `Using saved file context · File ${activeSession.file_id}`
            : !activeSessionId && store.getCurrentFile()
              ? `Next conversation: ${store.getCurrentFile()?.fileName}`
              : "General conversation"}
        </p>
        <div className="chat-controls">
          <div className="quick-actions">
            {quickActions.map((action) => (
              <button
                key={action.text}
                className="quick-action"
                disabled={busy}
                onClick={() => handleQuickAction(action.text)}
              >
                <action.icon size={14} />
                {action.text}
              </button>
            ))}
          </div>
          <label className="level-picker">
            Explanation level
            <select
              className="field"
              value={explanationMode}
              onChange={(event) => {
                const mode = event.target.value as ExplanationMode;
                try {
                  store.setExplanationMode(mode);
                  setExplanationMode(mode);
                } catch {
                  setErrorMessage(
                    "Could not save your explanation preference.",
                  );
                }
              }}
            >
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </label>
        </div>
        <div
          ref={thread}
          className="chat-thread space-y-4"
          role="log"
          aria-label="Conversation messages"
          aria-live="polite"
        >
          {messages.filter(message => message.id !== "welcome" || messages.length === 1).map((message) =>
            message.id === "welcome" ? (
              <div className="chat-empty" key={message.id}>
                <span className="chat-empty-icon">
                  <Sparkles size={27} />
                </span>
                <h2>Let’s make sense of it.</h2>
                <p>Ask about a line, explore a fix, or talk through an idea.</p>
                <small>Your conversation stays in your history.</small>
              </div>
            ) : (
              <div
                key={message.id}
                className={`chat-message ${message.sender === "user" ? "chat-user" : ""}`}
              >
                <strong>
                  {message.sender === "user" ? "You" : "Debug Buddy"}
                </strong>
                <Answer text={message.text} />
              </div>
            ),
          )}
          {isSending && (
            <p role="status" className="muted">
              Debug Buddy is working…
            </p>
          )}
        </div>
        {errorMessage && (
          <p role="alert" className="error-message">
            {errorMessage}
          </p>
        )}
        <form
          onSubmit={handleSubmit}
          className="chat-composer flex gap-3 items-end"
        >
          <textarea
            aria-label="Message Debug Buddy"
            className="field"
            rows={3}
            value={inputText}
            onChange={(event) => setInputText(event.target.value)}
            placeholder="Ask a question or paste code…"
            disabled={busy}
          />
          <button
            className="button"
            type="submit"
            disabled={busy || !inputText.trim()}
          >
            <Send size={17} />
            Send
          </button>
        </form>
      </section>
    </div>
  );
}

function Answer({ text }: { text: string }) {
  return (
    <div className="answer-text">
      {text.split(/(```[\s\S]*?```)/g).map((part, index) =>
        part.startsWith("```") ? (
          <pre className="code-block" key={index}>
            <code>{part.slice(3, -3).replace(/^[a-zA-Z0-9_+#.-]*\n/, "")}</code>
          </pre>
        ) : (
          <p className="whitespace-pre-wrap break-words" key={index}>
            {part}
          </p>
        ),
      )}
    </div>
  );
}
