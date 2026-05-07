import React from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Plus, Trash2, Users } from "lucide-react";
import { useTranslation } from "react-i18next";

type BrandSettingsTeamProps = {
  brand: any;
};

export const BrandSettingsTeam = ({ brand }: BrandSettingsTeamProps) => {
  const { t } = useTranslation("brand");

  return (
    <Card className="p-8 bg-white border border-gray-200 rounded-lg shadow-none">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xl font-bold text-gray-900 flex items-center gap-3">
          <Users className="w-6 h-6" />{" "}
          {t("campaignsDashboard.teamManagement.title", {
            defaultValue: "Team Management",
          })}
        </h3>
        <Badge className="rounded-lg bg-[#F7B750] text-white font-bold text-[10px] py-1.5 px-3">
          {t("campaignsDashboard.teamManagement.seatsBadge", {
            count: brand.team_seats,
            defaultValue: `${brand.team_seats} / 5 Seats`,
          })}
        </Badge>
      </div>
      <p className="text-sm text-gray-500 mb-8">
        {t("campaignsDashboard.teamManagement.manageTeam", {
          count: brand.team_seats,
          defaultValue: `Manage your team (${brand.team_seats} / 5 seats used)`,
        })}
      </p>

      <div className="space-y-3 mb-8">
        {[
          {
            name: "John Smith",
            email: "john@urbanapparel.com",
            role: "Admin",
          },
          {
            name: "Sarah Jones",
            email: "sarah@urbanapparel.com",
            role: "PM",
          },
          {
            name: "Mike Chen",
            email: "mike@urbanapparel.com",
            role: "Reviewer",
          },
        ].map((member, i) => (
          <div
            key={i}
            className="flex items-center justify-between p-5 bg-white border border-gray-100 hover:border-gray-900 transition-colors rounded-lg"
          >
            <div className="flex items-center gap-4">
              <Avatar className="w-10 h-10 rounded-lg border border-gray-200">
                <AvatarFallback className="font-bold text-xs bg-gray-100">
                  {member.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-bold text-gray-900 text-sm tracking-tight">
                  {member.name}
                </p>
                <p className="text-xs font-bold text-gray-400">
                  {member.email}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="px-3 py-1 rounded-md text-blue-600 bg-blue-50 border border-blue-200 text-[10px] font-bold">
                {member.role === "PM"
                  ? t("campaignsDashboard.teamManagement.projectManager", {
                      defaultValue: "Project Manager",
                    })
                  : member.role === "Reviewer"
                    ? t("campaignsDashboard.teamManagement.reviewer", {
                        defaultValue: "Reviewer",
                      })
                    : t("campaignsDashboard.teamManagement.admin", {
                        defaultValue: member.role,
                      })}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <Button className="w-full rounded-lg bg-[#F7B750] hover:bg-[#F7B750]/90 text-white font-bold h-12">
        <Plus className="w-5 h-5 mr-3" />
        {t("campaignsDashboard.teamManagement.inviteCollaborator", {
          defaultValue: "Invite New Collaborator",
        })}
      </Button>
    </Card>
  );
};
