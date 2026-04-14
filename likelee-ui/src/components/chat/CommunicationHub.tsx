import React, { useEffect } from "react";
import { useAuth } from "@/auth/AuthProvider";
import { useChat } from "@/hooks/useChat";
import { ThreadList } from "./ThreadList";
import { ChatWindow } from "./ChatWindow";
import { useIsMobile } from "@/hooks/use-mobile";

export function CommunicationHub() {
  const { profile } = useAuth();
  const isMobile = useIsMobile();
  const [mobileListVisible, setMobileListVisible] = React.useState(true);
  const {
    conversations,
    contacts,
    activeConversationId,
    messages,
    loadingConversations,
    loadingContacts,
    loadingMessages,
    sending,
    loadConversations,
    loadContacts,
    openConversation,
    startConversation,
    sendMessage,
    editMessage,
    deleteMessage,
    getParticipant,
  } = useChat(profile?.id, profile?.role);

  useEffect(() => {
    if (profile?.id) {
      loadConversations();
      loadContacts();
    }
  }, [profile?.id, loadConversations, loadContacts]);

  const activeConversation =
    conversations.find((c) => c.id === activeConversationId) ?? null;

  const otherParticipant =
    activeConversation && profile?.id
      ? getParticipant(activeConversation, profile.id)
      : null;

  const selfParticipant =
    activeConversation && profile?.id
      ? {
          id: profile.id,
          name: profile?.full_name || "You",
          avatarUrl: profile?.profile_photo_url || null,
          role: (activeConversation.agency_id === profile.id
            ? "agency"
            : "creator") as "agency" | "creator",
        }
      : null;

  const isCreator = profile?.role === "creator" || profile?.role === "talent";

  useEffect(() => {
    if (!isMobile) {
      setMobileListVisible(true);
      return;
    }
    if (!activeConversation) {
      setMobileListVisible(true);
    }
  }, [isMobile, activeConversation]);

  const handleSelectConversation = (conversationId: string) => {
    openConversation(conversationId);
    if (isMobile) setMobileListVisible(false);
  };

  const handleStartConversation = (contactId: string) => {
    startConversation(contactId);
    if (isMobile) setMobileListVisible(false);
  };

  return (
    <div className="flex h-[calc(100vh-10rem)] min-h-[500px] rounded-2xl border border-gray-200 shadow-sm overflow-hidden bg-white">
      {/* Thread list */}
      <aside
        className={`flex flex-col ${isMobile ? "w-full" : "w-72 flex-shrink-0 border-r border-gray-100"} ${isMobile && !mobileListVisible ? "hidden" : ""}`}
      >
        {loadingConversations || loadingContacts ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            <ThreadList
              conversations={conversations}
              contacts={contacts}
              activeConversationId={activeConversationId}
              currentUserId={profile?.id ?? ""}
              isCreator={isCreator}
              onSelect={handleSelectConversation}
              onStartChat={handleStartConversation}
              getParticipant={(conv, uid) => getParticipant(conv, uid)}
            />
          </div>
        )}
      </aside>

      {/* Chat area */}
      <main
        className={`flex-1 flex flex-col overflow-hidden ${isMobile && mobileListVisible ? "hidden" : ""}`}
      >
        {activeConversation && otherParticipant && selfParticipant ? (
          loadingMessages ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <ChatWindow
              messages={messages}
              currentUserId={profile?.id ?? ""}
              sending={sending}
              otherParticipant={otherParticipant}
              selfParticipant={selfParticipant}
              showBackButton={isMobile}
              onBack={isMobile ? () => setMobileListVisible(true) : undefined}
              onSend={sendMessage}
              onEdit={editMessage}
              onDelete={deleteMessage}
            />
          )
        ) : (
          <div className="flex-1 flex flex-col bg-white">
            <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center px-8 border-b border-gray-100 pb-16">
              <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-indigo-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z"
                  />
                </svg>
              </div>
              <div>
                <p className="text-sm font-bold text-gray-700">
                  Select a conversation
                </p>
                <p className="text-xs text-gray-400 mt-1 max-w-xs">
                  Choose a thread on the left, or initiate a new conversation
                  with {isCreator ? "an agency" : "a creator"}.
                </p>
              </div>
            </div>

            {/* Disabled Input bar for WhatsApp-style appearance */}
            <div className="px-4 py-3 bg-white">
              <div className="flex items-end gap-2 bg-gray-50 rounded-2xl border border-gray-200 px-4 py-2 opacity-60">
                <textarea
                  rows={1}
                  disabled
                  placeholder="Select a chat to start typing…"
                  className="flex-1 resize-none bg-transparent text-sm text-gray-800 placeholder-gray-400 outline-none max-h-36 overflow-y-auto cursor-not-allowed"
                />
                <button
                  type="button"
                  disabled
                  className="flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-xl bg-indigo-600 text-white opacity-40 cursor-not-allowed"
                >
                  <svg
                    className="w-4 h-4"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                  </svg>
                </button>
              </div>
              <p className="text-[10px] text-gray-400 mt-1 ml-1">&nbsp;</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
