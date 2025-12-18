import React from "react";


import { useAuth } from "@/auth/AuthProvider";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { toast } from "@/components/ui/use-toast";
import { Eye, EyeOff, Mail, Lock, Chrome, Sparkles } from "lucide-react";
import { getFriendlyErrorMessage } from "@/utils/errorMapping";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label as UILabel } from "@/components/ui/label";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Tabs as UITabs, TabsContent as UITabsContent, TabsList as UITabsList, TabsTrigger as UITabsTrigger } from "@/components/ui/tabs";
import { Separator as UISeparator } from "@/components/ui/separator";

const Tabs: any = UITabs;
const TabsContent: any = UITabsContent;
const TabsList: any = UITabsList;
const TabsTrigger: any = UITabsTrigger;
const Separator: any = UISeparator;
const Label: any = UILabel;


export default function Login() {
  const { login, initialized, authenticated } = useAuth();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [userType, setUserType] = React.useState("creator");
  const navigate = useNavigate();
  const location = useLocation();

  const creatorType = React.useMemo(
    () => new URLSearchParams(location.search).get("type"),
    [location.search],
  );

  React.useEffect(() => {
    if (initialized && authenticated) {
      if (creatorType) {
        navigate(
          `/ReserveProfile?type=${encodeURIComponent(creatorType)}&mode=login`,
          { replace: true },
        );
      } else {
        navigate("/CreatorDashboard", { replace: true });
      }
    }
  }, [initialized, authenticated, navigate, creatorType]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (userType === "agency") return; // Agency is coming soon

    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      if (creatorType) {
        navigate(
          `/ReserveProfile?type=${encodeURIComponent(creatorType)}&mode=login`,
        );
      } else {
        navigate("/CreatorDashboard");
      }
    } catch (err: any) {
      const msg = getFriendlyErrorMessage(err);
      setError(msg);
      toast({
        title: "Sign-in failed",
        description: msg,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getSignupLink = () => {
    if (userType === "creator") return "/CreatorSignupOptions";
    if (userType === "brand") return "/OrganizationSignup";
    if (userType === "agency") return "/TalentAgency";
    return "/Register";
  };

  return (
    <div className="min-h-[calc(100vh-80px)] flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">

      {!initialized ? (
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-[#32C8D1]/30 border-t-[#32C8D1] rounded-full animate-spin" />
          <p className="text-gray-500 font-medium">Initializing...</p>
        </div>
      ) : authenticated ? (
        <Card className="w-full max-w-md border-2 border-gray-100 shadow-xl rounded-2xl p-8 text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-50 text-green-500">
            <Sparkles className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">
            Already Signed In
          </h2>
          <p className="text-gray-500">
            You are already logged into your account.
          </p>
          <Button
            onClick={() => navigate("/CreatorDashboard")}
            className="w-full bg-black text-white rounded-xl h-12 font-bold"
          >
            Go to Dashboard
          </Button>
        </Card>
      ) : (
        <Card className="w-full max-w-md border-2 border-gray-100 shadow-xl rounded-2xl overflow-hidden">
          <CardHeader className="space-y-4 text-center pb-8">
            <div className="flex justify-center">
              <div className="w-20 h-20 rounded-full bg-white shadow-md flex items-center justify-center p-4">
                <img
                  src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68ed7158e33f31b30f653449/eaaf29851_Screenshot2025-10-12at31742PM.png"
                  alt="Likelee Logo"
                  className="w-full h-auto"
                />
              </div>
            </div>
            <div className="space-y-2">
              <CardTitle className="text-3xl font-bold tracking-tight text-gray-900">
                Welcome to Likelee
              </CardTitle>
              <CardDescription className="text-gray-500 font-medium">
                Sign in to continue
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            <Tabs
              defaultValue="creator"
              className="w-full"
              onValueChange={setUserType}
            >
              <TabsList className="grid w-full grid-cols-3 mb-8 p-1 bg-gray-100 rounded-xl">
                <TabsTrigger
                  value="creator"
                  className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm"
                >
                  Creator
                </TabsTrigger>
                <TabsTrigger
                  value="brand"
                  className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm"
                >
                  Brand
                </TabsTrigger>
                <TabsTrigger
                  value="agency"
                  className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm"
                >
                  Agency
                </TabsTrigger>
              </TabsList>

              <TabsContent value="agency" className="mt-0">
                <div className="py-12 text-center space-y-4">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-cyan-50 text-[#32C8D1]">
                    <Sparkles className="w-8 h-8" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-bold text-gray-900">
                      Coming Soon
                    </h3>
                    <p className="text-gray-500 max-w-[240px] mx-auto">
                      We're currently onboarding agencies manually. Join the
                      waitlist to get early access.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    className="mt-4 border-2 border-black rounded-none"
                    onClick={() => navigate("/TalentAgency")}
                  >
                    Learn More
                  </Button>
                </div>
              </TabsContent>

              {(userType === "creator" || userType === "brand") && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                  <Button
                    variant="outline"
                    className="w-full h-12 border-gray-200 hover:bg-gray-50 text-gray-700 font-semibold flex items-center justify-center gap-3 rounded-xl transition-all"
                    onClick={() => {
                      toast({
                        title: "Coming Soon",
                        description:
                          "Google Sign-In will be available shortly.",
                      });
                    }}
                  >
                    <svg
                      viewBox="0 0 24 24"
                      width="20"
                      height="20"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        fill="#4285F4"
                      />
                      <path
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-1 .67-2.28 1.07-3.71 1.07-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        fill="#34A853"
                      />
                      <path
                        d="M5.84 14.09c-.22-.67-.35-1.39-.35-2.09s.13-1.42.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                        fill="#FBBC05"
                      />
                      <path
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 12-4.53z"
                        fill="#EA4335"
                      />
                    </svg>
                    Continue with Google
                  </Button>


                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <Separator className="w-full" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-white px-4 text-gray-400 font-bold tracking-widest">
                        OR
                      </span>
                    </div>
                  </div>

                  <form onSubmit={handleLogin} className="space-y-5">
                    <div className="space-y-2">
                      <Label
                        htmlFor="email"
                        className="text-sm font-bold text-gray-700 ml-1"
                      >
                        {userType === "brand" ? "Company Email" : "Email"}
                      </Label>
                      <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <Input
                          id="email"
                          type="email"
                          placeholder="you@example.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                          className="pl-12 h-12 border-gray-200 rounded-xl focus:ring-2 focus:ring-[#32C8D1] focus:border-transparent transition-all"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between px-1">
                        <Label
                          htmlFor="password"
                          className="text-sm font-bold text-gray-700"
                        >
                          Password
                        </Label>
                        <Link
                          to="/forgot-password"
                          className="text-xs font-bold text-[#32C8D1] hover:underline"
                        >
                          Forgot password?
                        </Link>
                      </div>
                      <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <Input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          placeholder="••••••••"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                          className="pl-12 pr-12 h-12 border-gray-200 rounded-xl focus:ring-2 focus:ring-[#32C8D1] focus:border-transparent transition-all"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                        >
                          {showPassword ? (
                            <EyeOff className="w-5 h-5" />
                          ) : (
                            <Eye className="w-5 h-5" />
                          )}
                        </button>
                      </div>
                    </div>

                    {error && (
                      <div className="p-3 rounded-lg bg-red-50 border border-red-100 text-red-600 text-sm font-medium animate-in fade-in zoom-in duration-300">
                        {error}
                      </div>
                    )}

                    <Button
                      type="submit"
                      disabled={loading}
                      className="w-full h-12 bg-gray-900 hover:bg-black text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5 active:scale-[0.98]"
                    >
                      {loading ? (
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Signing in...
                        </div>
                      ) : (
                        "Sign in"
                      )}
                    </Button>
                  </form>
                </div>
              )}
            </Tabs>

            <div className="text-center pt-4">
              <p className="text-sm text-gray-500 font-medium">
                Need an account?{" "}
                <Link
                  to={getSignupLink()}
                  className="text-[#32C8D1] font-bold hover:underline"
                >
                  Sign up
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
      </div >
  );
}


