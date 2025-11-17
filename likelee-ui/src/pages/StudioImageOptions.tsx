import React from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Image as ImageIcon, ArrowLeft, Type, ImageIcon as ImageIcon2, MessageSquare, Wand2 } from "lucide-react";

const imageOptions = [
  { 
    id: "text-to-image", 
    title: "Text to Image", 
    description: "Generate images from text prompts",
    icon: Type,
    color: "from-[#32C8D1] to-teal-500"
  },
  { 
    id: "image-to-image", 
    title: "Image to Image", 
    description: "Transform existing images",
    icon: ImageIcon2,
    color: "from-purple-500 to-indigo-600"
  },
  { 
    id: "chat-to-image", 
    title: "Chat to Image", 
    description: "Create images through conversation",
    icon: MessageSquare,
    color: "from-[#F7B750] to-amber-500"
  }
];

export default function StudioImageOptions() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const modelId = searchParams.get('model');
  const modelName = searchParams.get('name');

  const handleOptionSelect = (optionId) => {
    navigate(createPageUrl("StudioImage") + `?model=${modelId}&mode=${optionId}`);
  };

  return (
    <div style={{ background: '#0A0A0F', minHeight: '100vh', color: '#fff' }}>
      {/* Header */}
      <header className="px-6 py-6 border-b border-white/10 bg-[#0A0A0F]/95 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => navigate(createPageUrl("Studio"))}
              className="text-gray-400 hover:text-white"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Studio
            </Button>
            <div className="flex items-center gap-3">
              <ImageIcon className="w-6 h-6 text-[#32C8D1]" />
              <div>
                <h1 className="text-xl font-bold text-white">{modelName || 'Image Model'}</h1>
                <p className="text-sm text-gray-400">Choose what you'd like to create</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Options Grid */}
      <section className="px-6 py-20">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              What would you like to create?
            </h2>
            <p className="text-xl text-gray-400">
              Choose your creation method
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {imageOptions.map((option) => (
              <Card
                key={option.id}
                onClick={() => handleOptionSelect(option.id)}
                className="p-8 bg-white/5 border-2 border-white/10 hover:border-white/30 rounded-xl cursor-pointer transition-all hover:scale-105 group"
              >
                <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${option.color} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                  <option.icon className="w-8 h-8 text-white" />
                </div>
                
                <h3 className="text-2xl font-bold text-white mb-3">{option.title}</h3>
                <p className="text-gray-400 mb-6">{option.description}</p>
                
                <div className="flex items-center text-[#32C8D1] group-hover:translate-x-2 transition-transform">
                  <span className="text-sm font-medium">Get started</span>
                  <Wand2 className="w-4 h-4 ml-2" />
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}