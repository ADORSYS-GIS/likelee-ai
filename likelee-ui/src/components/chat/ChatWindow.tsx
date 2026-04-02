import React, { useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import type { Message, Participant } from "@/hooks/useChat";
import { Avatar } from "./ThreadList";

interface ChatWindowProps {
  messages: Message[];
  currentUserId: string;
  sending: boolean;
  otherParticipant: Participant;
  selfParticipant: Participant;
  onSend: (content: string) => void;
}

export function ChatWindow({
  messages,
  currentUserId,
  sending,
  otherParticipant,
  selfParticipant,
  onSend,
}: ChatWindowProps) {
  const [draft, setDraft] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = () => {
    const content = draft.trim();
    if (!content || sending) return;
    onSend(content);
    setDraft("");
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 bg-white shadow-sm">
        <Avatar url={otherParticipant.avatarUrl} name={otherParticipant.name} size={10} />
        <div>
          <p className="text-sm font-bold text-gray-900">{otherParticipant.name}</p>
          <p className="text-xs text-gray-400 capitalize">{otherParticipant.role}</p>
        </div>
      </div>

      {/* Message list */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-14 h-14 rounded-full bg-indigo-50 flex items-center justify-center mb-4">
              <svg className="w-7 h-7 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <p className="text-sm font-semibold text-gray-500">No messages yet</p>
            <p className="text-xs text-gray-400 mt-1">Send a message to start the conversation.</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isSelf = msg.sender_id === currentUserId;
            const participant = isSelf ? selfParticipant : otherParticipant;
            const isOptimistic = msg.id.startsWith("temp_");

            return (
              <div key={msg.id} className={`flex items-end gap-2.5 ${isSelf ? "flex-row-reverse" : "flex-row"}`}>
                {/* Avatar */}
                <div className="flex-shrink-0 mb-0.5">
                  <Avatar url={participant.avatarUrl} name={participant.name} size={8} />
                </div>

                {/* Bubble */}
                <div className={`max-w-[70%] group`}>
                  <div
                    className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm
                      ${isSelf
                        ? "bg-indigo-600 text-white rounded-br-sm"
                        : "bg-gray-100 text-gray-900 rounded-bl-sm"
                      }
                      ${isOptimistic ? "opacity-60" : ""}
                    `}
                  >
                    {msg.content}
                  </div>
                  <p className={`text-[10px] text-gray-400 mt-0.5 ${isSelf ? "text-right" : "text-left"}`}>
                    {format(new Date(msg.created_at), "HH:mm")}
                    {isSelf && (
                      <span className="ml-1">{msg.is_read ? "✓✓" : "✓"}</span>
                    )}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div className="px-4 py-3 border-t border-gray-100 bg-white">
        <div className="flex items-end gap-2 bg-gray-50 rounded-2xl border border-gray-200 px-4 py-2 focus-within:border-indigo-400 focus-within:ring-1 focus-within:ring-indigo-200 transition">
          <textarea
            id="chat-input"
            rows={1}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message… (Enter to send)"
            className="flex-1 resize-none bg-transparent text-sm text-gray-800 placeholder-gray-400 outline-none max-h-36 overflow-y-auto"
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={!draft.trim() || sending}
            className="flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            aria-label="Send message"
          >
            {sending ? (
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
              </svg>
            )}
          </button>
        </div>
        <p className="text-[10px] text-gray-400 mt-1 ml-1">Shift+Enter for new line</p>
      </div>
    </div>
  );
}
