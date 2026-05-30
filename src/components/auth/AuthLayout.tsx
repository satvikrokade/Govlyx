import type { ReactNode } from "react";
import { motion } from "framer-motion";

type Props = {
  children: ReactNode;
};

const AuthLayout = ({ children }: Props) => {
  return (
    <div className="w-full h-full overflow-y-auto bg-base-100">
      <div className="min-h-full flex items-center justify-center px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="w-full max-w-md rounded-xl border border-base-300 bg-base-200 p-6 shadow-xl"
        >
          {children}
        </motion.div>
      </div>
    </div>
  );
};

export default AuthLayout;
