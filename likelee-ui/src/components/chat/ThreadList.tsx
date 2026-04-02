import React from "react";
import { formatDistanceToNow } from "date-fns";
import type { Conversation, Participant, Contact } from "@/hooks/useChat";

function formatTime(dateString: string) {
  try {
    const date = new Date(dateString);
    return formatDistanceToNow(date, { addSuffix: true });
  } catch (e) {
    return "";
  }
}

interface ThreadListProps {
  conversations: Conversation[];
  contacts: Contact[];
  activeConversationId: string | null;
  currentUserId: string;
  isCreator: boolean;
  onSelect: (conversationId: string) => void;
  onStartChat: (contactId: string) => void;
  getParticipant: (conversation: Conversation, userId: string) => Participant;
}

function AvatarPlaceholder({ name, size = 10 }: { name: string; size?: number }) {
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <div
      className={`w-${size} h-${size} rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0`}
    >
      {initials}
    </div>
  );
}

export function Avatar({
  url,
  name,
  size = 10,
}: {
  url?: string | null;
  name: string;
  size?: number;
}) {
  return url ? (
    <img
      src={url}
      alt={name}
      className={`w-${size} h-${size} rounded-full object-cover flex-shrink-0 border-2 border-white shadow-sm`}
    />
  ) : (
    <AvatarPlaceholder name={name} size={size} />
  );
}

export function ThreadList({
  conversations,
  contacts,
  activeConversationId,
  currentUserId,
  isCreator,
  onSelect,
  onStartChat,
  getParticipant,
}: ThreadListProps) {
  // Determine which contacts don't have conversations yet
  const contactsWithoutConversation = contacts.filter((contact) => {
    return !conversations.some(
      (conv) => conv.agency_id === contact.id || conv.creator_id === contact.id
    );
  });

  if (conversations.length === 0 && contactsWithoutConversation.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-16 px-6 text-center">
        <div className="w-14 h-14 rounded-full bg-indigo-50 flex items-center justify-center mb-4">
          <svg className="w-7 h-7 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
        </div>
        <p className="text-sm font-semibold text-gray-500">No active connections</p>
        <p className="text-xs text-gray-400 mt-1">Connect with {isCreator ? "an agency" : "a creator"} to chat.</p>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-gray-100 overflow-y-auto">
      {/* Existing Conversations */}
      {conversations.map((conv) => {
        const participant = getParticipant(conv, currentUserId);
        const isActive = conv.id === activeConversationId;

        return (
          <li
            key={conv.id}
            onClick={() => onSelect(conv.id)}
            className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-indigo-50/70 ${
              isActive ? "bg-indigo-50 border-l-4 border-indigo-500" : "border-l-4 border-transparent"
            }`}
          >
            <Avatar url={participant.avatarUrl} name={participant.name} />
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-baseline mb-0.5">
                <span className="text-sm font-bold text-gray-900 truncate pr-2">
                  {participant.name}
                </span>
                <span className="text-[10px] text-gray-400 font-medium flex-shrink-0">
                  {formatTime(conv.updated_at)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <p className="text-xs text-gray-500 truncate mr-2">
                  {conv.last_message_content || participant.role}
                </p>
                {conv.unread_count && conv.unread_count > 0 ? (
                  <span className="min-w-[18px] h-[18px] px-1 bg-indigo-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center flex-shrink-0 shadow-sm shadow-indigo-200">
                    {conv.unread_count > 99 ? "99+" : conv.unread_count}
                  </span>
                ) : null}
              </div>
            </div>
          </li>
        );
      })}

      {/* Contacts to Start New Chats */}
      {contactsWithoutConversation.map((contact) => {
        return (
          <li
            key={`contact-${contact.id}`}
            onClick={() => onStartChat(contact.id)}
            className="flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-gray-50 border-l-4 border-transparent group"
          >
            <Avatar url={contact.avatar_url} name={contact.display_name} size={10} />
            <div className="flex-1 min-w-0 flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-gray-900 truncate">
                  {contact.display_name}
                </div>
                <span className="text-xs text-gray-500 capitalize">New {contact.contact_type} contact</span>
              </div>
              <button 
                className="opacity-0 group-hover:opacity-100 transition-opacity w-8 h-8 flex items-center justify-center rounded-full bg-indigo-50 text-indigo-600 hover:bg-indigo-100"
                title="Start Conversation"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
