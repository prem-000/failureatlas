'use client';
/**
 * src/components/navigation/MobileDrawer.tsx
 *
 * Premium mobile navigation drawer utilizing Framer Motion.
 * Fully responsive down to 320px screen width.
 */

import React, { useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  navLinks: Array<{ label: string; href: string }>;
}

export default function MobileDrawer({ isOpen, onClose, navLinks }: MobileDrawerProps) {
  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.6 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black z-50 backdrop-blur-sm"
          />

          {/* Drawer Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 bottom-0 w-full max-w-[320px] bg-surface border-l border-border z-50 shadow-2xl flex flex-col p-6"
          >
            {/* Header */}
            <div className="flex justify-between items-center mb-10">
              <span className="text-xl font-bold text-foreground">Praxis</span>
              <button
                onClick={onClose}
                className="w-11 h-11 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                aria-label="Close menu"
              >
                <X size={20} />
              </button>
            </div>

            {/* Links */}
            <nav className="flex flex-col gap-6 flex-1">
              {navLinks.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  onClick={onClose}
                  className="text-lg font-medium text-muted-foreground hover:text-primary transition-colors py-2 px-1 border-b border-border/20"
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            {/* Action Buttons */}
            <div className="flex flex-col gap-3 mt-auto">
              <Link href="/login" onClick={onClose} className="w-full">
                <Button variant="secondary" size="lg" className="w-full justify-center">
                  Login
                </Button>
              </Link>
              <Link href="/register" onClick={onClose} className="w-full">
                <Button size="lg" className="w-full justify-center">
                  Get Started
                </Button>
              </Link>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
