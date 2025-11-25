import React from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, Users, UserCircle, Trophy } from "lucide-react";

const organizationTypes = [
  {
    type: "brand_company",
    icon: Building2,
    title: "Brand / Company",
    subtitle: "Direct brand or corporation",
    description:
      "You're a brand looking to create campaigns, ads, or content featuring real faces.",
    color: "bg-orange-500",
  },
  {
    type: "marketing_agency",
    icon: Users,
    title: "Marketing Agency",
    subtitle: "Advertising & creative services",
    description: "You create campaigns and content for multiple brand clients.",
    color: "bg-[#32C8D1]",
  },
  {
    type: "talent_agency",
    icon: UserCircle,
    title: "Talent / Modeling Agency",
    subtitle: "Talent representation",
    description:
      "You represent talent and want to expand their opportunities into AI content.",
    color: "bg-purple-500",
  },
  {
    type: "sports_agency",
    icon: Trophy,
    title: "Sports Agency",
    subtitle: "NIL & athlete representation",
    description:
      "You represent athletes and want to protect and monetize their likeness with AI-ready NIL management.",
    color: "bg-emerald-600",
  },
];

export default function GetAccess() {
  const navigate = useNavigate();

  const handleSelect = (type) => {
    navigate(createPageUrl(`OrganizationSignup`) + `?type=${type}`);
  };

  return (
    <div className="min-h-screen bg-amber-50 py-16 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
            What type of organization are you?
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            This helps us customize your experience and show you the most
            relevant features.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {organizationTypes.map((org) => {
            const Icon = org.icon;
            return (
              <Card
                key={org.type}
                className="p-8 bg-white border-2 border-black rounded-none hover:shadow-2xl transition-all cursor-pointer group"
                onClick={() => handleSelect(org.type)}
              >
                <div className="flex flex-col items-center text-center mb-6">
                  <div
                    className={`w-20 h-20 ${org.color} border-2 border-black flex items-center justify-center shrink-0 mb-4`}
                  >
                    <Icon className="w-10 h-10 text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-1">
                      {org.title}
                    </h3>
                    <p className="text-gray-600 font-medium">{org.subtitle}</p>
                  </div>
                </div>
                <p className="text-gray-700 leading-relaxed text-base mb-6">
                  {org.description}
                </p>
                <Button className="w-full h-12 bg-[#F7B750] hover:bg-[#E6A640] text-white border-2 border-black rounded-none group-hover:scale-105 transition-transform">
                  Select
                </Button>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
