type Tab = "posts" | "social" | "activity";

type Props = {
  active: Tab;
  onChange: (tab: Tab) => void;
  issueCount?: number | null;
  socialCount?: number | null;
};

const ProfileTabs = ({ active, onChange, issueCount, socialCount }: Props) => {
  const tabs: { key: Tab; label: string; count?: number | null }[] = [
    { key: "posts",    label: "Issues",   count: issueCount },
    { key: "social",   label: "Social",   count: socialCount },
    { key: "activity", label: "Activity" },
  ];

  return (
    <div className="flex gap-2 border-b border-base-300 overflow-x-auto scrollbar-hide">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onChange(tab.key)}
          className={`shrink-0 px-4 py-2 text-sm rounded-t-lg transition flex items-center gap-1.5 ${
            active === tab.key
              ? "bg-blue-700 text-white"
              : "opacity-70 hover:opacity-100"
          }`}
        >
          <span>{tab.label}</span>
          {tab.count !== undefined && tab.count !== null && (
            <span className={`px-1.5 py-0.5 text-[10px] font-bold rounded-full ${
              active === tab.key
                ? "bg-white/20 text-white"
                : "bg-base-300 text-base-content"
            }`}>
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
};

export default ProfileTabs;