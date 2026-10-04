import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { EmailMessage } from '../types.ts';
import { api } from '../lib/api.ts';
import {
  X,
  Mail,
  Trash2,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Clock,
  Sparkles,
  Copy,
  Check,
} from 'lucide-react';

export const CatMailDrawer: React.FC = () => {
  const {
    isMailboxOpen,
    setIsMailboxOpen,
    mailbox,
    refreshMailbox,
    verifyEmail,
    showToast,
  } = useAuth();

  const [selectedMail, setSelectedMail] = useState<EmailMessage | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [verifying, setVerifying] = useState(false);

  if (!isMailboxOpen) return null;

  const activeMail = selectedMail || mailbox[0] || null;

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    showToast(`Copied ${code} to clipboard!`, 'info');
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleQuickVerify = async (mail: EmailMessage) => {
    setVerifying(true);
    try {
      if (mail.verificationToken) {
        await verifyEmail({ token: mail.verificationToken });
      } else if (mail.verificationCode) {
        await verifyEmail({ code: mail.verificationCode });
      }
      showToast('Verified directly from CatMail message!', 'success');
      setIsMailboxOpen(false);
    } catch (err: any) {
      showToast(err.message || 'Verification failed', 'error');
    } finally {
      setVerifying(false);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await api.deleteMail(id);
    if (selectedMail?.id === id) {
      setSelectedMail(null);
    }
    await refreshMailbox();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
      <div className="absolute inset-0" onClick={() => setIsMailboxOpen(false)} />

      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-2xl bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col">
          {/* Top Bar */}
          <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  CatMail Simulator
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-mono">
                    crakkocat.com
                  </span>
                </h2>
                <p className="text-xs text-slate-400">
                  Real-time incoming feline verification emails &amp; security dispatches
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => refreshMailbox()}
                className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
                title="Refresh Inbox"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsMailboxOpen(false)}
                className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Main Body: List + View */}
          <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
            {/* Email List */}
            <div className="w-full md:w-5/12 border-r border-slate-800 overflow-y-auto divide-y divide-slate-800/80 bg-slate-950/30">
              {mailbox.length === 0 ? (
                <div className="p-8 text-center text-slate-500">
                  <Mail className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-400" />
                  <p className="text-xs">No emails received yet.</p>
                  <p className="text-[11px] text-slate-600 mt-1">
                    Register a new account to trigger automated verification dispatch.
                  </p>
                </div>
              ) : (
                mailbox.map(mail => {
                  const isSelected = activeMail?.id === mail.id;
                  return (
                    <div
                      key={mail.id}
                      onClick={() => setSelectedMail(mail)}
                      className={`p-3.5 cursor-pointer transition flex flex-col gap-1 relative ${
                        isSelected
                          ? 'bg-slate-800/90 text-white'
                          : 'hover:bg-slate-800/50 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <span className="font-semibold text-cyan-400 truncate max-w-[130px]">
                          {mail.to}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px]">
                            {new Date(mail.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <button
                            onClick={e => handleDelete(mail.id, e)}
                            className="p-1 hover:text-rose-400 text-slate-500 transition"
                            title="Delete Email"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      <div className="font-medium text-xs truncate text-slate-200">
                        {mail.subject}
                      </div>

                      <div className="text-[11px] text-slate-400 line-clamp-1">
                        {mail.preview}
                      </div>

                      {mail.verificationCode && (
                        <div className="mt-1 flex items-center gap-1.5">
                          <span className="font-mono text-[10px] bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 px-1.5 py-0.5 rounded font-bold">
                            PIN: {mail.verificationCode}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Email Viewer */}
            <div className="w-full md:w-7/12 flex-1 flex flex-col overflow-y-auto bg-slate-900/60 p-4 sm:p-6">
              {activeMail ? (
                <div className="space-y-4">
                  {/* Email Metadata */}
                  <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-bold text-sm text-white">{activeMail.subject}</h3>
                        <div className="mt-1 text-xs text-slate-400 space-y-0.5">
                          <div>
                            <span className="text-slate-500">From:</span> Sentinel CatAuth &lt;security@crakkocat.com&gt;
                          </div>
                          <div>
                            <span className="text-slate-500">To:</span>{' '}
                            <span className="text-cyan-400 font-mono">{activeMail.to}</span>
                          </div>
                          <div>
                            <span className="text-slate-500">Date:</span>{' '}
                            {new Date(activeMail.sentAt).toLocaleString()}
                          </div>
                        </div>
                      </div>

                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono uppercase font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        Delivered
                      </span>
                    </div>

                    {/* Quick 1-Click Action Bar if verification */}
                    {activeMail.verificationCode && (
                      <div className="mt-4 pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2 bg-cyan-950/20 -mx-4 -mb-4 p-3 rounded-b-xl border-t border-cyan-500/20">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-300 font-medium">PIN Code:</span>
                          <span className="font-mono font-bold text-sm text-cyan-300 bg-slate-900 px-2 py-1 rounded border border-cyan-500/30">
                            {activeMail.verificationCode}
                          </span>
                          <button
                            onClick={() => handleCopy(activeMail.verificationCode!)}
                            className="p-1 text-slate-400 hover:text-white transition cursor-pointer"
                            title="Copy PIN"
                          >
                            {copiedCode ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                          </button>
                        </div>

                        <button
                          onClick={() => handleQuickVerify(activeMail)}
                          disabled={verifying}
                          className="px-3 py-1.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold text-xs rounded-lg shadow-sm transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>{verifying ? 'Verifying...' : '1-Tap Verify'}</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Rendered HTML Message */}
                  <div className="border border-slate-800 rounded-xl overflow-hidden shadow-inner bg-[#0b1120]">
                    <div
                      dangerouslySetInnerHTML={{ __html: activeMail.htmlContent }}
                      className="text-xs"
                    />
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center text-slate-500 text-xs">
                  Select an email to view full content
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
