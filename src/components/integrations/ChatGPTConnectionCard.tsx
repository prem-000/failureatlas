'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  History,
  Target,
  ScanSearch,
  GraduationCap,
  CheckCircle2,
  ShieldCheck,
  AlertCircle,
  Loader2,
  Unlink,
  X,
} from 'lucide-react';
import { ChatGPTIcon } from '@/components/icons/ChatGPTIcon';
import { useChatGPTIntegration } from '@/hooks/useChatGPTIntegration';

export interface ChatGPTConnectionCardProps {
  /** Optional custom title override */
  title?: string;
  /** Custom className for container */
  className?: string;
}

const SCOPE_ITEMS = [
  {
    key: 'history',
    label: 'Failure history',
    detail: 'Recent submission attempts and error patterns',
    icon: History,
    color: '#fb923c', // Failure orange
  },
  {
    key: 'weaknesses',
    label: 'Recurring weaknesses',
    detail: 'Ranked systemic knowledge gaps and blind spots',
    icon: Target,
    color: '#a855f7', // Weakness purple
  },
  {
    key: 'diagnosis',
    label: 'Diagnosis results',
    detail: 'AI-generated root cause analysis and breakdowns',
    icon: ScanSearch,
    color: '#f59e0b', // Root cause amber
  },
  {
    key: 'recommendations',
    label: 'Learning recommendations',
    detail: 'Targeted practice strategies and problem suggestions',
    icon: GraduationCap,
    color: '#22c55e', // Strategy green
  },
] as const;

export const ChatGPTConnectionCard: React.FC<ChatGPTConnectionCardProps> = ({
  className = '',
}) => {
  const shouldReduceMotion = useReducedMotion();
  const {
    data,
    isLoading,
    isError,
    error,
    connectToChatGPT,
    isConnecting,
    connectError,
    disconnectFromChatGPT,
    isDisconnecting,
    disconnectError,
  } = useChatGPTIntegration();

  const [isPending, setIsPending] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [localErrorMessage, setLocalErrorMessage] = useState<string | null>(null);

  const isConnected = data?.connected ?? false;
  const connectedAt = data?.connectedAt;

  // Handle Connect Action
  const handleConnect = async () => {
    setLocalErrorMessage(null);
    setIsPending(true);
    try {
      // Simulate authorization step feedback before backend confirmation
      await new Promise((res) => setTimeout(res, 600));
      await connectToChatGPT();
    } catch (e: unknown) {
      setLocalErrorMessage(
        e instanceof Error ? e.message : 'Authorization failed. Please try again.'
      );
    } finally {
      setIsPending(false);
    }
  };

  // Handle Disconnect Action
  const handleDisconnect = async () => {
    setLocalErrorMessage(null);
    try {
      await disconnectFromChatGPT();
      setShowConfirmModal(false);
    } catch (e: unknown) {
      setLocalErrorMessage(
        e instanceof Error ? e.message : 'Failed to disconnect ChatGPT integration.'
      );
    }
  };

  // Stagger animation container
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: shouldReduceMotion ? 0 : 0.08,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: shouldReduceMotion ? 0 : 8 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.25 },
    },
  };

  // Determine current component state: loading | error | pending | connected | disconnected
  const currentState = isLoading
    ? 'loading'
    : isError || connectError || disconnectError || localErrorMessage
    ? 'error'
    : isConnecting || isPending
    ? 'pending'
    : isConnected
    ? 'connected'
    : 'disconnected';

  const displayedError =
    localErrorMessage ||
    (connectError instanceof Error ? connectError.message : null) ||
    (disconnectError instanceof Error ? disconnectError.message : null) ||
    (error instanceof Error ? error.message : null);

  return (
    <div className={className} style={{ width: '100%' }}>
      {/* Motion Card Container */}
      <motion.div
        whileHover={shouldReduceMotion ? {} : { scale: 1.01 }}
        transition={{ duration: 0.2 }}
        style={{
          background: '#191919',
          border: `1px solid ${isConnected ? '#22c55e40' : '#3f3f46'}`,
          borderRadius: 12,
          padding: 24,
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
          boxShadow: isConnected
            ? '0 4px 20px rgba(34, 197, 94, 0.06)'
            : '0 4px 20px rgba(0, 0, 0, 0.2)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Card Header Row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 10,
                background: '#27272a',
                border: '1px solid #3f3f46',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#f8fafc',
                flexShrink: 0,
              }}
            >
              <ChatGPTIcon size={26} color="#f8fafc" />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 16, fontWeight: 700, color: '#f8fafc', letterSpacing: '-0.01em' }}>
                  Praxis + ChatGPT
                </span>
                {currentState === 'connected' && (
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: '#22c55e',
                      background: '#22c55e1a',
                      border: '1px solid #22c55e40',
                      borderRadius: 20,
                      padding: '2px 10px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <CheckCircle2 size={12} /> Connected
                  </span>
                )}
                {currentState === 'pending' && (
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: '#f59e0b',
                      background: '#f59e0b1a',
                      border: '1px solid #f59e0b40',
                      borderRadius: 20,
                      padding: '2px 10px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <Loader2 size={12} className="animate-spin" /> Authorizing...
                  </span>
                )}
              </div>
              <span style={{ fontSize: 13, color: '#a1a1aa' }}>
                {currentState === 'connected'
                  ? 'ChatGPT can access your authorized Praxis learning memory.'
                  : 'Bring your Praxis learning memory into ChatGPT.'}
              </span>
            </div>
          </div>

          {/* Top Right Quick Badge/Action */}
          {currentState === 'connected' && connectedAt && (
            <span style={{ fontSize: 11, color: '#71717a', whiteSpace: 'nowrap' }}>
              Connected since {new Date(connectedAt).toLocaleDateString()}
            </span>
          )}
        </div>

        {/* ── State: Loading ── */}
        {currentState === 'loading' && (
          <div
            style={{
              padding: '24px 0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 12,
              color: '#a1a1aa',
              fontSize: 13,
            }}
          >
            <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
            Checking connection status...
          </div>
        )}

        {/* ── State: Error feedback banner ── */}
        {displayedError && (
          <div
            style={{
              background: '#450a0a',
              border: '1px solid #ef4444',
              borderRadius: 8,
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              color: '#f8fafc',
              fontSize: 13,
            }}
          >
            <AlertCircle size={18} color="#ef4444" style={{ flexShrink: 0 }} />
            <span style={{ flex: 1 }}>{displayedError}</span>
            <button
              onClick={() => setLocalErrorMessage(null)}
              className="compact"
              style={{
                background: 'transparent',
                border: 'none',
                color: '#a1a1aa',
                cursor: 'pointer',
                padding: 4,
              }}
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* ── Checklist / Permissions Section ── */}
        {currentState !== 'loading' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: '#a1a1aa',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
              }}
            >
              ChatGPT can access your:
            </span>

            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: 10,
              }}
            >
              {SCOPE_ITEMS.map((scope) => {
                const ScopeIcon = scope.icon;
                return (
                  <motion.div
                    key={scope.key}
                    variants={itemVariants}
                    style={{
                      background: '#131313',
                      border: '1px solid #27272a',
                      borderRadius: 8,
                      padding: '12px 14px',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 10,
                    }}
                  >
                    <div
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: 6,
                        background: isConnected ? '#22c55e15' : '#27272a',
                        border: `1px solid ${isConnected ? '#22c55e40' : '#3f3f46'}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        marginTop: 1,
                      }}
                    >
                      {isConnected ? (
                        <CheckCircle2 size={14} color="#22c55e" />
                      ) : (
                        <ScopeIcon size={14} color={scope.color} />
                      )}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#f8fafc' }}>
                        {scope.label}
                      </span>
                      <span style={{ fontSize: 11, color: '#a1a1aa', lineHeight: 1.3 }}>
                        {scope.detail}
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          </div>
        )}

        {/* ── Privacy & Scope Guarantee Banner ── */}
        <div
          style={{
            background: '#131313',
            border: '1px solid #27272a',
            borderRadius: 8,
            padding: '10px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <ShieldCheck size={16} color="#22c55e" style={{ flexShrink: 0 }} />
          <span style={{ fontSize: 12, color: '#a1a1aa', lineHeight: 1.4 }}>
            ChatGPT can access only the Praxis information authorized by you. Reuses your secure Praxis session identity.
          </span>
        </div>

        {/* ── Action Bar ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 12, paddingTop: 4 }}>
          {currentState === 'disconnected' && (
            <motion.button
              whileHover={shouldReduceMotion ? {} : { scale: 1.02 }}
              whileTap={shouldReduceMotion ? {} : { scale: 0.98 }}
              onClick={handleConnect}
              disabled={isPending}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                background: '#ff5f52',
                border: 'none',
                borderRadius: 8,
                padding: '10px 20px',
                color: '#ffffff',
                fontSize: 13,
                fontWeight: 600,
                cursor: isPending ? 'wait' : 'pointer',
                boxShadow: '0 4px 14px rgba(255, 95, 82, 0.25)',
                transition: 'background 0.2s',
              }}
            >
              {isPending ? (
                <>
                  <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                  Authorizing...
                </>
              ) : (
                <>
                  <ChatGPTIcon size={18} color="#ffffff" />
                  Connect to ChatGPT
                </>
              )}
            </motion.button>
          )}

          {currentState === 'connected' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <motion.button
                whileHover={shouldReduceMotion ? {} : { scale: 1.02 }}
                whileTap={shouldReduceMotion ? {} : { scale: 0.98 }}
                onClick={() => setShowConfirmModal(true)}
                disabled={isDisconnecting}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  background: '#27272a',
                  border: '1px solid #3f3f46',
                  borderRadius: 8,
                  padding: '9px 16px',
                  color: '#f8fafc',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: isDisconnecting ? 'wait' : 'pointer',
                  transition: 'background 0.15s, border-color 0.15s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#ef4444')}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#3f3f46')}
              >
                <Unlink size={15} color="#a1a1aa" />
                Manage connection
              </motion.button>
            </div>
          )}
        </div>
      </motion.div>

      {/* ── Disconnect Confirmation Modal ── */}
      <AnimatePresence>
        {showConfirmModal && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 9999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(0, 0, 0, 0.75)',
              backdropFilter: 'blur(4px)',
              padding: 20,
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              style={{
                width: '100%',
                maxWidth: 440,
                background: '#191919',
                border: '1px solid #3f3f46',
                borderRadius: 12,
                padding: 24,
                display: 'flex',
                flexDirection: 'column',
                gap: 16,
                boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    background: '#450a0a',
                    border: '1px solid #ef4444',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Unlink size={20} color="#ef4444" />
                </div>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: '#f8fafc', margin: 0 }}>
                    Disconnect ChatGPT?
                  </h3>
                  <span style={{ fontSize: 12, color: '#a1a1aa' }}>Access revocation</span>
                </div>
              </div>

              <p style={{ fontSize: 13, color: '#a1a1aa', lineHeight: 1.6, margin: 0 }}>
                ChatGPT will no longer be able to access your Praxis learning memory. Your Praxis data will remain safe and preserved in your account.
              </p>

              <div
                style={{
                  background: '#131313',
                  border: '1px solid #27272a',
                  borderRadius: 8,
                  padding: '10px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontSize: 12,
                  color: '#22c55e',
                }}
              >
                <CheckCircle2 size={16} color="#22c55e" style={{ flexShrink: 0 }} />
                <span>Your submissions, diagnoses, and learning history will not be deleted.</span>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  gap: 10,
                  paddingTop: 8,
                }}
              >
                <button
                  onClick={() => setShowConfirmModal(false)}
                  disabled={isDisconnecting}
                  style={{
                    background: '#27272a',
                    border: '1px solid #3f3f46',
                    borderRadius: 8,
                    padding: '8px 16px',
                    color: '#f8fafc',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDisconnect}
                  disabled={isDisconnecting}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    background: '#ef4444',
                    border: 'none',
                    borderRadius: 8,
                    padding: '8px 16px',
                    color: '#ffffff',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: isDisconnecting ? 'wait' : 'pointer',
                  }}
                >
                  {isDisconnecting ? (
                    <>
                      <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                      Disconnecting...
                    </>
                  ) : (
                    'Disconnect'
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ChatGPTConnectionCard;
