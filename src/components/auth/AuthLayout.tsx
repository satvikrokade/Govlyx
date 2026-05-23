import type { ReactNode } from "react";
import { motion } from "framer-motion";

type Props = {
  children: ReactNode;
};

const AuthLayout = ({ children }: Props) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-base-100 px-4">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="w-full max-w-md rounded-xl border border-base-300 bg-base-200 p-6"
      >
        {children}
      </motion.div>
    </div>
  );
};

export default AuthLayout;
