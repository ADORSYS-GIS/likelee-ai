
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Film, Image, Brain, Clapperboard, Sparkles, ArrowRight, Check, ChevronDown, Menu, X, ArrowLeft } from "lucide-react";

const toolCards = [
  { title: "Generate AI Video", icon: Film, path: "/studio/video", badge: null, color: "from-[#F18B6A] to-[#E07A5A]", bgColor: "bg-orange-500" },
  { title: "Generate AI Image", icon: Image, path: "/studio/image", badge: null, color: "from-[#32C8D1] to-teal-500", bgColor: "bg-cyan-500" },
  { title: "Generate AI Avatar", icon: Brain, path: "/studio/avatar", badge: null, color: "from-purple-500 to-indigo-600", bgColor: "bg-purple-500" },
  { title: "Generate AI Shorts", icon: Clapperboard, path: "/studio/shorts", badge: "Beta", color: "from-[#F7B750] to-amber-500", bgColor: "bg-amber-500" },
  { title: "Generate AI Effects", icon: Sparkles, path: "/studio/effects", badge: "New", color: "from-pink-500 to-rose-600", bgColor: "bg-pink-500" }
];

// Updated model arrays to include id and name for better navigation and consistency
const videoModels = [
  { id: "veo3", name: "Veo 3" },
  { id: "runway", name: "Runway" },
  { id: "sora2", name: "Sora 2" },
  { id: "klingai", name: "Kling AI" },
  { id: "seedance", name: "Seedance" },
  { id: "luma", name: "Luma" },
  { id: "hailuo", name: "Hailuo" },
  { id: "pixverse", name: "PixVerse" }
];
const imageModels = [
  { id: "midjourney", name: "Midjourney" },
  { id: "flux", name: "Flux" },
  { id: "ideogram", name: "Ideogram" },
  { id: "stable-diffusion", name: "Stable Diffusion" },
  { id: "dall-e", name: "DALL·E" },
  { id: "recraft", name: "Recraft" },
  { id: "seedream", name: "Seedream" }
];
const avatarModels = [
  { id: "vidu", name: "Vidu" },
  { id: "hunyuan", name: "Hunyuan" },
  { id: "qwen", name: "Qwen" },
  { id: "wanai", name: "Wan AI" }
];

const creditTiers = [
  { credits: 2000, price: 59, label: "2,000" },
  { credits: 5000, price: 129, label: "5,000" },
  { credits: 10000, price: 239, label: "10,000" },
  { credits: 25000, price: 519, label: "25,000" },
  { credits: 50000, price: 999, label: "50,000" },
  { credits: 100000, price: 1899, label: "100,000" },
  { credits: 250000, price: 4499, label: "250,000" },
  { credits: 500000, price: 8999, label: "500,000" }
];

const features = [
  { name: "Videos / month", lite: "30", pro: "80+" },
  { name: "Images / month", lite: "300", pro: "800+" },
  { name: "Parallel tasks", lite: "2", pro: "3" },
  { name: "All-in-one multi-model support", lite: true, pro: true },
  { name: "Text to video", lite: true, pro: true },
  { name: "Image to video", lite: true, pro: true },
  { name: "Text/Image/Video to video", lite: true, pro: true },
  { name: "Consistent character video", lite: true, pro: true },
  { name: "AI animation generator", lite: true, pro: true },
  { name: "Text/Image/Chat to image", lite: true, pro: true },
  { name: "300+ templates & effects", lite: true, pro: true }
];

const exampleProjects = [
  { type: "video", thumbnail: "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=400", caption: "Cinematic AI video" },
  { type: "image", thumbnail: "https://images.unsplash.com/photo-1618005198919-d3d4b5a92ead?w=400", caption: "AI portrait generation" },
  { type: "video", thumbnail: "https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?w=400", caption: "AI short film" },
  { type: "image", thumbnail: "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=400", caption: "Digital art style" }
];

export default function Studio() {
  const [hoveredTool, setHoveredTool] = useState(null);
  const [selectedTierIndex, setSelectedTierIndex] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  const scrollToSection = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  const selectedTier = creditTiers[selectedTierIndex];

  return (
    <div style={{ background: '#0A0A0F', minHeight: '100vh', color: '#fff' }}>
      <style>{`
        @keyframes float {
          0%, 100% { transform: translate(0, 0); }
          33% { transform: translate(30px, -30px); }
          66% { transform: translate(-20px, 20px); }
        }
        
        @keyframes noise {
          0%, 100% { transform: translate(0, 0); }
          10% { transform: translate(-5%, -5%); }
          20% { transform: translate(-10%, 5%); }
          30% { transform: translate(5%, -10%); }
          40% { transform: translate(-5%, 15%); }
          50% { transform: translate(-10%, 5%); }
          60% { transform: translate(15%, 0); }
          70% { transform: translate(0, 10%); }
          80% { transform: translate(-15%, 0); }
          90% { transform: translate(10%, 5%); }
        }

        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
        
        .animated-blob {
          animation: float 20s ease-in-out infinite;
        }
        
        .noise-texture {
          animation: noise 1s steps(10) infinite;
          opacity: 0.03;
        }
        
        .tool-card {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          animation: slideIn 0.5s ease-out;
        }
        
        .tool-card:hover {
          transform: translateY(-8px) scale(1.02);
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
        }

        .quick-action-card {
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          cursor: pointer;
        }

        .quick-action-card:hover {
          transform: translateY(-4px);
        }

        .quick-action-card:active {
          transform: translateY(-2px);
        }
        
        .model-card:hover {
          background: rgba(255, 255, 255, 0.05);
        }

        .badge-pulse {
          animation: pulse 2s ease-in-out infinite;
        }

        .credit-slider {
          -webkit-appearance: none;
          appearance: none;
          width: 100%;
          height: 8px;
          border-radius: 4px;
          background: rgba(255, 255, 255, 0.1);
          outline: none;
          opacity: 0.9;
          transition: opacity 0.2s;
        }

        .credit-slider:hover {
          opacity: 1;
        }

        .credit-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: linear-gradient(135deg, #F18B6A, #E07A5A);
          cursor: pointer;
          border: 3px solid rgba(255, 255, 255, 0.2);
          box-shadow: 0 4px 12px rgba(241, 139, 106, 0.4);
          transition: transform 0.2s;
        }

        .credit-slider::-webkit-slider-thumb:hover {
          transform: scale(1.1);
        }

        .credit-slider::-moz-range-thumb {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: linear-gradient(135deg, #F18B6A, #E07A5A);
          cursor: pointer;
          border: 3px solid rgba(255, 255, 255, 0.2);
          box-shadow: 0 4px 12px rgba(241, 139, 106, 0.4);
          transition: transform 0.2s;
        }

        .credit-slider::-moz-range-thumb:hover {
          transform: scale(1.1);
        }

        .dropdown-menu {
          opacity: 0;
          visibility: hidden;
          transform: translateY(-10px);
          transition: all 0.2s ease;
          pointer-events: none; /* Prevent interaction when hidden */
        }

        .dropdown-parent {
          position: relative;
        }

        .dropdown-parent:hover .dropdown-menu {
          opacity: 1;
          visibility: visible;
          transform: translateY(0);
          pointer-events: auto; /* Allow interaction when open */
        }

        .dropdown-menu::before {
          content: '';
          position: absolute;
          top: -10px; /* This creates a hoverable area above the menu */
          left: 0;
          right: 0;
          height: 10px; /* This height matches the translateY and provides the gap */
          background: transparent;
        }

        /* Hide scrollbar for quick action cards */
        .scrollbar-hide::-webkit-scrollbar {
            display: none;
        }
        .scrollbar-hide {
            -ms-overflow-style: none; /* IE and Edge */
            scrollbar-width: none; /* Firefox */
        }
      `}</style>

      {/* Enhanced Header with Navigation */}
      <header className="sticky top-0 z-50 px-6 py-4 border-b border-white/10 bg-[#0A0A0F]/95 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            {/* Brand */}
            <div className="flex items-center gap-3">
              <img 
                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68ed7158e33f31b30f653449/eaaf29851_Screenshot2025-10-12at31742PM.png"
                alt="Likelee Logo"
                width="32"
                height="32"
                className="h-8 w-auto"
              />
              <div>
                <span className="text-lg font-bold text-white">likelee.studio</span>
                <Badge className="ml-2 bg-white/10 text-white border-white/20 text-xs">Beta</Badge>
              </div>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-1">
              {/* Home */}
              <button
                onClick={() => navigate(createPageUrl("Studio"))}
                className="px-4 py-2 text-sm text-white hover:text-gray-300 transition-colors"
              >
                Home
              </button>

              {/* Video AI Dropdown */}
              <div className="dropdown-parent">
                <button className="px-4 py-2 text-sm text-white hover:text-gray-300 transition-colors flex items-center gap-1">
                  Video AI
                  <ChevronDown className="w-4 h-4" />
                </button>
                <div className="dropdown-menu absolute top-full left-0 mt-0 w-64 bg-[#1A1A1F] border border-white/10 rounded-lg shadow-2xl p-4">
                  <h4 className="text-xs font-semibold text-gray-400 mb-3 uppercase tracking-wider">Generate</h4>
                  <div className="space-y-1">
                    <button onClick={() => navigate(createPageUrl("StudioVideo"))} className="block w-full text-left px-3 py-2 text-sm text-white hover:bg-white/5 rounded transition-colors">AI Video Generator</button>
                    <button onClick={() => navigate(createPageUrl("StudioVideo"))} className="block w-full text-left px-3 py-2 text-sm text-white hover:bg-white/5 rounded transition-colors">Text to Video AI</button>
                    <button onClick={() => navigate(createPageUrl("StudioVideo"))} className="block w-full text-left px-3 py-2 text-sm text-white hover:bg-white/5 rounded transition-colors">Image to Video AI</button>
                    <button onClick={() => navigate(createPageUrl("StudioAvatar"))} className="block w-full text-left px-3 py-2 text-sm text-white hover:bg-white/5 rounded transition-colors">Photo to Video Avatar</button>
                    <button onClick={() => navigate(createPageUrl("StudioVideo"))} className="block w-full text-left px-3 py-2 text-sm text-white hover:bg-white/5 rounded transition-colors">AI Video Editor</button>
                    <button onClick={() => navigate(createPageUrl("StudioVideo"))} className="block w-full text-left px-3 py-2 text-sm text-white hover:bg-white/5 rounded transition-colors flex items-center gap-2">
                      AI Shorts
                      <Badge className="bg-blue-500/20 text-blue-400 text-xs">Beta</Badge>
                    </button>
                    <button onClick={() => navigate(createPageUrl("StudioVideo"))} className="block w-full text-left px-3 py-2 text-sm text-white hover:bg-white/5 rounded transition-colors">Mimic Motion</button>
                    <button onClick={() => navigate(createPageUrl("StudioVideo"))} className="block w-full text-left px-3 py-2 text-sm text-white hover:bg-white/5 rounded transition-colors">Canvas</button>
                    <button onClick={() => navigate(createPageUrl("StudioVideo"))} className="block w-full text-left px-3 py-2 text-sm text-white hover:bg-white/5 rounded transition-colors">Video to Video AI</button>
                    <button onClick={() => navigate(createPageUrl("StudioVideo"))} className="block w-full text-left px-3 py-2 text-sm text-white hover:bg-white/5 rounded transition-colors">Consistent Character Video</button>
                    <button onClick={() => navigate(createPageUrl("StudioVideo"))} className="block w-full text-left px-3 py-2 text-sm text-white hover:bg-white/5 rounded transition-colors">AI Video Enhancer</button>
                    <button onClick={() => navigate(createPageUrl("StudioVideo"))} className="block w-full text-left px-3 py-2 text-sm text-white hover:bg-white/5 rounded transition-colors">AI Video Extender</button>
                    <button onClick={() => navigate(createPageUrl("StudioVideo"))} className="block w-full text-left px-3 py-2 text-sm text-gray-400 hover:bg-white/5 rounded transition-colors">More Tools →</button>
                  </div>
                </div>
              </div>

              {/* Image AI Dropdown */}
              <div className="dropdown-parent">
                <button className="px-4 py-2 text-sm text-white hover:text-gray-300 transition-colors flex items-center gap-1">
                  Image AI
                  <ChevronDown className="w-4 h-4" />
                </button>
                <div className="dropdown-menu absolute top-full left-0 mt-0 w-[600px] bg-[#1A1A1F] border border-white/10 rounded-lg shadow-2xl p-6">
                  <div className="grid grid-cols-3 gap-6">
                    <div>
                      <h4 className="text-xs font-semibold text-gray-400 mb-3 uppercase tracking-wider">Generate</h4>
                      <div className="space-y-1">
                        <button onClick={() => navigate(createPageUrl("StudioImage"))} className="block w-full text-left px-3 py-2 text-sm text-white hover:bg-white/5 rounded transition-colors">AI Image Generator</button>
                        <button onClick={() => navigate(createPageUrl("StudioImage"))} className="block w-full text-left px-3 py-2 text-sm text-white hover:bg-white/5 rounded transition-colors">Image to Image AI</button>
                        <button onClick={() => navigate(createPageUrl("StudioImage"))} className="block w-full text-left px-3 py-2 text-sm text-white hover:bg-white/5 rounded transition-colors">Chat to Image</button>
                        <button onClick={() => navigate(createPageUrl("StudioImage"))} className="block w-full text-left px-3 py-2 text-sm text-white hover:bg-white/5 rounded transition-colors">AI Art Generator</button>
                      </div>
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold text-gray-400 mb-3 uppercase tracking-wider">Edit & Enhance</h4>
                      <div className="space-y-1">
                        <button onClick={() => navigate(createPageUrl("StudioImage"))} className="block w-full text-left px-3 py-2 text-sm text-white hover:bg-white/5 rounded transition-colors">Remove BG</button>
                        <button onClick={() => navigate(createPageUrl("StudioImage"))} className="block w-full text-left px-3 py-2 text-sm text-white hover:bg-white/5 rounded transition-colors">Object Remover</button>
                        <button onClick={() => navigate(createPageUrl("StudioImage"))} className="block w-full text-left px-3 py-2 text-sm text-white hover:bg-white/5 rounded transition-colors">Image Enhancer</button>
                      </div>
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold text-gray-400 mb-3 uppercase tracking-wider">Styles & Models</h4>
                      <div className="space-y-1">
                        <button onClick={() => navigate(createPageUrl("StudioImage"))} className="block w-full text-left px-3 py-2 text-sm text-white hover:bg-white/5 rounded transition-colors">Ghibli AI Generator</button>
                        <button onClick={() => navigate(createPageUrl("StudioImage"))} className="block w-full text-left px-3 py-2 text-sm text-white hover:bg-white/5 rounded transition-colors">Anime Upscaler</button>
                        <button onClick={() => navigate(createPageUrl("StudioImage"))} className="block w-full text-left px-3 py-2 text-sm text-white hover:bg-white/5 rounded transition-colors">Image Generators</button>
                        <button onClick={() => navigate(createPageUrl("StudioImage"))} className="block w-full text-left px-3 py-2 text-sm text-white hover:bg-white/5 rounded transition-colors">LoRAs</button>
                        <button onClick={() => navigate(createPageUrl("StudioImage"))} className="block w-full text-left px-3 py-2 text-sm text-gray-400 hover:bg-white/5 rounded transition-colors">More Tools →</button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Effects Dropdown */}
              <div className="dropdown-parent">
                <button className="px-4 py-2 text-sm text-white hover:text-gray-300 transition-colors flex items-center gap-1">
                  Effects
                  <ChevronDown className="w-4 h-4" />
                </button>
                <div className="dropdown-menu absolute top-full left-0 mt-0 w-56 bg-[#1A1A1F] border border-white/10 rounded-lg shadow-2xl p-4">
                  <div className="space-y-1">
                    <button onClick={() => navigate(createPageUrl("StudioEffects"))} className="block w-full text-left px-3 py-2 text-sm text-white hover:bg-white/5 rounded transition-colors">AI Effects Hub</button>
                    <button onClick={() => navigate(createPageUrl("StudioEffects"))} className="block w-full text-left px-3 py-2 text-sm text-white hover:bg-white/5 rounded transition-colors">Overlays & Templates</button>
                    <button onClick={() => navigate(createPageUrl("StudioEffects"))} className="block w-full text-left px-3 py-2 text-sm text-white hover:bg-white/5 rounded transition-colors">Transitions</button>
                    <button onClick={() => navigate(createPageUrl("StudioEffects"))} className="block w-full text-left px-3 py-2 text-sm text-white hover:bg-white/5 rounded transition-colors">Text & Captions</button>
                  </div>
                </div>
              </div>

              {/* AI Tools Dropdown */}
              <div className="dropdown-parent">
                <button className="px-4 py-2 text-sm text-white hover:text-gray-300 transition-colors flex items-center gap-1">
                  AI Tools
                  <ChevronDown className="w-4 h-4" />
                </button>
                <div className="dropdown-menu absolute top-full right-0 mt-0 w-[650px] bg-[#1A1A1F] border border-white/10 rounded-lg shadow-2xl p-6">
                  <div className="grid grid-cols-3 gap-6">
                    <div>
                      <h4 className="text-xs font-semibold text-gray-400 mb-3 uppercase tracking-wider">Video Models</h4>
                      <div className="space-y-1">
                        {videoModels.map((model, index) => (
                           <button key={index} onClick={() => navigate(createPageUrl("StudioVideoOptions") + `?model=${encodeURIComponent(model.id)}&name=${encodeURIComponent(model.name)}`)} className="block w-full text-left px-3 py-2 text-sm text-white hover:bg-white/5 rounded transition-colors">{model.name}</button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold text-gray-400 mb-3 uppercase tracking-wider">Image Models</h4>
                      <div className="space-y-1">
                        {imageModels.map((model, index) => (
                           <button key={index} onClick={() => navigate(createPageUrl("StudioImageOptions") + `?model=${encodeURIComponent(model.id)}&name=${encodeURIComponent(model.name)}`)} className="block w-full text-left px-3 py-2 text-sm text-white hover:bg-white/5 rounded transition-colors">{model.name}</button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold text-gray-400 mb-3 uppercase tracking-wider">Utilities</h4>
                      <div className="space-y-1">
                        <button onClick={() => navigate(createPageUrl("StudioImage"))} className="block w-full text-left px-3 py-2 text-sm text-white hover:bg-white/5 rounded transition-colors">Batch Queue</button>
                        <button onClick={() => navigate(createPageUrl("StudioImage"))} className="block w-full text-left px-3 py-2 text-sm text-white hover:bg-white/5 rounded transition-colors">Presets</button>
                        <button onClick={() => navigate(createPageUrl("Studio"))} className="block w-full text-left px-3 py-2 text-sm text-white hover:bg-white/5 rounded transition-colors">Templates</button>
                        <button onClick={() => navigate(createPageUrl("Studio"))} className="block w-full text-left px-3 py-2 text-sm text-white hover:bg-white/5 rounded transition-colors">Changelog</button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Pricing */}
              <button
                onClick={() => scrollToSection('pricing')}
                className="px-4 py-2 text-sm text-white hover:text-gray-300 transition-colors"
              >
                Pricing
              </button>
            </nav>

            {/* Right Side */}
            <div className="flex items-center gap-4">
              <button 
                onClick={() => navigate("/")}
                className="hidden lg:flex items-center gap-2 px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors bg-white/5 rounded-lg border border-white/10 hover:border-white/20"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to likelee.ai
              </button>

              {/* Mobile Menu Button */}
              <button 
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden text-white p-2"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="lg:hidden mt-4 pb-4 border-t border-white/10 pt-4">
              <div className="space-y-2">
                <button onClick={() => { navigate(createPageUrl("Studio")); setMobileMenuOpen(false); }} className="block w-full text-left px-4 py-2 text-white hover:bg-white/5 rounded transition-colors">Home</button>
                
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="video" className="border-none">
                    <AccordionTrigger className="px-4 py-2 text-white hover:bg-white/5 rounded hover:no-underline">
                      Video AI
                    </AccordionTrigger>
                    <AccordionContent className="px-4 space-y-1">
                      <button onClick={() => { navigate(createPageUrl("StudioVideo")); setMobileMenuOpen(false); }} className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-white/5 rounded">AI Video Generator</button>
                      <button onClick={() => { navigate(createPageUrl("StudioVideo")); setMobileMenuOpen(false); }} className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-white/5 rounded">Text to Video AI</button>
                      <button onClick={() => { navigate(createPageUrl("StudioVideo")); setMobileMenuOpen(false); }} className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-white/5 rounded">Image to Video AI</button>
                      <button onClick={() => { navigate(createPageUrl("StudioAvatar")); setMobileMenuOpen(false); }} className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-white/5 rounded">Photo to Video Avatar</button>
                      <button onClick={() => { navigate(createPageUrl("StudioVideo")); setMobileMenuOpen(false); }} className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-white/5 rounded">AI Video Editor</button>
                      <button onClick={() => { navigate(createPageUrl("StudioVideo")); setMobileMenuOpen(false); }} className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-white/5 rounded">AI Shorts</button>
                      <button onClick={() => { navigate(createPageUrl("StudioVideo")); setMobileMenuOpen(false); }} className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-white/5 rounded">Mimic Motion</button>
                      <button onClick={() => { navigate(createPageUrl("StudioVideo")); setMobileMenuOpen(false); }} className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-white/5 rounded">Canvas</button>
                      <button onClick={() => { navigate(createPageUrl("StudioVideo")); setMobileMenuOpen(false); }} className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-white/5 rounded">Video to Video AI</button>
                      <button onClick={() => { navigate(createPageUrl("StudioVideo")); setMobileMenuOpen(false); }} className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-white/5 rounded">Consistent Character Video</button>
                      <button onClick={() => { navigate(createPageUrl("StudioVideo")); setMobileMenuOpen(false); }} className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-white/5 rounded">AI Video Enhancer</button>
                      <button onClick={() => { navigate(createPageUrl("StudioVideo")); setMobileMenuOpen(false); }} className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-white/5 rounded">AI Video Extender</button>
                      <button onClick={() => { navigate(createPageUrl("StudioVideo")); setMobileMenuOpen(false); }} className="block w-full text-left px-4 py-2 text-sm text-gray-400 hover:bg-white/5 rounded">More Tools →</button>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="image" className="border-none">
                    <AccordionTrigger className="px-4 py-2 text-white hover:bg-white/5 rounded hover:no-underline">
                      Image AI
                    </AccordionTrigger>
                    <AccordionContent className="px-4 space-y-1">
                      <button onClick={() => { navigate(createPageUrl("StudioImage")); setMobileMenuOpen(false); }} className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-white/5 rounded">AI Image Generator</button>
                      <button onClick={() => { navigate(createPageUrl("StudioImage")); setMobileMenuOpen(false); }} className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-white/5 rounded">Image to Image AI</button>
                      <button onClick={() => { navigate(createPageUrl("StudioImage")); setMobileMenuOpen(false); }} className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-white/5 rounded">Chat to Image</button>
                      <button onClick={() => { navigate(createPageUrl("StudioImage")); setMobileMenuOpen(false); }} className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-white/5 rounded">AI Art Generator</button>
                      <button onClick={() => { navigate(createPageUrl("StudioImage")); setMobileMenuOpen(false); }} className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-white/5 rounded">Remove BG</button>
                      <button onClick={() => { navigate(createPageUrl("StudioImage")); setMobileMenuOpen(false); }} className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-white/5 rounded">Object Remover</button>
                      <button onClick={() => { navigate(createPageUrl("StudioImage")); setMobileMenuOpen(false); }} className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-white/5 rounded">Image Enhancer</button>
                      <button onClick={() => { navigate(createPageUrl("StudioImage")); setMobileMenuOpen(false); }} className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-white/5 rounded">Ghibli AI Generator</button>
                      <button onClick={() => { navigate(createPageUrl("StudioImage")); setMobileMenuOpen(false); }} className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-white/5 rounded">Anime Upscaler</button>
                      <button onClick={() => { navigate(createPageUrl("StudioImage")); setMobileMenuOpen(false); }} className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-white/5 rounded">Image Generators</button>
                      <button onClick={() => { navigate(createPageUrl("StudioImage")); setMobileMenuOpen(false); }} className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-white/5 rounded">LoRAs</button>
                      <button onClick={() => { navigate(createPageUrl("StudioImage")); setMobileMenuOpen(false); }} className="block w-full text-left px-4 py-2 text-sm text-gray-400 hover:bg-white/5 rounded">More Tools →</button>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="effects" className="border-none">
                    <AccordionTrigger className="px-4 py-2 text-white hover:bg-white/5 rounded hover:no-underline">
                      Effects
                    </AccordionTrigger>
                    <AccordionContent className="px-4 space-y-1">
                      <button onClick={() => { navigate(createPageUrl("StudioEffects")); setMobileMenuOpen(false); }} className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-white/5 rounded">AI Effects Hub</button>
                      <button onClick={() => { navigate(createPageUrl("StudioEffects")); setMobileMenuOpen(false); }} className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-white/5 rounded">Overlays & Templates</button>
                      <button onClick={() => { navigate(createPageUrl("StudioEffects")); setMobileMenuOpen(false); }} className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-white/5 rounded">Transitions</button>
                      <button onClick={() => { navigate(createPageUrl("StudioEffects")); setMobileMenuOpen(false); }} className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-white/5 rounded">Text & Captions</button>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="tools" className="border-none">
                    <AccordionTrigger className="px-4 py-2 text-white hover:bg-white/5 rounded hover:no-underline">
                      AI Tools
                    </AccordionTrigger>
                    <AccordionContent className="px-4 space-y-1">
                      <h4 className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">Video Models</h4>
                      {videoModels.map((model, index) => (
                        <button key={index} onClick={() => { navigate(createPageUrl("StudioVideoOptions") + `?model=${encodeURIComponent(model.id)}&name=${encodeURIComponent(model.name)}`); setMobileMenuOpen(false); }} className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-white/5 rounded">{model.name}</button>
                      ))}
                      <h4 className="text-xs font-semibold text-gray-400 mb-2 mt-4 uppercase tracking-wider">Image Models</h4>
                      {imageModels.map((model, index) => (
                        <button key={index} onClick={() => { navigate(createPageUrl("StudioImageOptions") + `?model=${encodeURIComponent(model.id)}&name=${encodeURIComponent(model.name)}`); setMobileMenuOpen(false); }} className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-white/5 rounded">{model.name}</button>
                      ))}
                      <h4 className="text-xs font-semibold text-gray-400 mb-2 mt-4 uppercase tracking-wider">Utilities</h4>
                      <button onClick={() => { navigate(createPageUrl("StudioImage")); setMobileMenuOpen(false); }} className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-white/5 rounded">Batch Queue</button>
                      <button onClick={() => { navigate(createPageUrl("StudioImage")); setMobileMenuOpen(false); }} className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-white/5 rounded">Presets</button>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>

                <button
                  onClick={() => {
                    scrollToSection('pricing');
                    setMobileMenuOpen(false);
                  }}
                  className="block w-full text-left px-4 py-2 text-white hover:bg-white/5 rounded transition-colors"
                >
                  Pricing
                </button>

                <button 
                  onClick={() => { navigate("/"); setMobileMenuOpen(false); }}
                  className="flex items-center gap-2 w-full text-left px-4 py-2 text-gray-400 hover:bg-white/5 rounded transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to likelee.ai
                </button>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Hero Section with Quick Actions */}
      <section className="relative px-6 pt-16 pb-12 overflow-hidden">
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-20 left-10 w-96 h-96 bg-[#32C8D1] rounded-full mix-blend-multiply filter blur-3xl animated-blob" />
          <div className="absolute top-40 right-10 w-96 h-96 bg-[#F18B6A] rounded-full mix-blend-multiply filter blur-3xl animated-blob" style={{ animationDelay: '7s' }} />
          <div className="absolute bottom-20 left-1/2 w-96 h-96 bg-[#F7B750] rounded-full mix-blend-multiply filter blur-3xl animated-blob" style={{ animationDelay: '14s' }} />
        </div>
        
        <div className="absolute inset-0 noise-texture" style={{ 
          backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 400 400\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\'/%3E%3C/svg%3E")'
        }} />

        <div className="relative z-10 max-w-7xl mx-auto">
          {/* Title */}
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-4">
              What would you like to
              <span className="block bg-gradient-to-r from-[#32C8D1] via-[#F18B6A] to-[#F7B750] bg-clip-text text-transparent">
                create today?
              </span>
            </h1>
            <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto">
              Choose your creative tool and start generating
            </p>
          </div>

          {/* Quick Action Cards - Horizontal Scroll */}
          <div className="mb-8">
            <div className="flex gap-4 overflow-x-auto pb-4 px-2 snap-x snap-mandatory scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
              {toolCards.map((tool, index) => (
                <div
                  key={index}
                  className="quick-action-card flex-shrink-0 w-64 snap-center"
                  onClick={() => navigate(tool.path)}
                  onMouseEnter={() => setHoveredTool(index)}
                  onMouseLeave={() => setHoveredTool(null)}
                >
                  <div className="bg-white/5 backdrop-blur-sm border-2 border-white/10 hover:border-white/30 rounded-xl p-6 h-full relative overflow-hidden group">
                    {/* Background gradient on hover */}
                    <div className={`absolute inset-0 bg-gradient-to-br ${tool.color} opacity-0 group-hover:opacity-10 transition-opacity`} />
                    
                    <div className="relative z-10">
                      {/* Icon */}
                      <div className={`w-14 h-14 rounded-lg ${tool.bgColor} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                        <tool.icon className="w-7 h-7 text-white" />
                      </div>

                      {/* Badge */}
                      {tool.badge && (
                        <Badge className="absolute top-4 right-4 bg-white/20 text-white border-white/30 text-xs badge-pulse">
                          {tool.badge}
                        </Badge>
                      )}

                      {/* Title */}
                      <h3 className="text-lg font-bold text-white mb-2">{tool.title}</h3>
                      <p className="text-sm text-gray-400 mb-4">Start creating with AI</p>

                      {/* Arrow */}
                      <div className="flex items-center text-sm text-gray-400 group-hover:text-white transition-colors">
                        <span className="mr-2">Get started</span>
                        <ArrowRight className={`w-4 h-4 transition-all ${hoveredTool === index ? 'translate-x-2' : ''}`} />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-4 max-w-3xl mx-auto mb-8">
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-[#32C8D1] mb-1">8+</div>
              <div className="text-xs text-gray-400">AI Models</div>
            </div>
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-[#F18B6A] mb-1">5</div>
              <div className="text-xs text-gray-400">Creative Tools</div>
            </div>
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-[#F7B750] mb-1">300+</div>
              <div className="text-xs text-gray-400">Templates</div>
            </div>
          </div>
        </div>
      </section>

      {/* Model Selector */}
      <section className="px-6 py-20 bg-white/[0.02]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Choose a model</h2>
            <p className="text-xl text-gray-400">Pick from the latest AI models supported by Likelee Studio.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mb-8">
            {/* Video Models */}
            <div>
              <h3 className="text-xl font-bold mb-6 text-[#F18B6A]">Video Models</h3>
              <div className="space-y-3">
                {videoModels.map((model, index) => (
                  <Card 
                    key={index} 
                    className="model-card p-4 bg-white/5 border border-white/10 hover:bg-white/10 cursor-pointer transition-all rounded-lg flex items-center justify-between"
                    onClick={() => navigate(createPageUrl("StudioVideoOptions") + `?model=${encodeURIComponent(model.id)}&name=${encodeURIComponent(model.name)}`)}
                  >
                    <span className="text-white font-medium">{model.name}</span>
                    <Button size="sm" variant="ghost" className="text-gray-400 hover:text-white">
                      Select
                    </Button>
                  </Card>
                ))}
              </div>
            </div>

            {/* Image Models */}
            <div>
              <h3 className="text-xl font-bold mb-6 text-[#32C8D1]">Image Models</h3>
              <div className="space-y-3">
                {imageModels.map((model, index) => (
                  <Card 
                    key={index} 
                    className="model-card p-4 bg-white/5 border border-white/10 hover:bg-white/10 cursor-pointer transition-all rounded-lg flex items-center justify-between"
                    onClick={() => navigate(createPageUrl("StudioImageOptions") + `?model=${encodeURIComponent(model.id)}&name=${encodeURIComponent(model.name)}`)}
                  >
                    <span className="text-white font-medium">{model.name}</span>
                    <Button size="sm" variant="ghost" className="text-gray-400 hover:text-white">
                      Select
                    </Button>
                  </Card>
                ))}
              </div>
            </div>

            {/* Avatars & Effects */}
            <div>
              <h3 className="text-xl font-bold mb-6 text-[#F7B750]">Avatars & Effects</h3>
              <div className="space-y-3">
                {avatarModels.map((model, index) => (
                  <Card 
                    key={index} 
                    className="model-card p-4 bg-white/5 border border-white/10 hover:bg-white/10 cursor-pointer transition-all rounded-lg flex items-center justify-between"
                    onClick={() => navigate(createPageUrl("StudioAvatarOptions") + `?model=${encodeURIComponent(model.id)}&name=${encodeURIComponent(model.name)}`)}
                  >
                    <span className="text-white font-medium">{model.name}</span>
                    <Button size="sm" variant="ghost" className="text-gray-400 hover:text-white">
                      Select
                    </Button>
                  </Card>
                ))}
              </div>
            </div>
          </div>

          <p className="text-center text-gray-400">
            We constantly add new models. Your subscription includes access to all.
          </p>
        </div>
      </section>

      {/* Subscription Section */}
      <section id="pricing" className="px-6 py-20">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Simple Monthly Plans</h2>
            <p className="text-xl text-gray-400">Get unlimited access to AI image and video generation.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 mb-16 max-w-5xl mx-auto">
            {/* Lite Plan */}
            <Card className="p-8 bg-white/5 backdrop-blur-sm border-2 border-white/10 hover:border-white/20 transition-all rounded-lg">
              <div className="mb-6">
                <h3 className="text-2xl font-bold text-white mb-2">Lite Plan</h3>
                <div className="flex items-baseline mb-2">
                  <span className="text-5xl font-bold text-white">$15</span>
                  <span className="text-gray-400 ml-2">/ month</span>
                </div>
                <p className="text-gray-400">300 credits</p>
              </div>

              <p className="text-gray-300 mb-6">For individuals who want to explore Likelee Studio.</p>

              <ul className="space-y-3 mb-8">
                <li className="flex items-center gap-3 text-gray-300">
                  <Check className="w-5 h-5 text-green-400 flex-shrink-0" />
                  <span>30 videos / month</span>
                </li>
                <li className="flex items-center gap-3 text-gray-300">
                  <Check className="w-5 h-5 text-green-400 flex-shrink-0" />
                  <span>300 images / month</span>
                </li>
                <li className="flex items-center gap-3 text-gray-300">
                  <Check className="w-5 h-5 text-green-400 flex-shrink-0" />
                  <span>2 parallel tasks</span>
                </li>
                <li className="flex items-center gap-3 text-gray-300">
                  <Check className="w-5 h-5 text-green-400 flex-shrink-0" />
                  <span>All-in-one multi-model support</span>
                </li>
                <li className="flex items-center gap-3 text-gray-300">
                  <Check className="w-5 h-5 text-green-400 flex-shrink-0" />
                  <span>Text to video</span>
                </li>
                <li className="flex items-center gap-3 text-gray-300">
                  <Check className="w-5 h-5 text-green-400 flex-shrink-0" />
                  <span>Image to video</span>
                </li>
                <li className="flex items-center gap-3 text-gray-300">
                  <Check className="w-5 h-5 text-green-400 flex-shrink-0" />
                  <span>Text/Image/Video to video</span>
                </li>
                <li className="flex items-center gap-3 text-gray-300">
                  <Check className="w-5 h-5 text-green-400 flex-shrink-0" />
                  <span>Consistent character video</span>
                </li>
                <li className="flex items-center gap-3 text-gray-300">
                  <Check className="w-5 h-5 text-green-400 flex-shrink-0" />
                  <span>AI animation generator</span>
                </li>
                <li className="flex items-center gap-3 text-gray-300">
                  <Check className="w-5 h-5 text-green-400 flex-shrink-0" />
                  <span>Text/Image/Chat to image</span>
                </li>
                <li className="flex items-center gap-3 text-gray-300">
                  <Check className="w-5 h-5 text-green-400 flex-shrink-0" />
                  <span>300+ templates & effects</span>
                </li>
              </ul>

              <p className="text-sm text-gray-400 mb-6">Perfect for creators just starting with AI image and video generation.</p>

              <Button className="w-full h-12 text-base font-medium bg-gradient-to-r from-[#32C8D1] to-teal-500 hover:opacity-90 text-white border-2 border-white/20 rounded-lg">
                Subscribe Now
              </Button>
            </Card>

            {/* Pro Plan */}
            <Card className="p-8 bg-white/5 backdrop-blur-sm border-2 border-white/10 hover:border-white/20 transition-all rounded-lg">
              <div className="mb-6">
                <h3 className="text-2xl font-bold text-white mb-2">Pro Plan — Flexible Credits</h3>
                <div className="flex items-baseline mb-2">
                  <span className="text-5xl font-bold text-white">${selectedTier.price}</span>
                  <span className="text-gray-400 ml-2">/ month</span>
                </div>
                <p className="text-gray-400">{selectedTier.label} credits per month</p>
              </div>

              <p className="text-gray-300 mb-6">Use credits for any generation type (image, video, avatar, or animation).</p>

              {/* Credit Slider */}
              <div className="bg-white/5 border border-white/10 rounded-lg p-6 mb-6">
                <div className="mb-6">
                  <label className="text-sm font-semibold text-gray-300 mb-4 block">
                    Choose your monthly credits:
                  </label>
                  <input
                    type="range"
                    min="0"
                    max={creditTiers.length - 1}
                    value={selectedTierIndex}
                    onChange={(e) => setSelectedTierIndex(parseInt(e.target.value))}
                    className="credit-slider"
                  />
                </div>
                
                {/* Tier Labels */}
                <div className="flex justify-between text-xs text-gray-400 mt-2">
                  <span>2K</span>
                  <span>5K</span>
                  <span>10K</span>
                  <span>25K</span>
                  <span>50K</span>
                  <span>100K</span>
                  <span>250K</span>
                  <span>500K</span>
                </div>

                {/* Price Display */}
                <div className="mt-6 pt-6 border-t border-white/10">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">Monthly total:</span>
                    <span className="text-3xl font-bold text-white">${selectedTier.price}</span>
                  </div>
                  <p className="text-sm text-gray-400 mt-2">for {selectedTier.label} credits</p>
                </div>
              </div>

              <ul className="space-y-2 mb-6 text-sm text-gray-300">
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                  <span>Credits renew monthly and can be used across all AI tools</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                  <span>Unused credits roll over for 30 days</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                  <span>Cancel anytime</span>
                </li>
              </ul>

              <Button className="w-full h-12 text-base font-medium bg-gradient-to-r from-[#F18B6A] to-[#E07A5A] hover:opacity-90 text-white border-2 border-white/20 rounded-lg">
                Subscribe Now
              </Button>
            </Card>
          </div>

          {/* Features Comparison Table */}
          <div className="max-w-5xl mx-auto">
            <h3 className="text-2xl font-bold mb-8 text-center">Supported Features</h3>
            <div className="bg-white/5 border-2 border-white/10 rounded-lg overflow-hidden">
              <div className="grid grid-cols-3 gap-4 p-4 bg-white/5 border-b border-white/10">
                <div className="font-bold text-white">Feature</div>
                <div className="font-bold text-white text-center">Lite</div>
                <div className="font-bold text-white text-center">Pro</div>
              </div>
              {features.map((feature, index) => (
                <div key={index} className="grid grid-cols-3 gap-4 p-4 border-b border-white/5 hover:bg-white/5 transition-colors">
                  <div className="text-gray-300">{feature.name}</div>
                  <div className="text-center">
                    {typeof feature.lite === 'boolean' ? (
                      feature.lite ? <Check className="w-5 h-5 text-green-400 mx-auto" /> : <span className="text-gray-600">—</span>
                    ) : (
                      <span className="text-gray-300">{feature.lite}</span>
                    )}
                  </div>
                  <div className="text-center">
                    {typeof feature.pro === 'boolean' ? (
                      feature.pro ? <Check className="w-5 h-5 text-green-400 mx-auto" /> : <span className="text-gray-300">—</span>
                    ) : (
                      <span className="text-gray-300">{feature.pro}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Examples Section */}
      <section className="px-6 py-20 bg-white/[0.02]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">What people are making</h2>
            <p className="text-xl text-gray-400">Created using Likelee Studio tools and models.</p>
          </div>

          <div className="grid md:grid-cols-4 gap-6">
            {exampleProjects.map((project, index) => (
              <Card key={index} className="group cursor-pointer overflow-hidden bg-white/5 border border-white/10 hover:border-white/20 transition-all rounded-lg">
                <div className="relative aspect-video overflow-hidden">
                  <img 
                    src={project.thumbnail} 
                    alt={project.caption}
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <Badge className="absolute top-3 right-3 bg-white/10 backdrop-blur-sm text-white border-white/20 rounded-full">
                    {project.type}
                  </Badge>
                </div>
                <div className="p-4">
                  <p className="text-white font-medium mb-2">{project.caption}</p>
                  <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white p-0 h-auto" onClick={() => navigate(project.type === "video" ? createPageUrl("StudioVideo") : createPageUrl("StudioImage"))}>
                    Try this style →
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="px-6 py-20">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold mb-12 text-center">Frequently Asked Questions</h2>

          <Accordion type="single" collapsible className="space-y-4">
            <AccordionItem value="item-1" className="border-2 border-white/10 rounded-lg bg-white/5 px-6">
              <AccordionTrigger className="text-lg font-semibold text-white hover:no-underline py-4">
                What can I make with Likelee Studio?
              </AccordionTrigger>
              <AccordionContent className="text-base text-gray-300 leading-relaxed pb-4">
                AI-generated videos, images, avatars, and creative effects — all in one place.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-2" className="border-2 border-white/10 rounded-lg bg-white/5 px-6">
              <AccordionTrigger className="text-lg font-semibold text-white hover:no-underline py-4">
                Do I need to code?
              </AccordionTrigger>
              <AccordionContent className="text-base text-gray-300 leading-relaxed pb-4">
                Nope. Just upload or describe what you want.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-3" className="border-2 border-white/10 rounded-lg bg-white/5 px-6">
              <AccordionTrigger className="text-lg font-semibold text-white hover:no-underline py-4">
                Is this unlimited?
              </AccordionTrigger>
              <AccordionContent className="text-base text-gray-300 leading-relaxed pb-4">
                Each plan has a fair-use limit to ensure performance. The Agency Plan includes unlimited generations.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </section>

      {/* Standalone Footer */}
      <footer className="border-t border-white/10 px-6 py-12">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-gray-400 text-sm mb-4">
            © 2025 Likelee Studio. Part of the Likelee ecosystem.
          </p>
          <button 
            onClick={() => navigate("/")}
            className="text-sm text-gray-500 hover:text-white transition-colors"
          >
            Visit likelee.ai
          </button>
        </div>
      </footer>
    </div>
  );
}
