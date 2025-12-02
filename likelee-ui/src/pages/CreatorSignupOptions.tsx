import React from "react";
import { useNavigate, Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card as UICard } from "@/components/ui/card";
import { Button as UIButton } from "@/components/ui/button";
import { Users, User, Trophy } from "lucide-react";

const Card: any = UICard;
const Button: any = UIButton;

const creatorTypes = [
  {
    type: "influencer",
    icon: Users,
    title: "Influencer / UGC Creator",
    description:
      "You create content, have an audience, or collaborate with brands.",
    color: "bg-[#32C8D1]",
  },
  {
    type: "model_actor",
    icon: User,
    title: "Independent Model or Actor",
    description:
      "You do castings, campaigns, or studio shoots — and want verified likeness protection + licensing opportunities.",
    color: "bg-purple-500",
  },
  {
    type: "athlete",
    icon: Trophy,
    title: "Athlete (NIL & Pro)",
    description:
      "You're a college or pro athlete managing your own name, image, and likeness dealings.",
    color: "bg-emerald-600",
  },
];

export default function CreatorSignupOptions() {
  const navigate = useNavigate();
  const [selectedType, setSelectedType] = React.useState<string | null>(null);
  const [showAuth, setShowAuth] = React.useState(false);

  const handleSelect = (type) => {
    setSelectedType(type);
    setShowAuth(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-teal-50 to-blue-50 py-16 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8 md:mb-16">
          <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-3 md:mb-6">
            What type of creator are you?
          </h1>
          <p className="text-base md:text-lg lg:text-xl text-gray-600 max-w-3xl mx-auto">
            Choose the option that best describes you to get started with the
            right profile setup.
          </p>
        </div>

        {/* Mobile: Vertical Stack - Compact */}
        <div className="flex flex-col gap-3 md:hidden">
          {creatorTypes.map((creator) => {
            const Icon = creator.icon;
            return (
              <Card
                key={creator.type}
                className="p-4 bg-white border-2 border-black rounded-none hover:shadow-xl transition-all cursor-pointer group"
                onClick={() => handleSelect(creator.type)}
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`w-12 h-12 ${creator.color} border-2 border-black flex items-center justify-center shrink-0`}
                  >
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-sm font-bold text-gray-900 leading-tight flex-1">
                    {creator.type === "influencer" &&
                      "Influencer / UGC Creator"}
                    {creator.type === "model_actor" &&
                      "Independent Model or Actor"}
                    {creator.type === "athlete" && "Athlete (NIL & Pro)"}
                  </h3>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Desktop: Grid Layout */}
        <div className="hidden md:grid md:grid-cols-3 gap-8">
          {creatorTypes.map((creator) => {
            const Icon = creator.icon;
            return (
              <Card
                key={creator.type}
                className="p-8 bg-white border-2 border-black rounded-none hover:shadow-2xl transition-all cursor-pointer group"
                onClick={() => handleSelect(creator.type)}
              >
                <div className="flex flex-col items-center text-center mb-6">
                  <div
                    className={`w-20 h-20 ${creator.color} border-2 border-black flex items-center justify-center shrink-0 mb-6`}
                  >
                    <Icon className="w-10 h-10 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">
                    {creator.title}
                  </h3>
                </div>
                <p className="text-gray-700 leading-relaxed text-base mb-6">
                  {creator.description}
                </p>
                <Button className="w-full h-12 bg-gradient-to-r from-[#32C8D1] to-teal-500 hover:from-[#2AB8C1] hover:to-teal-600 text-white border-2 border-black rounded-none group-hover:scale-105 transition-transform">
                  Select
                </Button>
              </Card>
            );
          })}
        </div>

        {/* Auth chooser modal */}
        {showAuth && selectedType && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div
              className="absolute inset-0 bg-black/50"
              onClick={() => setShowAuth(false)}
            />
            <div className="relative z-10 w-full max-w-md bg-white border-2 border-black p-6">
              <h2 className="text-xl font-bold mb-2">Get started</h2>
              <p className="text-sm text-gray-600 mb-6">
                Selected: {selectedType.replace("_", " ")}
              </p>
              <div className="space-y-3">
                <Link
                  to={`${createPageUrl("Register")}?type=${selectedType}`}
                  className="block w-full"
                  onClick={() => setShowAuth(false)}
                >
                  <Button className="w-full bg-black text-white rounded-none">
                    Sign up as {selectedType.replace("_", " ")}
                  </Button>
                </Link>
                <Link
                  to={`/ReserveProfile?type=${selectedType}&mode=login`}
                  className="block w-full"
                  onClick={() => setShowAuth(false)}
                >
                  <Button
                    variant="outline"
                    className="w-full border-2 border-black rounded-none"
                  >
                    I already have an account
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
