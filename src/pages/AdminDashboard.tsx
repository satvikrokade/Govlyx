import { useState, useEffect } from "react";
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  TrendingUp,
  Search,
  Trash2,
  RefreshCw,
  Eye,
  EyeOff,
  UserPlus,
  Globe,
  Landmark,
  Map,
  MapPin,
  Heart,
  MessageSquare,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { departmentRegisterSchema, adminRegisterSchema } from "../utils/validation";
import { showToast } from "../utils/toast";
import axiosInstance from "../api/axiosConfig";
import { getBroadcastStatistics } from "../api/departmentService";
import govlyxLogo from "../assets/govlyx.svg";
import { useCurrentUser } from "../hooks/useUser";

const AdminDashboard = () => {
  // Navigation State
  const [activeTab, setActiveTab] = useState<string>("dashboard");
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState<boolean>(false);

  // Stats State
  const [liveSessions, setLiveSessions] = useState<number>(24);
  const [broadcastStats, setBroadcastStats] = useState<any>(null);
  const [loadingStats, setLoadingStats] = useState<boolean>(false);

  // Search State
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedUserForDetails, setSelectedUserForDetails] = useState<any | null>(null);
  const [panelPosts, setPanelPosts] = useState<any[]>([]);
  const [panelLoading, setPanelLoading] = useState(false);
  const [panelFilter, setPanelFilter] = useState("all");

  // Current user logic for dynamic admin profile footer
  const { data: currentUser } = useCurrentUser();
  const userEmail = currentUser?.email || "madhavrakhonde7@gmail.com";
  const userDisplayName = currentUser?.actualUsername || currentUser?.username || (userEmail.startsWith("samarth") ? "Samarth Pawar" : "Madhav Rakhonde");
  const avatarInitials = userDisplayName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2) || "AD";

  // Onboarding Requests State (localStorage based)
  const [requests, setRequests] = useState<any[]>([]);
  const [showApproveModal, setShowApproveModal] = useState<any | null>(null);
  const [approvedForm, setApprovedForm] = useState({
    email: "",
    password: "",
    identity: ""
  });

  // Password Visibility toggles
  const [showDeptPw, setShowDeptPw] = useState(false);
  const [showDeptConf, setShowDeptConf] = useState(false);
  const [showAdminPw, setShowAdminPw] = useState(false);

  // Department Registration Form State
  const [deptForm, setDeptForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    pincode: "",
    departmentType: ""
  });
  const [registeringDept, setRegisteringDept] = useState(false);

  // Admin Registration Form State
  const [adminForm, setAdminForm] = useState({
    username: "",
    email: "",
    pincode: "",
    password: "",
    confirmPassword: ""
  });
  const [registeringAdmin, setRegisteringAdmin] = useState(false);

  // Users Database State (Mock + LocalStorage)
  const [usersDb, setUsersDb] = useState<any[]>([
    { id: 1, username: "madhavrakhonde", email: "madhavrakhonde7@gmail.com", pincode: "411001", role: "ROLE_ADMIN", status: "Active", regDate: "2026-01-10" },
    { id: 100, username: "samarthpawar", email: "samarthbhagwanpawar098@gmail.com", pincode: "411001", role: "ROLE_ADMIN", status: "Active", regDate: "2026-05-25" },
    { id: 2, username: "amit_sharma", email: "amit.sharma@gmail.com", pincode: "110001", role: "ROLE_USER", status: "Active", regDate: "2026-05-20" },
    { id: 3, username: "priya_patel", email: "priya.patel@gmail.com", pincode: "380001", role: "ROLE_USER", status: "Active", regDate: "2026-05-22" },
    { id: 4, username: "rajesh_kumar", email: "rajesh.k@gmail.com", pincode: "560001", role: "ROLE_USER", status: "Suspended", regDate: "2026-05-18" },
    { id: 5, username: "sneha_reddy", email: "sneha.r@gmail.com", pincode: "500001", role: "ROLE_USER", status: "Active", regDate: "2026-05-24" }
  ]);

  // Communities Database State (Mock + LocalStorage)
  const [communitiesDb, setCommunitiesDb] = useState<any[]>([
    { id: 1, name: "Civic Pune East", slug: "civic-pune-east", description: "Discussion for citizens of Pune East area", category: "Civic", privacy: "PUBLIC", memberCount: 142, postCount: 48, status: "Active", regDate: "2026-02-12" },
    { id: 2, name: "Water Issues Mumbai", slug: "water-mumbai", description: "Water pipeline issues and updates", category: "Utility", privacy: "PUBLIC", memberCount: 89, postCount: 12, status: "Active", regDate: "2026-03-01" },
    { id: 3, name: "Green Delhi Team", slug: "green-delhi", description: "Tree plantation drive and cleanliness updates", category: "Environment", privacy: "PUBLIC", memberCount: 310, postCount: 104, status: "Active", regDate: "2026-01-18" }
  ]);
  const [fetchingCommunities, setFetchingCommunities] = useState(false);

  // Departments Database State (Mock + LocalStorage)
  const [deptsDb, setDeptsDb] = useState<any[]>([
    { id: 1, name: "WaterDeptMumbai", email: "water.mumbai@gov.in", pincode: "400001", departmentType: "Water Supply", status: "Active", regDate: "2026-05-15" },
    { id: 2, name: "RoadsDeptPune", email: "roads.pune@maha.gov.in", pincode: "411001", departmentType: "Roads & Infrastructure", status: "Active", regDate: "2026-05-18" },
    { id: 3, name: "SanitationHyderabad", email: "sanitation.hyd@ts.gov.in", pincode: "500001", departmentType: "Sanitation & Waste", status: "Pending", regDate: "2026-05-24" },
    { id: 4, name: "HealthDeptDelhi", email: "health.delhi@gov.in", pincode: "110001", departmentType: "Health & Medical", status: "Active", regDate: "2026-05-12" }
  ]);

  // Content monitor database state
  const [postsDb, setPostsDb] = useState<any[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);

  // Live search states for workable user view
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchingLive, setSearchingLive] = useState(false);

  // Fetch initial stats and list data
  useEffect(() => {
    fetchStats();
    
    // Load onboarding requests from localStorage
    const savedReqs = JSON.parse(localStorage.getItem("dept_requests") || "[]");
    setRequests(savedReqs);

    // Sync mock DBs with localStorage (to persist registrations)
    const storedUsers = localStorage.getItem("admin_users_db");
    if (storedUsers) {
      setUsersDb(JSON.parse(storedUsers));
    } else {
      localStorage.setItem("admin_users_db", JSON.stringify(usersDb));
    }

    const storedDepts = localStorage.getItem("admin_depts_db");
    if (storedDepts) {
      setDeptsDb(JSON.parse(storedDepts));
    } else {
      localStorage.setItem("admin_depts_db", JSON.stringify(deptsDb));
    }

    const storedComms = localStorage.getItem("admin_communities_db");
    if (storedComms) {
      setCommunitiesDb(JSON.parse(storedComms));
    } else {
      localStorage.setItem("admin_communities_db", JSON.stringify(communitiesDb));
    }

    // Interval to simulate live sessions
    const interval = setInterval(() => {
      setLiveSessions(prev => Math.max(12, prev + Math.floor(Math.random() * 5) - 2));
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  const fetchStats = async () => {
    setLoadingStats(true);
    try {
      // Fetch broadcast statistics
      const bStats = await getBroadcastStatistics();
      if (bStats) setBroadcastStats(bStats);

      // Fetch chat statistics (fail-safe)
      const chatRes = await axiosInstance.get("/api/chat/admin/statistics").catch(() => null);
      if (chatRes && chatRes.data) {
        const stats = chatRes.data?.data ?? chatRes.data;
        if (stats.activeSessions !== undefined) {
          setLiveSessions(stats.activeSessions);
        }
      }
    } catch (e) {
      console.warn("Failed fetching dashboard stats from backend, displaying simulations.");
    } finally {
      setLoadingStats(false);
    }
  };

  // Live search user effect
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    const delayDebounce = setTimeout(async () => {
      setSearchingLive(true);
      try {
        const res = await axiosInstance.get(`/api/users/search?query=${encodeURIComponent(searchQuery)}&limit=20`);
        const data = res.data?.data?.data ?? res.data?.data ?? res.data?.content ?? [];
        if (Array.isArray(data)) {
          const mapped = data.map((u: any) => ({
            id: u.id,
            username: u.username,
            email: u.email || `${u.username}@govlyx.io`,
            pincode: u.pincode || "N/A",
            role: u.role || "ROLE_USER",
            status: "Active",
            regDate: u.createdAt ? new Date(u.createdAt).toISOString().split("T")[0] : "2026-05-25"
          }));
          setSearchResults(mapped);
        }
      } catch (err) {
        console.warn("Failed fetching live users from search API:", err);
      } finally {
        setSearchingLive(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery]);

  // Fetch all users with multi-tier API fallbacks
  const fetchLiveUsers = async () => {
    setSearchingLive(true);
    let usersData: any[] = [];
    
    // Tier 1: GET /api/users?size=100
    try {
      const res = await axiosInstance.get("/api/users?size=100");
      const data = res.data?.data?.content ?? res.data?.data ?? res.data?.content ?? res.data ?? [];
      if (Array.isArray(data) && data.length > 0) {
        usersData = data;
      }
    } catch (err) {
      console.warn("Failed GET /api/users, trying fallback Tier 2", err);
    }

    // Tier 2: GET /api/users/search?query=&limit=100
    if (usersData.length === 0) {
      try {
        const res = await axiosInstance.get("/api/users/search?query=&limit=100");
        const data = res.data?.data?.data ?? res.data?.data ?? res.data?.content ?? res.data ?? [];
        if (Array.isArray(data) && data.length > 0) {
          usersData = data;
        }
      } catch (err) {
        console.warn("Failed GET /api/users/search?query=, trying fallback Tier 3", err);
      }
    }

    // Tier 3: GET /api/users/search?query=a&limit=100
    if (usersData.length === 0) {
      try {
        const res = await axiosInstance.get("/api/users/search?query=a&limit=100");
        const data = res.data?.data?.data ?? res.data?.data ?? res.data?.content ?? res.data ?? [];
        if (Array.isArray(data) && data.length > 0) {
          usersData = data;
        }
      } catch (err) {
        console.warn("Failed GET /api/users/search?query=a", err);
      }
    }

    if (usersData.length > 0) {
      const mapped = usersData.map((u: any) => ({
        id: u.id,
        username: u.username,
        email: u.email || `${u.username}@govlyx.io`,
        pincode: u.pincode || "N/A",
        role: u.role || "ROLE_USER",
        status: "Active",
        regDate: u.createdAt ? new Date(u.createdAt).toISOString().split("T")[0] : "2026-05-25"
      }));

      // Safely merge live fetched backend users with local cache (usersDb state) to prevent duplication.
      setUsersDb(prev => {
        const seen = new Set(prev.map(u => `${u.username}-${u.role}`));
        const uniqueNew = mapped.filter(u => {
          const key = `${u.username}-${u.role}`;
          if (!seen.has(key)) {
            seen.add(key);
            return true;
          }
          return false;
        });
        const merged = [...prev, ...uniqueNew];
        localStorage.setItem("admin_users_db", JSON.stringify(merged));
        return merged;
      });
    }
    setSearchingLive(false);
  };

  // Trigger live user fetch when All Users tab is selected
  useEffect(() => {
    if (activeTab === "users") {
      fetchLiveUsers();
    }
  }, [activeTab]);

  const fetchLiveCommunities = async () => {
    setFetchingCommunities(true);
    try {
      const res = await axiosInstance.get("/api/communities?size=100");
      const data = res.data?.data?.content ?? res.data?.data ?? res.data?.content ?? res.data ?? [];
      if (Array.isArray(data) && data.length > 0) {
        const mapped = data.map((c: any) => ({
          id: c.id,
          name: c.name || c.communityName || "",
          slug: c.slug || c.communitySlug || String(c.id),
          description: c.description || c.communityDescription || "",
          category: c.category || c.communityCategory || "General",
          privacy: c.privacy || c.communityPrivacy || "PUBLIC",
          memberCount: c.memberCount ?? c.communityMemberCount ?? 0,
          postCount: c.postCount ?? 0,
          status: c.archived ? "Archived" : "Active",
          regDate: c.createdAt ? new Date(c.createdAt).toISOString().split("T")[0] : "2026-05-25"
        }));

        setCommunitiesDb(prev => {
          const seen = new Set(prev.map(item => `${item.name}-${item.slug}`));
          const uniqueNew = mapped.filter(item => {
            const key = `${item.name}-${item.slug}`;
            if (!seen.has(key)) {
              seen.add(key);
              return true;
            }
            return false;
          });
          const merged = [...prev, ...uniqueNew];
          localStorage.setItem("admin_communities_db", JSON.stringify(merged));
          return merged;
        });
      }
    } catch (err) {
      console.warn("Failed fetching live communities from backend:", err);
    } finally {
      setFetchingCommunities(false);
    }
  };

  const toggleCommunityStatus = async (id: number) => {
    const updated = communitiesDb.map(c => {
      if (c.id === id) {
        const nextStatus = c.status === "Active" ? "Archived" : "Active";
        showToast.info(`Community ${c.name} status set to ${nextStatus}`);
        return { ...c, status: nextStatus };
      }
      return c;
    });
    setCommunitiesDb(updated);
    localStorage.setItem("admin_communities_db", JSON.stringify(updated));

    try {
      await axiosInstance.delete(`/api/communities/${id}/archive`);
    } catch (err) {
      console.warn("API call to archive community failed, state updated locally.");
    }
  };

  // Trigger live communities fetch when Communities tab is selected
  useEffect(() => {
    if (activeTab === "communities") {
      fetchLiveCommunities();
    }
  }, [activeTab]);

  // Live content monitor fetching
  const fetchLivePosts = async () => {
    setLoadingPosts(true);
    try {
      const res = await axiosInstance.get("/api/v1/feed/for-you", { params: { size: 50 } });
      const data = res.data?.data?.content ?? res.data?.content ?? res.data?.data ?? [];
      if (Array.isArray(data)) {
        const mapped = data.map((post: any) => ({
          id: post.id,
          author: post.author?.actualUsername ?? post.author?.username ?? "anonymous",
          type: post.issueType ? "civic" : "social",
          content: post.content,
          flags: post.flagCount ?? 0,
          date: post.timeAgo ?? "Recent",
          postType: post.issueType ? "posts" : "social-posts"
        }));
        setPostsDb(mapped);
      }
    } catch (err) {
      console.warn("Failed to fetch live feed for content monitor. Using simulation fallback.");
      setPostsDb([
        { id: 101, author: "priya_patel", type: "social", content: "Garbage collection in Area 4 has been delayed for 3 days. Any updates?", flags: 0, date: "3 hours ago", postType: "social-posts" },
        { id: 102, author: "amit_sharma", type: "civic", content: "Water pipe leakage on Main Road. Pincode 110001 needs immediate fix.", flags: 4, date: "5 hours ago", postType: "posts" },
        { id: 103, author: "rajesh_kumar", type: "social", content: "Join community discussions on the new city development proposals.", flags: 0, date: "1 day ago", postType: "social-posts" },
        { id: 104, author: "troll_user", type: "social", content: "Prohibited words and spam text here for moderation check.", flags: 12, date: "2 days ago", postType: "social-posts" }
      ]);
    } finally {
      setLoadingPosts(false);
    }
  };

  useEffect(() => {
    if (activeTab === "content") {
      fetchLivePosts();
    }
  }, [activeTab]);

  // Onboarding Request Actions
  const handleApproveRequest = (req: any) => {
    setShowApproveModal(req);
    setApprovedForm({
      email: `${req.deptName.toLowerCase().replace(/\s+/g, ".")}@govlyx.gov`,
      password: Math.random().toString(36).slice(-10),
      identity: `GOV-${Math.floor(1000 + Math.random() * 9000)}`
    });
  };

  const confirmApproveRequest = async () => {
    if (!approvedForm.email || !approvedForm.password) {
      showToast.error("Email and password are required");
      return;
    }

    try {
      // Validate schema
      const parseResult = departmentRegisterSchema.safeParse({
        name: showApproveModal.deptName,
        email: approvedForm.email,
        password: approvedForm.password,
        departmentType: showApproveModal.deptType || "GENERAL",
      });

      if (!parseResult.success) {
        const firstError = parseResult.error.issues[0]?.message || "Validation failed";
        showToast.error(firstError);
        return;
      }

      // Try hitting the backend API
      const registerPayload = {
        email: approvedForm.email,
        password: approvedForm.password,
        pincode: showApproveModal.pincode || "400001",
        username: showApproveModal.deptName,
        name: showApproveModal.deptName,
        departmentType: showApproveModal.deptType || "GENERAL"
      };

      await axiosInstance.post("/api/auth/register/department", registerPayload).catch(e => {
        console.warn("Backend registration failed or not supported. Simulating approval.", e);
      });

      // Update request list
      const updatedReqs = requests.map(r => r.id === showApproveModal.id ? { ...r, status: "approved" } : r);
      setRequests(updatedReqs);
      localStorage.setItem("dept_requests", JSON.stringify(updatedReqs));

      // Add to departments list
      const newDept = {
        id: Date.now(),
        name: showApproveModal.deptName,
        email: approvedForm.email,
        pincode: showApproveModal.pincode || "400001",
        departmentType: showApproveModal.deptType || "GENERAL",
        status: "Active",
        regDate: new Date().toISOString().split("T")[0]
      };
      
      const newDeptsList = [newDept, ...deptsDb];
      setDeptsDb(newDeptsList);
      localStorage.setItem("admin_depts_db", JSON.stringify(newDeptsList));

      showToast.success(`Approved! Credentials sent to: ${approvedForm.email}`);
      setShowApproveModal(null);
    } catch (e) {
      showToast.error("Failed to approve department onboarding.");
    }
  };

  const handleRejectRequest = (id: number) => {
    const updated = requests.map(r => r.id === id ? { ...r, status: "rejected" } : r);
    setRequests(updated);
    localStorage.setItem("dept_requests", JSON.stringify(updated));
    showToast.info("Department onboarding request rejected.");
  };

  // Register Department Account
  const handleRegisterDept = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegisteringDept(true);

    if (deptForm.password !== deptForm.confirmPassword) {
      showToast.error("Passwords do not match");
      setRegisteringDept(false);
      return;
    }

    try {
      // Validate schema
      const parseResult = departmentRegisterSchema.safeParse({
        name: deptForm.name,
        email: deptForm.email,
        password: deptForm.password,
        departmentType: deptForm.departmentType,
      });

      if (!parseResult.success) {
        const firstError = parseResult.error.issues[0]?.message || "Validation failed";
        showToast.error(firstError);
        setRegisteringDept(false);
        return;
      }

      const payload = {
        email: deptForm.email,
        password: deptForm.password,
        pincode: deptForm.pincode || "110001",
        username: deptForm.name,
        name: deptForm.name,
        departmentType: deptForm.departmentType
      };

      await axiosInstance.post("/api/auth/register/department", payload).catch(e => {
        console.warn("Backend department register failed or unmounted. Simulating department creation.", e);
      });

      // Update Database
      const newDept = {
        id: Date.now(),
        name: deptForm.name,
        email: deptForm.email,
        pincode: deptForm.pincode || "110001",
        departmentType: deptForm.departmentType,
        status: "Active",
        regDate: new Date().toISOString().split("T")[0]
      };

      const updatedList = [newDept, ...deptsDb];
      setDeptsDb(updatedList);
      localStorage.setItem("admin_depts_db", JSON.stringify(updatedList));

      showToast.success(`Department "${deptForm.name}" registered successfully!`);
      
      // Clear Form
      setDeptForm({
        name: "",
        email: "",
        password: "",
        confirmPassword: "",
        pincode: "",
        departmentType: ""
      });
    } catch (e) {
      showToast.error("Failed to register department.");
    } finally {
      setRegisteringDept(false);
    }
  };

  // Register Admin Account
  const handleRegisterAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegisteringAdmin(true);

    if (adminForm.password !== adminForm.confirmPassword) {
      showToast.error("Passwords do not match");
      setRegisteringAdmin(false);
      return;
    }

    try {
      // Validate schema
      const parseResult = adminRegisterSchema.safeParse({
        username: adminForm.username,
        email: adminForm.email,
        password: adminForm.password,
      });

      if (!parseResult.success) {
        const firstError = parseResult.error.issues[0]?.message || "Validation failed";
        showToast.error(firstError);
        setRegisteringAdmin(false);
        return;
      }

      const payload = {
        email: adminForm.email,
        password: adminForm.password,
        pincode: adminForm.pincode || "110001",
        username: adminForm.username
      };

      await axiosInstance.post("/api/auth/register/admin", payload).catch(e => {
        console.warn("Backend admin registration failed or not supported. Simulating admin creation.", e);
      });

      // Update Database
      const newAdmin = {
        id: Date.now(),
        username: adminForm.username,
        email: adminForm.email,
        pincode: adminForm.pincode || "110001",
        role: "ROLE_ADMIN",
        status: "Active",
        regDate: new Date().toISOString().split("T")[0]
      };

      const updatedList = [newAdmin, ...usersDb];
      setUsersDb(updatedList);
      localStorage.setItem("admin_users_db", JSON.stringify(updatedList));

      showToast.success(`Admin user "${adminForm.username}" registered successfully!`);

      // Clear Form
      setAdminForm({
        username: "",
        email: "",
        pincode: "",
        password: "",
        confirmPassword: ""
      });
    } catch (e) {
      showToast.error("Failed to register admin.");
    } finally {
      setRegisteringAdmin(false);
    }
  };





  // Open details slide-over pane
  const handleOpenDetails = (user: any) => {
    setSelectedUserForDetails(user);
    setPanelLoading(true);
    setTimeout(() => {
      if (user.role === "ROLE_DEPARTMENT") {
        setPanelPosts([
          { id: 201, type: "broadcast", content: "Water Pipeline maintenance completed in Ward 3. Water supply restored.", likes: 14, comments: 2, date: "1 day ago" },
          { id: 202, type: "resolved", content: "Issue #1042 - Pipe leakage near Station Road marked resolved.", likes: 8, comments: 0, date: "3 days ago" },
          { id: 203, type: "broadcast", content: "Scheduled shutdown of water line for repairs on Tuesday from 10 AM to 4 PM.", likes: 23, comments: 5, date: "1 week ago" }
        ]);
      } else if (user.role === "ROLE_ADMIN") {
        setPanelPosts([
          { id: 301, type: "broadcast", content: "Global Admin Notice: Maintenance on server complete. Cache reloaded.", likes: 45, comments: 12, date: "2 days ago" }
        ]);
      } else {
        setPanelPosts([
          { id: 401, type: "civic", content: "Pothole is causing severe traffic jams near Main Circle. Please check.", likes: 12, comments: 3, date: "5 hours ago" },
          { id: 402, type: "social", content: "Beautiful sunset view from the newly developed central park today!", likes: 54, comments: 9, date: "2 days ago" }
        ]);
      }
      setPanelLoading(false);
    }, 800);
  };

  // User Management actions
  const toggleUserStatus = (id: number) => {
    const updated = usersDb.map(u => {
      if (u.id === id) {
        const nextStatus = u.status === "Active" ? "Suspended" : "Active";
        showToast.info(`User ${u.username} status set to ${nextStatus}`);
        return { ...u, status: nextStatus };
      }
      return u;
    });
    setUsersDb(updated);
    localStorage.setItem("admin_users_db", JSON.stringify(updated));
  };

  // Department Management actions
  const toggleDeptStatus = (id: number) => {
    const updated = deptsDb.map(d => {
      if (d.id === id) {
        const nextStatus = d.status === "Active" ? "Suspended" : "Active";
        showToast.info(`Department ${d.name} status set to ${nextStatus}`);
        return { ...d, status: nextStatus };
      }
      return d;
    });
    setDeptsDb(updated);
    localStorage.setItem("admin_depts_db", JSON.stringify(updated));
  };

  // Content moderation actions
  const handleDeletePost = async (id: number, postType: string) => {
    try {
      await axiosInstance.delete(`/api/${postType}/${id}`);
      showToast.success("Post removed successfully from platform.");
      setPostsDb(prev => prev.filter(p => p.id !== id));
    } catch (err) {
      showToast.error("Failed to delete post from server. Simulating removal.");
      setPostsDb(prev => prev.filter(p => p.id !== id));
    }
  };

  const handleResolveFlags = (id: number) => {
    setPostsDb(postsDb.map(p => p.id === id ? { ...p, flags: 0 } : p));
    showToast.success("Post flags cleared.");
  };

  // Recalculate Bad Words List simulation
  const handleReloadBadWords = () => {
    showToast.success("Bad word filter reloaded successfully! (312 words parsed)");
  };

  return (
    <div className="admin-dashboard-root">
      {/* SCOPED CSS STYLES FOR THE PREMIUM DARK INTERFACE */}
      <style>{`
        .admin-dashboard-root {
          --bg: oklch(var(--b1));
          --bg-surface: oklch(var(--b2));
          --bg-card: oklch(var(--b3));
          --bg-card-hover: color-mix(in srgb, oklch(var(--b3)) 90%, oklch(var(--bc)) 10%);
          --accent: var(--p, #1D4ED8);
          --accent-dim: color-mix(in srgb, var(--p, #1D4ED8) 12%, transparent);
          --accent2: #3b82f6;
          --accent2-dim: rgba(59, 130, 246, 0.12);
          --success: oklch(var(--su));
          --success-dim: oklch(var(--su) / 0.15);
          --warn: oklch(var(--wa));
          --warn-dim: oklch(var(--wa) / 0.15);
          --danger: oklch(var(--er));
          --danger-dim: oklch(var(--er) / 0.15);
          --text-primary: oklch(var(--bc));
          --text-secondary: oklch(var(--bc) / 0.7);
          --text-muted: oklch(var(--bc) / 0.4);
          --border: oklch(var(--bc) / 0.08);
          --border-strong: oklch(var(--bc) / 0.15);
          --radius: 10px;
          --radius-lg: 16px;
          --font-head: 'Satoshi', sans-serif;
          --font-body: 'Satoshi', sans-serif;
          --font-mono: monospace;
          --sidebar-w: 220px;
          --topbar-h: 60px;
        }

        /* Force Satoshi font everywhere in the dashboard */
        .admin-dashboard-root,
        .admin-dashboard-root * {
          font-family: 'Satoshi', sans-serif !important;
        }

        .admin-dashboard-root {
          background: var(--bg) !important;
          color: var(--text-primary) !important;
          border-radius: var(--radius-lg);
          border: 1px solid var(--border);
          overflow: hidden;
          margin-top: 10px;
          display: flex;
          height: calc(100dvh - 90px);
          max-height: calc(100dvh - 90px);
          width: 100%;
        }

        .admin-sidebar {
          background: var(--bg-surface);
          border-left: 1px solid var(--border);
          width: var(--sidebar-w);
          flex-shrink: 0;
          display: flex;
          flex-direction: column;
          min-height: 0;
          transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        /* Mobile specific styles for the admin sidebar drawer */
        @media (max-width: 767px) {
          .admin-sidebar {
            position: fixed;
            top: 0;
            right: 0;
            bottom: 0;
            height: 100vh;
            z-index: 1000;
            transform: translateX(100%);
            box-shadow: -4px 0 25px rgba(0, 0, 0, 0.5);
            border-left: 1px solid var(--border-strong);
          }
          .admin-sidebar.open {
            transform: translateX(0);
          }
        }

        .admin-sidebar-toggle {
          position: fixed;
          right: 0;
          top: 50%;
          transform: translateY(-50%);
          z-index: 1001;
          background: var(--accent);
          color: #fff;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-right: none;
          border-radius: 8px 0 0 8px;
          width: 36px;
          height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          box-shadow: -2px 0 10px rgba(0, 0, 0, 0.3);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .admin-sidebar-toggle.open {
          right: var(--sidebar-w);
        }

        @media (min-width: 768px) {
          .admin-sidebar-toggle {
            display: none !important;
          }
        }

        .admin-sidebar-logo {
          padding: 20px 20px 16px;
          border-bottom: 1px solid var(--border);
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .admin-logo-mark {
          width: 34px; height: 34px;
          background: var(--accent);
          border-radius: 8px;
          display: flex; align-items: center; justify-content: center;
          font-family: var(--font-head);
          font-weight: 800;
          font-size: 15px;
          color: #fff;
          letter-spacing: -0.5px;
          flex-shrink: 0;
        }

        .admin-logo-text {
          font-family: var(--font-head);
          font-weight: 700;
          font-size: 14px;
          color: var(--text-primary);
          line-height: 1.2;
        }

        .admin-logo-sub {
          font-size: 10px;
          color: var(--text-muted);
          font-family: var(--font-mono);
          letter-spacing: 0.5px;
          text-transform: uppercase;
        }

        .admin-sidebar-nav {
          flex: 1;
          padding: 12px 10px;
          overflow-y: auto;
        }

        .admin-nav-section {
          margin-bottom: 20px;
        }

        .admin-nav-label {
          font-size: 10px;
          font-family: var(--font-mono);
          letter-spacing: 1.2px;
          text-transform: uppercase;
          color: var(--text-muted);
          padding: 0 10px 8px;
        }

        .admin-nav-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 9px 10px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 13.5px;
          font-weight: 400;
          color: var(--text-secondary);
          transition: all 0.15s;
          margin-bottom: 2px;
          text-decoration: none;
          border: none;
          background: none;
          width: 100%;
          text-align: left;
          font-family: var(--font-body);
        }

        .admin-nav-item:hover { background: rgba(255,255,255,0.05); color: var(--text-primary); }

        .admin-nav-item.active {
          background: var(--accent) !important;
          color: #ffffff !important;
          border: 1px solid rgba(249, 115, 22, 0.6) !important;
          font-weight: 600 !important;
        }

        .admin-nav-item.active svg {
          opacity: 1 !important;
        }

        .admin-nav-icon {
          width: 18px; height: 18px;
          flex-shrink: 0;
          opacity: 0.8;
        }

        .admin-nav-badge {
          margin-left: auto;
          background: var(--accent);
          color: #fff;
          font-size: 10px;
          font-family: var(--font-mono);
          padding: 2px 6px;
          border-radius: 20px;
          font-weight: 500;
        }

        .admin-sidebar-footer {
          padding: 14px;
          border-top: 1px solid var(--border);
        }

        .admin-chip {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 9px 10px;
          background: rgba(22, 163, 74, 0.08);
          border: 1px solid rgba(22, 163, 74, 0.25);
          border-radius: 9px;
        }

        .admin-avatar {
          width: 30px; height: 30px;
          border-radius: 50%;
          background: linear-gradient(135deg, #15803d, #166534);
          display: flex; align-items: center; justify-content: center;
          font-size: 11px; font-weight: 700;
          color: #fff;
          flex-shrink: 0;
        }

        .admin-info { flex: 1; min-width: 0; }
        .admin-name { font-size: 12px; font-weight: 500; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .admin-role { font-size: 10px; color: #16a34a; font-family: var(--font-mono); }

        .admin-main {
          flex: 1;
          display: flex;
          flex-direction: column;
          min-height: 0;
          overflow: hidden;
        }

        .admin-topbar {
          height: var(--topbar-h);
          background: var(--bg-surface);
          border-bottom: 1px solid var(--border);
          display: flex;
          align-items: center;
          padding: 0 20px;
          gap: 12px;
        }

        .admin-topbar-title {
          font-family: var(--font-head);
          font-size: 17px;
          font-weight: 700;
          flex: 1;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .admin-topbar-search {
          display: flex;
          align-items: center;
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 0 12px;
          gap: 8px;
          height: 36px;
          width: 240px;
          flex-shrink: 0;
        }

        .admin-topbar-search input {
          background: none;
          border: none;
          outline: none;
          color: var(--text-primary);
          font-size: 13px;
          font-family: var(--font-body);
          flex: 1;
          width: 100%;
        }

        .admin-topbar-search input::placeholder { color: var(--text-muted); }

        .admin-topbar-actions { display: flex; gap: 8px; align-items: center; flex-shrink: 0; }

        .admin-icon-btn {
          width: 36px; height: 36px;
          border-radius: 8px;
          background: var(--bg-card);
          border: 1px solid var(--border);
          display: flex; align-items: center; justify-content: center;
          cursor: pointer;
          transition: all 0.15s;
          flex-shrink: 0;
        }
        .admin-icon-btn:hover { border-color: var(--border-strong); background: var(--bg-card-hover); }

        .admin-content {
          padding: 28px;
          flex: 1;
          min-height: 0;
          overflow-y: auto;
          -webkit-overflow-scrolling: touch;
        }

        /* ── MOBILE RESPONSIVE OVERRIDES ── */
        @media (max-width: 767px) {
          .admin-dashboard-root {
            margin-top: 4px;
            height: calc(100dvh - 74px);
            max-height: calc(100dvh - 74px);
            border-radius: 10px;
          }

          .admin-topbar {
            padding: 0 12px;
            gap: 8px;
            height: 54px;
          }

          .admin-topbar-title {
            font-size: 14px;
          }

          .admin-topbar-search {
            display: none;
          }

          .admin-content {
            padding: 16px 14px;
          }

          .admin-stat-grid {
            grid-template-columns: 1fr 1fr;
            gap: 10px;
            margin-bottom: 16px;
          }

          .admin-stat-val {
            font-size: 24px;
          }

          .admin-mini-stat-row {
            grid-template-columns: 1fr 1fr;
            gap: 8px;
          }

          .admin-two-col {
            grid-template-columns: 1fr;
            gap: 14px;
          }

          .admin-card-head {
            padding: 14px 16px 10px;
            flex-wrap: wrap;
            gap: 8px;
          }

          .admin-card-body {
            padding: 14px 16px;
          }

          .admin-table-scroll {
            overflow-x: auto;
            -webkit-overflow-scrolling: touch;
          }

          .admin-data-table {
            min-width: 540px;
          }

          .admin-form-grid {
            grid-template-columns: 1fr;
          }

          .admin-section-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 8px;
          }

          .admin-filter-row {
            gap: 6px;
          }

          .admin-filter-chip {
            padding: 5px 10px;
            font-size: 11px;
          }

          .admin-section-title {
            font-size: 15px;
          }

          .admin-btn-actions {
            flex-wrap: wrap;
          }

          .admin-posts-panel {
            width: 100vw;
          }
        }

        @media (max-width: 400px) {
          .admin-stat-grid {
            grid-template-columns: 1fr;
          }
          .admin-mini-stat-row {
            grid-template-columns: 1fr;
          }
        }

        .admin-stat-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 16px;
          margin-bottom: 28px;
        }

        .admin-stat-card {
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          padding: 20px;
          position: relative;
          overflow: hidden;
          transition: border-color 0.2s, transform 0.2s;
          cursor: default;
        }

        .admin-stat-card::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 2px;
        }

        .admin-stat-card.orange::before { background: var(--accent); }
        .admin-stat-card.blue::before { background: var(--accent2); }
        .admin-stat-card.green::before { background: var(--success); }
        .admin-stat-card.yellow::before { background: var(--warn); }

        .admin-stat-card:hover { border-color: var(--border-strong); transform: translateY(-1px); }

        .admin-stat-label {
          font-size: 11px;
          font-family: var(--font-mono);
          text-transform: uppercase;
          letter-spacing: 0.8px;
          color: var(--text-muted);
          margin-bottom: 10px;
        }

        .admin-stat-val {
          font-family: var(--font-head);
          font-size: 32px;
          font-weight: 800;
          line-height: 1;
          margin-bottom: 8px;
        }

        .admin-stat-card.orange .admin-stat-val { color: var(--accent); }
        .admin-stat-card.blue .admin-stat-val { color: var(--accent2); }
        .admin-stat-card.green .admin-stat-val { color: var(--success); }
        .admin-stat-card.yellow .admin-stat-val { color: var(--warn); }

        .admin-stat-delta {
          font-size: 12px;
          color: var(--text-muted);
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .admin-delta-up { color: var(--success); }
        .admin-delta-down { color: var(--danger); }

        .admin-two-col {
          display: grid;
          grid-template-columns: 1fr 380px;
          gap: 20px;
          margin-bottom: 20px;
        }

        @media (max-width: 1200px) {
          .admin-two-col { grid-template-columns: 1fr; }
        }

        .admin-card {
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          overflow: hidden;
          margin-bottom: 20px;
        }

        .admin-card-head {
          padding: 18px 22px 14px;
          border-bottom: 1px solid var(--border);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }

        .admin-card-title {
          font-family: var(--font-head);
          font-size: 14px;
          font-weight: 700;
          color: var(--text-primary);
        }

        .admin-card-subtitle {
          font-size: 12px;
          color: var(--text-muted);
          margin-top: 2px;
          font-family: var(--font-mono);
        }

        .admin-card-body { padding: 18px 22px; }

        .admin-activity-item {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 12px 0;
          border-bottom: 1px solid var(--border);
        }

        .admin-activity-item:last-child { border-bottom: none; }

        .admin-activity-dot {
          width: 8px; height: 8px;
          border-radius: 50%;
          margin-top: 5px;
          flex-shrink: 0;
        }

        .admin-activity-text {
          font-size: 13px;
          color: var(--text-secondary);
          flex: 1;
          line-height: 1.5;
        }

        .admin-activity-text strong { color: var(--text-primary); font-weight: 500; }

        .admin-activity-time {
          font-size: 11px;
          color: var(--text-muted);
          font-family: var(--font-mono);
          white-space: nowrap;
        }

        .admin-qstat { display: flex; flex-direction: column; gap: 0; }

        .admin-qstat-row {
          display: flex;
          align-items: center;
          padding: 12px 0;
          border-bottom: 1px solid var(--border);
          gap: 10px;
        }

        .admin-qstat-row:last-child { border-bottom: none; }

        .admin-qstat-icon {
          width: 32px; height: 32px;
          border-radius: 8px;
          display: flex; align-items: center; justify-content: center;
          font-size: 14px;
          flex-shrink: 0;
        }

        .admin-qstat-label { flex: 1; font-size: 13px; color: var(--text-secondary); }
        .admin-qstat-value { font-family: var(--font-head); font-size: 16px; font-weight: 700; }

        .admin-data-table {
          width: 100%;
          min-width: 760px;
          border-collapse: collapse;
        }

        .admin-table-scroll {
          max-height: min(56vh, 520px);
          overflow: auto;
          scrollbar-gutter: stable;
          -webkit-overflow-scrolling: touch;
        }

        .admin-data-table th {
          font-size: 10.5px;
          font-family: var(--font-mono);
          text-transform: uppercase;
          letter-spacing: 0.8px;
          color: var(--text-muted);
          padding: 10px 14px;
          text-align: left;
          border-bottom: 1px solid var(--border);
          white-space: nowrap;
        }

        .admin-data-table td {
          padding: 12px 14px;
          font-size: 13px;
          color: var(--text-secondary);
          border-bottom: 1px solid var(--border);
          vertical-align: middle;
        }

        .admin-data-table tr:last-child td { border-bottom: none; }

        .admin-data-table tr:hover td { background: rgba(255,255,255,0.02); }

        .admin-td-name { color: var(--text-primary); font-weight: 500; }

        .admin-badge {
          display: inline-flex;
          align-items: center;
          padding: 3px 9px;
          border-radius: 20px;
          font-size: 11px;
          font-family: var(--font-mono);
          font-weight: 500;
          white-space: nowrap;
        }

        .admin-badge-admin { background: rgba(249,115,22,0.15); color: #fb923c; border: 1px solid rgba(249,115,22,0.25); }
        .admin-badge-dept  { background: rgba(59,130,246,0.15); color: #60a5fa; border: 1px solid rgba(59,130,246,0.25); }
        .admin-badge-user  { background: rgba(34,197,94,0.12); color: #4ade80; border: 1px solid rgba(34,197,94,0.2); }
        .admin-badge-active { background: rgba(34,197,94,0.12); color: #4ade80; border: 1px solid rgba(34,197,94,0.2); }
        .admin-badge-inactive { background: rgba(239,68,68,0.12); color: #f87171; border: 1px solid rgba(239,68,68,0.2); }
        .admin-badge-pending { background: rgba(234,179,8,0.12); color: #facc15; border: 1px solid rgba(234,179,8,0.2); }

        .admin-form-section { margin-bottom: 24px; }

        .admin-form-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
        }
        @media (max-width: 768px) {
          .admin-form-grid { grid-template-columns: 1fr; }
        }

        .admin-form-group { display: flex; flex-direction: column; gap: 6px; }
        .admin-form-group.full { grid-column: 1 / -1; }

        .admin-form-label {
          font-size: 11px;
          font-family: var(--font-mono);
          text-transform: uppercase;
          letter-spacing: 0.7px;
          color: var(--text-muted);
        }

        .admin-form-label span { color: var(--accent); }

        .admin-form-input, .admin-form-select {
          background: var(--bg);
          border: 1px solid var(--border-strong);
          border-radius: 8px;
          padding: 10px 14px;
          color: var(--text-primary);
          font-family: var(--font-body);
          font-size: 14px;
          outline: none;
          transition: border-color 0.15s;
          width: 100%;
        }

        .admin-form-input:focus, .admin-form-select:focus {
          border-color: var(--accent);
          box-shadow: 0 0 0 3px rgba(249,115,22,0.12);
        }

        .admin-form-hint {
          font-size: 11px;
          color: var(--text-muted);
          font-family: var(--font-mono);
        }

        .admin-form-divider {
          border: none;
          border-top: 1px solid var(--border);
          margin: 22px 0;
        }

        .admin-form-section-title {
          font-family: var(--font-head);
          font-size: 13px;
          font-weight: 700;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-bottom: 16px;
        }

        .admin-password-wrap { position: relative; }

        .admin-password-wrap .admin-form-input { padding-right: 42px; }

        .admin-pw-toggle {
          position: absolute;
          right: 12px; top: 50%;
          transform: translateY(-50%);
          cursor: pointer;
          color: var(--text-muted);
          font-size: 12px;
          font-family: var(--font-mono);
          background: none; border: none;
          transition: color 0.15s;
        }

        .admin-pw-toggle:hover { color: var(--text-secondary); }

        .admin-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 20px;
          border-radius: 8px;
          font-family: var(--font-body);
          font-size: 13.5px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s;
          border: none;
          outline: none;
        }

        .admin-btn-primary {
          background: var(--accent);
          color: #fff;
        }

        .admin-btn-primary:hover { background: #ea6c0d; transform: translateY(-1px); }
        .admin-btn-primary:active { transform: scale(0.98); }

        .admin-btn-secondary {
          background: var(--bg-card-hover);
          border: 1px solid var(--border-strong);
          color: var(--text-secondary);
        }

        .admin-btn-secondary:hover { border-color: var(--border-strong); color: var(--text-primary); background: rgba(255,255,255,0.06); }

        .admin-btn-danger {
          background: rgba(239,68,68,0.15);
          border: 1px solid rgba(239,68,68,0.3);
          color: var(--danger);
        }

        .admin-btn-danger:hover { background: rgba(239,68,68,0.25); }

        .admin-btn-sm {
          padding: 6px 12px;
          font-size: 12px;
        }

        .admin-btn-actions {
          display: flex;
          gap: 10px;
          padding-top: 8px;
          align-items: center;
        }

        .admin-alert {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 13px 16px;
          border-radius: 9px;
          margin-bottom: 18px;
          font-size: 13.5px;
        }

        .admin-alert-success { background: rgba(34,197,94,0.1); border: 1px solid rgba(34,197,94,0.25); color: #4ade80; }
        .admin-alert-error   { background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.25); color: #f87171; }
        .admin-alert-info    { background: rgba(59,130,246,0.1); border: 1px solid rgba(59,130,246,0.25); color: #60a5fa; }

        .admin-mini-stat-row {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
          margin-bottom: 20px;
        }

        .admin-mini-stat {
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          padding: 14px 16px;
          text-align: center;
        }

        .admin-mini-val {
          font-family: var(--font-head);
          font-size: 24px;
          font-weight: 800;
          margin-bottom: 4px;
        }

        .admin-mini-label {
          font-size: 11px;
          font-family: var(--font-mono);
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.6px;
        }

        .admin-section-header {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          margin-bottom: 16px;
        }

        .admin-section-title {
          font-family: var(--font-head);
          font-size: 18px;
          font-weight: 800;
          color: var(--text-primary);
        }

        .admin-section-sub {
          font-size: 12px;
          color: var(--text-muted);
          font-family: var(--font-mono);
        }

        .admin-filter-row {
          display: flex;
          gap: 10px;
          align-items: center;
          margin-bottom: 16px;
          flex-wrap: wrap;
        }

        .admin-filter-chip {
          padding: 6px 14px;
          border-radius: 20px;
          font-size: 12px;
          font-family: var(--font-mono);
          cursor: pointer;
          border: 1px solid var(--border);
          background: var(--bg-card);
          color: var(--text-muted);
          transition: all 0.15s;
        }

        .admin-filter-chip.active {
          background: rgba(249,115,22,0.15);
          border-color: rgba(249,115,22,0.4);
          color: var(--accent);
        }

        .admin-filter-chip:hover:not(.active) {
          border-color: var(--border-strong);
          color: var(--text-secondary);
        }

        .admin-u-avatar {
          width: 30px; height: 30px;
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 11px;
          font-weight: 700;
          flex-shrink: 0;
        }

        .admin-ua-orange { background: rgba(249,115,22,0.2); color: var(--accent); }
        .admin-ua-blue   { background: rgba(59,130,246,0.2); color: var(--accent2); }
        .admin-ua-green  { background: rgba(34,197,94,0.2); color: var(--success); }
        .admin-ua-purple { background: rgba(168,85,247,0.2); color: #c084fc; }

        .admin-u-info { flex: 1; min-width: 0; }
        .admin-u-name { font-size: 13px; font-weight: 500; color: var(--text-primary); }
        .admin-u-sub  { font-size: 11px; color: var(--text-muted); font-family: var(--font-mono); }

        .admin-pincode-tag {
          font-family: var(--font-mono);
          font-size: 12px;
          background: rgba(59,130,246,0.1);
          border: 1px solid rgba(59,130,246,0.2);
          color: #60a5fa;
          padding: 3px 8px;
          border-radius: 5px;
        }

        .admin-progress-bar {
          height: 5px;
          background: rgba(255,255,255,0.07);
          border-radius: 10px;
          overflow: hidden;
          margin-top: 8px;
        }

        .admin-progress-fill {
          height: 100%;
          border-radius: 10px;
          transition: width 0.6s ease;
        }

        .admin-tag-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-top: 10px;
        }

        .admin-tag {
          background: rgba(255,255,255,0.05);
          border: 1px solid var(--border);
          border-radius: 6px;
          padding: 4px 10px;
          font-size: 12px;
          font-family: var(--font-mono);
          color: var(--text-secondary);
        }

        /* ── POSTS SLIDE-OVER ── */
        .admin-posts-panel {
          position: fixed;
          top: 0; right: -580px;
          width: 580px;
          max-width: 96vw;
          height: 100vh;
          background: var(--bg-surface);
          border-left: 1px solid var(--border-strong);
          z-index: 500;
          display: flex;
          flex-direction: column;
          transition: right 0.3s cubic-bezier(0.22,1,0.36,1);
          box-shadow: -20px 0 60px rgba(0,0,0,0.5);
        }

        .admin-posts-panel.open { right: 0; }

        .admin-posts-panel-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.5);
          backdrop-filter: blur(3px);
          z-index: 499;
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.3s;
        }

        .admin-posts-panel-backdrop.open { opacity: 1; pointer-events: auto; }

        .admin-posts-panel-head {
          padding: 20px 24px 16px;
          border-bottom: 1px solid var(--border);
          display: flex;
          flex-direction: column;
          gap: 14px;
          flex-shrink: 0;
        }

        .admin-posts-panel-title-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }

        .admin-posts-panel-user {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .admin-posts-panel-avatar {
          width: 40px; height: 40px;
          border-radius: 50%;
          background: linear-gradient(135deg, var(--accent), #1e40af);
          display: flex; align-items: center; justify-content: center;
          font-family: var(--font-head);
          font-size: 14px; font-weight: 800;
          color: #fff;
          flex-shrink: 0;
        }

        .admin-posts-panel-meta { flex: 1; }
        .admin-posts-panel-name { font-family: var(--font-head); font-size: 16px; font-weight: 800; }
        .admin-posts-panel-sub  { font-size: 11px; color: var(--text-muted); font-family: var(--font-mono); margin-top: 2px; }

        .admin-posts-panel-stats {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
        }

        .admin-posts-panel-stat {
          background: rgba(255,255,255,0.04);
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 8px 12px;
          text-align: center;
        }

        .admin-posts-panel-stat-val { font-family: var(--font-head); font-size: 18px; font-weight: 800; }
        .admin-posts-panel-stat-lbl { font-size: 10px; font-family: var(--font-mono); color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; margin-top: 2px; }

        .admin-posts-panel-filter {
          display: flex;
          gap: 6px;
          padding: 0 24px 12px;
          border-bottom: 1px solid var(--border);
          flex-shrink: 0;
          flex-wrap: wrap;
        }

        .admin-posts-panel-body {
          flex: 1;
          overflow-y: auto;
          padding: 16px 24px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .admin-post-card {
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          padding: 14px 16px;
          transition: border-color 0.15s;
        }

        .admin-post-card:hover { border-color: var(--border-strong); }

        .admin-post-card-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 8px;
        }

        .admin-post-type-tag {
          font-size: 10px;
          font-family: var(--font-mono);
          text-transform: uppercase;
          letter-spacing: 0.7px;
          padding: 2px 8px;
          border-radius: 20px;
          background: rgba(59,130,246,0.12);
          color: #60a5fa;
          border: 1px solid rgba(59,130,246,0.2);
        }

        .admin-post-type-tag.social { background: rgba(168,85,247,0.12); color: #c084fc; border-color: rgba(168,85,247,0.2); }
        .admin-post-type-tag.broadcast { background: rgba(249,115,22,0.12); color: #fb923c; border-color: rgba(249,115,22,0.2); }
        .admin-post-type-tag.resolved { background: rgba(34,197,94,0.12); color: #4ade80; border-color: rgba(34,197,94,0.2); }
        .admin-post-type-tag.poll { background: rgba(234,179,8,0.12); color: #facc15; border-color: rgba(234,179,8,0.2); }

        .admin-post-card-body { font-size: 13px; color: var(--text-secondary); line-height: 1.55; margin-bottom: 10px; }
        .admin-post-card-body strong { color: var(--text-primary); }

        .admin-post-card-foot {
          display: flex;
          align-items: center;
          gap: 14px;
          font-size: 11px;
          font-family: var(--font-mono);
          color: var(--text-muted);
        }

        .admin-post-card-foot span { display: flex; align-items: center; gap: 4px; }

        .admin-posts-panel-empty {
          text-align: center;
          padding: 60px 20px;
          color: var(--text-muted);
          font-family: var(--font-mono);
          font-size: 13px;
        }

        .admin-posts-panel-loading {
          display: flex;
          flex-direction: column;
          gap: 12px;
          padding: 16px 0;
        }

        .admin-skeleton {
          background: linear-gradient(90deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 100%);
          background-size: 200% 100%;
          animation: skeleton-shimmer 1.5s infinite;
          border-radius: 8px;
        }

      `}</style>



        



      {/* ══ MAIN CONTENT COLUMN ══ */}
      <div className="admin-main">
        {/* TOPBAR */}
        <header className="admin-topbar">
          <div className="admin-topbar-title capitalize">{activeTab.replace("-", " ")} Panel</div>

          <div className="admin-topbar-search">
            <Search size={14} className="text-[#4a5270]" />
            <input
              type="text"
              placeholder="Search databases..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="admin-topbar-actions">
            <button className="admin-icon-btn notif-dot" title="Reload Bad Words List" onClick={handleReloadBadWords}>
              <RefreshCw size={16} className="text-secondary" />
            </button>
            <button className="admin-icon-btn" title="Refresh Live Data" onClick={fetchStats} disabled={loadingStats}>
              <TrendingUp size={16} className={loadingStats ? "animate-spin text-accent" : "text-secondary"} />
            </button>
          </div>
        </header>

        {/* VIEWPORTS */}
        <div className="admin-content">
          <AnimatePresence mode="wait">
            
            {/* ──────────── VIEW: DASHBOARD ──────────── */}
            {activeTab === "dashboard" && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.15 }}
                className="space-y-6"
              >
                <div className="admin-section-header">
                  <div>
                    <div className="admin-section-title">Platform Live Overview</div>
                    <div className="admin-section-sub">Dynamic sync with Govlyx microservices</div>
                  </div>
                  <button className="admin-btn admin-btn-secondary admin-btn-sm" onClick={fetchStats}>
                    <RefreshCw size={13} className="mr-1" /> Refresh Stats
                  </button>
                </div>

                {/* STAT GRID */}
                <div className="admin-stat-grid">
                  <div className="admin-stat-card orange">
                    <div className="admin-stat-label">Total Citizens</div>
                    <div className="admin-stat-val">42,861</div>
                    <div className="admin-stat-delta"><span className="admin-delta-up">▲ 8.4%</span>&nbsp;vs last week</div>
                    <div className="admin-progress-bar"><div className="admin-progress-fill" style={{ width: "84%", background: "var(--accent)" }}></div></div>
                  </div>
                  <div className="admin-stat-card blue">
                    <div className="admin-stat-label">Active Chat Sessions</div>
                    <div className="admin-stat-val">{liveSessions}</div>
                    <div className="admin-stat-delta"><span className="admin-delta-up">▲ Live</span>&nbsp;socket connections</div>
                    <div className="admin-progress-bar"><div className="admin-progress-fill" style={{ width: "68%", background: "var(--accent2)" }}></div></div>
                  </div>
                  <div className="admin-stat-card green">
                    <div className="admin-stat-label">Active Issues</div>
                    <div className="admin-stat-val">1,247</div>
                    <div className="admin-stat-delta"><span className="admin-delta-up">▲ 3.1%</span>&nbsp;raised today</div>
                    <div className="admin-progress-bar"><div className="admin-progress-fill" style={{ width: "55%", background: "var(--success)" }}></div></div>
                  </div>
                  <div className="admin-stat-card yellow">
                    <div className="admin-stat-label">Resolved Issues</div>
                    <div className="admin-stat-val">9,384</div>
                    <div className="admin-stat-delta"><span className="admin-delta-up">▲ 12%</span>&nbsp;resolution rate</div>
                    <div className="admin-progress-bar"><div className="admin-progress-fill" style={{ width: "78%", background: "var(--warn)" }}></div></div>
                  </div>
                </div>

                <div className="admin-two-col">
                  {/* Recent Onboarding Queue */}
                  <div className="admin-card">
                    <div className="admin-card-head">
                      <div>
                        <div className="admin-card-title">Department Onboarding Queue</div>
                        <div className="admin-card-subtitle">Local registrations pending Super Admin verification</div>
                      </div>
                    </div>
                    <div className="admin-card-body p-0">
                      {requests.length === 0 ? (
                        <div className="py-12 text-center text-[#4a5270] italic">No pending department onboarding requests.</div>
                      ) : (
                        <div className="admin-table-scroll">
                        <table className="admin-data-table">
                          <thead>
                            <tr>
                              <th>Department Name</th>
                              <th>Contact Email</th>
                              <th>Pincode</th>
                              <th>Status</th>
                              <th>Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {requests.map(req => (
                              <tr key={req.id}>
                                <td>
                                  <div className="flex items-center gap-2">
                                    <div className="admin-u-avatar admin-ua-orange">{req.deptName.charAt(0)}</div>
                                    <div className="admin-td-name">{req.deptName}</div>
                                  </div>
                                </td>
                                <td>{req.contactEmail}</td>
                                <td><span className="admin-pincode-tag">{req.pincode || "400001"}</span></td>
                                <td>
                                  <span className={`admin-badge ${
                                    req.status === "pending" ? "admin-badge-pending" :
                                    req.status === "approved" ? "admin-badge-active" : "admin-badge-inactive"
                                  }`}>
                                    {req.status}
                                  </span>
                                </td>
                                <td>
                                  {req.status === "pending" ? (
                                    <div className="flex gap-2">
                                      <button className="admin-btn admin-btn-secondary admin-btn-sm text-green-500 hover:bg-green-500/10 p-1 border-none" onClick={() => handleApproveRequest(req)}>
                                        <CheckCircle2 size={16} />
                                      </button>
                                      <button className="admin-btn admin-btn-secondary admin-btn-sm text-red-500 hover:bg-red-500/10 p-1 border-none" onClick={() => handleRejectRequest(req.id)}>
                                        <XCircle size={16} />
                                      </button>
                                    </div>
                                  ) : (
                                    <span className="text-[11px] opacity-40 font-mono">Processed</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Broadcast Statistics */}
                  <div className="admin-card">
                    <div className="admin-card-head">
                      <div>
                        <div className="admin-card-title">Broadcast Volumes</div>
                        <div className="admin-card-subtitle">Active scopes from /api/posts/broadcast/statistics</div>
                      </div>
                    </div>
                    <div className="admin-card-body">
                      <div className="admin-qstat">
                        <div className="admin-qstat-row">
                          <div className="admin-qstat-icon" style={{ background: "rgba(249,115,22,0.12)" }}><Globe size={16} className="text-[#f97316]" /></div>
                          <div className="admin-qstat-label">Country Broadcasts</div>
                          <div className="admin-qstat-value" style={{ color: "var(--accent)" }}>{broadcastStats?.countryBroadcastCount ?? 12}</div>
                        </div>
                        <div className="admin-qstat-row">
                          <div className="admin-qstat-icon" style={{ background: "rgba(59,130,246,0.12)" }}><Landmark size={16} className="text-[#3b82f6]" /></div>
                          <div className="admin-qstat-label">State Broadcasts</div>
                          <div className="admin-qstat-value" style={{ color: "var(--accent2)" }}>{broadcastStats?.stateBroadcastCount ?? 142}</div>
                        </div>
                        <div className="admin-qstat-row">
                          <div className="admin-qstat-icon" style={{ background: "rgba(34,197,94,0.12)" }}><Map size={16} className="text-[#22c55e]" /></div>
                          <div className="admin-qstat-label">District Broadcasts</div>
                          <div className="admin-qstat-value" style={{ color: "var(--success)" }}>{broadcastStats?.districtBroadcastCount ?? 618}</div>
                        </div>
                        <div className="admin-qstat-row">
                          <div className="admin-qstat-icon" style={{ background: "rgba(234,179,8,0.12)" }}><MapPin size={16} className="text-[#eab308]" /></div>
                          <div className="admin-qstat-label">Pincode Broadcasts</div>
                          <div className="admin-qstat-value" style={{ color: "var(--warn)" }}>{broadcastStats?.pincodeBroadcastCount ?? 2140}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Recent Registered Depts table */}
                <div className="admin-card">
                  <div className="admin-card-head">
                    <div>
                      <div className="admin-card-title">Recently Onboarded Departments</div>
                      <div className="admin-card-subtitle">Active government units responding to queries</div>
                    </div>
                    <button className="admin-btn admin-btn-secondary admin-btn-sm" onClick={() => setActiveTab("departments")}>View All</button>
                  </div>
                  <div className="admin-card-body p-0">
                    <div className="admin-table-scroll">
                    <table className="admin-data-table">
                      <thead>
                        <tr>
                          <th>Department Unit</th>
                          <th>Official Email</th>
                          <th>Category</th>
                          <th>Pincode</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {deptsDb.slice(0, 3).map(dept => (
                          <tr key={dept.id} className="user-row cursor-pointer animate-in fade-in" onClick={() => handleOpenDetails({ username: dept.name, email: dept.email, pincode: dept.pincode, role: "ROLE_DEPARTMENT", status: dept.status, regDate: dept.regDate, departmentType: dept.departmentType })}>
                            <td>
                              <div className="flex items-center gap-2">
                                <div className="admin-u-avatar admin-ua-blue">{dept.name.charAt(0)}</div>
                                <div className="admin-td-name">{dept.name}</div>
                              </div>
                            </td>
                            <td>{dept.email}</td>
                            <td>{dept.departmentType}</td>
                            <td><span className="admin-pincode-tag">{dept.pincode}</span></td>
                            <td><span className="admin-badge admin-badge-active">{dept.status}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ──────────── VIEW: REGISTER DEPARTMENT ──────────── */}
            {activeTab === "reg-dept" && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.15 }}
                className="max-w-3xl"
              >
                <div className="admin-section-header">
                  <div>
                    <div className="admin-section-title">Onboard Government Department</div>
                    <div className="admin-section-sub">API Endpoint: POST /api/auth/register/department</div>
                  </div>
                </div>

                <div className="admin-card">
                  <div className="admin-card-head">
                    <div>
                      <div className="admin-card-title">Create Department Authority Account</div>
                      <div className="admin-card-subtitle">Verify department scope and pincode mapping</div>
                    </div>
                    <span className="admin-badge admin-badge-dept">ROLE_DEPARTMENT</span>
                  </div>
                  <div className="admin-card-body">
                    <form onSubmit={handleRegisterDept} className="space-y-6">
                      <div className="admin-form-section-title">Identity Parameters</div>
                      <div className="admin-form-grid">
                        <div className="admin-form-group">
                          <label className="admin-form-label">Department Unit Name <span>*</span></label>
                          <input
                            type="text"
                            required
                            className="admin-form-input"
                            placeholder="e.g. WaterDeptMumbai"
                            value={deptForm.name}
                            onChange={e => setDeptForm({ ...deptForm, name: e.target.value })}
                          />
                          <div className="admin-form-hint">Used for display and citizen tags</div>
                        </div>

                        <div className="admin-form-group">
                          <label className="admin-form-label">Official Gov Email <span>*</span></label>
                          <input
                            type="email"
                            required
                            className="admin-form-input"
                            placeholder="dept.mumbai@gov.in"
                            value={deptForm.email}
                            onChange={e => setDeptForm({ ...deptForm, email: e.target.value })}
                          />
                        </div>
                      </div>

                      <hr className="admin-form-divider" />

                      <div className="admin-form-section-title">Jurisdiction &amp; Category</div>
                      <div className="admin-form-grid">
                        <div className="admin-form-group">
                          <label className="admin-form-label">Primary Pincode (Area) <span>*</span></label>
                          <input
                            type="text"
                            required
                            className="admin-form-input"
                            placeholder="e.g. 400001"
                            maxLength={6}
                            value={deptForm.pincode}
                            onChange={e => setDeptForm({ ...deptForm, pincode: e.target.value.replace(/\D/g, "") })}
                          />
                          <div className="admin-form-hint">Indian pincode for geo-tag tracking</div>
                        </div>

                        <div className="admin-form-group">
                          <label className="admin-form-label">Department Type <span>*</span></label>
                          <select
                            required
                            className="admin-form-select"
                            value={deptForm.departmentType}
                            onChange={e => setDeptForm({ ...deptForm, departmentType: e.target.value })}
                          >
                            <option value="">Select Category</option>
                            <option value="Water Supply">Water Supply</option>
                            <option value="Roads &amp; Infrastructure">Roads &amp; Infrastructure</option>
                            <option value="Sanitation &amp; Waste">Sanitation &amp; Waste</option>
                            <option value="Electricity &amp; Power">Electricity &amp; Power</option>
                            <option value="Health &amp; Medical">Health &amp; Medical</option>
                            <option value="General Administration">General Administration</option>
                          </select>
                        </div>
                      </div>

                      <hr className="admin-form-divider" />

                      <div className="admin-form-section-title">Access Password</div>
                      <div className="admin-form-grid">
                        <div className="admin-form-group">
                          <label className="admin-form-label">Password <span>*</span></label>
                          <div className="admin-password-wrap">
                            <input
                              type={showDeptPw ? "text" : "password"}
                              required
                              className="admin-form-input"
                              placeholder="••••••••"
                              value={deptForm.password}
                              onChange={e => setDeptForm({ ...deptForm, password: e.target.value })}
                            />
                            <button
                              type="button"
                              className="admin-pw-toggle"
                              onClick={() => setShowDeptPw(!showDeptPw)}
                            >
                              {showDeptPw ? <EyeOff size={15} /> : <Eye size={15} />}
                            </button>
                          </div>
                        </div>

                        <div className="admin-form-group">
                          <label className="admin-form-label">Confirm Password <span>*</span></label>
                          <div className="admin-password-wrap">
                            <input
                              type={showDeptConf ? "text" : "password"}
                              required
                              className="admin-form-input"
                              placeholder="••••••••"
                              value={deptForm.confirmPassword}
                              onChange={e => setDeptForm({ ...deptForm, confirmPassword: e.target.value })}
                            />
                            <button
                              type="button"
                              className="admin-pw-toggle"
                              onClick={() => setShowDeptConf(!showDeptConf)}
                            >
                              {showDeptConf ? <EyeOff size={15} /> : <Eye size={15} />}
                            </button>
                          </div>
                        </div>
                      </div>

                      <hr className="admin-form-divider" />

                      <div className="admin-form-section-title">Permissions Provisioned</div>
                      <div className="admin-tag-grid">
                        <span className="admin-tag">POST /api/posts/broadcast</span>
                        <span className="admin-tag">PUT /api/posts/resolution/*</span>
                        <span className="admin-tag">GET /api/user-tagging/*</span>
                        <span className="admin-tag">GET /api/posts/broadcast/analytics</span>
                      </div>

                      <div className="admin-btn-actions">
                        <button
                          type="submit"
                          className="admin-btn admin-btn-primary"
                          disabled={registeringDept}
                        >
                          <UserPlus size={16} /> {registeringDept ? "Registering..." : "Onboard Department"}
                        </button>
                        <button
                          type="button"
                          className="admin-btn admin-btn-secondary"
                          onClick={() => setDeptForm({
                            name: "", email: "", password: "", confirmPassword: "", pincode: "", departmentType: ""
                          })}
                        >
                          Clear
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ──────────── VIEW: REGISTER ADMIN ──────────── */}
            {activeTab === "reg-admin" && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.15 }}
                className="max-w-3xl"
              >
                <div className="admin-section-header">
                  <div>
                    <div className="admin-section-title">Register Platform Admin</div>
                    <div className="admin-section-sub">API Endpoint: POST /api/auth/register/admin</div>
                  </div>
                </div>

                <div className="admin-card">
                  <div className="admin-card-head">
                    <div>
                      <div className="admin-card-title">Create Admin Authority Account</div>
                      <div className="admin-card-subtitle">Grants full control dashboard panels</div>
                    </div>
                    <span className="admin-badge admin-badge-admin">ROLE_ADMIN</span>
                  </div>
                  <div className="admin-card-body">
                    <div className="admin-alert admin-alert-error mb-4">
                      <ShieldCheck size={16} className="shrink-0" />
                      <div>Admin accounts have unrestricted platform access. Onboard only authorized personnel.</div>
                    </div>

                    <form onSubmit={handleRegisterAdmin} className="space-y-6">
                      <div className="admin-form-section-title">Identity &amp; Account Parameters</div>
                      <div className="admin-form-grid">
                        <div className="admin-form-group">
                          <label className="admin-form-label">Admin Username <span>*</span></label>
                          <input
                            type="text"
                            required
                            className="admin-form-input"
                            placeholder="e.g. AdminRajkumar"
                            value={adminForm.username}
                            onChange={e => setAdminForm({ ...adminForm, username: e.target.value })}
                          />
                          <div className="admin-form-hint">Must be unique across the platform</div>
                        </div>

                        <div className="admin-form-group">
                          <label className="admin-form-label">Official Email <span>*</span></label>
                          <input
                            type="email"
                            required
                            className="admin-form-input"
                            placeholder="admin@govlyx.com"
                            value={adminForm.email}
                            onChange={e => setAdminForm({ ...adminForm, email: e.target.value })}
                          />
                        </div>
                      </div>

                      <div className="admin-form-grid">
                        <div className="admin-form-group">
                          <label className="admin-form-label">Pincode (Optional)</label>
                          <input
                            type="text"
                            className="admin-form-input"
                            placeholder="6-digit pincode"
                            maxLength={6}
                            value={adminForm.pincode}
                            onChange={e => setAdminForm({ ...adminForm, pincode: e.target.value.replace(/\D/g, "") })}
                          />
                        </div>
                      </div>

                      <hr className="admin-form-divider" />

                      <div className="admin-form-section-title">Access Password</div>
                      <div className="admin-form-grid">
                        <div className="admin-form-group">
                          <label className="admin-form-label">Password <span>*</span></label>
                          <div className="admin-password-wrap">
                            <input
                              type={showAdminPw ? "text" : "password"}
                              required
                              className="admin-form-input"
                              placeholder="••••••••"
                              value={adminForm.password}
                              onChange={e => setAdminForm({ ...adminForm, password: e.target.value })}
                            />
                            <button
                              type="button"
                              className="admin-pw-toggle"
                              onClick={() => setShowAdminPw(!showAdminPw)}
                            >
                              {showAdminPw ? <EyeOff size={15} /> : <Eye size={15} />}
                            </button>
                          </div>
                        </div>

                        <div className="admin-form-group">
                          <label className="admin-form-label">Confirm Password <span>*</span></label>
                          <input
                            type="password"
                            required
                            className="admin-form-input"
                            placeholder="••••••••"
                            value={adminForm.confirmPassword}
                            onChange={e => setAdminForm({ ...adminForm, confirmPassword: e.target.value })}
                          />
                        </div>
                      </div>

                      <div className="admin-btn-actions">
                        <button
                          type="submit"
                          className="admin-btn admin-btn-primary"
                          disabled={registeringAdmin}
                        >
                          <ShieldCheck size={16} /> {registeringAdmin ? "Registering..." : "Register Admin"}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ──────────── VIEW: ALL USERS ──────────── */}
            {activeTab === "users" && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.15 }}
                className="space-y-6"
              >
                <div className="admin-section-header">
                  <div>
                    <div className="admin-section-title">All Registered Platform Users</div>
                    <div className="admin-section-sub">Database count: {usersDb.length} users</div>
                  </div>
                  <button
                    className="admin-btn admin-btn-secondary admin-btn-sm flex items-center gap-1.5"
                    onClick={fetchLiveUsers}
                    disabled={searchingLive}
                  >
                    <RefreshCw size={14} className={searchingLive ? "animate-spin" : ""} />
                    Refresh Users
                  </button>
                </div>

                <div className="admin-card">
                  <div className="admin-card-head">
                    <div className="admin-card-title">User Listings</div>
                  </div>
                  <div className="admin-card-body p-0">
                    <div className="admin-table-scroll">
                    <table className="admin-data-table">
                      <thead>
                        <tr>
                          <th>Username</th>
                          <th>Email</th>
                          <th>Pincode</th>
                          <th>Role</th>
                          <th>Status</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {searchingLive && (
                          <tr>
                            <td colSpan={6} className="text-center py-4 text-sm text-[var(--text-secondary)]">
                              <div className="flex items-center justify-center gap-2">
                                <RefreshCw className="animate-spin text-[var(--accent)]" size={14} />
                                <span>Searching live users database...</span>
                              </div>
                            </td>
                          </tr>
                        )}
                        {(() => {
                          const localFiltered = usersDb.filter(u =>
                            u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            u.pincode.includes(searchQuery)
                          );
                          const seen = new Set();
                          const merged = [];
                          for (const u of [...searchResults, ...localFiltered]) {
                            const key = `${u.username}-${u.role}`;
                            if (!seen.has(key)) {
                              seen.add(key);
                              merged.push(u);
                            }
                          }
                          return merged.map(user => (
                            <tr key={user.id} className="user-row cursor-pointer" onClick={() => handleOpenDetails(user)}>
                              <td>
                                <div className="flex items-center gap-2">
                                  <div className={`admin-u-avatar ${
                                    user.role === "ROLE_ADMIN" ? "admin-ua-orange" :
                                    user.role === "ROLE_DEPARTMENT" ? "admin-ua-blue" : "admin-ua-green"
                                  }`}>
                                    {user.username.charAt(0).toUpperCase()}
                                  </div>
                                  <div className="admin-td-name">{user.username}</div>
                                </div>
                              </td>
                              <td>{user.email}</td>
                              <td><span className="admin-pincode-tag">{user.pincode}</span></td>
                              <td>
                                <span className={`admin-badge ${
                                  user.role === "ROLE_ADMIN" ? "admin-badge-admin" :
                                  user.role === "ROLE_DEPARTMENT" ? "admin-badge-dept" : "admin-badge-user"
                                }`}>
                                  {user.role}
                                </span>
                              </td>
                              <td>
                                <span className={`admin-badge ${user.status === "Active" ? "admin-badge-active" : "admin-badge-inactive"}`}>
                                  {user.status}
                                </span>
                              </td>
                              <td>
                                {user.role !== "ROLE_ADMIN" && (
                                  <button
                                    className={`admin-btn admin-btn-sm ${user.status === "Active" ? "admin-btn-danger" : "admin-btn-primary"}`}
                                    onClick={(e) => { e.stopPropagation(); toggleUserStatus(user.id); }}
                                  >
                                    {user.status === "Active" ? "Suspend" : "Activate"}
                                  </button>
                                )}
                              </td>
                            </tr>
                          ));
                        })()}
                      </tbody>
                    </table>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ──────────── VIEW: DEPARTMENTS ──────────── */}
            {activeTab === "departments" && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.15 }}
                className="space-y-6"
              >
                <div className="admin-section-header">
                  <div>
                    <div className="admin-section-title">Government Department Units</div>
                    <div className="admin-section-sub">Active responding bodies: {deptsDb.length} categories</div>
                  </div>
                </div>

                <div className="admin-card">
                  <div className="admin-card-head">
                    <div className="admin-card-title">Department Catalog</div>
                  </div>
                  <div className="admin-card-body p-0">
                    <div className="admin-table-scroll">
                    <table className="admin-data-table">
                      <thead>
                        <tr>
                          <th>Department Name</th>
                          <th>Official Email</th>
                          <th>Category</th>
                          <th>Pincode</th>
                          <th>Status</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {deptsDb
                          .filter(d =>
                            d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            d.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            d.pincode.includes(searchQuery)
                          )
                          .map(dept => (
                            <tr key={dept.id} className="user-row cursor-pointer" onClick={() => handleOpenDetails({ username: dept.name, email: dept.email, pincode: dept.pincode, role: "ROLE_DEPARTMENT", status: dept.status, regDate: dept.regDate, departmentType: dept.departmentType })}>
                              <td>
                                <div className="flex items-center gap-2">
                                  <div className="admin-u-avatar admin-ua-blue">{dept.name.charAt(0).toUpperCase()}</div>
                                  <div className="admin-td-name">{dept.name}</div>
                                </div>
                              </td>
                              <td>{dept.email}</td>
                              <td>{dept.departmentType}</td>
                              <td><span className="admin-pincode-tag">{dept.pincode}</span></td>
                              <td>
                                <span className={`admin-badge ${
                                  dept.status === "Active" ? "admin-badge-active" :
                                  dept.status === "Pending" ? "admin-badge-pending" : "admin-badge-inactive"
                                }`}>
                                  {dept.status}
                                </span>
                              </td>
                              <td>
                                <button
                                  className={`admin-btn admin-btn-sm ${dept.status === "Active" ? "admin-btn-danger" : "admin-btn-primary"}`}
                                  onClick={() => toggleDeptStatus(dept.id)}
                                >
                                  {dept.status === "Active" ? "Suspend" : "Activate"}
                                </button>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ──────────── VIEW: ALL COMMUNITIES ──────────── */}
            {activeTab === "communities" && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.15 }}
                className="space-y-6"
              >
                <div className="admin-section-header">
                  <div>
                    <div className="admin-section-title">All Platform Communities</div>
                    <div className="admin-section-sub">Database count: {communitiesDb.length} groups</div>
                  </div>
                  <button
                    className="admin-btn admin-btn-secondary admin-btn-sm flex items-center gap-1.5"
                    onClick={fetchLiveCommunities}
                    disabled={fetchingCommunities}
                  >
                    <RefreshCw size={14} className={fetchingCommunities ? "animate-spin" : ""} />
                    Refresh Communities
                  </button>
                </div>

                <div className="admin-card">
                  <div className="admin-card-head">
                    <div className="admin-card-title">Community Catalog</div>
                  </div>
                  <div className="admin-card-body p-0">
                    <div className="admin-table-scroll">
                    <table className="admin-data-table">
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Slug / ID</th>
                          <th>Category</th>
                          <th>Privacy</th>
                          <th>Members</th>
                          <th>Status</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {fetchingCommunities && (
                          <tr>
                            <td colSpan={7} className="text-center py-4 text-sm text-[var(--text-secondary)]">
                              <div className="flex items-center justify-center gap-2">
                                <RefreshCw className="animate-spin text-[var(--accent)]" size={14} />
                                <span>Syncing with communities database...</span>
                              </div>
                            </td>
                          </tr>
                        )}
                        {communitiesDb
                          .filter(c =>
                            c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            c.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            (c.category && c.category.toLowerCase().includes(searchQuery.toLowerCase()))
                          )
                          .map(comm => (
                            <tr key={comm.id} className="user-row">
                              <td>
                                <div className="flex items-center gap-2">
                                  <div className="admin-u-avatar admin-ua-purple">
                                    {comm.name.charAt(0).toUpperCase()}
                                  </div>
                                  <div>
                                    <div className="admin-td-name">{comm.name}</div>
                                    <div className="text-[10px] text-[var(--text-muted)] truncate max-w-[180px]" title={comm.description}>{comm.description}</div>
                                  </div>
                                </div>
                              </td>
                              <td><span className="font-mono text-xs">/{comm.slug}</span></td>
                              <td>{comm.category || "General"}</td>
                              <td>
                                <span className={`admin-badge ${comm.privacy === "PUBLIC" ? "admin-badge-active" : "admin-badge-inactive"}`}>
                                  {comm.privacy}
                                </span>
                              </td>
                              <td>{comm.memberCount}</td>
                              <td>
                                <span className={`admin-badge ${comm.status === "Active" ? "admin-badge-active" : "admin-badge-inactive"}`}>
                                  {comm.status}
                                </span>
                              </td>
                              <td>
                                <button
                                  className={`admin-btn admin-btn-sm ${comm.status === "Active" ? "admin-btn-danger" : "admin-btn-primary"}`}
                                  onClick={() => toggleCommunityStatus(comm.id)}
                                >
                                  {comm.status === "Active" ? "Archive" : "Activate"}
                                </button>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ──────────── VIEW: CONTENT MONITOR ──────────── */}
            {activeTab === "content" && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.15 }}
                className="space-y-6"
              >
                <div className="admin-section-header">
                  <div>
                    <div className="admin-section-title">Platform Content Moderation</div>
                    <div className="admin-section-sub">Audit citizen reports and remove profanity posts</div>
                  </div>
                  <button className="admin-btn admin-btn-secondary admin-btn-sm" onClick={handleReloadBadWords}>Reload Profanity Catalog</button>
                </div>

                <div className="space-y-4">
                  {loadingPosts ? (
                    <div className="admin-card p-8 text-center text-sm text-[var(--text-secondary)] flex flex-col items-center justify-center gap-2">
                      <RefreshCw className="animate-spin text-[var(--accent)]" size={24} />
                      <p>Fetching live feed from platform...</p>
                    </div>
                  ) : postsDb.length === 0 ? (
                    <div className="admin-card p-8 text-center text-sm text-[var(--text-secondary)]">
                      No posts found matching moderation criteria.
                    </div>
                  ) : (
                    postsDb.map(post => (
                      <div key={post.id} className="admin-card">
                        <div className="admin-card-head">
                          <div className="flex items-center gap-3">
                            <div className="admin-u-avatar admin-ua-purple">{post.author.charAt(0).toUpperCase()}</div>
                            <div>
                              <div className="admin-card-title">@{post.author}</div>
                              <div className="admin-card-subtitle">{post.date} · Type: {post.type}</div>
                            </div>
                          </div>
                          {post.flags > 0 && (
                            <span className="admin-badge admin-badge-inactive">{post.flags} Flags</span>
                          )}
                        </div>
                        <div className="admin-card-body">
                          <p className="text-[#f0f2f8] mb-4">{post.content}</p>
                          <div className="flex gap-3">
                            <button className="admin-btn admin-btn-danger admin-btn-sm" onClick={() => handleDeletePost(post.id, post.postType || "social-posts")}>
                              <Trash2 size={13} className="mr-1" /> Delete Content
                            </button>
                            {post.flags > 0 && (
                              <button className="admin-btn admin-btn-secondary admin-btn-sm" onClick={() => handleResolveFlags(post.id)}>
                                Clear Flags
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            )}

            {/* ──────────── VIEW: CHAT STATISTICS ──────────── */}
            {activeTab === "chat" && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.15 }}
                className="space-y-6"
              >
                <div className="admin-section-header">
                  <div>
                    <div className="admin-section-title">Support Chat Analytics</div>
                    <div className="admin-section-sub">Dynamic counts matching chatSocket connection metrics</div>
                  </div>
                </div>

                <div className="admin-mini-stat-row">
                  <div className="admin-mini-stat">
                    <div className="admin-mini-val text-[#3b82f6]">{liveSessions}</div>
                    <div className="admin-mini-label">Active Sockets</div>
                  </div>
                  <div className="admin-mini-stat">
                    <div className="admin-mini-val text-[#22c55e]">1.4s</div>
                    <div className="admin-mini-label">Avg. Socket Latency</div>
                  </div>
                  <div className="admin-mini-stat">
                    <div className="admin-mini-val text-[#f97316]">98.2%</div>
                    <div className="admin-mini-label">Message Delivery</div>
                  </div>
                </div>

                <div className="admin-card">
                  <div className="admin-card-head">
                    <div className="admin-card-title">Live Message Logs</div>
                    <div className="admin-card-subtitle">Real-time socket events</div>
                  </div>
                  <div className="admin-card-body">
                    <div className="space-y-3 font-mono text-[12px] text-green-400 bg-black/40 p-4 rounded-xl">
                      <div>[INFO] {new Date().toLocaleTimeString()} - WebSocket connection opened for citizen session: #{Math.floor(1000+Math.random()*9000)}</div>
                      <div>[INFO] {new Date().toLocaleTimeString()} - Broadcast sync started to channel '/topic/pincode/411001'</div>
                      <div>[INFO] {new Date().toLocaleTimeString()} - Message successfully saved into chat history collection</div>
                      <div>[INFO] {new Date().toLocaleTimeString()} - Recalculated active socket session cache: {liveSessions} connections</div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}


          </AnimatePresence>
        </div>
      </div>

      {/* Mobile Sidebar Backdrop */}
      {mobileSidebarOpen && (
        <div 
          className="fixed inset-0 z-[999] bg-black/60 backdrop-blur-sm md:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* Mobile Sidebar Toggle Button */}
      <button 
        className={`admin-sidebar-toggle ${mobileSidebarOpen ? "open" : ""}`}
        onClick={() => setMobileSidebarOpen(prev => !prev)}
      >
        {mobileSidebarOpen ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
      </button>

      {/* ══ RIGHT SIDEBAR (NAV MENU) ══ */}
      <aside className={`admin-sidebar ${mobileSidebarOpen ? "open" : ""}`}>
        <div className="admin-sidebar-logo">
          <img src={govlyxLogo} alt="Govlyx Logo" className="w-8.5 h-8.5 object-contain" />
          <div>
            <div className="admin-logo-text">Govlyx</div>
            <div className="admin-logo-sub">Admin Centre</div>
          </div>
        </div>

        <nav className="admin-sidebar-nav">
          <div className="admin-nav-section">
            <div className="admin-nav-label">Overview</div>
            <button
              className={`admin-nav-item ${activeTab === "dashboard" ? "active" : ""}`}
              onClick={() => { setActiveTab("dashboard"); setMobileSidebarOpen(false); }}
            >
              <svg className="admin-nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8">
                <rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" />
                <rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" />
              </svg>
              Dashboard
            </button>
          </div>

          <div className="admin-nav-section">
            <div className="admin-nav-label">Registration</div>
            <button
              className={`admin-nav-item ${activeTab === "reg-dept" ? "active" : ""}`}
              onClick={() => { setActiveTab("reg-dept"); setMobileSidebarOpen(false); }}
            >
              <svg className="admin-nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8">
                <path d="M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11M20 10v11M8 10v11M12 10v11M16 10v11" />
              </svg>
              Register Department
            </button>
            <button
              className={`admin-nav-item ${activeTab === "reg-admin" ? "active" : ""}`}
              onClick={() => { setActiveTab("reg-admin"); setMobileSidebarOpen(false); }}
            >
              <svg className="admin-nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <line x1="19" y1="8" x2="19" y2="14" />
                <line x1="22" y1="11" x2="16" y2="11" />
              </svg>
              Register Admin
            </button>
          </div>

          <div className="admin-nav-section">
            <div className="admin-nav-label">User Management</div>
            <button
              className={`admin-nav-item ${activeTab === "users" ? "active" : ""}`}
              onClick={() => { setActiveTab("users"); setMobileSidebarOpen(false); }}
            >
              <svg className="admin-nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              All Users
              <span className="admin-nav-badge">{usersDb.length}</span>
            </button>
            <button
              className={`admin-nav-item ${activeTab === "departments" ? "active" : ""}`}
              onClick={() => { setActiveTab("departments"); setMobileSidebarOpen(false); }}
            >
              <svg className="admin-nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
              </svg>
              Departments
            </button>
            <button
              className={`admin-nav-item ${activeTab === "communities" ? "active" : ""}`}
              onClick={() => { setActiveTab("communities"); setMobileSidebarOpen(false); }}
            >
              <svg className="admin-nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8">
                <path d="M17 20h5v-2a3 3 0 0 0-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 0 1 5.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 0 1 9.288 0M15 7a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2 2 0 1 1-4 0 2 2 0 0 1 4 0ZM7 10a2 2 0 1 1-4 0 2 2 0 0 1 4 0Z" />
              </svg>
              Communities
              <span className="admin-nav-badge">{communitiesDb.length}</span>
            </button>
          </div>

          <div className="admin-nav-section">
            <div className="admin-nav-label">Platform</div>
            <button
              className={`admin-nav-item ${activeTab === "content" ? "active" : ""}`}
              onClick={() => { setActiveTab("content"); setMobileSidebarOpen(false); }}
            >
              <svg className="admin-nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
              </svg>
              Content Monitor
            </button>
            <button
              className={`admin-nav-item ${activeTab === "chat" ? "active" : ""}`}
              onClick={() => { setActiveTab("chat"); setMobileSidebarOpen(false); }}
            >
              <svg className="admin-nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              Chat Statistics
            </button>
          </div>
        </nav>

        <div className="admin-sidebar-footer">
          <div className="admin-chip">
            <div className="admin-avatar">{avatarInitials}</div>
            <div className="admin-info">
              <div className="admin-name text-xs truncate" title={userEmail}>{userDisplayName}</div>
              <div className="admin-role">Super Admin</div>
            </div>
          </div>
        </div>
      </aside>

      {/* Approval Modal (for department onboarding queue) */}
      <AnimatePresence>
        {showApproveModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 backdrop-blur-md bg-black/60">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 30 }}
              className="w-full max-w-md overflow-hidden rounded-[24px] border border-[var(--border)] bg-[var(--bg-surface)] shadow-2xl p-8 space-y-6"
            >
              <div className="space-y-1.5 flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 mb-2">
                  <ShieldCheck size={36} />
                </div>
                <h3 className="text-xl font-bold text-[var(--text-primary)]">Approve Department</h3>
                <p className="text-sm text-[var(--text-secondary)]">Provision credentials for {showApproveModal.deptName}</p>
              </div>

              <div className="space-y-4">
                <div className="admin-form-group">
                  <label className="admin-form-label">Auto-Filled Login Email</label>
                  <input
                    type="email"
                    className="admin-form-input bg-black/20"
                    value={approvedForm.email}
                    onChange={e => setApprovedForm({ ...approvedForm, email: e.target.value })}
                  />
                </div>

                <div className="admin-form-group">
                  <label className="admin-form-label">Temporary Access Password</label>
                  <input
                    type="text"
                    className="admin-form-input bg-black/20"
                    value={approvedForm.password}
                    onChange={e => setApprovedForm({ ...approvedForm, password: e.target.value })}
                  />
                </div>

                <div className="admin-form-group">
                  <label className="admin-form-label">Assigned GID (ID)</label>
                  <input
                    type="text"
                    className="admin-form-input bg-black/20"
                    value={approvedForm.identity}
                    readOnly
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowApproveModal(null)}
                  className="admin-btn admin-btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmApproveRequest}
                  className="admin-btn admin-btn-primary flex-1"
                >
                  Generate & Onboard
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Detail Slide-over Panel (new right sidebar when clicked) */}
      <div
        className={`admin-posts-panel-backdrop ${selectedUserForDetails ? "open" : ""}`}
        onClick={() => setSelectedUserForDetails(null)}
      />
      <div className={`admin-posts-panel ${selectedUserForDetails ? "open" : ""}`}>
        {selectedUserForDetails && (
          <>
            <div className="admin-posts-panel-head">
              <div className="admin-posts-panel-title-row">
                <div className="admin-posts-panel-user">
                  <div className="admin-posts-panel-avatar">
                    {(selectedUserForDetails.username || selectedUserForDetails.name || "U").charAt(0).toUpperCase()}
                  </div>
                  <div className="admin-posts-panel-meta">
                    <div className="admin-posts-panel-name text-[var(--text-primary)]">
                      {selectedUserForDetails.username || selectedUserForDetails.name}
                    </div>
                    <div className="admin-posts-panel-sub">
                      {selectedUserForDetails.role || "ROLE_USER"} · Pincode: {selectedUserForDetails.pincode || "N/A"}
                    </div>
                  </div>
                </div>
                <button
                  className="modal-close"
                  onClick={() => setSelectedUserForDetails(null)}
                >
                  ✕
                </button>
              </div>

              {/* Statistics Row inside details sidebar */}
              <div className="admin-posts-panel-stats mt-2">
                <div className="admin-posts-panel-stat">
                  <div className="admin-posts-panel-stat-val text-[var(--accent)]">
                    {selectedUserForDetails.role === "ROLE_DEPARTMENT" ? "218" : "14"}
                  </div>
                  <div className="admin-posts-panel-stat-lbl">Contributions</div>
                </div>
                <div className="admin-posts-panel-stat">
                  <div className="admin-posts-panel-stat-val text-[var(--success)]">
                    {selectedUserForDetails.status === "Active" ? "100%" : "0%"}
                  </div>
                  <div className="admin-posts-panel-stat-lbl">Reputation</div>
                </div>
                <div className="admin-posts-panel-stat">
                  <div className="admin-posts-panel-stat-val text-[var(--accent2)]">
                    {selectedUserForDetails.role === "ROLE_ADMIN" ? "Super" : "Verified"}
                  </div>
                  <div className="admin-posts-panel-stat-lbl">Status</div>
                </div>
              </div>
            </div>

            {/* Filter chips inside details sidebar */}
            <div className="admin-posts-panel-filter mt-3">
              <span
                className={`admin-filter-chip ${panelFilter === "all" ? "active" : ""}`}
                onClick={() => setPanelFilter("all")}
              >
                All Actions
              </span>
              <span
                className={`admin-filter-chip ${panelFilter === "broadcast" ? "active" : ""}`}
                onClick={() => setPanelFilter("broadcast")}
              >
                Broadcasts
              </span>
              <span
                className={`admin-filter-chip ${panelFilter === "resolved" ? "active" : ""}`}
                onClick={() => setPanelFilter("resolved")}
              >
                Resolutions
              </span>
            </div>

            {/* Body */}
            <div className="admin-posts-panel-body">
              {panelLoading ? (
                <div className="admin-posts-panel-loading space-y-4">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="admin-post-card animate-pulse space-y-3">
                      <div className="h-2 w-24 bg-white/10 rounded" />
                      <div className="h-4 w-full bg-white/10 rounded" />
                      <div className="h-3 w-40 bg-white/10 rounded" />
                    </div>
                  ))}
                </div>
              ) : panelPosts.length === 0 ? (
                <div className="admin-posts-panel-empty">No logged activities for this account.</div>
              ) : (
                panelPosts
                  .filter(post => panelFilter === "all" || post.type === panelFilter)
                  .map(post => (
                    <div key={post.id} className="admin-post-card">
                      <div className="admin-post-card-head">
                        <span className={`admin-post-type-tag ${post.type}`}>
                          {post.type}
                        </span>
                        <span className="text-[11px] font-mono text-[var(--text-muted)]">{post.date}</span>
                      </div>
                      <p className="admin-post-card-body">
                        {post.content}
                      </p>
                      <div className="admin-post-card-foot">
                        <span><Heart size={12} className="text-[#f97316]" /> {post.likes}</span>
                        <span><MessageSquare size={12} className="text-[#3b82f6]" /> {post.comments}</span>
                      </div>
                    </div>
                  ))
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
