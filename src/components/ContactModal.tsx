import { type FormEvent, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, Copy, X } from 'lucide-react';
import { validateInquiryForm } from '../utils/portfolioHelpers';

interface ContactModalProps {
  open: boolean;
  onClose: () => void;
}

export function ContactModal({ open, onClose }: ContactModalProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [errors, setErrors] = useState<Partial<Record<'name' | 'email' | 'message', string>>>({});
  const [submitted, setSubmitted] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  const handleCopyEmail = async () => {
    try {
      await navigator.clipboard.writeText('hello@michaelsmith.com');
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked in strict sandbox; mailto link remains available
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const validation = validateInquiryForm({ name, email, message });
    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }
    setErrors({});
    setSubmitted(true);
  };

  const handleResetAndClose = () => {
    setSubmitted(false);
    setName('');
    setEmail('');
    setMessage('');
    setErrors({});
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-6"
          onClick={handleResetAndClose}
          role="dialog"
          aria-modal="true"
          aria-label="Say hi to Michael Smith"
        >
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-lg bg-surface border border-stroke rounded-3xl p-6 sm:p-8"
          >
            <button
              type="button"
              onClick={handleResetAndClose}
              aria-label="Close contact dialog"
              className="absolute top-5 right-5 w-9 h-9 rounded-full bg-bg border border-stroke text-muted hover:text-text-primary flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>

            <p className="text-xs text-muted uppercase tracking-[0.3em] mb-2">Say hi</p>
            <h3 className="text-3xl font-display italic text-text-primary mb-2">
              Start a conversation
            </h3>
            <p className="text-sm text-muted mb-6">
              Based in Chicago — open for select creative direction and engineering partnerships.
            </p>

            <div className="flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-bg border border-stroke mb-6">
              <a
                href="mailto:hello@michaelsmith.com"
                className="text-sm text-text-primary hover:text-[#89AACC] transition-colors truncate"
              >
                hello@michaelsmith.com
              </a>
              <button
                type="button"
                onClick={handleCopyEmail}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface border border-stroke text-xs text-text-primary hover:border-[#89AACC] transition-colors shrink-0 cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>

            {submitted ? (
              <div className="py-8 text-center">
                <p className="font-display italic text-2xl text-text-primary mb-2">
                  Thank you, {name}.
                </p>
                <p className="text-sm text-muted mb-6">
                  Your note has been prepared. I typically respond within one business day.
                </p>
                <button
                  type="button"
                  onClick={handleResetAndClose}
                  className="px-6 py-2.5 rounded-full bg-text-primary text-bg text-sm font-medium cursor-pointer"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} noValidate className="space-y-4">
                <div>
                  <label htmlFor="contact-name" className="block text-xs text-muted mb-1.5">
                    Name
                  </label>
                  <input
                    id="contact-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name"
                    className="w-full px-4 py-2.5 rounded-xl bg-bg border border-stroke text-sm text-text-primary placeholder:text-muted/60 focus:outline-none focus:border-[#89AACC]"
                  />
                  {errors.name && (
                    <p className="text-xs text-rose-400 mt-1">{errors.name}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="contact-email" className="block text-xs text-muted mb-1.5">
                    Email
                  </label>
                  <input
                    id="contact-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@studio.com"
                    className="w-full px-4 py-2.5 rounded-xl bg-bg border border-stroke text-sm text-text-primary placeholder:text-muted/60 focus:outline-none focus:border-[#89AACC]"
                  />
                  {errors.email && (
                    <p className="text-xs text-rose-400 mt-1">{errors.email}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="contact-message" className="block text-xs text-muted mb-1.5">
                    Project brief
                  </label>
                  <textarea
                    id="contact-message"
                    rows={3}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Tell me about the timeline and what we are building..."
                    className="w-full px-4 py-2.5 rounded-xl bg-bg border border-stroke text-sm text-text-primary placeholder:text-muted/60 focus:outline-none focus:border-[#89AACC] resize-none"
                  />
                  {errors.message && (
                    <p className="text-xs text-rose-400 mt-1">{errors.message}</p>
                  )}
                </div>

                <button
                  type="submit"
                  className="w-full py-3 rounded-full bg-text-primary text-bg hover:opacity-90 text-sm font-medium transition-opacity cursor-pointer"
                >
                  Send message
                </button>
              </form>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
