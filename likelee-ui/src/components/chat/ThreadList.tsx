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

function AvatarPlaceholder({
  name,
  size = 10,
}: {
  name: string;
  size?: number;
}) {
  const dimRem = `${size * 0.25}rem`;
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <div
      className="rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
      style={{ width: dimRem, height: dimRem }}
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
  const dimRem = `${size * 0.25}rem`;
  return url ? (
    <img
      src={url}
      alt={name}
      className="rounded-full object-cover flex-shrink-0 border-2 border-white shadow-sm"
      style={{ width: dimRem, height: dimRem }}
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
  const [searchQuery, setSearchQuery] = React.useState("");
  const [filter, setFilter] = React.useState<"all" | "unread">("all");

  // Determine which contacts don't have conversations yet
  const contactsWithoutConversation = contacts.filter((contact) => {
    return !conversations.some(
      (conv) => conv.agency_id === contact.id || conv.creator_id === contact.id,
    );
  });

  const filteredConversations = conversations.filter((conv) => {
    const participant = getParticipant(conv, currentUserId);
    const matchesSearch = (participant.name || "")
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesFilter =
      filter === "all" || (conv.unread_count && conv.unread_count > 0);
    return matchesSearch && matchesFilter;
  });

  const filteredContacts = contactsWithoutConversation.filter((contact) => {
    const matchesSearch = (contact.display_name || "")
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    return filter === "all" && matchesSearch; // Only show new contacts in "All" view
  });

  if (conversations.length === 0 && contactsWithoutConversation.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-16 px-6 text-center">
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
              d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
            />
          </svg>
        </div>
        <p className="text-sm font-semibold text-gray-500">
          No active connections
        </p>
        <p className="text-xs text-gray-400 mt-1">
          Connect with {isCreator ? "an agency" : "a creator"} to chat.
        </p>
      </div>
    );
  }

  const countLabel = isCreator
    ? conversations.length === 1
      ? "Agency"
      : "Agencies"
    : conversations.length === 1
      ? "Creator"
      : "Creators";

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 bg-white">
        <h2 className="text-xl font-black text-gray-900 tracking-tight">
          Messages
        </h2>
        <p className="text-[11px] font-bold text-indigo-500 uppercase tracking-wider mt-0.5">
          {conversations.length} {countLabel}
        </p>
      </div>
      {/* Search and Filter */}
      <div className="px-4 py-3 space-y-3 bg-white border-b border-gray-100">
        <div className="relative">
          <input
            type="text"
            placeholder="Search conversations…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
          />
          <svg
            className="absolute left-3 top-2.5 w-4 h-4 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setFilter("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              filter === "all"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-100"
                : "bg-gray-50 text-gray-500 hover:bg-gray-100"
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter("unread")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              filter === "unread"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-100"
                : "bg-gray-50 text-gray-500 hover:bg-gray-100"
            }`}
          >
            Unread
            {conversations.some((c) => (c.unread_count || 0) > 0) && (
              <span
                className={`w-2 h-2 rounded-full ${filter === "unread" ? "bg-white" : "bg-indigo-500"}`}
              />
            )}
          </button>
        </div>
      </div>

      <ul className="divide-y divide-gray-100 overflow-y-auto flex-1">
        {/* Existing Conversations */}
        {filteredConversations.map((conv) => {
          const participant = getParticipant(conv, currentUserId);
          const isActive = conv.id === activeConversationId;
          const preview = (conv.last_message_content || "").trim();
          const previewText = preview || "No messages yet";

          return (
            <li
              key={conv.id}
              onClick={() => onSelect(conv.id)}
              className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-all hover:bg-indigo-50/50 ${
                isActive
                  ? "bg-indigo-50/80 border-l-4 border-indigo-500"
                  : "border-l-4 border-transparent"
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
                    {previewText}
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
        {filteredContacts.map((contact) => {
          return (
            <li
              key={`contact-${contact.id}`}
              onClick={() => onStartChat(contact.id)}
              className="flex items-center gap-3 px-4 py-3 cursor-pointer transition-all hover:bg-gray-50 border-l-4 border-transparent group"
            >
              <Avatar
                url={contact.avatar_url}
                name={contact.display_name}
                size={10}
              />
              <div className="flex-1 min-w-0 flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-gray-900 truncate">
                    {contact.display_name}
                  </div>
                </div>
                <button
                  className="opacity-0 group-hover:opacity-100 transition-opacity w-8 h-8 flex items-center justify-center rounded-full bg-indigo-50 text-indigo-600 hover:bg-indigo-100 shadow-sm"
                  title="Start Conversation"
                >
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
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                </button>
              </div>
            </li>
          );
        })}
        {filteredConversations.length === 0 &&
          filteredContacts.length === 0 && (
            <div className="py-8 px-4 text-center">
              <p className="text-xs text-gray-400">No results found</p>
            </div>
          )}
      </ul>
    </div>
  );
}
