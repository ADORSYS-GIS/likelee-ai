import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Upload, Instagram, Mic, Users, Eye, Image as ImageIcon,
  Video, AlertCircle, CheckCircle2, Loader2, Trash2, Settings,
  DollarSign, TrendingUp, Briefcase, Edit, Play, Pause, Square,
  Volume2, Download, Lock, Unlock, Plus, X, LayoutDashboard,
  FileText, Calendar, BarChart3, Menu, ChevronRight, Clock,
  Shield, Building2, Target, PlayCircle, CheckSquare, XCircle,
  Send, MessageSquare, Copy, ArrowRight, RefreshCw
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useAuth } from '@/auth/AuthProvider'

// Voice recording scripts for different emotions
const VOICE_SCRIPTS = {
  happy: "I'm absolutely thrilled to be here today! Life is full of wonderful surprises and exciting opportunities. Every morning brings a fresh start and new possibilities. I love connecting with people and sharing positive energy. The world is an amazing place when you look at it with optimism. Let's celebrate the little victories and cherish every moment of joy. Happiness is contagious, so let's spread it around!",
  
  emotional: "There are moments in life that touch our hearts deeply. Sometimes we feel overwhelmed by the beauty of human connection. These experiences shape who we are and remind us of what truly matters. I've learned that vulnerability is not weakness, but courage. Every person we meet carries their own story, their own struggles and triumphs. Let's honor those moments and hold space for authentic emotion.",
  
  excited: "Oh my goodness, this is incredible! I can barely contain my enthusiasm right now! There's so much energy and potential in this moment. I'm buzzing with anticipation for what's coming next. Can you feel that electricity in the air? This is going to be absolutely amazing! I'm ready to jump in with both feet and make things happen. The future is bright and I'm here for it!",
  
  mellow: "Sometimes it's nice to just slow down and take things easy. There's no rush, no pressure. Just a calm, steady presence in the moment. Life doesn't always have to be intense or dramatic. These quiet moments have their own beauty and purpose. Let's just breathe and appreciate the stillness. Everything unfolds in its own time, and that's perfectly okay.",
  
  relaxed: "Hey there, just taking it easy today. No stress, no worries. Everything's flowing naturally and smoothly. I'm in a really good headspace right now, just enjoying the present moment. Life feels balanced and comfortable. There's something peaceful about not overthinking things. Just being here, being present, and letting things happen naturally. It's all good.",
  
  angry: "I cannot believe this is happening. This is completely unacceptable and frankly, I'm fed up. There are limits to what anyone should have to tolerate. This situation needs to change, and it needs to change now. I'm tired of excuses and empty promises. Actions speak louder than words, and I'm ready to demand what's right. This ends here."
};

// Content types and industries for My Rules
const CONTENT_TYPES = [
  "Social-media ads",
  "Web & banner campaigns",
  "TV / streaming commercials",
  "Film & scripted streaming",
  "Print & outdoor ads",
  "Music videos",
  "Video-game / VR characters",
  "Stock photo / video libraries",
  "Educational / nonprofit spots"
];

const INDUSTRIES = [
  "Fashion / Beauty",
  "Tech / Electronics",
  "Sports / Fitness",
  "Food / Beverage",
  "Film / Gaming / Music",
  "Automotive",
  "Finance / Fintech",
  "Health / Wellness",
  "Luxury & Lifestyle",
  "Travel / Hospitality"
];

const IMAGE_SECTIONS = [
  { 
    id: "headshot_neutral", 
    title: "Headshots - Neutral Expression", 
    description: "Face front-facing, neutral expression (not smiling or frowning). Good lighting on face. Professional clothing or plain background. 1080x1080 minimum.",
    bestFor: "Brands need a clean face reference"
  },
  { 
    id: "headshot_smiling", 
    title: "Headshots - Smiling", 
    description: "Face front-facing, natural smile (genuine, not forced). Good lighting. Professional setting. 1080x1080 minimum.",
    bestFor: "Brands want to show you happy/approachable"
  },
  { 
    id: "fullbody_casual", 
    title: "Full Body - Casual Outfit", 
    description: "Full body shot in casual everyday clothing. Natural pose.",
    bestFor: "Everyday casual look"
  },
  { 
    id: "fullbody_formal", 
    title: "Full Body - Formal/Professional", 
    description: "Full body shot in professional or formal attire.",
    bestFor: "Professional or business contexts"
  },
  { 
    id: "side_profile", 
    title: "Side Profile", 
    description: "Clean side view of your face and upper body.",
    bestFor: "Brands need your side angle"
  },
  { 
    id: "three_quarter", 
    title: "3/4 Angle", 
    description: "Face turned at a 45-degree angle, natural expression.",
    bestFor: "Natural conversational angle"
  },
  { 
    id: "hair_down", 
    title: "Hair Down - Loose/Wavy", 
    description: "Hair worn down in your natural style.",
    bestFor: "Casual, relaxed look"
  },
  { 
    id: "hair_up", 
    title: "Hair Up - Ponytail/Bun", 
    description: "Hair pulled up/back, clean look.",
    bestFor: "Professional or active look"
  },
  { 
    id: "hair_styling", 
    title: "Hair Styling - Braids/Specific Style", 
    description: "If you have a signature hairstyle.",
    bestFor: "If you have a signature style"
  },
  { 
    id: "upper_body", 
    title: "Upper Body Close-Up", 
    description: "Shoulders and up, detailed facial features visible.",
    bestFor: "Close-up shots, detailed facial features"
  },
  { 
    id: "outdoors", 
    title: "In Environment - Outdoors", 
    description: "You in an outdoor setting (park, street, nature).",
    bestFor: "Contextual, lifestyle content"
  },
  { 
    id: "indoors", 
    title: "In Environment - Indoors", 
    description: "You in an indoor setting (home, office, cafe).",
    bestFor: "Indoor/office/home contexts"
  },
  { 
    id: "makeup_variation", 
    title: "Different Makeup Style", 
    description: "If you vary your makeup style, show different looks.",
    bestFor: "If you vary makeup, brands should know"
  },
  { 
    id: "seasonal", 
    title: "Seasonal/Outfit Variation", 
    description: "Different seasonal styles or outfit variations.",
    bestFor: "Seasonal campaigns, different looks"
  },
  { 
    id: "signature", 
    title: "Your Choice - Signature Moment", 
    description: "A photo that really represents YOU and how people recognize you.",
    bestFor: "A photo that really represents YOU"
  }
];

// Mock data for campaigns
const mockActiveCampaigns = [
  {
    id: 1,
    brand: "Nike Sportswear",
    brand_logo: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=100",
    usage_type: "Social Ads",
    rate: 500,
    active_until: "2025-12-31",
    status: "active",
    earnings_this_month: 500,
    regions: ["North America", "Europe"],
    impressions_week: 125000,
    auto_renewal: true
  },
  {
    id: 2,
    brand: "Glossier Beauty",
    brand_logo: "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=100",
    usage_type: "Web & Banner",
    rate: 750,
    active_until: "2026-03-15",
    status: "active",
    earnings_this_month: 750,
    regions: ["Global"],
    impressions_week: 89000,
    auto_renewal: false
  },
  {
    id: 3,
    brand: "Tesla Motors",
    brand_logo: "https://images.unsplash.com/photo-1560958089-b8a1929cea89?w=100",
    usage_type: "TV Commercial",
    rate: 1200,
    active_until: "2025-06-30",
    status: "expiring_soon",
    earnings_this_month: 1200,
    regions: ["North America"],
    impressions_week: 250000,
    auto_renewal: false
  }
];

const mockPendingApprovals = [
  {
    id: 1,
    brand: "Adidas Running",
    brand_logo: "https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=100",
    usage_type: "Social Media Campaign",
    proposed_rate: 600,
    term_length: "6 months",
    regions: ["North America", "Asia"],
    industries: ["Sports / Fitness"],
    perpetual: false,
    requested_date: "2025-11-10"
  },
  {
    id: 2,
    brand: "Whole Foods Market",
    brand_logo: "https://images.unsplash.com/photo-1542838132-92c53300491e?w=100",
    usage_type: "Print & Outdoor",
    proposed_rate: 450,
    term_length: "3 months",
    regions: ["North America"],
    industries: ["Food / Beverage"],
    perpetual: false,
    requested_date: "2025-11-09"
  },
  {
    id: 3,
    brand: "Samsung Electronics",
    brand_logo: "https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=100",
    usage_type: "TV Commercial",
    proposed_rate: 2000,
    term_length: "Perpetual",
    regions: ["Global"],
    industries: ["Tech / Electronics"],
    perpetual: true,
    requested_date: "2025-11-08"
  }
];

const revenueData = [
  { month: 'Jun', revenue: 0 },
  { month: 'Jul', revenue: 500 },
  { month: 'Aug', revenue: 1250 },
  { month: 'Sep', revenue: 1750 },
  { month: 'Oct', revenue: 2200 },
  { month: 'Nov', revenue: 2450 }
];

const earningsByIndustry = [
  { name: 'Sports / Fitness', value: 1200, color: '#32C8D1' },
  { name: 'Beauty / Fashion', value: 750, color: '#F18B6A' },
  { name: 'Tech / Electronics', value: 500, color: '#F7B750' }
];

const mockContracts = [
  {
    id: 1,
    brand: "Nike Sportswear",
    brand_logo: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=100",
    project_name: "Fall Running Campaign",
    creator_earnings: 500,
    earnings_to_date: 3000,
    status: "active",
    effective_date: "2024-06-01",
    expiration_date: "2025-12-31",
    days_remaining: 395,
    auto_renew: true,
    territory: "North America, Europe",
    channels: ["Social Media", "Website"],
    deliverables: "2 Instagram Reels (15-30s each), 1 Hero Image",
    revisions: 2,
    prohibited_uses: "Competitor brands, political content",
    payment_status: "paid",
    amount_paid: 3000,
    amount_pending: 0
  },
  {
    id: 2,
    brand: "Glossier Beauty",
    brand_logo: "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=100",
    project_name: "Holiday Beauty Collection",
    creator_earnings: 750,
    earnings_to_date: 4500,
    status: "active",
    effective_date: "2024-07-01",
    expiration_date: "2026-03-15",
    days_remaining: 488,
    auto_renew: false,
    territory: "Global",
    channels: ["Social Media", "Website", "Email Marketing"],
    deliverables: "3 TikTok videos, 2 Instagram posts",
    revisions: 3,
    prohibited_uses: "Adult content, tobacco",
    payment_status: "paid",
    amount_paid: 4500,
    amount_pending: 0
  },
  {
    id: 3,
    brand: "Tesla Motors",
    brand_logo: "https://images.unsplash.com/photo-1560958089-b8a1929cea89?w=100",
    project_name: "Model Y Launch",
    creator_earnings: 1200,
    earnings_to_date: 7200,
    status: "expiring_soon",
    effective_date: "2024-12-01",
    expiration_date: "2025-06-30",
    days_remaining: 14,
    auto_renew: false,
    territory: "North America",
    channels: ["TV Commercial", "Web"],
    deliverables: "1 TV spot (30s), 3 web banner images",
    revisions: 2,
    prohibited_uses: "Competitor automotive brands",
    payment_status: "paid",
    amount_paid: 7200,
    amount_pending: 0
  }
];

export default function CreatorDashboard() {
  const navigate = useNavigate();
  const { user, initialized, authenticated } = useAuth()
  const API_BASE = (import.meta as any).env.VITE_API_BASE_URL || ''
  const [activeSection, setActiveSection] = useState("dashboard");
  const [settingsTab, setSettingsTab] = useState("profile"); // 'profile' or 'rules'
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [creator, setCreator] = useState<any>({});
  
  const [heroMedia, setHeroMedia] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [voiceLibrary, setVoiceLibrary] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [kycLoading, setKycLoading] = useState(false);
  const [activeCampaigns, setActiveCampaigns] = useState<any[]>(mockActiveCampaigns);
  const [pendingApprovals, setPendingApprovals] = useState<any[]>(mockPendingApprovals);
  const [editingRules, setEditingRules] = useState(false);
  const [contracts, setContracts] = useState<any[]>(mockContracts);
  const [selectedContract, setSelectedContract] = useState(null);
  const [showContractDetails, setShowContractDetails] = useState(false);
  const [showPauseModal, setShowPauseModal] = useState(false);
  const [pauseOption, setPauseOption] = useState(null);
  const [showRevokeModal, setShowRevokeModal] = useState(false);
  const [showApprovalContract, setShowApprovalContract] = useState(null);
  const [contractsTab, setContractsTab] = useState("active");
  const [showReuploadCameoModal, setShowReuploadCameoModal] = useState(false);
  const [showImageUploadModal, setShowImageUploadModal] = useState(false);
  const [selectedImageSection, setSelectedImageSection] = useState(null);
  const [uploadingToSection, setUploadingToSection] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const [referenceImages, setReferenceImages] = useState({
    headshot_neutral: null,
    headshot_smiling: null,
    fullbody_casual: null,
    fullbody_formal: null,
    side_profile: { url: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400" },
    three_quarter: null,
    hair_down: { url: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400" },
    hair_up: null,
    hair_styling: null,
    upper_body: { url: "https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=400" },
    outdoors: null,
    indoors: { url: "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=400" },
    makeup_variation: null,
    seasonal: { url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400" },
    signature: { url: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400" }
  });
  const [contentPreferences, setContentPreferences] = useState({
    comfortable: ["Fashion & Beauty", "Product Reviews", "Testimonials", "Social Media Content", "Educational Content", "Fitness/Wellness", "Lifestyle Content"],
    not_comfortable: ["Political Content", "Controversial Topics", "Explicit/Adult Content", "Pharmaceutical Claims", "Financial/Investment Advice"]
  });
  
  // Voice recording states
  const [showRecordingModal, setShowRecordingModal] = useState(false);
  const [selectedEmotion, setSelectedEmotion] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [currentWord, setCurrentWord] = useState(0);
  const [generatingVoice, setGeneratingVoice] = useState(false);
  
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);

  // Calculate metrics (fallback to computed if backend doesn't send)
  const totalMonthlyRevenue = activeCampaigns.reduce((sum, c) => sum + (c.rate || 0), 0);
  const annualRunRate = totalMonthlyRevenue * 12;
  const pendingCount = pendingApprovals.length;

  // Fetch per-user dashboard data
  useEffect(() => {
    if (!initialized) return
    if (!authenticated || !user?.uid) return
    const abort = new AbortController()
    ;(async () => {
      try {
        const res = await fetch(`${API_BASE}/api/dashboard?user_id=${encodeURIComponent(user.uid)}`, { signal: abort.signal })
        if (!res.ok) throw new Error(await res.text())
        const json = await res.json()
        const profile = json.profile || {}
        setCreator({
          name: profile.full_name || creator.name,
          email: profile.email || creator.email,
          profile_photo: creator.profile_photo,
          location: [profile.city, profile.state].filter(Boolean).join(', '),
          bio: creator.bio,
          instagram_handle: profile.platform_handle ? `@${profile.platform_handle}` : creator.instagram_handle,
          tiktok_handle: creator.tiktok_handle,
          instagram_connected: creator.instagram_connected ?? false,
          instagram_followers: creator.instagram_followers ?? 0,
          content_types: profile.content_types || [],
          industries: profile.industries || [],
          price_per_week: creator.price_per_week ?? 0,
          royalty_percentage: creator.royalty_percentage ?? 0,
          accept_negotiations: creator.accept_negotiations ?? true,
          kyc_status: profile.kyc_status,
          verified_at: profile.verified_at,
        })
        // If backend provides arrays later, replace mocks
        if (Array.isArray(json.campaigns) && json.campaigns.length) setActiveCampaigns(json.campaigns)
        if (Array.isArray(json.approvals) && json.approvals.length) setPendingApprovals(json.approvals)
        if (Array.isArray(json.contracts) && json.contracts.length) setContracts(json.contracts)
        // Optionally, if backend provides metrics, you can store them to override computed ones
      } catch (e) {
        console.error('Failed to fetch dashboard', e)
      }
    })()
    return () => abort.abort()
  }, [initialized, authenticated, user?.uid])

  // Verification actions from dashboard
  const startVerificationFromDashboard = async () => {
    if (!authenticated || !user?.uid) {
      alert('Please log in to start verification.')
      return
    }
    try {
      setKycLoading(true)
      const res = await fetch(`${API_BASE}/api/kyc/session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.uid }),
      })
      if (!res.ok) throw new Error(await res.text())
      const data = await res.json()
      if (data.session_url) window.open(data.session_url, '_blank')
    } catch (e: any) {
      alert(`Failed to start verification: ${e?.message || e}`)
    } finally {
      setKycLoading(false)
    }
  }

  const refreshVerificationFromDashboard = async () => {
    if (!authenticated || !user?.uid) return
    try {
      setKycLoading(true)
      const res = await fetch(`${API_BASE}/api/kyc/status?user_id=${encodeURIComponent(user.uid)}`)
      if (!res.ok) throw new Error(await res.text())
      const rows = await res.json()
      const row = Array.isArray(rows) && rows.length ? rows[0] : null
      if (row && (row.kyc_status || row.liveness_status)) {
        setCreator((prev: any) => ({ ...prev, kyc_status: row.kyc_status, verified_at: row.verified_at }))
      }
    } catch (e: any) {
      console.error('Failed to refresh verification status', e)
    } finally {
      setKycLoading(false)
    }
  }

  const navigationItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "likeness", label: "My Likeness", icon: ImageIcon },
    { id: "voice", label: "Voice & Recordings", icon: Mic },
    { id: "campaigns", label: "Active Campaigns", icon: Target, badge: activeCampaigns.length },
    { id: "approvals", label: "Approval Queue", icon: CheckSquare, badge: pendingCount, urgent: pendingCount > 0 },
    { id: "contracts", label: "Licenses & Contracts", icon: FileText, badge: contracts.filter(c => c.status === "expiring_soon").length > 0 ? contracts.filter(c => c.status === "expiring_soon").length : undefined },
    { id: "earnings", label: "Earnings", icon: DollarSign },
    { id: "settings", label: "Settings", icon: Settings }
  ];

  const handleHeroUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setUploading(true);
      setTimeout(() => {
        setHeroMedia({
          url: URL.createObjectURL(file),
          type: file.type.includes('video') ? 'video' : 'image',
          name: file.name
        });
        setUploading(false);
        alert("Hero media uploaded! (Demo mode)");
      }, 1000);
    }
  };

  const handlePhotosUpload = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      setUploading(true);
      setTimeout(() => {
        const newPhotos = files.map(file => ({
          url: URL.createObjectURL(file),
          name: file.name
        }));
        setPhotos([...photos, ...newPhotos]);
        setUploading(false);
        alert(`${files.length} photo(s) uploaded! (Demo mode)`);
      }, 1000);
    }
  };

  const handleDeletePhoto = (index) => {
    setPhotos(photos.filter((_, i) => i !== index));
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      setUploadingPhoto(true);
      setTimeout(() => {
        const url = URL.createObjectURL(file);
        setCreator({...creator, profile_photo: url});
        setUploadingPhoto(false);
        alert("Photo uploaded! (Demo mode)");
      }, 1000);
    }
  };

  // Recording functions
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      let options = { mimeType: 'audio/webm' };
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        options = { mimeType: 'audio/webm;codecs=opus' };
      }
      
      mediaRecorderRef.current = new MediaRecorder(stream, options);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorderRef.current.onstop = async () => {
        const mimeType = mediaRecorderRef.current.mimeType;
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        const audioUrl = URL.createObjectURL(audioBlob);
        
        const newRecording = {
          id: Date.now(),
          emotion: selectedEmotion,
          url: audioUrl,
          blob: audioBlob,
          mimeType: mimeType,
          duration: recordingTime,
          date: new Date().toISOString(),
          accessible: true,
          voiceProfileCreated: false,
          usageCount: 0
        };
        
        setVoiceLibrary([...voiceLibrary, newRecording]);
        setShowRecordingModal(false);
        setRecordingTime(0);
        setCurrentWord(0);
        
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      
      const startTime = Date.now();
      timerRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        setRecordingTime(elapsed);
        
        const script = VOICE_SCRIPTS[selectedEmotion];
        const words = script.split(' ');
        const wordsPerSecond = words.length / 60;
        const wordIndex = Math.min(Math.floor(elapsed * wordsPerSecond), words.length - 1);
        setCurrentWord(wordIndex);
        
        if (elapsed >= 60) {
          stopRecording();
        }
      }, 100);
      
    } catch (error) {
      console.error('Error starting recording:', error);
      alert('Failed to access microphone. Please check permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(timerRef.current);
    }
  };

  const handleEmotionSelect = (emotion) => {
    setSelectedEmotion(emotion);
    setShowRecordingModal(true);
    setRecordingTime(0);
    setCurrentWord(0);
  };

  const toggleRecordingAccess = (id) => {
    setVoiceLibrary(voiceLibrary.map(rec => 
      rec.id === id ? { ...rec, accessible: !rec.accessible } : rec
    ));
  };

  const deleteRecording = (id) => {
    if (confirm("Are you sure you want to delete this recording?")) {
      setVoiceLibrary(voiceLibrary.filter(rec => rec.id !== id));
    }
  };

  const createVoiceProfile = async (recording) => {
    try {
      setGeneratingVoice(true);
      
      let extension = 'webm';
      if (recording.mimeType && recording.mimeType.includes('mp4')) {
        extension = 'mp4';
      } else if (recording.mimeType && recording.mimeType.includes('ogg')) {
        extension = 'ogg';
      } else if (recording.mimeType && recording.mimeType.includes('wav')) {
        extension = 'wav';
      }
      
      const file = new File([recording.blob], `voice_${recording.emotion}.${extension}`, { 
        type: recording.mimeType || recording.blob.type,
        lastModified: Date.now()
      });
      
      const formData = new FormData();
      formData.append('audio_file', file);
      formData.append('voice_name', `${creator.name}_${recording.emotion}`);
      formData.append('description', `${recording.emotion} voice profile for ${creator.name}`);

      const response = await base44.functions.invoke('createVoiceProfile', formData);

      if (response.data && response.data.voice_id) {
        setVoiceLibrary(voiceLibrary.map(rec => 
          rec.id === recording.id 
            ? { ...rec, voiceProfileCreated: true, voice_id: response.data.voice_id }
            : rec
        ));

        alert("Voice profile created successfully with ElevenLabs!");
      } else {
        throw new Error(response.data?.error || response.data?.details || 'Unknown error creating voice profile');
      }
      
    } catch (error) {
      console.error("Voice profile creation error:", error);
      
      let errorMessage = 'Failed to create voice profile';
      if (error.response?.data) {
        errorMessage = error.response.data.details || error.response.data.error || errorMessage;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      alert(`Error: ${errorMessage}\n\nPossible issues:\n• Recording quality too low\n• File format not supported by ElevenLabs\n• Recording too short (need 30+ seconds)\n• Try re-recording with better audio`);
    } finally {
      setGeneratingVoice(false);
    }
  };

  const renderScript = () => {
    if (!selectedEmotion) return null;
    
    const script = VOICE_SCRIPTS[selectedEmotion];
    const words = script.split(' ');
    
    return (
      <div className="text-center py-8 px-6 max-h-96 overflow-hidden">
        <div className="text-2xl leading-relaxed">
          {words.map((word, index) => (
            <span
              key={index}
              className={`inline-block mx-1 transition-all duration-300 ${
                index === currentWord
                  ? 'text-[#32C8D1] font-bold scale-110'
                  : index < currentWord
                  ? 'text-gray-400'
                  : 'text-gray-700'
              }`}
            >
              {word}
            </span>
          ))}
        </div>
      </div>
    );
  };

  const handleApprove = (approvalId) => {
    setPendingApprovals(pendingApprovals.filter(a => a.id !== approvalId));
    setShowApprovalContract(null);
    alert("Campaign approved! Contract signed! (Demo mode)");
  };

  const handleDecline = (approvalId) => {
    setPendingApprovals(pendingApprovals.filter(a => a.id !== approvalId));
    setShowApprovalContract(null);
    alert("Campaign declined! (Demo mode)");
  };

  const handlePauseLicense = (contract, immediate) => {
    const option = immediate ? "immediate" : "next_month";
    setPauseOption(option);
    setShowPauseModal(false);
    alert(`License ${option === "immediate" ? "paused immediately" : "scheduled to pause next month"}! (Demo mode)\n\n${option === "immediate" ? "You will forfeit this month's payment." : "You'll receive full payment for this month, pause starts next month."}`);
  };

  const handleRevokeLicense = (contract) => {
    setShowRevokeModal(false);
    alert(`License revoked! (Demo mode)\n\n30-day notice period has begun.\nYou'll receive final payment of $${contract.creator_earnings} on the notice expiration date.`);
  };

  const handlePauseCampaign = (campaignId) => {
    setActiveCampaigns(activeCampaigns.map(c => 
      c.id === campaignId ? { ...c, status: 'paused' } : c
    ));
    alert("Campaign paused! (Demo mode)");
  };

  const handleRevokeCampaign = (campaignId) => {
    if (confirm("Are you sure you want to revoke this campaign license?")) {
      setActiveCampaigns(activeCampaigns.filter(c => c.id !== campaignId));
      alert("Campaign revoked! (Demo mode)");
    }
  };

  const handleToggleContentType = (type) => {
    const current = creator.content_types || [];
    if (current.includes(type)) {
      setCreator({ ...creator, content_types: current.filter(t => t !== type) });
    } else {
      setCreator({ ...creator, content_types: [...current, type] });
    }
  };

  const handleToggleIndustry = (industry) => {
    const current = creator.industries || [];
    if (current.includes(industry)) {
      setCreator({ ...creator, industries: current.filter(i => i !== industry) });
    } else {
      setCreator({ ...creator, industries: [...current, industry] });
    }
  };

  const handleSaveRules = () => {
    setEditingRules(false);
    alert("Licensing preferences updated! (Demo mode)");
  };

  const handleSaveProfile = () => {
    alert("Profile updated! (Demo mode)");
  };

  const renderDashboard = () => (
    <div className="space-y-6">
      {/* Top Section - Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="p-6 bg-white border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-gray-600">Total Monthly Revenue</p>
            <DollarSign className="w-5 h-5 text-[#32C8D1]" />
          </div>
          <p className="text-4xl font-bold text-gray-900">${totalMonthlyRevenue.toLocaleString()}</p>
          <p className="text-sm text-gray-600 mt-1">From {activeCampaigns.length} active campaigns</p>
        </Card>

        <Card className="p-6 bg-white border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-gray-600">Active Campaigns</p>
            <Target className="w-5 h-5 text-[#32C8D1]" />
          </div>
          <p className="text-4xl font-bold text-gray-900">{activeCampaigns.length}</p>
          <Badge className="mt-2 bg-green-100 text-green-700 border border-green-300">All Running</Badge>
        </Card>

        <Card className="p-6 bg-white border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-gray-600">Pending Approvals</p>
            <AlertCircle className="w-5 h-5 text-yellow-600" />
          </div>
          <p className="text-4xl font-bold text-gray-900">{pendingCount}</p>
          {pendingCount > 0 && (
            <Badge className="mt-2 bg-yellow-100 text-yellow-700 border border-yellow-300">Action Needed</Badge>
          )}
        </Card>

        <Card className="p-6 bg-white border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-gray-600">Annual Run Rate</p>
            <TrendingUp className="w-5 h-5 text-[#32C8D1]" />
          </div>
          <p className="text-4xl font-bold text-gray-900">${annualRunRate.toLocaleString()}</p>
          <p className="text-sm text-gray-600 mt-1">Based on active licenses</p>
        </Card>
      </div>

      {/* Action Cards */}
      <div className="grid md:grid-cols-3 gap-6">
        <Card 
          className="p-6 bg-white border border-gray-200 cursor-pointer hover:shadow-lg transition-all"
          onClick={() => setActiveSection("approvals")}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <CheckSquare className="w-6 h-6 text-yellow-600" />
            </div>
            {pendingCount > 0 && (
              <Badge className="bg-yellow-500 text-white">{pendingCount}</Badge>
            )}
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">Review {pendingCount} Usage Request{pendingCount !== 1 ? 's' : ''}</h3>
          <p className="text-sm text-gray-600">Brands waiting for approval</p>
        </Card>

        <Card 
          className="p-6 bg-white border border-gray-200 cursor-pointer hover:shadow-lg transition-all"
          onClick={() => setActiveSection("voice")}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-cyan-100 rounded-lg flex items-center justify-center">
              <Mic className="w-6 h-6 text-[#32C8D1]" />
            </div>
            <Badge className="bg-[#32C8D1] text-white">{voiceLibrary.length}</Badge>
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">Upload New Voice Tone</h3>
          <p className="text-sm text-gray-600">Expand your voice library</p>
        </Card>

        <Card 
          className="p-6 bg-white border border-gray-200 cursor-pointer hover:shadow-lg transition-all"
          onClick={() => setActiveSection("campaigns")}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <Clock className="w-6 h-6 text-orange-600" />
            </div>
            <Badge className="bg-orange-100 text-orange-700 border border-orange-300">1 Expiring</Badge>
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">Pause/Renew Expiring Campaign</h3>
          <p className="text-sm text-gray-600">Tesla Motors ends Jun 30</p>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card className="p-6 bg-white border border-gray-200">
          <h3 className="text-xl font-bold text-gray-900 mb-6">Revenue Trend (Last 6 Months)</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="revenue" stroke="#32C8D1" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-6 bg-white border border-gray-200">
          <h3 className="text-xl font-bold text-gray-900 mb-6">Earnings by Industry</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={earningsByIndustry}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({name, value}) => `${name}: $${value}`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {earningsByIndustry.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Usage Frequency */}
      <Card className="p-6 bg-white border border-gray-200">
        <h3 className="text-xl font-bold text-gray-900 mb-6">Usage Frequency</h3>
        <div className="space-y-3">
          {activeCampaigns.map((campaign) => (
            <div key={campaign.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <img 
                  src={campaign.brand_logo} 
                  alt={campaign.brand}
                  className="w-10 h-10 rounded-full object-cover"
                />
                <div>
                  <p className="font-semibold text-gray-900">{campaign.brand}</p>
                  <p className="text-xs text-gray-500">{campaign.usage_type}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold text-gray-900">{campaign.impressions_week.toLocaleString()}</p>
                <p className="text-xs text-gray-500">impressions/week</p>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );

  const handleImageSectionUpload = (sectionId) => {
    setSelectedImageSection(sectionId);
    setShowImageUploadModal(true);
    setPreviewImage(null);
  };

  const handleImageFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPreviewImage({
        file,
        url: URL.createObjectURL(file),
        size: file.size,
        resolution: "1920x1920" // Mock resolution
      });
    }
  };

  const confirmImageUpload = () => {
    if (!previewImage || !selectedImageSection) return;
    
    setUploadingToSection(true);
    setTimeout(() => {
      setReferenceImages({
        ...referenceImages,
        [selectedImageSection]: { url: previewImage.url }
      });
      setUploadingToSection(false);
      setShowImageUploadModal(false);
      setSelectedImageSection(null);
      setPreviewImage(null);
      alert("Reference image uploaded! (Demo mode)");
    }, 1000);
  };

  const deleteReferenceImage = (sectionId) => {
    if (confirm("Delete this reference image?")) {
      setReferenceImages({
        ...referenceImages,
        [sectionId]: null
      });
    }
  };

  const getCompleteness = () => {
    const filled = Object.values(referenceImages).filter(img => img !== null).length;
    return { filled, total: IMAGE_SECTIONS.length, percentage: Math.round((filled / IMAGE_SECTIONS.length) * 100) };
  };

  const renderLikeness = () => {
    const completeness = getCompleteness();

    return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">My Likeness</h2>
          <p className="text-gray-600 mt-1">Your complete likeness profile - used by brands to generate content</p>
        </div>
      </div>

      {/* Completeness Card */}
      <Card className="p-6 bg-gradient-to-br from-cyan-50 to-blue-50 border-2 border-[#32C8D1]">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Profile Completeness: {completeness.percentage}%</h3>
            <p className="text-gray-700">You're missing {IMAGE_SECTIONS.length - completeness.filled} sections</p>
          </div>
        </div>
        <Progress value={completeness.percentage} className="h-3 mb-3" />
        <Alert className="bg-white border border-blue-200">
          <AlertCircle className="h-5 w-5 text-blue-600" />
          <AlertDescription className="text-blue-900">
            <strong>Complete profiles earn 15% more.</strong> Brands pay premium rates for creators with full reference libraries.
          </AlertDescription>
        </Alert>
      </Card>

      {/* MY CAMEO Section */}
      <Card className="p-6 bg-white border border-gray-200">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">MY CAMEO</h3>
            <p className="text-gray-600">The video representation of you - brands use this for AI cameos and content generation</p>
          </div>
          {heroMedia && <CheckCircle2 className="w-8 h-8 text-green-600" />}
        </div>

        {heroMedia ? (
          <div className="space-y-4">
            <Card className="p-4 bg-green-50 border border-green-200">
              <div className="grid md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-gray-600 mb-1">Uploaded:</p>
                  <p className="font-bold text-gray-900">Nov 12, 2024</p>
                </div>
                <div>
                  <p className="text-gray-600 mb-1">Duration:</p>
                  <p className="font-bold text-gray-900">45 seconds</p>
                </div>
                <div>
                  <p className="text-gray-600 mb-1">Quality:</p>
                  <p className="font-bold text-gray-900">4K</p>
                </div>
                <div>
                  <p className="text-gray-600 mb-1">Status:</p>
                  <Badge className="bg-green-500 text-white">✓ Verified & Approved</Badge>
                </div>
              </div>
            </Card>

            <div className="relative">
              {heroMedia.type === 'video' ? (
                <video 
                  src={heroMedia.url}
                  controls
                  className="w-full h-96 object-cover border-2 border-gray-200 rounded-lg"
                />
              ) : (
                <img 
                  src={heroMedia.url}
                  alt="Hero media"
                  className="w-full h-96 object-cover border-2 border-gray-200 rounded-lg"
                />
              )}
            </div>

            <Alert className="bg-blue-50 border border-blue-200">
              <AlertCircle className="h-5 w-5 text-blue-600" />
              <AlertDescription className="text-blue-900 text-sm">
                <strong>About Your Cameo:</strong> Brands use this to generate AI cameos of you speaking, reference your voice/expressions, and create photorealistic content featuring you.
              </AlertDescription>
            </Alert>

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1 border-2 border-gray-300">
                <Play className="w-4 h-4 mr-2" />
                Watch Full Cameo
              </Button>
              <Button 
                onClick={() => setShowReuploadCameoModal(true)}
                variant="outline" 
                className="flex-1 border-2 border-[#32C8D1] text-[#32C8D1]"
              >
                <Upload className="w-4 h-4 mr-2" />
                Re-upload New Cameo
              </Button>
              <Button variant="outline" className="border-2 border-gray-300">
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
            </div>
          </div>
        ) : (
          <div>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center hover:border-[#32C8D1] transition-colors mb-4">
              <input
                type="file"
                id="heroUpload"
                accept="video/*"
                onChange={handleHeroUpload}
                disabled={uploading}
                className="hidden"
              />
              <label htmlFor="heroUpload" className="cursor-pointer">
                {uploading ? (
                  <Loader2 className="w-16 h-16 text-gray-400 mx-auto mb-4 animate-spin" />
                ) : (
                  <Video className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                )}
                <p className="text-lg text-gray-700 font-medium mb-2">
                  {uploading ? "Uploading..." : "Upload Your Cameo Video"}
                </p>
                <p className="text-sm text-gray-500">MP4 or MOV, 30-60 seconds recommended</p>
              </label>
            </div>
            <Alert className="bg-amber-50 border border-amber-200">
              <AlertCircle className="h-5 w-5 text-amber-600" />
              <AlertDescription className="text-amber-900 text-sm">
                <strong>Your cameo is required to start earning.</strong> Brands need this video reference to create content featuring you.
              </AlertDescription>
            </Alert>
          </div>
        )}
      </Card>

      {/* REFERENCE IMAGE LIBRARY */}
      <Card className="p-6 bg-white border border-gray-200">
        <div className="mb-6">
          <h3 className="text-2xl font-bold text-gray-900 mb-2">REFERENCE IMAGE LIBRARY</h3>
          <p className="text-gray-600 mb-4">Brands use these to match your appearance across different contexts</p>
          <div className="flex items-center justify-between p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <div>
              <p className="font-bold text-gray-900 text-lg">Completeness: {completeness.filled}/{completeness.total} sections filled</p>
              <p className="text-sm text-gray-600 mt-1">{IMAGE_SECTIONS.length - completeness.filled} sections needed for "Complete Profile"</p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-[#32C8D1]">{completeness.percentage}%</div>
            </div>
          </div>
        </div>

        <Alert className="mb-6 bg-blue-50 border border-blue-200">
          <AlertCircle className="h-5 w-5 text-blue-600" />
          <AlertDescription className="text-blue-900">
            <strong>How This Works:</strong> Upload photos in 15 different categories. Brands use these to generate images of you that look consistent and photorealistic. More variety = better quality content = higher rates.
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          {IMAGE_SECTIONS.map((section, index) => {
            const hasImage = referenceImages[section.id];
            
            return (
              <Card key={section.id} className={`p-4 border-2 ${hasImage ? 'border-green-200 bg-green-50' : 'border-gray-200'}`}>
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-gray-900 text-white rounded-full flex items-center justify-center font-bold">
                    {index + 1}
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-bold text-gray-900 text-lg mb-1">{section.title}</h4>
                        <p className="text-sm text-gray-600 mb-2"><strong>Best For:</strong> {section.bestFor}</p>
                        <Badge className={hasImage ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-700'}>
                          {hasImage ? '✓ UPLOADED' : '⚠️ MISSING'}
                        </Badge>
                      </div>
                      {hasImage && (
                        <img 
                          src={hasImage.url}
                          alt={section.title}
                          className="w-24 h-24 object-cover border-2 border-gray-200 rounded-lg"
                        />
                      )}
                    </div>

                    <p className="text-sm text-gray-700 mb-4">{section.description}</p>

                    <div className="flex gap-2">
                      {hasImage ? (
                        <>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="border-2 border-gray-300"
                            onClick={() => window.open(hasImage.url, '_blank')}
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            View
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="border-2 border-[#32C8D1] text-[#32C8D1]"
                            onClick={() => handleImageSectionUpload(section.id)}
                          >
                            <Upload className="w-4 h-4 mr-2" />
                            Replace
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="border-2 border-red-300 text-red-600"
                            onClick={() => deleteReferenceImage(section.id)}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </Button>
                        </>
                      ) : (
                        <Button 
                          onClick={() => handleImageSectionUpload(section.id)}
                          className="bg-[#32C8D1] hover:bg-[#2AB8C1] text-white"
                        >
                          <Upload className="w-4 h-4 mr-2" />
                          Upload Image
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Quality Standards */}
        <Alert className="mt-6 bg-amber-50 border border-amber-200">
          <AlertCircle className="h-5 w-5 text-amber-600" />
          <AlertDescription className="text-amber-900">
            <strong>Quality Standards:</strong> High-resolution (minimum 1080x1080), clear lighting, face/body clearly visible, no heavy filters, professional quality preferred.
          </AlertDescription>
        </Alert>
      </Card>

      {/* Content Guidelines */}
      <Card className="p-6 bg-white border border-gray-200">
        <h3 className="text-2xl font-bold text-gray-900 mb-4">USAGE GUIDELINES</h3>
        <p className="text-gray-600 mb-6">Tell brands what you're comfortable with</p>

        <div className="space-y-6">
          <div>
            <Label className="text-lg font-semibold text-gray-900 block mb-3">Comfortable With:</Label>
            <div className="flex flex-wrap gap-2">
              {contentPreferences.comfortable.map((item) => (
                <Badge key={item} className="bg-green-100 text-green-700 border border-green-300 px-3 py-2">
                  ✓ {item}
                </Badge>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-lg font-semibold text-gray-900 block mb-3">Not Comfortable With:</Label>
            <div className="flex flex-wrap gap-2">
              {contentPreferences.not_comfortable.map((item) => (
                <Badge key={item} className="bg-red-100 text-red-700 border border-red-300 px-3 py-2">
                  ✗ {item}
                </Badge>
              ))}
            </div>
          </div>

          <Button variant="outline" className="w-full border-2 border-gray-300">
            <Settings className="w-4 h-4 mr-2" />
            Edit Preferences
          </Button>
        </div>
      </Card>

      {/* Verification Status */}
      <Card className="p-6 bg-white border border-gray-200">
        <h3 className="text-xl font-bold text-gray-900 mb-4">Verification & Status</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3">
              {creator?.kyc_status === 'approved' && <CheckCircle2 className="w-5 h-5 text-green-600" />}
              {creator?.kyc_status === 'pending' && <Clock className="w-5 h-5 text-yellow-600" />}
              {creator?.kyc_status === 'rejected' && <XCircle className="w-5 h-5 text-red-600" />}
              {!creator?.kyc_status && <AlertCircle className="w-5 h-5 text-gray-500" />}
              <span className="font-medium text-gray-900">Identity Verification</span>
            </div>
            <Badge className={
              creator?.kyc_status === 'approved' ? 'bg-green-100 text-green-700' :
              creator?.kyc_status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
              creator?.kyc_status === 'rejected' ? 'bg-red-100 text-red-700' :
              'bg-gray-100 text-gray-700'
            }>
              {creator?.kyc_status ? (creator.kyc_status.charAt(0).toUpperCase() + creator.kyc_status.slice(1)) : 'Not started'}
            </Badge>
          </div>
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5 text-[#32C8D1]" />
              <span className="font-medium text-gray-900">Likeness Rights</span>
            </div>
            <Badge className="bg-green-100 text-green-700">Confirmed</Badge>
          </div>
          <div className="flex gap-2 pt-2">
            <Button onClick={startVerificationFromDashboard} disabled={kycLoading} variant="outline" className="border-2 border-gray-300">
              {kycLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Shield className="w-4 h-4 mr-2" />}
              Complete Verification
            </Button>
            <Button onClick={refreshVerificationFromDashboard} disabled={kycLoading} variant="outline" className="border-2 border-gray-300">
              {kycLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
              Refresh Status
            </Button>
          </div>
        </div>
      </Card>
    </div>
    );
  };

  const renderVoice = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Voice & Recordings</h2>
          <p className="text-gray-600 mt-1">Build your voice library for different emotions and tones</p>
        </div>
        <Badge className="bg-purple-100 text-purple-700 border border-purple-300 px-4 py-2 text-lg">
          {voiceLibrary.length} Voice{voiceLibrary.length !== 1 ? 's' : ''}
        </Badge>
      </div>

      {/* Voice Overview Card */}
      {voiceLibrary.length > 0 && (
        <Card className="p-6 bg-white border border-gray-200">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Voice Profile Overview</h3>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-sm text-gray-600 mb-1">Total Recordings</p>
              <p className="text-3xl font-bold text-gray-900">{voiceLibrary.length}</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-sm text-gray-600 mb-1">ElevenLabs Profiles</p>
              <p className="text-3xl font-bold text-gray-900">
                {voiceLibrary.filter(v => v.voiceProfileCreated).length}
              </p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-sm text-gray-600 mb-1">Total Usage</p>
              <p className="text-3xl font-bold text-gray-900">
                {voiceLibrary.reduce((sum, v) => sum + (v.usageCount || 0), 0)}
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Record New Voice Sample */}
      <Card className="p-6 bg-white border border-gray-200">
        <h3 className="text-2xl font-bold text-gray-900 mb-4">Record New Voice Sample</h3>
        <p className="text-gray-600 mb-6">
          Record samples with different emotions to create a versatile voice profile
        </p>

        <div className="grid md:grid-cols-3 gap-4">
          {Object.keys(VOICE_SCRIPTS).map((emotion) => {
            const hasRecording = voiceLibrary.find(r => r.emotion === emotion);
            return (
              <Card
                key={emotion}
                className={`p-6 border-2 cursor-pointer transition-all hover:shadow-lg ${
                  hasRecording ? 'border-green-300 bg-green-50' : 'border-gray-200 hover:border-[#32C8D1]'
                }`}
                onClick={() => handleEmotionSelect(emotion)}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                    hasRecording ? 'bg-green-500' : 'bg-[#32C8D1]'
                  }`}>
                    <Mic className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 capitalize text-lg">{emotion}</h4>
                    <p className="text-xs text-gray-500">~60 seconds</p>
                  </div>
                </div>
                {hasRecording && (
                  <Badge className="bg-green-500 text-white">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    Recorded
                  </Badge>
                )}
              </Card>
            );
          })}
        </div>
      </Card>

      {/* Voice Library */}
      {voiceLibrary.length > 0 && (
        <Card className="p-6 bg-white border border-gray-200">
          <h3 className="text-2xl font-bold text-gray-900 mb-6">Voice Library</h3>
          <div className="space-y-4">
            {voiceLibrary.map((recording) => (
              <div
                key={recording.id}
                className="p-6 bg-gray-50 border-2 border-gray-200 rounded-lg"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div className={`w-14 h-14 rounded-full flex items-center justify-center ${
                      recording.accessible ? 'bg-green-500' : 'bg-gray-400'
                    }`}>
                      <Mic className="w-7 h-7 text-white" />
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 capitalize text-xl">{recording.emotion}</h4>
                      <p className="text-sm text-gray-600">
                        {new Date(recording.date).toLocaleDateString()} • {recording.duration}s • Used {recording.usageCount || 0} times
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {recording.voiceProfileCreated && (
                      <Badge className="bg-purple-100 text-purple-700 border border-purple-300">
                        ElevenLabs Ready
                      </Badge>
                    )}
                    <Button
                      onClick={() => toggleRecordingAccess(recording.id)}
                      variant="outline"
                      size="sm"
                    >
                      {recording.accessible ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                    </Button>
                    <Button
                      onClick={() => handleEmotionSelect(recording.emotion)}
                      variant="outline"
                      size="sm"
                    >
                      Re-record
                    </Button>
                    <Button
                      onClick={() => deleteRecording(recording.id)}
                      variant="outline"
                      size="sm"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <audio controls src={recording.url} className="w-full mb-4" />
                
                {!recording.voiceProfileCreated && recording.accessible && (
                  <Button
                    onClick={() => createVoiceProfile(recording)}
                    disabled={generatingVoice}
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                  >
                    {generatingVoice ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Creating Voice Profile...
                      </>
                    ) : (
                      <>
                        <PlayCircle className="w-4 h-4 mr-2" />
                        Create Voice Profile with ElevenLabs
                      </>
                    )}
                  </Button>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Voice Training Tips */}
      <Alert className="bg-purple-50 border border-purple-200">
        <Volume2 className="h-5 w-5 text-purple-600" />
        <AlertDescription className="text-purple-900">
          <strong>Voice Training Tips:</strong> Speak clearly, avoid background noise, record in a quiet room, and maintain consistent volume throughout the recording.
        </AlertDescription>
      </Alert>
    </div>
  );

  const renderCampaigns = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Active Campaigns</h2>
          <p className="text-gray-600 mt-1">Track and manage your licensing agreements</p>
        </div>
        <Badge className="bg-green-100 text-green-700 border border-green-300 px-4 py-2 text-lg">
          {activeCampaigns.length} Active
        </Badge>
      </div>

      {/* Campaigns Table */}
      <Card className="p-6 bg-white border border-gray-200">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-gray-300">
                <th className="text-left py-4 px-4 font-bold text-gray-900">Brand</th>
                <th className="text-left py-4 px-4 font-bold text-gray-900">Usage Type</th>
                <th className="text-left py-4 px-4 font-bold text-gray-900">Rate</th>
                <th className="text-left py-4 px-4 font-bold text-gray-900">Active Until</th>
                <th className="text-left py-4 px-4 font-bold text-gray-900">Status</th>
                <th className="text-left py-4 px-4 font-bold text-gray-900">This Month</th>
                <th className="text-left py-4 px-4 font-bold text-gray-900">Actions</th>
              </tr>
            </thead>
            <tbody>
              {activeCampaigns.map((campaign) => (
                <tr key={campaign.id} className="border-b border-gray-200 hover:bg-gray-50">
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-3">
                      <img 
                        src={campaign.brand_logo} 
                        alt={campaign.brand}
                        className="w-10 h-10 rounded-full object-cover border border-gray-200"
                      />
                      <div>
                        <p className="font-semibold text-gray-900">{campaign.brand}</p>
                        <p className="text-xs text-gray-500">{campaign.impressions_week.toLocaleString()} impressions/week</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-4 text-gray-700">{campaign.usage_type}</td>
                  <td className="py-4 px-4 font-bold text-gray-900">${campaign.rate}/mo</td>
                  <td className="py-4 px-4 text-gray-700">
                    {new Date(campaign.active_until).toLocaleDateString()}
                    {campaign.auto_renewal && (
                      <Badge className="ml-2 bg-blue-100 text-blue-700 border border-blue-300 text-xs">Auto-Renew</Badge>
                    )}
                  </td>
                  <td className="py-4 px-4">
                    <Badge className={`${
                      campaign.status === 'active' ? 'bg-green-100 text-green-700 border border-green-300' :
                      campaign.status === 'expiring_soon' ? 'bg-orange-100 text-orange-700 border border-orange-300' :
                      'bg-gray-100 text-gray-700 border border-gray-300'
                    }`}>
                      {campaign.status === 'active' ? 'Active' : 
                       campaign.status === 'expiring_soon' ? 'Expiring Soon' : 
                       campaign.status}
                    </Badge>
                  </td>
                  <td className="py-4 px-4 font-bold text-green-600">${campaign.earnings_this_month}</td>
                  <td className="py-4 px-4">
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handlePauseCampaign(campaign.id)}
                        variant="outline"
                        size="sm"
                      >
                        <Pause className="w-4 h-4" />
                      </Button>
                      <Button
                        onClick={() => handleRevokeCampaign(campaign.id)}
                        variant="outline"
                        size="sm"
                        className="text-red-600 hover:bg-red-50"
                      >
                        Revoke
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Campaign Details Cards */}
      <div className="grid md:grid-cols-2 gap-6">
        {activeCampaigns.slice(0, 2).map((campaign) => (
          <Card key={campaign.id} className="p-6 bg-white border border-gray-200">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <img 
                  src={campaign.brand_logo} 
                  alt={campaign.brand}
                  className="w-12 h-12 rounded-lg object-cover border-2 border-gray-200"
                />
                <div>
                  <h3 className="font-bold text-gray-900 text-lg">{campaign.brand}</h3>
                  <p className="text-sm text-gray-600">{campaign.usage_type}</p>
                </div>
              </div>
              <Badge className={campaign.status === 'active' ? 'bg-green-100 text-green-700 border border-green-300' : 'bg-orange-100 text-orange-700 border border-orange-300'}>
                {campaign.status === 'active' ? 'Active' : 'Expiring Soon'}
              </Badge>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Monthly Rate:</span>
                <span className="font-bold text-gray-900">${campaign.rate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Active Until:</span>
                <span className="font-medium text-gray-900">{new Date(campaign.active_until).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Regions:</span>
                <span className="font-medium text-gray-900">{campaign.regions.join(', ')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Weekly Impressions:</span>
                <span className="font-medium text-gray-900">{campaign.impressions_week.toLocaleString()}</span>
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <Button variant="outline" className="flex-1">
                <Eye className="w-4 h-4 mr-2" />
                View Details
              </Button>
              <Button 
                variant="outline" 
                className="flex-1 text-red-600 hover:bg-red-50"
                onClick={() => handleRevokeCampaign(campaign.id)}
              >
                Revoke
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {/* Rights Expiration Calendar */}
      <Alert className="bg-blue-50 border border-blue-200">
        <Calendar className="h-5 w-5 text-blue-600" />
        <AlertDescription className="text-blue-900">
          <strong>Your consent required for all uses.</strong> {activeCampaigns.length} active campaigns, all time-limited, all approved by you. You can pause/revoke anytime.
        </AlertDescription>
      </Alert>
    </div>
  );

  const renderApprovals = () => {
    if (showApprovalContract) {
      const approval = pendingApprovals.find(a => a.id === showApprovalContract);
      if (!approval) return null;

      return (
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => setShowApprovalContract(null)} className="border-2 border-gray-300">
              ← Back to Queue
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{approval.brand} - Contract Review</h1>
              <p className="text-gray-600">Review terms before approving</p>
            </div>
          </div>

          {/* What You're Earning */}
          <Card className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-300">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">What You'll Earn</h3>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <p className="text-gray-700 mb-2">Your Monthly Payment:</p>
                <p className="text-5xl font-bold text-green-600">${approval.proposed_rate}</p>
              </div>
              <div>
                <p className="text-gray-700 mb-2">If you keep this for {approval.term_length}:</p>
                <p className="text-3xl font-bold text-gray-900">
                  ${approval.term_length === "Perpetual" ? "Ongoing" : approval.proposed_rate * parseInt(approval.term_length)}
                </p>
                <p className="text-sm text-gray-600 mt-1">Total estimated earnings</p>
              </div>
            </div>
          </Card>

          {/* Contract Terms */}
          <Card className="p-6 bg-white border border-gray-200">
            <h3 className="text-xl font-bold text-gray-900 mb-6">Contract Terms</h3>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-sm text-gray-600 mb-1">Duration:</p>
                  <p className="font-bold text-gray-900 text-lg">{approval.term_length}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-sm text-gray-600 mb-1">Territory:</p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {approval.regions.map((region) => (
                      <Badge key={region} className="bg-blue-100 text-blue-700">{region}</Badge>
                    ))}
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-sm text-gray-600 mb-1">Usage Type:</p>
                  <p className="font-bold text-gray-900 text-lg">{approval.usage_type}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-sm text-gray-600 mb-1">Industries:</p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {approval.industries.map((industry) => (
                      <Badge key={industry} className="bg-purple-100 text-purple-700">{industry}</Badge>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Your Rights */}
          <Card className="p-6 bg-blue-50 border-2 border-blue-300">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Your Rights & Protections</h3>
            <div className="space-y-3 text-gray-900">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <p>You can pause this license anytime (temporarily stop usage)</p>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <p>You can revoke with 30 days notice (permanently end)</p>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <p>License expires on a specific date (not forever)</p>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <p>Payment protected in escrow until brand approves deliverables</p>
              </div>
            </div>
          </Card>

          {approval.perpetual && (
            <Alert className="bg-red-50 border-2 border-red-400">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <AlertDescription className="text-red-900">
                <strong>⚠️ Perpetual Use Warning:</strong> This brand wants to use your likeness forever. You should negotiate for time-limited terms (6 months, 1 year) instead.
              </AlertDescription>
            </Alert>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              onClick={() => handleDecline(approval.id)}
              variant="outline"
              className="flex-1 h-14 border-2 border-gray-300"
            >
              <XCircle className="w-5 h-5 mr-2" />
              Decline
            </Button>
            <Button
              variant="outline"
              className="flex-1 h-14 border-2 border-[#32C8D1] text-[#32C8D1]"
            >
              <MessageSquare className="w-5 h-5 mr-2" />
              Counter Offer
            </Button>
            <Button
              onClick={() => handleApprove(approval.id)}
              className="flex-1 h-14 bg-green-600 hover:bg-green-700 text-white"
            >
              <CheckCircle2 className="w-5 h-5 mr-2" />
              Accept & Sign
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">Approval Queue</h2>
            <p className="text-gray-600 mt-1">Review and approve licensing requests</p>
          </div>
          <Badge className={`${pendingCount > 0 ? 'bg-yellow-100 text-yellow-700 border border-yellow-300' : 'bg-gray-100 text-gray-700 border border-gray-300'} px-4 py-2 text-lg`}>
            {pendingCount} Pending
          </Badge>
        </div>

        {pendingApprovals.length === 0 ? (
          <Card className="p-12 bg-gray-50 border border-gray-200 text-center">
            <CheckCircle2 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">No Pending Approvals</h3>
            <p className="text-gray-600">You're all caught up! New requests will appear here.</p>
          </Card>
        ) : (
          <div className="space-y-6">
            {pendingApprovals.map((approval) => (
              <Card key={approval.id} className={`p-6 bg-white border-2 ${approval.perpetual ? 'border-red-400' : 'border-blue-400'}`}>
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <img 
                      src={approval.brand_logo} 
                      alt={approval.brand}
                      className="w-16 h-16 rounded-lg object-cover border-2 border-gray-200"
                    />
                    <div>
                      <h3 className="font-bold text-gray-900 text-2xl">{approval.brand}</h3>
                      <p className="text-gray-600">{approval.usage_type}</p>
                      <p className="text-xs text-gray-500 mt-1">Requested {new Date(approval.requested_date).toLocaleDateString()}</p>
                    </div>
                  </div>
                  {approval.perpetual && (
                    <Badge className="bg-red-500 text-white">
                      <AlertCircle className="w-4 h-4 mr-1" />
                      Perpetual Request
                    </Badge>
                  )}
                </div>

                <div className="grid md:grid-cols-2 gap-6 mb-6">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="text-sm text-gray-600">Proposed Rate:</span>
                      <span className="font-bold text-gray-900 text-lg">${approval.proposed_rate}/month</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="text-sm text-gray-600">Term Length:</span>
                      <span className="font-bold text-gray-900">{approval.term_length}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="text-sm text-gray-600">Estimated Monthly:</span>
                      <span className="font-bold text-green-600 text-lg">${approval.proposed_rate}</span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-600 mb-2">Regions:</p>
                      <div className="flex flex-wrap gap-2">
                        {approval.regions.map((region) => (
                          <Badge key={region} className="bg-blue-100 text-blue-700 border border-blue-300">{region}</Badge>
                        ))}
                      </div>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-600 mb-2">Industries:</p>
                      <div className="flex flex-wrap gap-2">
                        {approval.industries.map((industry) => (
                          <Badge key={industry} className="bg-purple-100 text-purple-700 border border-purple-300">{industry}</Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {approval.perpetual && (
                  <Alert className="mb-6 bg-red-50 border-2 border-red-300">
                    <AlertCircle className="h-5 w-5 text-red-600" />
                    <AlertDescription className="text-red-900">
                      <strong>Warning:</strong> This is a perpetual-use request. You would give up long-term control of your likeness for this campaign. Consider negotiating for time-limited terms instead.
                    </AlertDescription>
                  </Alert>
                )}

                <div className="flex gap-3">
                  <Button
                    onClick={() => setShowApprovalContract(approval.id)}
                    variant="outline"
                    className="flex-1 h-12 border-2 border-blue-300 text-blue-600"
                  >
                    <FileText className="w-5 h-5 mr-2" />
                    View Contract
                  </Button>
                  <Button
                    onClick={() => handleDecline(approval.id)}
                    variant="outline"
                    className="h-12 border-2 border-gray-300"
                  >
                    <XCircle className="w-5 h-5 mr-2" />
                    Decline
                  </Button>
                  <Button
                    variant="outline"
                    className="h-12 border-2 border-[#32C8D1] text-[#32C8D1]"
                  >
                    Counter Offer
                  </Button>
                  <Button
                    onClick={() => handleApprove(approval.id)}
                    className="h-12 bg-green-600 hover:bg-green-700 text-white px-8"
                  >
                    <CheckCircle2 className="w-5 h-5 mr-2" />
                    Accept & Sign
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderContracts = () => {
    if (showContractDetails && selectedContract) {
      const contract = contracts.find(c => c.id === selectedContract);
      if (!contract) return null;

      const currentMonth = new Date().toLocaleString('default', { month: 'long' });
      const proratedAmount = Math.round(contract.creator_earnings * (new Date().getDate() / 30));

      return (
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => { setShowContractDetails(false); setSelectedContract(null); }} className="border-2 border-gray-300">
              ← Back to Contracts
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{contract.brand}</h1>
              <p className="text-gray-600">{contract.project_name}</p>
            </div>
          </div>

          {/* What You're Earning */}
          <Card className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-300">
            <h3 className="text-2xl font-bold text-gray-900 mb-6">What You're Earning</h3>
            <div className="grid md:grid-cols-3 gap-6">
              <div>
                <p className="text-gray-700 mb-2">Monthly Payment:</p>
                <p className="text-4xl font-bold text-green-600">${contract.creator_earnings}</p>
              </div>
              <div>
                <p className="text-gray-700 mb-2">Total Earned So Far:</p>
                <p className="text-3xl font-bold text-gray-900">${contract.earnings_to_date.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-gray-700 mb-2">Payment Status:</p>
                <Badge className="bg-green-500 text-white text-lg">✓ Paid</Badge>
                <p className="text-sm text-gray-600 mt-2">${contract.amount_paid} received</p>
              </div>
            </div>
          </Card>

          {/* Timeline */}
          <Card className="p-6 bg-white border border-gray-200">
            <h3 className="text-xl font-bold text-gray-900 mb-6">Your Timeline</h3>
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className="text-center flex-1">
                  <p className="text-sm text-gray-600 mb-1">Started</p>
                  <p className="font-bold text-gray-900">{new Date(contract.effective_date).toLocaleDateString()}</p>
                </div>
                <div className="text-center flex-1">
                  <p className="text-sm text-gray-600 mb-1">Today</p>
                  <div className="w-4 h-4 bg-[#32C8D1] rounded-full mx-auto"></div>
                </div>
                <div className="text-center flex-1">
                  <p className="text-sm text-gray-600 mb-1">Expires</p>
                  <p className="font-bold text-gray-900">{new Date(contract.expiration_date).toLocaleDateString()}</p>
                </div>
              </div>
              <div className="h-2 bg-gray-200 rounded-full relative overflow-hidden">
                <div 
                  className="h-full bg-[#32C8D1] rounded-full"
                  style={{ width: '45%' }}
                ></div>
              </div>
              <p className="text-center text-sm text-gray-600 mt-3">
                {contract.days_remaining} days remaining
              </p>
            </div>
            {contract.auto_renew && (
              <Alert className="mt-4 bg-blue-50 border border-blue-200">
                <AlertCircle className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-900 text-sm">
                  <strong>Auto-Renewal Enabled:</strong> After expiration, you can decide whether to renew on new terms.
                </AlertDescription>
              </Alert>
            )}
          </Card>

          {/* How Your Likeness Is Being Used */}
          <Card className="p-6 bg-white border border-gray-200">
            <h3 className="text-xl font-bold text-gray-900 mb-6">How Your Likeness Is Being Used</h3>
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-sm font-semibold text-gray-700 mb-2">What They're Using:</p>
                <p className="text-gray-900">{contract.deliverables}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-sm font-semibold text-gray-700 mb-2">Where They Can Use It:</p>
                <p className="text-gray-900 mb-2"><strong>Territory:</strong> {contract.territory}</p>
                <p className="text-gray-900"><strong>Channels:</strong> {contract.channels.join(", ")}</p>
              </div>
              <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                <p className="text-sm font-semibold text-red-700 mb-2">What They CAN'T Do:</p>
                <p className="text-red-900">{contract.prohibited_uses}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-sm font-semibold text-gray-700 mb-2">Revisions:</p>
                <p className="text-gray-900">{contract.revisions} rounds included</p>
              </div>
            </div>
          </Card>

          {/* Actions */}
          <Card className="p-6 bg-white border border-gray-200">
            <h3 className="text-xl font-bold text-gray-900 mb-6">Manage This License</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <Button
                onClick={() => { setShowPauseModal(true); }}
                variant="outline"
                className="h-12 border-2 border-amber-300 text-amber-700 hover:bg-amber-50"
              >
                <Pause className="w-5 h-5 mr-2" />
                Pause License
              </Button>
              <Button
                onClick={() => { setShowRevokeModal(true); }}
                variant="outline"
                className="h-12 border-2 border-red-300 text-red-600 hover:bg-red-50"
              >
                <XCircle className="w-5 h-5 mr-2" />
                Revoke (30-day notice)
              </Button>
              <Button
                variant="outline"
                className="h-12 border-2 border-blue-300 text-blue-600 hover:bg-blue-50"
              >
                <MessageSquare className="w-5 h-5 mr-2" />
                Message Brand
              </Button>
              <Button
                variant="outline"
                className="h-12 border-2 border-gray-300"
              >
                <FileText className="w-5 h-5 mr-2" />
                View Full Legal Contract
              </Button>
            </div>
          </Card>
        </div>
      );
    }

    const activeContracts = contracts.filter(c => c.status === "active" || c.status === "expiring_soon");
    const expiredContracts = contracts.filter(c => c.status === "expired");

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">Licenses & Contracts</h2>
            <p className="text-gray-600 mt-1">Track all your licensing deals and earnings</p>
          </div>
        </div>

        {/* Contract Tabs */}
        <div className="flex gap-2 border-b border-gray-200">
          <button
            onClick={() => setContractsTab("active")}
            className={`px-6 py-3 font-semibold border-b-2 transition-colors ${
              contractsTab === "active"
                ? "border-[#32C8D1] text-[#32C8D1]"
                : "border-transparent text-gray-600 hover:text-gray-900"
            }`}
          >
            Active ({activeContracts.length})
          </button>
          <button
            onClick={() => setContractsTab("expired")}
            className={`px-6 py-3 font-semibold border-b-2 transition-colors ${
              contractsTab === "expired"
                ? "border-[#32C8D1] text-[#32C8D1]"
                : "border-transparent text-gray-600 hover:text-gray-900"
            }`}
          >
            Expired ({expiredContracts.length})
          </button>
        </div>

        {/* Active Contracts */}
        {contractsTab === "active" && (
          <div className="space-y-4">
            {activeContracts.map((contract) => (
              <Card key={contract.id} className={`p-6 bg-white border-2 ${
                contract.status === "expiring_soon" ? "border-orange-300" : "border-gray-200"
              }`}>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <img 
                      src={contract.brand_logo}
                      alt={contract.brand}
                      className="w-14 h-14 rounded-lg object-cover border-2 border-gray-200"
                    />
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">{contract.brand}</h3>
                      <p className="text-gray-600">{contract.project_name}</p>
                    </div>
                  </div>
                  <Badge className={
                    contract.status === "active" ? "bg-green-100 text-green-700 border border-green-300" :
                    "bg-orange-100 text-orange-700 border border-orange-300"
                  }>
                    {contract.status === "active" ? "✓ Active & Earning" : "⏳ Expiring Soon"}
                  </Badge>
                </div>

                <div className="grid md:grid-cols-3 gap-4 mb-4">
                  <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                    <p className="text-sm text-gray-600 mb-1">Your Monthly Fee:</p>
                    <p className="text-2xl font-bold text-green-600">${contract.creator_earnings}</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <p className="text-sm text-gray-600 mb-1">Earned to Date:</p>
                    <p className="text-2xl font-bold text-gray-900">${contract.earnings_to_date.toLocaleString()}</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <p className="text-sm text-gray-600 mb-1">Days Remaining:</p>
                    <p className="text-2xl font-bold text-gray-900">{contract.days_remaining}</p>
                  </div>
                </div>

                {contract.status === "expiring_soon" && (
                  <Alert className="mb-4 bg-orange-50 border-2 border-orange-300">
                    <Clock className="h-5 w-5 text-orange-600" />
                    <AlertDescription className="text-orange-900">
                      <strong>Expiring in {contract.days_remaining} days!</strong> Would you like to renew this license?
                    </AlertDescription>
                  </Alert>
                )}

                <div className="flex gap-2">
                  <Button
                    onClick={() => { setSelectedContract(contract.id); setShowContractDetails(true); }}
                    className="flex-1 bg-[#32C8D1] hover:bg-[#2AB8C1] text-white"
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    View Details
                  </Button>
                  {contract.status === "expiring_soon" && (
                    <Button className="bg-green-600 hover:bg-green-700 text-white">
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Renew
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Expired Contracts */}
        {contractsTab === "expired" && (
          <Card className="p-12 bg-gray-50 border border-gray-200 text-center">
            <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">No Expired Contracts</h3>
            <p className="text-gray-600">Completed contracts will appear here</p>
          </Card>
        )}
      </div>
    );
  };

  const renderEarnings = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Earnings Dashboard</h2>
          <p className="text-gray-600 mt-1">Track your revenue and payments</p>
        </div>
      </div>

      {/* Key Earnings Metrics */}
      <div className="grid md:grid-cols-4 gap-6">
        <Card className="p-6 bg-white border border-gray-200">
          <p className="text-sm text-gray-600 mb-2">Total Earned YTD</p>
          <p className="text-3xl font-bold text-gray-900">$14,700</p>
          <p className="text-sm text-green-600 mt-1">+156% vs last year</p>
        </Card>

        <Card className="p-6 bg-white border border-gray-200">
          <p className="text-sm text-gray-600 mb-2">This Month's Recurring</p>
          <p className="text-3xl font-bold text-gray-900">${totalMonthlyRevenue.toLocaleString()}</p>
          <p className="text-sm text-gray-600 mt-1">From {activeCampaigns.length} campaigns</p>
        </Card>

        <Card className="p-6 bg-white border border-gray-200">
          <p className="text-sm text-gray-600 mb-2">Projected Next Month</p>
          <p className="text-3xl font-bold text-gray-900">${totalMonthlyRevenue.toLocaleString()}</p>
          <Badge className="mt-2 bg-blue-100 text-blue-700 border border-blue-300">Same as current</Badge>
        </Card>

        <Card className="p-6 bg-white border border-gray-200">
          <p className="text-sm text-gray-600 mb-2">Next Payment</p>
          <p className="text-2xl font-bold text-gray-900">Dec 1, 2025</p>
          <p className="text-sm text-gray-600 mt-1">${totalMonthlyRevenue} pending</p>
        </Card>
      </div>

      {/* Earnings Comparison */}
      <Card className="p-6 bg-gray-100 border border-gray-300">
        <h3 className="text-xl font-bold text-gray-900 mb-4">Comparison Widget</h3>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="p-4 bg-white rounded-lg border border-gray-200">
            <p className="text-gray-600 mb-2">Traditional Model:</p>
            <p className="text-3xl font-bold text-gray-900">$500</p>
            <p className="text-sm text-gray-600">One-time payment</p>
          </div>
          <div className="p-4 bg-white rounded-lg border border-gray-200">
            <p className="text-gray-600 mb-2">Likelee Model:</p>
            <p className="text-3xl font-bold text-[#32C8D1]">${totalMonthlyRevenue}/month</p>
            <p className="text-sm text-gray-600">6 months = ${totalMonthlyRevenue * 6}</p>
          </div>
        </div>
      </Card>

      {/* Revenue by Campaign */}
      <Card className="p-6 bg-white border border-gray-200">
        <h3 className="text-xl font-bold text-gray-900 mb-6">Earnings by Campaign</h3>
        <div className="space-y-3">
          {activeCampaigns.map((campaign) => (
            <div key={campaign.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex items-center gap-3">
                <img 
                  src={campaign.brand_logo} 
                  alt={campaign.brand}
                  className="w-10 h-10 rounded-full object-cover"
                />
                <div>
                  <p className="font-semibold text-gray-900">{campaign.brand}</p>
                  <p className="text-xs text-gray-500">{campaign.usage_type}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold text-gray-900">${campaign.earnings_this_month}</p>
                <p className="text-xs text-gray-500">this month</p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Payment History */}
      <Card className="p-6 bg-white border border-gray-200">
        <h3 className="text-xl font-bold text-gray-900 mb-6">Payment History</h3>
        <div className="space-y-3">
          {[
            { date: "2025-11-01", amount: 2450, status: "paid", transaction: "TXN_112025" },
            { date: "2025-10-01", amount: 2200, status: "paid", transaction: "TXN_102025" },
            { date: "2025-09-01", amount: 1750, status: "paid", transaction: "TXN_092025" }
          ].map((payment, index) => (
            <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div>
                <p className="font-semibold text-gray-900">{new Date(payment.date).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
                <p className="text-xs text-gray-500">{payment.transaction}</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-green-600">${payment.amount.toLocaleString()}</p>
                <Badge className="bg-green-100 text-green-700 border border-green-300 text-xs">Paid</Badge>
              </div>
            </div>
          ))}
        </div>
        <Button variant="outline" className="w-full mt-4 border-2 border-gray-300">
          Download Tax Summary (1099)
        </Button>
      </Card>
    </div>
  );

  const renderSettings = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Settings</h2>
          <p className="text-gray-600 mt-1">Manage your profile and preferences</p>
        </div>
      </div>

      {/* Settings Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setSettingsTab("profile")}
          className={`px-6 py-3 font-semibold border-b-2 transition-colors ${
            settingsTab === "profile"
              ? "border-[#32C8D1] text-[#32C8D1]"
              : "border-transparent text-gray-600 hover:text-gray-900"
          }`}
        >
          Profile Settings
        </button>
        <button
          onClick={() => setSettingsTab("rules")}
          className={`px-6 py-3 font-semibold border-b-2 transition-colors ${
            settingsTab === "rules"
              ? "border-[#32C8D1] text-[#32C8D1]"
              : "border-transparent text-gray-600 hover:text-gray-900"
          }`}
        >
          My Rules
        </button>
      </div>

      {/* Profile Settings Tab */}
      {settingsTab === "profile" && (
        <div className="space-y-6">
          {/* Profile Photo */}
          <Card className="p-6 bg-white border border-gray-200">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Profile Photo</h3>
            <div className="flex items-center gap-6">
              <div className="relative">
                <img 
                  src={creator.profile_photo}
                  alt={creator.name}
                  className={`w-32 h-32 rounded-full object-cover border-4 ${creator?.kyc_status === 'approved' ? 'border-red-500' : 'border-[#32C8D1]'}`}
                />
                <label className="absolute bottom-0 right-0 bg-white rounded-full p-2 border-2 border-gray-300 cursor-pointer hover:bg-gray-50">
                  <Edit className="w-4 h-4 text-gray-600" />
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handlePhotoUpload}
                    disabled={uploadingPhoto}
                  />
                </label>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-2">Upload a professional headshot</p>
                <p className="text-xs text-gray-500">JPG or PNG, max 5MB</p>
              </div>
            </div>
          </Card>

          {/* Basic Information */}
          <Card className="p-6 bg-white border border-gray-200">
            <h3 className="text-xl font-bold text-gray-900 mb-6">Basic Information</h3>
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">Name</Label>
                <Input
                  value={creator.name}
                  onChange={(e) => setCreator({...creator, name: e.target.value})}
                  className="border-2 border-gray-300"
                />
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">Email</Label>
                <Input
                  value={creator.email}
                  disabled
                  className="border-2 border-gray-200 bg-gray-50"
                />
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">Location</Label>
                <Input
                  value={creator.location}
                  onChange={(e) => setCreator({...creator, location: e.target.value})}
                  className="border-2 border-gray-300"
                  placeholder="City, State"
                />
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">Bio</Label>
                <Textarea
                  value={creator.bio}
                  onChange={(e) => setCreator({...creator, bio: e.target.value})}
                  className="border-2 border-gray-300 min-h-32"
                  placeholder="Tell us about yourself..."
                />
              </div>

              <Button
                onClick={handleSaveProfile}
                className="w-full bg-[#32C8D1] hover:bg-[#2AB8C1] text-white"
              >
                Save Profile
              </Button>
            </div>
          </Card>

          {/* Social Media Links */}
          <Card className="p-6 bg-white border border-gray-200">
            <h3 className="text-xl font-bold text-gray-900 mb-6">Social Media</h3>
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">
                  <Instagram className="w-4 h-4 inline mr-2" />
                  Instagram Handle
                </Label>
                <Input
                  value={creator.instagram_handle || ""}
                  onChange={(e) => setCreator({...creator, instagram_handle: e.target.value})}
                  className="border-2 border-gray-300"
                  placeholder="@yourhandle"
                />
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">
                  <Video className="w-4 h-4 inline mr-2" />
                  TikTok Handle
                </Label>
                <Input
                  value={creator.tiktok_handle || ""}
                  onChange={(e) => setCreator({...creator, tiktok_handle: e.target.value})}
                  className="border-2 border-gray-300"
                  placeholder="@yourhandle"
                />
              </div>

              <Button
                onClick={handleSaveProfile}
                className="w-full bg-[#32C8D1] hover:bg-[#2AB8C1] text-white"
              >
                Save Social Links
              </Button>
            </div>
          </Card>

          {/* Visibility Settings */}
          <Card className="p-6 bg-white border border-gray-200">
            <h3 className="text-xl font-bold text-gray-900 mb-6">Visibility Settings</h3>
            
            <div className="space-y-6">
              <div className="flex items-center justify-between py-4 border-b border-gray-200">
                <div>
                  <Label className="text-base font-semibold text-gray-900 block mb-1">
                    Visible to Brands
                  </Label>
                  <p className="text-sm text-gray-600">
                    Allow brands to discover and contact you
                  </p>
                </div>
                <Switch
                  checked={creator.is_public_brands || false}
                  onCheckedChange={(checked) => {
                    setCreator({ ...creator, is_public_brands: checked });
                    alert(`Profile is now ${checked ? 'VISIBLE' : 'HIDDEN'} to brands! (Demo mode)`);
                  }}
                />
              </div>

              <div className="flex items-center justify-between py-4 border-b border-gray-200">
                <div>
                  <Label className="text-base font-semibold text-gray-900 block mb-1">
                    Enable Licensing
                  </Label>
                  <p className="text-sm text-gray-600">
                    Accept licensing requests from brands
                  </p>
                </div>
                <Switch defaultChecked />
              </div>

              <div className="flex items-center justify-between py-4">
                <div>
                  <Label className="text-base font-semibold text-gray-900 block mb-1">
                    Email Notifications
                  </Label>
                  <p className="text-sm text-gray-600">
                    Receive updates about campaigns and approvals
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* My Rules Tab */}
      {settingsTab === "rules" && (
        <div className="space-y-6">
          <Card className="p-6 bg-white border border-gray-200">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-1">My Rules</h3>
                <p className="text-sm text-gray-600">Set your licensing preferences and rates</p>
              </div>
              {!editingRules ? (
                <Button
                  onClick={() => setEditingRules(true)}
                  variant="outline"
                  className="border-2 border-gray-300"
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Edit
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button
                    onClick={() => setEditingRules(false)}
                    variant="outline"
                    className="border-2 border-gray-300"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSaveRules}
                    className="bg-[#32C8D1] hover:bg-[#2AB8C1] text-white"
                  >
                    Save
                  </Button>
                </div>
              )}
            </div>

            <div className="space-y-8">
              {/* Content Types */}
              <div>
                <Label className="text-base font-semibold text-gray-900 block mb-3">
                  Content I'm Open To
                </Label>
                <div className="flex flex-wrap gap-2">
                  {CONTENT_TYPES.map((type) => (
                    <Badge
                      key={type}
                      onClick={() => editingRules && handleToggleContentType(type)}
                      className={`cursor-pointer transition-all px-4 py-2 ${
                        creator.content_types?.includes(type)
                          ? 'bg-[#32C8D1] text-white hover:bg-[#2AB8C1] border-2 border-[#32C8D1]'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border-2 border-gray-300'
                      } ${!editingRules && 'cursor-default'}`}
                    >
                      {type}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Industries */}
              <div className="pt-6 border-t border-gray-200">
                <Label className="text-base font-semibold text-gray-900 block mb-3">
                  Industries I Work With
                </Label>
                <div className="flex flex-wrap gap-2">
                  {INDUSTRIES.map((industry) => (
                    <Badge
                      key={industry}
                      onClick={() => editingRules && handleToggleIndustry(industry)}
                      className={`cursor-pointer transition-all px-4 py-2 ${
                        creator.industries?.includes(industry)
                          ? 'bg-purple-500 text-white hover:bg-purple-600 border-2 border-purple-500'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border-2 border-gray-300'
                      } ${!editingRules && 'cursor-default'}`}
                    >
                      {industry}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Pricing */}
              <div className="pt-6 border-t border-gray-200">
                <Label className="text-base font-semibold text-gray-900 block mb-3">
                  Initial Licensing Rate
                </Label>
                <p className="text-sm text-gray-600 mb-4">
                  Base rate per week for cameo usage
                </p>
                <div className="flex items-center gap-4">
                  <div className="flex-1 max-w-md">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-700 font-medium text-lg">$</span>
                      <Input
                        type="number"
                        value={creator.price_per_week || 0}
                        onChange={(e) => setCreator({ ...creator, price_per_week: parseInt(e.target.value) || 0 })}
                        disabled={!editingRules}
                        className="border-2 border-gray-300 text-lg"
                        min="0"
                        step="50"
                      />
                      <span className="text-gray-700 font-medium text-lg">/ week</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Campaign Royalties */}
              <div className="pt-6 border-t border-gray-200">
                <Label className="text-base font-semibold text-gray-900 block mb-3">
                  Campaign Royalties
                </Label>
                <p className="text-sm text-gray-600 mb-4">
                  Percentage of campaign revenue from your likeness (0-5%)
                </p>
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <input
                      type="range"
                      min="0"
                      max="5"
                      step="0.5"
                      value={creator.royalty_percentage || 0}
                      onChange={(e) => setCreator({ ...creator, royalty_percentage: parseFloat(e.target.value) })}
                      disabled={!editingRules}
                      className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#32C8D1]"
                    />
                    <div className="flex items-center gap-2 min-w-24">
                      <span className="text-2xl font-bold text-[#32C8D1]">
                        {creator.royalty_percentage || 0}%
                      </span>
                    </div>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>0%</span>
                    <span>1%</span>
                    <span>2%</span>
                    <span>3%</span>
                    <span>4%</span>
                    <span>5%</span>
                  </div>
                </div>
              </div>

              {/* Negotiation Acceptance */}
              <div className="pt-6 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base font-semibold text-gray-900 block mb-1">
                      Accept Negotiations
                    </Label>
                    <p className="text-sm text-gray-600">
                      Allow brands to propose counter-offers to your base rate
                    </p>
                  </div>
                  <Switch
                    checked={creator.accept_negotiations || false}
                    onCheckedChange={(checked) => {
                      setCreator({ ...creator, accept_negotiations: checked });
                      if (!editingRules) {
                        alert(`Negotiation ${checked ? 'enabled' : 'disabled'}! (Demo mode)`);
                      }
                    }}
                    disabled={!editingRules}
                  />
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-white border-r border-gray-200 transition-all duration-300 flex flex-col fixed h-screen z-40`}>
        {/* Profile Section */}
        <div className="p-6 border-b border-gray-200">
          {sidebarOpen ? (
            <div className="flex items-center gap-3">
              <img 
                src={creator.profile_photo}
                alt={creator.name}
                className={`w-12 h-12 rounded-full object-cover border-2 ${creator?.kyc_status === 'approved' ? 'border-red-500' : 'border-[#32C8D1]'}`}
              />
              <div className="flex-1 min-w-0">
                <p className="font-bold text-gray-900 truncate">{creator.name}</p>
                <p className="text-xs text-gray-600 truncate">{creator.email}</p>
              </div>
            </div>
          ) : (
            <img 
              src={creator.profile_photo}
              alt={creator.name}
              className={`w-12 h-12 rounded-full object-cover border-2 ${creator?.kyc_status === 'approved' ? 'border-red-500' : 'border-[#32C8D1]'} mx-auto`}
            />
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 overflow-y-auto">
          <div className="space-y-1">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;
              
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-all ${
                    isActive 
                      ? 'bg-[#32C8D1] text-white' 
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  {sidebarOpen && (
                    <>
                      <span className="flex-1 text-left font-medium">{item.label}</span>
                      {item.badge !== undefined && item.badge > 0 && (
                        <Badge className={`${item.urgent ? 'bg-red-500' : 'bg-gray-500'} text-white`}>
                          {item.badge}
                        </Badge>
                      )}
                    </>
                  )}
                </button>
              );
            })}
          </div>
        </nav>

        {/* Toggle Sidebar Button */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-4 border-t border-gray-200 hover:bg-gray-50 transition-colors"
        >
          <Menu className="w-5 h-5 text-gray-600 mx-auto" />
        </button>
      </aside>

      {/* Main Content */}
      <main className={`flex-1 ${sidebarOpen ? 'ml-64' : 'ml-20'} transition-all duration-300 overflow-y-auto`}>
        <div className="p-8">
          {activeSection === "dashboard" && renderDashboard()}
          {activeSection === "likeness" && renderLikeness()}
          {activeSection === "voice" && renderVoice()}
          {activeSection === "campaigns" && renderCampaigns()}
          {activeSection === "approvals" && renderApprovals()}
          {activeSection === "contracts" && renderContracts()}
          {activeSection === "earnings" && renderEarnings()}
          {activeSection === "settings" && renderSettings()}
        </div>
      </main>

      {/* Pause License Modal */}
      <Dialog open={showPauseModal} onOpenChange={setShowPauseModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-gray-900">
              Pause This License?
            </DialogTitle>
          </DialogHeader>

          {selectedContract && (() => {
            const contract = contracts.find(c => c.id === selectedContract);
            if (!contract) return null;
            const currentMonth = new Date().toLocaleString('default', { month: 'long' });
            const proratedAmount = Math.round(contract.creator_earnings * (new Date().getDate() / 30));

            return (
              <div className="py-4 space-y-6">
                <Alert className="bg-amber-50 border-2 border-amber-300">
                  <AlertCircle className="h-5 w-5 text-amber-600" />
                  <AlertDescription className="text-amber-900">
                    <strong>⚠️ IMPORTANT PAYMENT WARNING</strong>
                    <p className="mt-2">If you pause NOW (mid-month):</p>
                    <ul className="list-disc ml-6 mt-2 space-y-1">
                      <li>You will NOT receive payment for {currentMonth}</li>
                      <li>Even though you've earned ${proratedAmount} so far this month</li>
                      <li>That money will be forfeited</li>
                    </ul>
                  </AlertDescription>
                </Alert>

                <div className="space-y-4">
                  <Card 
                    className="p-6 border-2 border-red-300 hover:border-red-400 cursor-pointer transition-all"
                    onClick={() => handlePauseLicense(contract, true)}
                  >
                    <h3 className="text-lg font-bold text-gray-900 mb-2">OPTION 1: Pause Immediately</h3>
                    <div className="space-y-2 text-sm text-gray-700 mb-4">
                      <p><strong>Effective:</strong> Today</p>
                      <p><strong>This Month's Payment:</strong> <span className="text-red-600 font-bold">✗ FORFEITED (${proratedAmount})</span></p>
                      <p><strong>Next Month's Payment:</strong> <span className="text-red-600">✗ PAUSED</span></p>
                    </div>
                    <p className="text-sm text-gray-600">Use this if you want to stop immediately and are okay losing this month's partial payment.</p>
                  </Card>

                  <Card 
                    className="p-6 border-2 border-green-300 hover:border-green-400 cursor-pointer transition-all"
                    onClick={() => handlePauseLicense(contract, false)}
                  >
                    <div className="flex items-start gap-2 mb-2">
                      <Badge className="bg-green-500 text-white">Recommended</Badge>
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">OPTION 2: Pause Next Month</h3>
                    <div className="space-y-2 text-sm text-gray-700 mb-4">
                      <p><strong>Effective:</strong> {new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toLocaleDateString()}</p>
                      <p><strong>This Month's Payment:</strong> <span className="text-green-600 font-bold">✓ YOU'LL GET PAID (${contract.creator_earnings})</span></p>
                      <p><strong>Next Month's Payment:</strong> <span className="text-red-600">✗ PAUSED</span></p>
                    </div>
                    <p className="text-sm text-gray-600">Use this to keep earning through the end of this month, then pause starting next month.</p>
                  </Card>
                </div>

                <div className="text-center">
                  <Button 
                    variant="outline" 
                    onClick={() => setShowPauseModal(false)}
                    className="border-2 border-gray-300"
                  >
                    Cancel - Don't Pause
                  </Button>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Revoke License Modal */}
      <Dialog open={showRevokeModal} onOpenChange={setShowRevokeModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-gray-900">
              Revoke This License?
            </DialogTitle>
          </DialogHeader>

          {selectedContract && (() => {
            const contract = contracts.find(c => c.id === selectedContract);
            if (!contract) return null;
            const revocationDate = new Date();
            const finalDate = new Date(revocationDate);
            finalDate.setDate(finalDate.getDate() + 30);

            return (
              <div className="py-4 space-y-6">
                <Alert className="bg-red-50 border-2 border-red-300">
                  <AlertCircle className="h-5 w-5 text-red-600" />
                  <AlertDescription className="text-red-900">
                    <strong>What happens when you revoke:</strong>
                    <ul className="list-disc ml-6 mt-2 space-y-1">
                      <li>You're requesting to END this license permanently</li>
                      <li>30-day notice period begins (they keep rights for 30 more days)</li>
                      <li>After 30 days, they must take down all content</li>
                      <li>Your earnings STOP after the 30-day period ends</li>
                      <li>The license cannot be reactivated</li>
                    </ul>
                  </AlertDescription>
                </Alert>

                <Card className="p-6 bg-gray-50 border border-gray-200">
                  <h3 className="font-bold text-gray-900 mb-4">Revocation Timeline</h3>
                  <div className="relative">
                    <div className="flex items-center justify-between mb-4">
                      <div className="text-center flex-1">
                        <p className="text-sm text-gray-600 mb-1">Notice Starts</p>
                        <p className="font-bold text-gray-900">{revocationDate.toLocaleDateString()}</p>
                      </div>
                      <div className="text-center flex-1">
                        <p className="text-sm text-gray-600 mb-1">Final Takedown</p>
                        <p className="font-bold text-gray-900">{finalDate.toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full">
                      <div className="h-full w-0 bg-red-500 rounded-full"></div>
                    </div>
                  </div>
                  <div className="mt-6 space-y-2 text-sm">
                    <p className="text-gray-700"><strong>Days 1-30:</strong> {contract.brand} can still use your likeness (final payments due)</p>
                    <p className="text-gray-700"><strong>Day 30:</strong> All content must be taken down</p>
                    <p className="text-gray-700"><strong>Your Final Payment:</strong> ${contract.creator_earnings} on {finalDate.toLocaleDateString()}</p>
                  </div>
                </Card>

                <div>
                  <Label className="text-sm font-medium text-gray-700 block mb-2">
                    Reason for revoking (optional):
                  </Label>
                  <Textarea
                    placeholder="e.g., I don't want to work with this brand anymore"
                    className="border-2 border-gray-300"
                    rows={3}
                  />
                </div>

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setShowRevokeModal(false)}
                    className="flex-1 border-2 border-gray-300"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => handleRevokeLicense(contract)}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                  >
                    <XCircle className="w-5 h-5 mr-2" />
                    Yes, Revoke License
                  </Button>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Re-upload Cameo Modal */}
      <Dialog open={showReuploadCameoModal} onOpenChange={setShowReuploadCameoModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-gray-900">
              Re-Record Your Cameo
            </DialogTitle>
          </DialogHeader>

          <div className="py-4 space-y-6">
            <Card className="p-4 bg-gray-50 border border-gray-200">
              <h4 className="font-bold text-gray-900 mb-3">Your Current Cameo:</h4>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">Uploaded:</p>
                  <p className="font-bold text-gray-900">Nov 12, 2024</p>
                </div>
                <div>
                  <p className="text-gray-600">Duration:</p>
                  <p className="font-bold text-gray-900">45 seconds</p>
                </div>
                <div>
                  <p className="text-gray-600">Quality:</p>
                  <p className="font-bold text-gray-900">4K</p>
                </div>
              </div>
            </Card>

            <div>
              <h4 className="font-bold text-gray-900 mb-3">You can re-upload if you've made changes to your appearance:</h4>
              <div className="space-y-2 text-gray-700">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-[#32C8D1]" />
                  <p>Changed hairstyle</p>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-[#32C8D1]" />
                  <p>Changed hair color</p>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-[#32C8D1]" />
                  <p>Significant weight loss/gain</p>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-[#32C8D1]" />
                  <p>New tattoos</p>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-[#32C8D1]" />
                  <p>Changed style/fashion</p>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-[#32C8D1]" />
                  <p>Just want a fresher look</p>
                </div>
              </div>
            </div>

            <Alert className="bg-blue-50 border-2 border-blue-300">
              <AlertCircle className="h-5 w-5 text-blue-600" />
              <AlertDescription className="text-blue-900">
                <strong>What Happens After You Upload:</strong>
                <ul className="list-disc ml-6 mt-2 space-y-1">
                  <li>New cameo goes through verification (24 hours)</li>
                  <li>If approved, new cameo becomes your primary</li>
                  <li>Old cameo is archived but still available</li>
                  <li>All active licenses continue using the version they signed (old cameo)</li>
                  <li>New licenses will use the new cameo</li>
                </ul>
              </AlertDescription>
            </Alert>

            <Alert className="bg-amber-50 border-2 border-amber-300">
              <AlertCircle className="h-5 w-5 text-amber-600" />
              <AlertDescription className="text-amber-900">
                <strong>Important:</strong> Existing contracts will NOT change. Brands who signed with your old cameo will continue using that version. Only new projects will use the updated cameo.
              </AlertDescription>
            </Alert>

            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-[#32C8D1] transition-colors">
              <input
                type="file"
                id="reuploadCameo"
                accept="video/*"
                onChange={handleHeroUpload}
                className="hidden"
              />
              <label htmlFor="reuploadCameo" className="cursor-pointer">
                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-700 font-medium mb-2">Click to upload new cameo</p>
                <p className="text-sm text-gray-500">MP4 or MOV, 30-60 seconds</p>
              </label>
            </div>

            <div className="flex gap-3">
              <Button 
                variant="outline" 
                onClick={() => setShowReuploadCameoModal(false)}
                className="flex-1 border-2 border-gray-300"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Image Upload Modal */}
      <Dialog open={showImageUploadModal} onOpenChange={setShowImageUploadModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-gray-900">
              Upload Reference Image
            </DialogTitle>
          </DialogHeader>

          <div className="py-4 space-y-6">
            {selectedImageSection && (() => {
              const section = IMAGE_SECTIONS.find(s => s.id === selectedImageSection);
              if (!section) return null;

              return (
                <>
                  <div>
                    <p className="text-gray-700 mb-2"><strong>Section:</strong> {section.title}</p>
                    <p className="text-gray-600"><strong>Best For:</strong> {section.bestFor}</p>
                  </div>

                  <Card className="p-4 bg-gray-50 border border-gray-200">
                    <h4 className="font-bold text-gray-900 mb-3">Requirements Checklist:</h4>
                    <div className="space-y-2 text-sm text-gray-700">
                      <div className="flex items-center gap-2">
                        <CheckSquare className="w-4 h-4 text-green-600" />
                        <p>At least 1080x1080 resolution</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckSquare className="w-4 h-4 text-green-600" />
                        <p>Face/body clearly visible</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckSquare className="w-4 h-4 text-green-600" />
                        <p>Good lighting (natural or studio)</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckSquare className="w-4 h-4 text-green-600" />
                        <p>Recent photo (from last 3 months)</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckSquare className="w-4 h-4 text-green-600" />
                        <p>No heavy filters</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckSquare className="w-4 h-4 text-green-600" />
                        <p>Professional quality preferred (not selfie-style)</p>
                      </div>
                    </div>
                  </Card>

                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-[#32C8D1] transition-colors">
                    <input
                      type="file"
                      id="sectionImageUpload"
                      accept="image/*"
                      onChange={handleImageFileSelect}
                      className="hidden"
                    />
                    <label htmlFor="sectionImageUpload" className="cursor-pointer">
                      <ImageIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                      <p className="text-gray-700 font-medium mb-2">Drag photos here or click to browse</p>
                      <p className="text-sm text-gray-500">File Size: Max 10MB | Formats: JPG, PNG, WebP</p>
                    </label>
                  </div>

                  {previewImage && (
                    <div>
                      <h4 className="font-bold text-gray-900 mb-3">Preview:</h4>
                      <img 
                        src={previewImage.url}
                        alt="Preview"
                        className="w-full max-h-96 object-contain border-2 border-gray-200 rounded-lg mb-4"
                      />
                      
                      <Card className="p-4 bg-green-50 border border-green-200">
                        <h5 className="font-bold text-gray-900 mb-2">Auto-Check:</h5>
                        <div className="space-y-1 text-sm">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-green-600" />
                            <p className="text-gray-900">Resolution: {previewImage.resolution} (Excellent)</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-green-600" />
                            <p className="text-gray-900">Faces Detected: 1 (You alone)</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-green-600" />
                            <p className="text-gray-900">Lighting Quality: Good</p>
                          </div>
                        </div>
                      </Card>
                    </div>
                  )}

                  <div className="flex gap-3">
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setShowImageUploadModal(false);
                        setPreviewImage(null);
                        setSelectedImageSection(null);
                      }}
                      className="flex-1 border-2 border-gray-300"
                    >
                      Cancel
                    </Button>
                    <Button 
                      onClick={confirmImageUpload}
                      disabled={!previewImage || uploadingToSection}
                      className="flex-1 bg-[#32C8D1] hover:bg-[#2AB8C1] text-white"
                    >
                      {uploadingToSection ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4 mr-2" />
                          Upload
                        </>
                      )}
                    </Button>
                  </div>
                </>
              );
            })()}
          </div>
        </DialogContent>
      </Dialog>

      {/* Recording Modal */}
      <Dialog open={showRecordingModal} onOpenChange={setShowRecordingModal}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-gray-900 capitalize">
              Record {selectedEmotion} Voice Sample
            </DialogTitle>
          </DialogHeader>

          <div className="py-4">
            {!isRecording ? (
              <div className="text-center py-8">
                <div className="w-20 h-20 bg-[#32C8D1] rounded-full flex items-center justify-center mx-auto mb-6">
                  <Mic className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">Ready to Record?</h3>
                <p className="text-gray-600 mb-6">
                  The script will scroll slowly. Speak naturally and expressively.
                </p>
                <Button
                  onClick={startRecording}
                  className="h-14 px-8 bg-red-500 hover:bg-red-600 text-white text-lg"
                >
                  <Mic className="w-5 h-5 mr-2" />
                  Start Recording
                </Button>
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-center gap-3 mb-6">
                  <div className="w-4 h-4 bg-red-500 rounded-full animate-pulse" />
                  <span className="text-2xl font-bold text-gray-900">
                    {Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')}
                  </span>
                </div>

                {renderScript()}

                <div className="flex justify-center gap-4 mt-6">
                  <Button
                    onClick={stopRecording}
                    className="h-12 px-8 bg-red-500 hover:bg-red-600 text-white"
                  >
                    <Square className="w-5 h-5 mr-2" />
                    Stop Recording
                  </Button>
                </div>

                <Progress value={(recordingTime / 60) * 100} className="mt-6 h-2" />
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}