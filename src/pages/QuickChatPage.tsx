import StrangerChat from "../components/layout/StrangerChat";
import { useNavigate } from "react-router-dom";

const QuickChatPage = () => {
  const navigate = useNavigate();

  return (
    <div className="w-full h-screen flex flex-col overflow-hidden rounded-none md:rounded-3xl border-0 md:border md:border-base-300 md:h-[calc(100vh-6rem)]">
      <StrangerChat standalone onClose={() => navigate("/dashboard")} />
    </div>
  );
};

export default QuickChatPage;
