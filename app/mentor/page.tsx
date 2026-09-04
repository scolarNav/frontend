"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import UpgradePrompt from "@/components/UpgradePrompt";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
const FREE_MSG_LIMIT = 5;
const HISTORY_WINDOW = 10; // messages sent to backend for context

const STARTER_QUESTIONS = [
  "Can I apply with a 3.2 GPA?",
  "Which scholarships fit my profile?",
  "What IELTS score do I need for UK universities?",
  "How do I write a strong motivation letter?",
  "What's the realistic timeline if I want to start in September 2026?",
  "How does the Chevening scholarship work?",
];

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function MentorPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [freeCount, setFreeCount] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!authLoading && !user) router.push("/login");
  }, [authLoading, user, router]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streaming]);

  const isPro = user?.subscription?.plan === "pro" &&
    (user?.subscription?.status === "active" || user?.subscription?.status === "trialing");

  const hitLimit = !isPro && freeCount >= FREE_MSG_LIMIT;

  async function sendMessage(text: string) {
    if (!text.trim() || streaming || hitLimit) return;

    const userMsg: Message = { role: "user", content: text.trim() };
    // Capture history before adding the new user message
    const historySnapshot = messages.slice(-HISTORY_WINDOW);

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setStreaming(true);
    setError(null);

    const assistantMsg: Message = { role: "assistant", content: "" };
    setMessages((prev) => [...prev, assistantMsg]);

    try {
      const token = localStorage.getItem("Apexli_token");
      const res = await fetch(`${API_BASE}/mentor/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message: text.trim(), history: historySnapshot }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const errMsg: string = data?.error || "Request failed.";
        if (errMsg.includes("UPGRADE_REQUIRED:mentor_limit")) {
          setFreeCount(FREE_MSG_LIMIT); // force the upgrade prompt
          setMessages((prev) => prev.slice(0, -1));
          setStreaming(false);
          return;
        }
        throw new Error(errMsg);
      }

      if (!isPro) setFreeCount((n) => n + 1);

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const parsed = JSON.parse(line.slice(6));
            if (parsed.type === "chunk") {
              setMessages((prev) => {
                const updated = [...prev];
                updated[updated.length - 1] = {
                  ...updated[updated.length - 1],
                  content: updated[updated.length - 1].content + parsed.text,
                };
                return updated;
              });
            }
          } catch { }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setStreaming(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  }

  if (authLoading) return null;
  if (!user) return null;

  return (
    <div className="max-w-3xl mx-auto px-6 py-14 flex flex-col" style={{ minHeight: "calc(100vh - 80px)" }}>
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl text-ink">Mentor</h1>
          <p className="text-ink-soft mt-2">
            Specific answers to your scholarship questions — based on your actual profile.
            {!user.cvData && (
              <> <Link href="/cv" className="text-brass hover:underline">Upload your CV</Link> for answers tailored to you.</>
            )}
          </p>
        </div>
        {!isPro && (
          <div className="shrink-0 text-right">
            <p className="font-mono text-xs text-slate">
              {Math.max(0, FREE_MSG_LIMIT - freeCount)} / {FREE_MSG_LIMIT} free today
            </p>
            <Link href="/pricing" className="text-xs text-forest hover:underline font-mono">
              Go Pro →
            </Link>
          </div>
        )}
      </div>

      {/* Chat area */}
      <div className="flex-1 space-y-5 mb-6">
        {messages.length === 0 && (
          <div>
            <p className="text-sm text-slate font-mono mb-4">Try asking:</p>
            <div className="flex flex-wrap gap-2">
              {STARTER_QUESTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => sendMessage(q)}
                  disabled={hitLimit}
                  className="text-sm border border-rule px-3 py-1.5 text-ink-soft hover:border-forest hover:text-forest transition-colors text-left rounded disabled:opacity-40"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[85%] px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${msg.role === "user"
                ? "bg-forest text-white ml-8"
                : "bg-indigo text-ink border border-rule"
                }`}
              style={{ borderRadius: "8px" }}
            >
              {msg.content}
              {i === messages.length - 1 && streaming && msg.role === "assistant" && (
                <span className="inline-block w-1.5 h-4 bg-forest ml-1 animate-pulse align-text-bottom" />
              )}
            </div>
          </div>
        ))}

        {error && <p className="text-alert text-sm">{error}</p>}

        {hitLimit && (
          <UpgradePrompt feature="mentor" />
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      {!hitLimit && (
        <div className="border border-rule focus-within:border-forest transition-colors rounded-lg">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a question… (Enter to send, Shift+Enter for new line)"
            rows={3}
            disabled={streaming}
            className="w-full px-4 py-3 text-sm bg-transparent resize-none outline-none text-ink placeholder:text-slate disabled:opacity-60"
          />
          <div className="flex items-center justify-between px-3 pb-3">
            <p className="text-xs text-slate font-mono">
              Always verify deadlines on official scholarship websites.
            </p>
            <button
              onClick={() => sendMessage(input)}
              disabled={streaming || !input.trim()}
              className="btn-primary text-sm px-4 py-2 disabled:opacity-40"
            >
              {streaming ? "Thinking…" : "Send"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
