import { useNavigate } from "react-router-dom";
import { ArrowLeft, ShieldCheck, Sun, Moon, MapPin, Scale, Users, MessageSquare, Image, Trash2, Mail, AlertTriangle } from "lucide-react";
import { useTheme } from "../hooks/useTheme";
import GovlyxLogo from "../components/ui/GovlyxLogo";

export default function PrivacyPolicy() {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="h-screen bg-base-100 text-slate-800 dark:text-slate-200 selection:bg-blue-650/30 transition-colors duration-300 flex flex-col relative overflow-hidden">
      <nav className="border-b border-slate-200 dark:border-slate-800 bg-base-100/90 backdrop-blur-md sticky top-0 z-50 h-[72px] shrink-0 transition-colors duration-300">
        <div className="max-w-[1200px] mx-auto px-6 h-full flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-sm font-bold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white transition-all cursor-pointer bg-transparent border-none group"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" /> Go Back
          </button>
          
          <div className="flex items-center gap-3">
            <GovlyxLogo showText size={44} textClassName="text-xl sm:text-2xl font-extrabold" />
            <span className="h-4 w-px bg-slate-200 dark:bg-slate-800 mx-2" />
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl bg-slate-105 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white transition-all cursor-pointer"
              aria-label="Toggle theme"
            >
              {theme === "light" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </nav>

      {/* Scrollable Container Wrapper */}
      <div className="flex-1 min-h-0 overflow-y-auto flex flex-col justify-between z-10">
        {/* Main Content */}
        <main className="w-full mx-auto max-w-[850px] px-6 py-16 relative">
          
          {/* Header */}
          <div className="text-center mb-12">
            <div className="w-16 h-16 rounded-2xl bg-blue-600/10 text-blue-605 dark:text-blue-400 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-blue-500/5 border border-blue-500/15">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
              Privacy Policy & Terms
            </h1>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
              <span><strong>Effective Date:</strong> June 2026</span>
              <span className="hidden sm:inline">•</span>
              <span><strong>Jurisdiction:</strong> Republic of India</span>
            </div>
          </div>

          {/* Privacy Document Body */}
          <div className="bg-base-100/60 dark:bg-base-100/40 border border-slate-200 dark:border-slate-850 p-6 sm:p-10 rounded-3xl backdrop-blur-xl shadow-xl space-y-8 text-slate-650 dark:text-slate-300 text-sm sm:text-base leading-relaxed">
            <p className="font-semibold text-slate-900 dark:text-white">
              Welcome to Govlyx. This platform is here to help you connect with your neighborhood and local government. By using Govlyx, you agree to how we collect and use your data as described below.
            </p>

            <div className="p-4 bg-red-500/10 border border-red-550/20 rounded-2xl text-xs sm:text-sm text-red-600 dark:text-red-400 font-bold flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 shrink-0 text-red-500" />
              <span><strong>18+ Warning:</strong> You must be at least 18 years old to access and use Govlyx. Registration and access to all platform services are restricted to adult users only.</span>
            </div>

            <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-2xl text-xs sm:text-sm text-slate-600 dark:text-slate-400 font-medium">
              Govlyx acts as an Intermediary under Indian IT laws. We follow the official rules to keep the platform safe and secure for all citizens.
            </div>

            <hr className="border-slate-200 dark:border-slate-800" />

            <section className="space-y-3">
              <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <MapPin className="w-5 h-5 text-blue-550 dark:text-blue-400 shrink-0" /> 1. Location & Pincode
              </h2>
              <p>
                Govlyx uses your <strong>6-digit pincode</strong> and address details to show you updates in your area.
              </p>
              <ul className="list-disc pl-6 space-y-1.5 text-slate-500 dark:text-slate-400 text-sm">
                <li>
                  <strong>No Live Tracking:</strong> We do <strong>not</strong> track your real-time GPS location. We only use the area information you voluntarily share.
                </li>
                <li>
                  <strong>Local Updates Only:</strong> While we show public announcements for your pincode, we cannot guarantee their accuracy. Govlyx is not an emergency response service.
                </li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <Scale className="w-5 h-5 text-blue-550 dark:text-blue-400 shrink-0" /> 2. Anonymous Chat & Law Enforcement (CRITICAL)
              </h2>
              <p>
                Govlyx includes a 1-on-1 Anonymous chat. <strong>Anonymous means the other user cannot see your identity, NOT that you are hidden from the law.</strong>
              </p>
              <ul className="list-disc pl-6 space-y-1.5 text-slate-500 dark:text-slate-400 text-sm">
                <li>
                  <strong>Record Keeping:</strong> We keep secure, encrypted system logs linking your anonymous chat identifier to your actual account profile, IP address, and device info.
                </li>
                <li>
                  <strong>Zero Tolerance for Abuse:</strong> We do not allow illegal activities, cyber threats, hate speech, or sharing of prohibited/harmful materials.
                </li>
                <li>
                  <strong>Law Enforcement Access:</strong> If we receive a valid legal order or request from police or government investigators under Indian law, <strong>we will unmask your identity and share chat logs directly with authorities.</strong>
                </li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-550 dark:text-blue-400 shrink-0" /> 3. Communities & What You Share
              </h2>
              <p>
                You can join public, private, or secret groups.
              </p>
              <ul className="list-disc pl-6 space-y-1.5 text-slate-500 dark:text-slate-400 text-sm">
                <li>
                  <strong>Your Responsibility:</strong> We do not write or edit your posts. You are legally responsible for whatever content you share.
                </li>
                <li>
                  <strong>Content Removal:</strong> In line with IT rules, if we receive a court or government order reporting illegal content, we will remove it within 36 hours.
                </li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-blue-550 dark:text-blue-400 shrink-0" /> 4. Government Communication
              </h2>
              <p>
                We connect citizens with government departments.
              </p>
              <ul className="list-disc pl-6 space-y-1.5 text-slate-500 dark:text-slate-400 text-sm">
                <li>
                  <strong>Anonymous Stats:</strong> We may share general stats (like how many people report water issues in a pincode) with verified government bodies.
                </li>
                <li>
                  <strong>Public Records:</strong> If you write directly to a government department or post in public forums, those details will be visible to them. We cannot control how government departments act on your reports.
                </li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <Image className="w-5 h-5 text-blue-550 dark:text-blue-400 shrink-0" /> 5. Uploading Photos & Media
              </h2>
              <ul className="list-disc pl-6 space-y-1.5 text-slate-500 dark:text-slate-400 text-sm">
                <li>
                  <strong>Metadata Removal:</strong> We try to strip hidden location data (metadata) from photos you upload to protect your privacy, but we advise checking your device's camera privacy settings.
                </li>
                <li>
                  <strong>Banned Media:</strong> Uploading copyrighted, fake, or illegal pictures/videos will get your account banned, and we may preserve the files for law enforcement.
                </li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <Trash2 className="w-5 h-5 text-blue-550 dark:text-blue-400 shrink-0" /> 6. Deleting Your Data
              </h2>
              <p>
                We process all details in compliance with the Digital Personal Data Protection (DPDP) Act, 2023.
              </p>
              <ul className="list-disc pl-6 space-y-1.5 text-slate-500 dark:text-slate-400 text-sm">
                <li>
                  <strong>Account Deletion:</strong> You can delete your account anytime through the Settings menu. Your active profile data will be deleted within 30 days.
                </li>
                <li>
                  <strong>Legal Exception:</strong> If your account has been flagged for criminal abuse, reported for serious violations, or is under investigation by police, we are legally required to keep your data even if you delete your profile.
                </li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <Mail className="w-5 h-5 text-blue-550 dark:text-blue-400 shrink-0" /> 7. Grievance Support Desk
              </h2>
              <p>
                If you have any questions, concerns, or want to report illegal content, please contact our Grievance Support Desk:
              </p>
              <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl text-xs sm:text-sm font-semibold space-y-2 mt-2">
                <p><span className="opacity-60 text-slate-500 dark:text-slate-405">Email:</span> <a href="mailto:govlyxsupport@gmail.com" className="text-blue-600 dark:text-blue-400 hover:underline">govlyxsupport@gmail.com</a></p>
                <p><span className="opacity-60 text-slate-505 dark:text-slate-405">Response Time:</span> Acknowledged within 24 hours</p>
                <p><span className="opacity-60 text-slate-505 dark:text-slate-405">Resolution Time:</span> Resolved within 15 days</p>
              </div>
            </section>

            <hr className="border-slate-200 dark:border-slate-800" />

            <p className="text-xs text-slate-500 text-center font-bold italic">
              By creating an account, you confirm you are 18 years of age or older and agree to this Privacy Policy under the laws of the Republic of India.
            </p>
          </div>
        </main>        <footer className="bg-base-100 border-t border-base-300 py-10 sm:py-12 px-6 transition-colors duration-300 z-10 shrink-0">
          <div className="max-w-[1400px] mx-auto flex flex-col md:flex-row justify-between items-center gap-6 text-center md:text-left">
            <GovlyxLogo showText size={38} textClassName="text-2xl sm:text-2xl" />
            <div className="flex flex-wrap justify-center gap-4 sm:gap-6 text-sm text-slate-500 dark:text-slate-400 font-semibold">
              <button onClick={() => navigate("/")} className="hover:text-red-600 dark:hover:text-red-400 transition-colors bg-transparent border-none p-0 cursor-pointer font-semibold">Home</button>
              <button onClick={() => navigate("/upcoming-updates")} className="hover:text-red-600 dark:hover:text-red-400 transition-colors bg-transparent border-none p-0 cursor-pointer font-semibold">Upcoming Updates</button>
              <button onClick={() => navigate("/privacy-policy")} className="text-red-600 dark:text-red-400 bg-transparent border-none p-0 cursor-pointer font-semibold">Privacy Policy</button>
              <button onClick={() => navigate("/review")} className="hover:text-red-600 dark:hover:text-red-400 transition-colors bg-transparent border-none p-0 cursor-pointer font-semibold">Review</button>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-400 dark:text-slate-500 font-medium">
              © 2026 Govlyx
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}
