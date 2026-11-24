import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  BookOpen,
  Check,
  Copy,
  Download,
  KeyRound,
  Megaphone,
  MessageSquare,
  Send,
  Shield,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  formatBillingSuffix,
  formatMoney,
  postWhopMessage,
  subscribeWhopFiles,
  subscribeWhopLessons,
  subscribeWhopMessages,
  toggleLessonComplete,
  updateMembershipStatus,
} from '../services/whopService';
import {
  AppView,
  Membership,
  Whop,
  WhopFile,
  WhopLesson,
  WhopMessage,
} from '../types/whop';

interface WhopWorkspaceViewProps {
  whop: Whop;
  membership?: Membership;
  onNavigate: (view: AppView) => void;
  onMembershipUpdated: (updated: Membership) => void;
}

type WorkspaceTab = 'chat' | 'courses' | 'files' | 'billing';

export const WhopWorkspaceView: React.FC<WhopWorkspaceViewProps> = ({
  whop,
  membership,
  onNavigate,
  onMembershipUpdated,
}) => {
  const { user, profile, signInWithGoogle } = useAuth();
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('chat');
  const [channel, setChannel] = useState<'general' | 'announcements'>('general');
  const [lessons, setLessons] = useState<WhopLesson[]>([]);
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const [files, setFiles] = useState<WhopFile[]>([]);
  const [messages, setMessages] = useState<WhopMessage[]>([]);
  const [draftMessage, setDraftMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const isOwner = Boolean(user && user.uid === whop.ownerId);
  const isFree = whop.priceCents === 0;
  const hasAccess = isOwner || isFree || membership?.status === 'active';

  useEffect(() => {
    const unsubLessons = subscribeWhopLessons(whop.id, (items) => {
      setLessons(items);
      if (items.length > 0) {
        setSelectedLessonId((prev) => prev || items[0].id);
      }
    });
    const unsubFiles = subscribeWhopFiles(whop.id, setFiles);
    const unsubMsgs = subscribeWhopMessages(whop.id, setMessages);
    return () => {
      unsubLessons();
      unsubFiles();
      unsubMsgs();
    };
  }, [whop.id]);

  const channelMessages = useMemo(
    () => messages.filter((m) => m.channel === channel),
    [messages, channel]
  );

  const activeLesson = useMemo(
    () => lessons.find((l) => l.id === selectedLessonId) || lessons[0] || null,
    [lessons, selectedLessonId]
  );

  const completedIds = membership?.completedLessons || [];
  const completionPct =
    lessons.length > 0
      ? Math.round((completedIds.length / lessons.length) * 100)
      : 0;

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      await signInWithGoogle();
      return;
    }
    if (!draftMessage.trim()) return;
    if (channel === 'announcements' && !isOwner) return;

    setSending(true);
    try {
      const created = await postWhopMessage(
        whop.id,
        channel,
        user,
        profile,
        draftMessage
      );
      if (created) {
        setMessages((prev) =>
          prev.some((m) => m.id === created.id) ? prev : [...prev, created]
        );
        setDraftMessage('');
      }
    } finally {
      setSending(false);
    }
  };

  const handleToggleLesson = async (lessonId: string) => {
    if (!membership) return;
    const nextCompleted = await toggleLessonComplete(membership, lessonId);
    onMembershipUpdated({ ...membership, completedLessons: nextCompleted });
  };

  const handleDownloadFile = (file: WhopFile) => {
    const content = [
      `Whop Deliverable: ${file.title}`,
      `Storefront: ${whop.title}`,
      `Type: ${file.fileType}`,
      `License Key: ${membership?.licenseKey || 'PUBLIC-FREE-ACCESS'}`,
      ``,
      `Description:`,
      file.description,
    ].join('\n');

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.title;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopyLicense = async () => {
    const key = membership?.licenseKey || 'FREE-MEMBER-ACCESS';
    try {
      await navigator.clipboard.writeText(key);
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 1800);
    } catch {
      // clipboard blocked
    }
  };

  const handleToggleMembershipStatus = async () => {
    if (!membership) return;
    const nextStatus = membership.status === 'active' ? 'cancelled' : 'active';
    await updateMembershipStatus(membership.id, nextStatus);
    onMembershipUpdated({ ...membership, status: nextStatus });
    setStatusMessage(
      nextStatus === 'cancelled'
        ? 'Membership cancelled. You can reactivate anytime.'
        : 'Membership reactivated.'
    );
  };

  if (!hasAccess) {
    return (
      <div className="max-w-xl mx-auto px-6 py-16 text-center">
        <div className="bg-white border border-neutral-200 rounded-2xl p-8">
          <h2 className="font-display text-2xl font-bold text-[#111111]">
            Membership Required
          </h2>
          <p className="text-sm text-neutral-600 mt-2 mb-6">
            Join {whop.title} to unlock community chat, course modules, and downloadable files.
          </p>
          <button
            type="button"
            onClick={() => onNavigate({ name: 'whop', slug: whop.slug })}
            className="px-5 py-2.5 text-sm font-semibold text-white bg-[#FA4616] hover:bg-[#e03a0c] rounded-xl transition-colors"
          >
            View Storefront & Join
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1280px] mx-auto px-6 py-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Workspace Sidebar */}
        <aside className="lg:col-span-3 bg-white border border-neutral-200 rounded-2xl p-4 space-y-5">
          <div>
            <button
              type="button"
              onClick={() => onNavigate({ name: 'my-whops' })}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-500 hover:text-[#111111] mb-3"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              All My Whops
            </button>
            <h1 className="font-display text-lg font-bold text-[#111111] truncate">
              {whop.title}
            </h1>
            <p className="text-xs text-neutral-500 mt-0.5 truncate">
              by {whop.creatorName}
            </p>
          </div>

          {/* App Navigation */}
          <nav aria-label="Whop Apps" className="space-y-1">
            <button
              type="button"
              onClick={() => {
                setActiveTab('chat');
                setChannel('general');
              }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                activeTab === 'chat' && channel === 'general'
                  ? 'bg-[#111111] text-white'
                  : 'text-neutral-700 hover:bg-neutral-100'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              #general
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('chat');
                setChannel('announcements');
              }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                activeTab === 'chat' && channel === 'announcements'
                  ? 'bg-[#111111] text-white'
                  : 'text-neutral-700 hover:bg-neutral-100'
              }`}
            >
              <Megaphone className="w-4 h-4" />
              #announcements
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('courses')}
              className={`w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                activeTab === 'courses'
                  ? 'bg-[#111111] text-white'
                  : 'text-neutral-700 hover:bg-neutral-100'
              }`}
            >
              <span className="flex items-center gap-2.5">
                <BookOpen className="w-4 h-4" />
                Courses
              </span>
              <span className="text-xs tabular-nums opacity-80">
                {lessons.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('files')}
              className={`w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                activeTab === 'files'
                  ? 'bg-[#111111] text-white'
                  : 'text-neutral-700 hover:bg-neutral-100'
              }`}
            >
              <span className="flex items-center gap-2.5">
                <Download className="w-4 h-4" />
                Files & Keys
              </span>
              <span className="text-xs tabular-nums opacity-80">
                {files.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('billing')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                activeTab === 'billing'
                  ? 'bg-[#111111] text-white'
                  : 'text-neutral-700 hover:bg-neutral-100'
              }`}
            >
              <Shield className="w-4 h-4" />
              Member Pass
            </button>
          </nav>

          {isOwner && (
            <div className="pt-3 border-t border-neutral-100">
              <button
                type="button"
                onClick={() => onNavigate({ name: 'studio', tab: 'whops' })}
                className="w-full py-2 px-3 text-xs font-semibold text-[#FA4616] bg-[#FA4616]/10 hover:bg-[#FA4616]/15 rounded-lg transition-colors"
              >
                Manage in Creator Studio
              </button>
            </div>
          )}
        </aside>

        {/* Main Workspace Panel */}
        <main className="lg:col-span-9 bg-white border border-neutral-200 rounded-2xl min-h-[560px] flex flex-col">
          {/* TAB 1: CHAT & ANNOUNCEMENTS */}
          {activeTab === 'chat' && (
            <div className="flex-1 flex flex-col h-[600px]">
              <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between">
                <div>
                  <h2 className="font-display text-base font-bold text-[#111111]">
                    #{channel}
                  </h2>
                  <p className="text-xs text-neutral-500">
                    {channel === 'announcements'
                      ? 'Official updates and broadcasts from the creator'
                      : 'Real-time community discussion'}
                  </p>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {channelMessages.length === 0 ? (
                  <p className="text-sm text-neutral-500">
                    No messages in #{channel} yet. Start the conversation below.
                  </p>
                ) : (
                  channelMessages.map((msg) => (
                    <div
                      key={msg.id}
                      className="flex items-start gap-3 pb-3 border-b border-neutral-100 last:border-b-0"
                    >
                      <div className="w-8 h-8 rounded-lg bg-neutral-900 text-white text-xs font-bold flex items-center justify-center shrink-0">
                        {msg.authorName.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 text-xs">
                          <span className="font-semibold text-[#111111]">
                            {msg.authorName}
                          </span>
                          <span className="text-neutral-400">
                            @{msg.authorHandle}
                          </span>
                          {msg.displayTime && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="text-neutral-400">
                                {msg.displayTime}
                              </span>
                            </>
                          )}
                        </div>
                        <p className="text-sm text-neutral-700 mt-1 leading-relaxed">
                          {msg.text}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <form
                onSubmit={handleSendMessage}
                className="p-4 border-t border-neutral-200 bg-[#FAFAFA] rounded-b-2xl"
              >
                {channel === 'announcements' && !isOwner ? (
                  <p className="text-xs text-neutral-500 text-center py-2">
                    Only the storefront creator can publish in #announcements.
                  </p>
                ) : (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={draftMessage}
                      onChange={(e) => setDraftMessage(e.target.value)}
                      placeholder={
                        user
                          ? `Message #${channel}...`
                          : 'Sign in to post a message...'
                      }
                      className="flex-1 h-10 px-4 bg-white border border-neutral-200 rounded-xl text-sm focus:outline-none focus:border-[#111111]"
                    />
                    <button
                      type="submit"
                      disabled={sending}
                      className="px-4 h-10 bg-[#111111] hover:bg-neutral-800 disabled:opacity-50 text-white text-sm font-medium rounded-xl inline-flex items-center gap-2 transition-colors"
                    >
                      <Send className="w-4 h-4" />
                      Send
                    </button>
                  </div>
                )}
              </form>
            </div>
          )}

          {/* TAB 2: COURSES */}
          {activeTab === 'courses' && (
            <div className="p-6 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-neutral-200">
                <div>
                  <h2 className="font-display text-xl font-bold text-[#111111]">
                    Course Curriculum
                  </h2>
                  <p className="text-xs text-neutral-500 mt-0.5 tabular-nums">
                    {completedIds.length} of {lessons.length} lessons completed ({completionPct}%)
                  </p>
                </div>
                <div className="w-44 h-2 bg-neutral-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#FA4616] transition-all duration-300"
                    style={{ width: `${completionPct}%` }}
                  />
                </div>
              </div>

              {lessons.length === 0 ? (
                <p className="text-sm text-neutral-500 py-8">
                  No course lessons have been published to this Whop yet.
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                  <div className="md:col-span-5 space-y-2">
                    {lessons.map((lesson, index) => {
                      const done = completedIds.includes(lesson.id);
                      const selected = activeLesson?.id === lesson.id;
                      return (
                        <button
                          key={lesson.id}
                          type="button"
                          onClick={() => setSelectedLessonId(lesson.id)}
                          className={`w-full text-left p-3.5 rounded-xl border transition-colors ${
                            selected
                              ? 'border-[#111111] bg-[#FAFAFA]'
                              : 'border-neutral-200 bg-white hover:border-neutral-300'
                          }`}
                        >
                          <div className="flex items-center justify-between text-xs text-neutral-500">
                            <span>{lesson.moduleTitle}</span>
                            <span className="tabular-nums">{lesson.duration}</span>
                          </div>
                          <div className="mt-1 flex items-center justify-between gap-2">
                            <span className="text-sm font-semibold text-[#111111]">
                              {index + 1}. {lesson.title}
                            </span>
                            {done && (
                              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {activeLesson && (
                    <div className="md:col-span-7 bg-[#FAFAFA] border border-neutral-200 rounded-xl p-6 space-y-4">
                      <div className="text-xs font-medium text-[#FA4616]">
                        {activeLesson.moduleTitle} · {activeLesson.duration}
                      </div>
                      <h3 className="font-display text-xl font-bold text-[#111111]">
                        {activeLesson.title}
                      </h3>
                      <p className="text-sm font-medium text-neutral-700">
                        {activeLesson.summary}
                      </p>
                      <div className="pt-4 border-t border-neutral-200 text-sm text-neutral-700 leading-relaxed whitespace-pre-line">
                        {activeLesson.content}
                      </div>

                      {membership && (
                        <div className="pt-4 border-t border-neutral-200">
                          <button
                            type="button"
                            onClick={() => handleToggleLesson(activeLesson.id)}
                            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors inline-flex items-center gap-2 ${
                              completedIds.includes(activeLesson.id)
                                ? 'bg-emerald-600 text-white'
                                : 'bg-[#111111] text-white hover:bg-neutral-800'
                            }`}
                          >
                            <Check className="w-4 h-4" />
                            {completedIds.includes(activeLesson.id)
                              ? 'Completed'
                              : 'Mark Lesson Complete'}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: FILES & LICENSE KEYS */}
          {activeTab === 'files' && (
            <div className="p-6 space-y-6">
              <div>
                <h2 className="font-display text-xl font-bold text-[#111111]">
                  Files & License Keys
                </h2>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Download member assets and manage your personal software license key.
                </p>
              </div>

              {/* License Key Card */}
              <div className="bg-[#FAFAFA] border border-neutral-200 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[#111111] text-white flex items-center justify-center shrink-0">
                    <KeyRound className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs text-neutral-500">
                      Your Personal License Key
                    </div>
                    <div className="font-mono text-sm font-semibold text-[#111111] mt-0.5">
                      {membership?.licenseKey || 'WHOP-FREE-MEMBER-ACCESS'}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleCopyLicense}
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-[#111111] bg-white border border-neutral-200 hover:border-neutral-400 rounded-lg transition-colors shrink-0"
                >
                  {copiedKey ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      Copy Key
                    </>
                  )}
                </button>
              </div>

              {/* Deliverables Table */}
              <div className="border border-neutral-200 rounded-xl divide-y divide-neutral-200">
                {files.length === 0 ? (
                  <p className="p-6 text-sm text-neutral-500">
                    No downloadable files attached to this Whop yet.
                  </p>
                ) : (
                  files.map((file) => (
                    <div
                      key={file.id}
                      className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div>
                        <div className="text-sm font-semibold text-[#111111]">
                          {file.title}
                        </div>
                        <div className="text-xs text-neutral-500 mt-0.5">
                          {file.fileType} · {file.fileSize} — {file.description}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDownloadFile(file)}
                        className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#111111] hover:bg-neutral-800 rounded-lg transition-colors shrink-0"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Download
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 4: PASS & BILLING */}
          {activeTab === 'billing' && (
            <div className="p-6 space-y-6">
              <div>
                <h2 className="font-display text-xl font-bold text-[#111111]">
                  Member Pass & Billing
                </h2>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Subscription status and storefront access details.
                </p>
              </div>

              <div className="border border-neutral-200 rounded-xl p-5 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-xs text-neutral-500">Plan</div>
                    <div className="font-semibold text-[#111111] mt-0.5">
                      {membership?.planLabel || 'Open Free Access'}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-neutral-500">Price</div>
                    <div className="font-mono font-semibold text-[#111111] mt-0.5 tabular-nums">
                      {formatMoney(membership?.priceCents ?? whop.priceCents)}
                      {formatBillingSuffix(
                        membership?.billingInterval ?? whop.billingInterval
                      )}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-neutral-500">Status</div>
                    <div className="font-semibold text-emerald-700 mt-0.5 capitalize">
                      {membership?.status || 'active'}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-neutral-500">Pass ID</div>
                    <div className="font-mono text-xs text-neutral-700 mt-1 truncate">
                      {membership?.id || `open_${whop.id}`}
                    </div>
                  </div>
                </div>

                {statusMessage && (
                  <p className="text-xs text-neutral-600">{statusMessage}</p>
                )}

                {membership && (
                  <div className="pt-4 border-t border-neutral-100">
                    <button
                      type="button"
                      onClick={handleToggleMembershipStatus}
                      className="px-4 py-2 text-xs font-semibold text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-lg transition-colors"
                    >
                      {membership.status === 'active'
                        ? 'Cancel Renewal'
                        : 'Reactivate Pass'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
