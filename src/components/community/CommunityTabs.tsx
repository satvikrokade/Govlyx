type CommunityTabsProps = {
  active: "posts" | "about";
  onChange: (tab: "posts" | "about") => void;
};

const CommunityTabs = ({ active, onChange }: CommunityTabsProps) => {
  return (
    <div className="flex gap-2 border-b border-base-300 overflow-x-auto scrollbar-hide">
      {["posts", "about"].map((tab) => (
        <button
          key={tab}
          onClick={() => onChange(tab as "posts" | "about")}
          className={`shrink-0 px-4 py-2 text-sm font-medium capitalize ${
            active === tab
              ? "border-b-2 border-blue-700 text-blue-700"
              : "opacity-70 hover:opacity-100"
          }`}
        >
          {tab}
        </button>
      ))}
    </div>
  );
};

export default CommunityTabs;
