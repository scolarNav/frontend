"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import UpgradePrompt from "@/components/UpgradePrompt";
import { Alert } from "@/components/ui/States";
import { GraduationCap, Send } from "lucide-react";
import { SkeletonPage } from "@/components/ui/Skeleton";

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
      const token = localStorage.getItem("ScolarNav_token");
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

  if (authLoading) return <SkeletonPage variant="list" />;
  if (!user) return null;

  const lastIsEmptyAssistant =
    streaming && messages.length > 0 && messages[messages.length - 1].role === "assistant" && messages[messages.length - 1].content === "";

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col px-4 pb-4 pt-8 sm:px-6 sm:pt-10 lg:min-h-screen">
      <header className="mb-6 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="eyebrow mb-2">Mentor</p>
          <h1 className="h1">Ask your mentor</h1>
          <p className="mt-2 text-ink-soft">
            Specific answers to your scholarship questions, based on your actual profile.
            {!user.cvData && (
              <>
                {" "}
                <Link href="/cv" className="font-semibold text-forest hover:underline">Upload your CV</Link> for answers tailored to you.
              </>
            )}
          </p>
        </div>
        {!isPro && (
          <div className="shrink-0 text-right">
            <p className="badge badge-brand">
              {Math.max(0, FREE_MSG_LIMIT - freeCount)} of {FREE_MSG_LIMIT} free today
            </p>
            <Link href="/pricing" className="mt-1 block text-sm font-semibold text-forest hover:underline">
              Go Pro
            </Link>
          </div>
        )}
      </header>

      {/* Conversation */}
      <div className="flex-1 space-y-5 pb-6" aria-live="polite" aria-label="Conversation">
        {messages.length === 0 && (
          <section aria-labelledby="starters-heading">
            <h2 id="starters-heading" className="mb-3 text-sm font-semibold text-ink">Try asking</h2>
            <ul className="grid gap-2 sm:grid-cols-2">
              {STARTER_QUESTIONS.map((q) => (
                <li key={q}>
                  <button
                    type="button"
                    onClick={() => sendMessage(q)}
                    disabled={hitLimit}
                    className="card-interactive min-h-touch w-full px-4 py-3 text-left text-sm text-ink-soft disabled:opacity-50"
                  >
                    {q}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        {messages.map((msg, i) => {
          const mine = msg.role === "user";
          const isLast = i === messages.length - 1;
          return (
            <div key={i} className={`flex items-end gap-2.5 ${mine ? "justify-end" : "justify-start"}`}>
              {!mine && (
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-navy text-white" aria-hidden="true">
                  <GraduationCap size={16} />
                </span>
              )}
              <div
                className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  mine ? "rounded-br-sm bg-navy text-white" : "rounded-bl-sm bg-white text-ink"
                }`}
              >
                <span className="sr-only">{mine ? "You: " : "Mentor: "}</span>
                {lastIsEmptyAssistant && isLast ? (
                  <span className="flex items-center gap-1.5 py-1" role="status" aria-label="Mentor is typing">
                    <span className="h-2 w-2 animate-soft-pulse rounded-full bg-slate" />
                    <span className="h-2 w-2 animate-soft-pulse rounded-full bg-slate" style={{ animationDelay: "200ms" }} />
                    <span className="h-2 w-2 animate-soft-pulse rounded-full bg-slate" style={{ animationDelay: "400ms" }} />
                  </span>
                ) : (
                  msg.content
                )}
              </div>
            </div>
          );
        })}

        {error && <Alert variant="danger">{error}</Alert>}

        {hitLimit && <UpgradePrompt feature="mentor" />}

        <div ref={bottomRef} />
      </div>

      {/* Composer */}
      {!hitLimit && (
        <div className="sticky bottom-0 bg-surface pb-2 pt-2">
          <div className="rounded-xl bg-white ring-1 ring-inset ring-control transition-shadow focus-within:ring-2 focus-within:ring-forest">
            <label htmlFor="mentor-input" className="sr-only">Your question</label>
            <textarea
              id="mentor-input"
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask a question. Enter to send, Shift+Enter for a new line."
              rows={3}
              disabled={streaming}
              className="block w-full resize-none rounded-t-xl bg-transparent px-4 py-3 text-base text-ink outline-none placeholder:text-slate disabled:opacity-60 sm:text-sm"
            />
            <div className="flex items-center justify-between gap-3 px-3 pb-3">
              <p className="text-sm text-slate">Always verify deadlines on official scholarship websites.</p>
              <button
                type="button"
                onClick={() => sendMessage(input)}
                disabled={streaming || !input.trim()}
                aria-busy={streaming}
                className="btn-primary shrink-0"
              >
                {streaming ? "Thinking" : (<><Send size={16} aria-hidden="true" />Send</>)}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
