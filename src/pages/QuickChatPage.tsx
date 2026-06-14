import StrangerChat from "../components/layout/StrangerChat";
import { useNavigate } from "react-router-dom";
import ScreenshotProtectionOverlay from "../components/security/ScreenshotProtectionOverlay";

const QuickChatPage = () => {
  const navigate = useNavigate();

  return (
    <div className="w-full h-[calc(100dvh-3.5rem)] md:h-[calc(100vh-6rem)] flex flex-col overflow-hidden rounded-none md:rounded-3xl border-0 md:border md:border-base-300">
      <StrangerChat standalone onClose={() => navigate("/dashboard")} />
      <ScreenshotProtectionOverlay />
    </div>
  );
};

export default QuickChatPage;
