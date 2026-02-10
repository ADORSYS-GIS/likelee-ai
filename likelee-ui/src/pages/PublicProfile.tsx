import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Avatar as UIAvatar,
  AvatarFallback as UIAvatarFallback,
  AvatarImage as UIAvatarImage,
} from "@/components/ui/avatar";
import { Badge as UIBadge } from "@/components/ui/badge";
import { Card as UICard } from "@/components/ui/card";
import { Button as UIButton } from "@/components/ui/button";
import {
  Alert as UIAlert,
  AlertDescription as UIAlertDescription,
} from "@/components/ui/alert";
import {
  Dialog as UIDialog,
  DialogContent as UIDialogContent,
} from "@/components/ui/dialog";
import {
  CheckCircle2,
  Eye,
  Edit,
  Shield,
  Users,
  Mic,
  Image as ImageIcon,
  DollarSign,
  Globe,
  MapPin,
} from "lucide-react";
import { useAuth } from "@/auth/AuthProvider";
import { getDashboard } from "@/api/functions";

// Cast UI components to any to avoid TS forwardRef prop typing frictions within this page
const Avatar: any = UIAvatar;
const AvatarFallback: any = UIAvatarFallback;
const AvatarImage: any = UIAvatarImage;
const Badge: any = UIBadge;
const Card: any = UICard;
const Button: any = UIButton;
const Alert: any = UIAlert;
const AlertDescription: any = UIAlertDescription;
const Dialog: any = UIDialog;
const DialogContent: any = UIDialogContent;

export default function PublicProfile() {
  const navigate = useNavigate();
  const { user, initialized, authenticated } = useAuth();
  const API_BASE = (import.meta as any).env.VITE_API_BASE_URL || "";
  const [profile, setProfile] = useState<any>({});
  const [stats, setStats] = useState<any>({
    active_campaigns: 0,
    completed_projects: 0,
    voice_profiles: 0,
  });
  const [showCard, setShowCard] = useState(false);

  useEffect(() => {
    if (!initialized) return;
    if (!authenticated || !user?.id) return;
    const abort = new AbortController();
    (async () => {
      try {
        const json: any = await getDashboard(user.id);
        const p = json?.profile || {};
        setProfile(p);
        setStats({
          active_campaigns: Array.isArray(json?.campaigns)
            ? json.campaigns.length
            : 0,
          completed_projects: json?.completed_projects ?? 0,
          voice_profiles: json?.voice_profiles ?? 0,
        });
      } catch (e) {
        // leave defaults
      }
    })();
    return () => abort.abort();
  }, [initialized, authenticated, user?.id]);

  const displayName = useMemo(
    () => profile.full_name || "",
    [profile.full_name],
  );
  const location = useMemo(
    () => [profile.city, profile.state].filter(Boolean).join(", "),
    [profile.city, profile.state],
  );
  const handleText = useMemo(
    () => (profile.platform_handle ? `@${profile.platform_handle}` : ""),
    [profile.platform_handle],
  );
  const contentTypes: string[] = useMemo(
    () => (Array.isArray(profile.content_types) ? profile.content_types : []),
    [profile.content_types],
  );
  const industries: string[] = useMemo(
    () => (Array.isArray(profile.industries) ? profile.industries : []),
    [profile.industries],
  );
  const pricePerWeek =
    typeof profile.base_monthly_price_cents === "number"
      ? Math.round(Number(profile.base_monthly_price_cents) / 100 / 4)
      : undefined;
  const openToNegotiations = profile.accept_negotiations ?? true;

  return (
    <div className="bg-gray-50 min-h-screen flex">
      {/* Left Sidebar */}
      <aside className="hidden md:flex md:flex-col md:w-64 border-r border-gray-200 bg-white">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <Avatar className="w-12 h-12 border-2 border-gray-200">
              {profile.headshot_url ? (
                <AvatarImage
                  src={profile.headshot_url}
                  alt={displayName || "User"}
                />
              ) : null}
              <AvatarFallback className="bg-gray-200 text-gray-800 font-semibold">
                {(displayName || profile.email || "U")
                  .slice(0, 1)
                  .toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-bold text-gray-900 truncate max-w-[10rem]">
                  {displayName || "—"}
                </p>
                {profile?.kyc_status === "approved" && (
                  <Badge className="bg-gray-900 text-green-400 border border-green-500">
                    Verified
                  </Badge>
                )}
              </div>
              {location && (
                <p className="text-xs text-gray-600 truncate max-w-[10rem]">
                  {location}
                </p>
              )}
            </div>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {[
            { id: "dashboard", label: "Dashboard" },
            { id: "likeness", label: "My Likeness" },
            { id: "voice", label: "Voice & Recordings" },
            { id: "campaigns", label: "Active Campaigns" },
            { id: "approvals", label: "Approval Queue" },
            { id: "contracts", label: "Licenses & Contracts" },
            { id: "earnings", label: "Earnings" },
            { id: "settings", label: "Settings" },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => navigate(`/CreatorDashboard?section=${item.id}`)}
              className="w-full text-left px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-100 cursor-pointer"
            >
              {item.label}
            </button>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex-1">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Public Profile Preview
              </h1>
              <p className="text-gray-600">
                This is how brands see your profile
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="border-2 border-gray-300"
                onClick={() => setShowCard(true)}
              >
                <Eye className="w-4 h-4 mr-2" />
                View Card
              </Button>
              <Button
                className="bg-gray-900 text-white hover:bg-gray-800"
                onClick={() => navigate("/CreatorDashboard?section=settings")}
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit Profile
              </Button>
            </div>
          </div>

          <Card className="overflow-hidden border-2 border-gray-200">
            <div className="h-24 w-full bg-gradient-to-r from-sky-500 to-emerald-400" />
            <div className="p-6">
              <div className="flex items-start gap-4">
                <div className="-mt-12">
                  <Avatar className="w-20 h-20 border-4 border-white">
                    {profile.headshot_url ? (
                      <AvatarImage
                        src={profile.headshot_url}
                        alt={displayName}
                      />
                    ) : null}
                    <AvatarFallback className="bg-emerald-100 text-emerald-700 font-bold">
                      {displayName[0]}
                    </AvatarFallback>
                  </Avatar>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h2 className="text-2xl font-bold text-gray-900">
                      {displayName || "—"}
                    </h2>
                    {profile?.kyc_status === "approved" && (
                      <Badge className="bg-gray-900 text-green-400 border border-green-500">
                        <CheckCircle2 className="w-3 h-3 mr-1" /> Verified
                        Creator
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-600 mt-1 flex-wrap">
                    {location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" /> {location}
                      </span>
                    )}
                    {handleText && (
                      <span className="flex items-center gap-1">
                        <Globe className="w-4 h-4" /> {handleText}
                      </span>
                    )}
                  </div>
                  {profile.bio && (
                    <p className="text-gray-700 mt-3">{profile.bio}</p>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                    <Card className="p-4 border border-gray-200">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Active Campaigns</span>
                        <ImageIcon className="w-4 h-4 text-sky-600" />
                      </div>
                      <div className="text-3xl font-bold mt-1">
                        {stats.active_campaigns}
                      </div>
                    </Card>
                    <Card className="p-4 border border-gray-200">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">
                          Completed Projects
                        </span>
                        <Users className="w-4 h-4 text-sky-600" />
                      </div>
                      <div className="text-3xl font-bold mt-1">
                        {stats.completed_projects}
                      </div>
                    </Card>
                    <Card className="p-4 border border-gray-200">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Voice Profiles</span>
                        <Mic className="w-4 h-4 text-sky-600" />
                      </div>
                      <div className="text-3xl font-bold mt-1">
                        {stats.voice_profiles}
                      </div>
                    </Card>
                  </div>

                  {contentTypes.length > 0 && (
                    <div className="mt-6">
                      <h3 className="font-semibold text-gray-900 mb-2">
                        Open to Work With
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {contentTypes.map((t) => (
                          <Badge key={t} className="bg-teal-100 text-teal-800">
                            {t}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {industries.length > 0 && (
                    <div className="mt-4">
                      <h3 className="font-semibold text-gray-900 mb-2">
                        Industries
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {industries.map((i) => (
                          <Badge
                            key={i}
                            className="bg-purple-100 text-purple-800"
                          >
                            {i}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {typeof pricePerWeek === "number" && (
                    <div className="mt-6">
                      <Card className="p-4 border-2 border-sky-200 bg-gradient-to-r from-sky-50 to-emerald-50">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-semibold text-gray-900">
                              Licensing Rate
                            </h4>
                            <p className="text-sm text-gray-700">
                              Base rate for likeness usage
                            </p>
                            {openToNegotiations && (
                              <div className="mt-2 text-sm text-emerald-700 flex items-center gap-2">
                                <Shield className="w-4 h-4" /> Open to
                                negotiations
                              </div>
                            )}
                          </div>
                          <div className="text-right">
                            <div className="text-3xl font-bold text-sky-600">
                              ${pricePerWeek}
                            </div>
                            <div className="text-xs text-gray-600">
                              per week
                            </div>
                          </div>
                        </div>
                      </Card>
                    </div>
                  )}

                  {/* Portfolio hidden until real data is available */}
                </div>
              </div>
            </div>
          </Card>

          <Alert className="mt-6 bg-blue-50 border border-blue-200">
            <AlertDescription className="text-blue-900 text-sm">
              This is a preview of how your profile appears to brands. Make sure
              your information is up-to-date to attract more opportunities.
            </AlertDescription>
          </Alert>

          {/* Card Modal */}
          <Dialog open={showCard} onOpenChange={setShowCard}>
            <DialogContent className="sm:max-w-[380px] p-0 rounded-2xl overflow-hidden">
              {/* Gradient header with logo */}
              <div className="h-24 bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center">
                <div className="text-white text-4xl font-extrabold">[u]</div>
              </div>
              {/* Body */}
              <div className="bg-white p-5">
                {/* Name and location */}
                <div className="mb-2">
                  <div className="text-xl font-extrabold text-gray-900 leading-tight">
                    {displayName || "Profile"}
                  </div>
                  {location && (
                    <div className="text-sm text-gray-600">{location}</div>
                  )}
                </div>

                {/* Bio snippet */}
                {profile.bio && (
                  <p className="text-sm text-gray-700 line-clamp-2 mb-3">
                    {profile.bio}
                  </p>
                )}

                {/* Tags: prefer content types, else industries */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {(contentTypes.length ? contentTypes : industries)
                    .slice(0, 3)
                    .map((t: string) => (
                      <span
                        key={t}
                        className="px-3 py-1 rounded-full text-xs bg-gray-100 text-gray-700 border border-gray-200"
                      >
                        {t}
                      </span>
                    ))}
                </div>

                {/* Metrics grid (show only available ones) */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                  {typeof pricePerWeek === "number" && (
                    <div>
                      <div className="text-xs text-gray-500">From</div>
                      <div className="text-lg font-bold text-gray-900">
                        $
                        {Math.round(
                          (Number(profile.base_monthly_price_cents) || 0) / 100,
                        )}
                      </div>
                    </div>
                  )}
                  {/* Additional metrics can be added when available (followers, engagement, turnaround) */}
                </div>

                {/* CTA buttons */}
                <button className="w-full bg-gray-900 text-white rounded-full py-3 font-semibold mb-3">
                  Hire Creator
                </button>
                <div className="flex items-center justify-between">
                  <button className="flex-1 mr-2 border border-gray-300 rounded-full py-2 text-sm">
                    Preview
                  </button>
                  <button
                    className="flex-1 ml-2 border border-gray-300 rounded-full py-2 text-sm"
                    onClick={() => navigate("/PublicProfile")}
                  >
                    Profile
                  </button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
}
