import { Outlet, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import Navbar from "./Navbar";
import SidebarLeft from "./SidebarLeft";
import SidebarRight from "./SidebarRight";
import DepartmentRequestModal from "../modals/DepartmentRequestModal";
import { useModal } from "../../context/ModalContext";
import { isAdminUser, isDepartmentUser } from "../../utils/auth";

const MainLayout = () => {
  const location = useLocation();
  const { isAnyModalOpen } = useModal();
  const hideRightSidebar =
    location.pathname.startsWith("/admin/dashboard") ||
    isAdminUser() ||
    location.pathname.startsWith("/department/dashboard") ||
    isDepartmentUser();

  return (
    <div className="drawer lg:drawer-open">
      <DepartmentRequestModal />
      {/* Drawer toggle */}
      <input id="mobile-drawer" type="checkbox" className="drawer-toggle" />

      {/* MAIN CONTENT */}
      <div className="drawer-content h-[100dvh] overflow-hidden flex flex-col relative">
        {/* Dim overlay when any modal is open */}
        <AnimatePresence>
          {isAnyModalOpen && (
            <motion.div
              key="modal-dim"
              className="absolute inset-0 z-[90] bg-black/30 pointer-events-none"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            />
          )}
        </AnimatePresence>

        <Navbar />

        <motion.div
          className="flex-1 flex flex-col bg-base-100 text-base-content overflow-hidden relative"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
        >
          {/* Layout area BELOW navbar */}
          <div className="flex-1 min-h-0 overflow-hidden relative flex flex-col h-full">
            <div className="mx-auto max-w-[1780px] px-4 w-full flex-1 min-h-0 flex flex-col h-full">
              <div className="grid grid-cols-12 gap-4 flex-1 min-h-0 w-full h-full">

                {/* LEFT SIDEBAR */}
                <aside className="hidden lg:block lg:col-span-3 h-full py-4 min-h-0">
                  <div className="h-full overflow-y-auto scrollbar-hide">
                    <SidebarLeft />
                  </div>
                </aside>

                {/* CENTER — page content animates, layout stays mounted */}
                <main className={`col-span-12 lg:col-span-9 ${hideRightSidebar ? "xl:col-span-9" : "xl:col-span-6"} h-full ${location.pathname.includes("quick-chat") || location.pathname.startsWith("/admin/dashboard") ? "pb-0 overflow-hidden flex flex-col" : "pb-20 sm:pb-4 overflow-y-auto"} scrollbar-hide min-h-0`}>
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.div
                      key={location.pathname}
                      className={location.pathname.includes("quick-chat") || location.pathname.startsWith("/admin/dashboard") ? "flex-1 min-h-0 h-full flex flex-col pt-0" : "pt-3"}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.15, ease: "easeOut" }}
                    >
                      <Outlet />
                    </motion.div>
                  </AnimatePresence>
                </main>
                
                {/* RIGHT SIDEBAR */}
                {!hideRightSidebar && (
                  <aside className="hidden xl:block xl:col-span-3 h-full py-4 min-h-0">
                    <div className="h-full overflow-y-auto scrollbar-hide">
                      <SidebarRight />
                    </div>
                  </aside>
                )}

              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* MOBILE DRAWER */}
      <div className="drawer-side lg:hidden z-50">
        <label
          htmlFor="mobile-drawer"
          className="drawer-overlay mt-[calc(3.75rem+env(safe-area-inset-top,0px))] h-[calc(100dvh-(3.75rem+env(safe-area-inset-top,0px)))]"
        />

        <div className="mt-[calc(3.75rem+env(safe-area-inset-top,0px))] h-[calc(100dvh-(3.75rem+env(safe-area-inset-top,0px)))] w-72 bg-base-200 p-4 flex flex-col">
          {/* Drawer Header */}
          <div className="mb-4 flex items-center justify-between">
            <span className="text-sm font-semibold opacity-70">Menu</span>
            <label htmlFor="mobile-drawer" className="btn btn-ghost btn-sm">
              ✕
            </label>
          </div>

          <div className="flex-1 overflow-y-auto hide-scrollbar scrollbar-hide">
            <SidebarLeft />
          </div>
        </div>
      </div>
    </div>
  );
};

export default MainLayout;
