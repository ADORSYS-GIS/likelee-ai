import React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  DollarSign,
  AlertCircle,
  Trophy,
  TrendingUp,
  ShieldAlert,
  Briefcase,
  Megaphone,
} from "lucide-react";

interface DashboardViewProps {
  onKYC: () => void;
  agencyName: string;
  rosterData: any[];
}

const DashboardView = ({
  onKYC,
  agencyName,
  rosterData,
}: DashboardViewProps) => {
  // Real data calculations
  const totalTalent = rosterData.length;
  const activeTalent = rosterData.filter((t) => t.status === "active").length;
  const totalEarnings = rosterData.reduce(
    (acc, t) => acc + (t.earnings_val || 0),
    0,
  );

  // Calculate expiring licenses (within 30 days)
  const expiringLicenses = rosterData.filter((t) => {
    if (!t.expiry || t.expiry === "—") return false;
    const expiryDate = new Date(t.expiry);
    const today = new Date();
    const diffTime = expiryDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 && diffDays <= 30;
  }).length;

  const formatCurrency = (val: number) => {
    if (val >= 1000000) return `$${(val / 1000000).toFixed(1)}M`;
    if (val >= 1000) return `$${(val / 1000).toFixed(1)}K`;
    return `$${val}`;
  };

  return (
    <div className="space-y-8">
      {/* KYC Verification Alert */}
      <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-6 flex flex-col md:flex-row justify-between items-center gap-4 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-white rounded-xl shadow-sm">
            <ShieldAlert className="w-6 h-6 text-indigo-600" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">
              KYC Verification Required
            </h3>
            <p className="text-sm text-gray-500">
              To enable payouts and licensing for your talent, please complete
              your agency's ID verification.
            </p>
          </div>
        </div>
        <Button
          variant="default"
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-8 h-12 rounded-xl"
          onClick={onKYC}
        >
          Complete KYC
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Roster Health */}
        <Card className="p-6 bg-white border border-gray-200 shadow-sm rounded-xl border-l-4 border-l-indigo-500">
          <div className="flex justify-between items-start mb-2">
            <div className="p-2 bg-indigo-50 rounded-lg">
              <Users className="w-5 h-5 text-indigo-600" />
            </div>
            <TrendingUp className="w-4 h-4 text-green-500" />
          </div>
          <h3 className="text-sm font-medium text-gray-500 mb-1">
            Roster Health
          </h3>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-gray-900">
              {activeTalent}/{totalTalent}
            </span>
          </div>
          <p className="text-xs text-green-600 font-medium mt-1">
            {totalTalent > 0
              ? Math.round((activeTalent / totalTalent) * 100)
              : 0}
            % active
          </p>
        </Card>

        {/* Revenue */}
        <Card className="p-6 bg-white border border-gray-200 shadow-sm rounded-xl border-l-4 border-l-green-500">
          <div className="flex justify-between items-start mb-2">
            <div className="p-2 bg-green-50 rounded-lg">
              <DollarSign className="w-5 h-5 text-green-600" />
            </div>
            <TrendingUp className="w-4 h-4 text-green-500" />
          </div>
          <h3 className="text-sm font-medium text-gray-500 mb-1">
            Revenue This Month
          </h3>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-gray-900">
              {formatCurrency(totalEarnings)}
            </span>
          </div>
          <p className="text-xs text-green-600 font-medium mt-1">
            +12% vs last month
          </p>
        </Card>

        {/* Pending Actions */}
        <Card className="p-6 bg-white border border-gray-200 shadow-sm rounded-xl border-l-4 border-l-red-500 relative">
          <div className="flex justify-between items-start mb-2">
            <div className="p-2 bg-red-50 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-600" />
            </div>
            {expiringLicenses > 0 && (
              <Badge
                variant="default"
                className="bg-red-600 hover:bg-red-700 text-white border-0 h-5 w-5 p-0 flex items-center justify-center rounded-full text-[10px]"
              >
                {expiringLicenses}
              </Badge>
            )}
          </div>
          <h3 className="text-sm font-medium text-gray-500 mb-1">
            Pending Actions
          </h3>
          <div className="space-y-1">
            {expiringLicenses > 0 ? (
              <p className="text-xs text-gray-600">
                • {expiringLicenses} expiring license
                {expiringLicenses > 1 ? "s" : ""}
              </p>
            ) : (
              <p className="text-xs text-gray-400 italic">No urgent actions</p>
            )}
          </div>
        </Card>

        {/* Platform Ranking */}
        <Card className="p-6 bg-white border border-gray-200 shadow-sm rounded-xl border-l-4 border-l-blue-400">
          <div className="flex justify-between items-start mb-2">
            <div className="p-2 bg-blue-50 rounded-lg">
              <Trophy className="w-5 h-5 text-blue-600" />
            </div>
          </div>
          <h3 className="text-sm font-medium text-gray-500 mb-1">
            Platform Ranking
          </h3>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-blue-600">top 15%</span>
          </div>
          <p className="text-xs text-gray-500 font-medium mt-1">
            Top performer
          </p>
        </Card>
      </div>

      {/* Talent Performance Summary */}
      <Card className="p-8 rounded-xl border border-gray-200 shadow-sm bg-white">
        <h2 className="text-xl font-bold text-gray-900 mb-8">
          Talent Performance Summary
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Top 3 Revenue Generators */}
          <div className="space-y-6">
            <div className="flex items-center gap-2 mb-4">
              <Trophy className="w-5 h-5 text-yellow-500" />
              <h3 className="text-sm font-bold text-gray-900">
                Top 3 Revenue Generators
              </h3>
            </div>

            {rosterData
              .sort((a, b) => (b.earnings_val || 0) - (a.earnings_val || 0))
              .slice(0, 3)
              .map((talent, idx) => (
                <div
                  key={talent.id}
                  className="flex items-center gap-4 p-4 border border-gray-100 rounded-xl bg-white shadow-sm hover:shadow-md transition-shadow"
                >
                  <span className="font-bold text-2xl w-10 text-green-600">
                    #{idx + 1}
                  </span>
                  <img
                    src={talent.img || "https://via.placeholder.com/150"}
                    alt={talent.name}
                    className="w-12 h-12 rounded-lg object-cover"
                  />
                  <div className="flex-1">
                    <p className="font-bold text-gray-900 text-sm">
                      {talent.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatCurrency(talent.earnings_val || 0)}
                    </p>
                  </div>
                  <TrendingUp className="w-4 h-4 text-green-500" />
                </div>
              ))}
          </div>

          {/* Needs Activation */}
          <div className="space-y-6">
            <div className="flex items-center gap-2 mb-4">
              <AlertCircle className="w-5 h-5 text-orange-500" />
              <h3 className="text-sm font-bold text-gray-900">
                Needs Activation (
                {rosterData.filter((t) => t.status !== "active").length})
              </h3>
            </div>
            {rosterData.filter((t) => t.status !== "active").length === 0 ? (
              <p className="text-sm text-gray-500 italic">
                All talent actively earning!
              </p>
            ) : (
              rosterData
                .filter((t) => t.status !== "active")
                .slice(0, 3)
                .map((talent) => (
                  <div key={talent.id} className="flex items-center gap-3">
                    <img
                      src={talent.img || "https://via.placeholder.com/150"}
                      alt={talent.name}
                      className="w-8 h-8 rounded-full object-cover"
                    />
                    <span className="text-sm font-medium text-gray-700">
                      {talent.name}
                    </span>
                    <Badge variant="outline" className="text-[10px] py-0">
                      {talent.status}
                    </Badge>
                  </div>
                ))
            )}
          </div>

          {/* New Talent Performance */}
          <div className="space-y-6">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              <h3 className="text-sm font-bold text-gray-900">
                New Talent Performance
              </h3>
            </div>

            <div className="p-6 border border-gray-100 rounded-xl bg-white shadow-sm space-y-4">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                Onboarded recently
              </p>
              {rosterData.slice(-1).map((talent) => (
                <div key={talent.id} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-gray-900 text-sm">
                      {talent.name}
                    </span>
                    <Badge
                      variant="default"
                      className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200 border-0 uppercase font-bold text-[10px]"
                    >
                      {talent.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-500">
                    Average time to First booking: 12 days
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default DashboardView;
