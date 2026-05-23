import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Loader2 } from "lucide-react";

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDanger?: boolean;
  isLoading?: boolean;
}

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  isDanger = true,
  isLoading = false,
}: ConfirmModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, y: 15, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.95, y: 15, opacity: 0 }}
            transition={{ type: "spring", duration: 0.4, bounce: 0.1 }}
            className="w-full max-w-sm rounded-[2rem] border border-base-300 bg-base-100 p-6 shadow-2xl text-center relative flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Warning Circle */}
            <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 ${
              isDanger ? "bg-red-500/10 text-red-500" : "bg-primary/10 text-primary"
            }`}>
              <AlertTriangle size={24} />
            </div>

            {/* Content */}
            <h3 className="text-lg font-extrabold text-base-content tracking-tight">{title}</h3>
            <p className="text-xs font-semibold text-base-content/60 mt-2 leading-relaxed max-w-[90%]">
              {message}
            </p>

            {/* Actions */}
            <div className="mt-6 flex gap-3 w-full">
              <button
                disabled={isLoading}
                onClick={onClose}
                className="flex-1 h-11 rounded-xl font-bold text-xs uppercase tracking-wider text-base-content/75 hover:bg-base-200 border-none bg-transparent transition-all duration-200 cursor-pointer"
              >
                {cancelLabel}
              </button>
              <button
                disabled={isLoading}
                onClick={onConfirm}
                className={`flex-1 h-11 rounded-xl font-extrabold text-xs uppercase tracking-wider text-white transition-all duration-200 flex items-center justify-center gap-2 border-none cursor-pointer shadow-lg ${
                  isDanger
                    ? "bg-red-600 hover:bg-red-700 shadow-red-600/20 disabled:bg-red-600/40"
                    : "bg-[#1D4ED8] hover:bg-[#1D4ED8]/90 shadow-[#1D4ED8]/20 disabled:bg-[#1D4ED8]/40"
                }`}
              >
                {isLoading ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  confirmLabel
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
