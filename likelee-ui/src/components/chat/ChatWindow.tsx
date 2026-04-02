import React, { useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import type { Message, Participant } from "@/hooks/useChat";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Avatar } from "./ThreadList";

interface ChatWindowProps {
  messages: Message[];
  currentUserId: string;
  sending: boolean;
  otherParticipant: Participant;
  selfParticipant: Participant;
  onSend: (content: string) => void;
  onEdit: (id: string, content: string) => void;
  onDelete: (id: string) => void;
}

export function ChatWindow({
  messages,
  currentUserId,
  sending,
  otherParticipant,
  selfParticipant,
  onSend,
  onEdit,
  onDelete,
}: ChatWindowProps) {
  const [draft, setDraft] = useState("");
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [deleteMessageId, setDeleteMessageId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
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

  const handleEditClick = (msgId: string, content: string) => {
    setEditingMessageId(msgId);
    setEditContent(content);
  };

  const handleDeleteClick = (msgId: string) => {
    setDeleteMessageId(msgId);
  };

  const confirmDelete = () => {
    if (deleteMessageId) {
      onDelete(deleteMessageId);
      setDeleteMessageId(null);
    }
  };

  const saveEdit = () => {
    if (editingMessageId && editContent.trim()) {
      onEdit(editingMessageId, editContent.trim());
      setEditingMessageId(null);
      setEditContent("");
    }
  };

  return (
    <div className="flex flex-col h-full bg-white relative">
      {/* Dynamic Background Watermark */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden opacity-[0.06] z-0">
        <img
          src="/likelee-logo.png"
          alt=""
          className="w-[80%] max-w-[500px] object-contain grayscale"
        />
      </div>

      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 bg-white shadow-sm">
        <Avatar
          url={otherParticipant.avatarUrl}
          name={otherParticipant.name}
          size={10}
        />
        <div>
          <p className="text-sm font-bold text-gray-900">
            {otherParticipant.name}
          </p>
          <p className="text-xs text-gray-400 capitalize">
            {otherParticipant.role}
          </p>
        </div>
      </div>

      {/* Message list */}
      <div className="flex-1 overflow-y-auto px-4 py-6 flex flex-col gap-6 relative z-10">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-14 h-14 rounded-full bg-indigo-50 flex items-center justify-center mb-4">
              <svg
                className="w-7 h-7 text-indigo-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
            </div>
            <p className="text-sm font-semibold text-gray-500">
              No messages yet
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Send a message to start the conversation.
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isSelf = msg.sender_id === currentUserId;
            const participant = isSelf ? selfParticipant : otherParticipant;
            const isOptimistic = msg.id.startsWith("temp_");

            return (
              <div
                key={msg.id}
                className={`flex items-end gap-2.5 ${isSelf ? "flex-row-reverse" : "flex-row"}`}
              >
                {!isSelf && (
                  <div className="flex-shrink-0 mb-0.5">
                    <Avatar
                      url={participant.avatarUrl}
                      name={participant.name}
                      size={8}
                    />
                  </div>
                )}

                <div
                  className={`max-w-[80%] group relative flex flex-col ${isSelf ? "items-end" : "items-start"}`}
                >
                  <div
                    className={`rounded-[20px] px-4 py-2.5 text-sm leading-relaxed shadow-sm relative
                      ${
                        msg.is_deleted
                          ? "bg-gray-50 text-gray-400 border border-gray-100 italic"
                          : isSelf
                            ? "bg-indigo-600 text-white rounded-br-none"
                            : "bg-white text-gray-900 border border-gray-100 rounded-bl-none"
                      }
                      ${isOptimistic ? "opacity-60" : ""}
                    `}
                  >
                    {msg.is_deleted ? (
                      <div className="flex items-center gap-2 py-0.5">
                        <svg
                          className="w-3.5 h-3.5 opacity-50"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                          />
                        </svg>
                        <span>This message was deleted</span>
                      </div>
                    ) : (
                      <>
                        {msg.content}
                        {msg.edited_at && (
                          <span className="text-[9px] opacity-70 ml-1.5 align-middle">
                            (edited)
                          </span>
                        )}
                      </>
                    )}

                    {isSelf && !msg.is_deleted && !isOptimistic && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="absolute top-2 -left-6 p-1 rounded-full hover:bg-gray-100 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 9l-7 7-7-7"
                              />
                            </svg>
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-24">
                          <DropdownMenuItem
                            onClick={() => handleEditClick(msg.id, msg.content)}
                          >
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDeleteClick(msg.id)}
                            className="text-red-600"
                          >
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>

                  <div className={`flex items-center gap-1.5 mt-1 px-1`}>
                    <p className={`text-[10px] text-gray-400`}>
                      {format(new Date(msg.created_at), "HH:mm")}
                    </p>
                    {isSelf && !msg.is_deleted && (
                      <span
                        className={`text-[12px] leading-none ${msg.is_read ? "text-green-500 font-bold" : "text-gray-300"}`}
                      >
                        {msg.is_read ? "✓✓" : "✓"}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

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
            className="flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-full bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-md"
            aria-label="Send message"
          >
            {sending ? (
              <svg
                className="w-4 h-4 animate-spin"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v8H4z"
                />
              </svg>
            ) : (
              <svg
                className="w-4 h-4 transform rotate-90"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
              </svg>
            )}
          </button>
        </div>
        <p className="text-[10px] text-gray-400 mt-1 ml-1">
          Shift+Enter for new line
        </p>
      </div>

      <Dialog
        open={!!deleteMessageId}
        onOpenChange={() => setDeleteMessageId(null)}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Delete Message</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this message? This action cannot
              be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setDeleteMessageId(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!editingMessageId}
        onOpenChange={() => setEditingMessageId(null)}
      >
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Message</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <textarea
              className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[120px] resize-none"
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              placeholder="Enter your message..."
              autoFocus
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setEditingMessageId(null)}>
              Cancel
            </Button>
            <Button
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
              onClick={saveEdit}
              disabled={!editContent.trim()}
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
