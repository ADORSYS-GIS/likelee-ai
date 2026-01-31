import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    Loader2, Plus, X, Check, ArrowRight, ArrowLeft,
    Image as ImageIcon, User, Settings, Send, Search,
    Eye, EyeOff, Calendar, Palette, Type, Building2, Mail,
    GripVertical, Trash2, Globe, SwitchCamera, Layers
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { packageApi } from "@/api/packages";
import { useToast } from "@/components/ui/use-toast";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { AssetSelector } from "./AssetSelector";

interface CreatePackageWizardProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

const STEPS = [
    { id: "basic", title: "Basic Info", icon: Type },
    { id: "talent", title: "Select Talents", icon: User },
    { id: "custom", title: "Customize", icon: Palette },
    { id: "send", title: "Send", icon: Send },
];

export function CreatePackageWizard({ open, onOpenChange }: CreatePackageWizardProps) {
    const [step, setStep] = useState(0);
    const [showTalentSelector, setShowTalentSelector] = useState(false);
    const [isNavigating, setIsNavigating] = useState(false);
    const [activeTalentForAssets, setActiveTalentForAssets] = useState<{ id: string, name: string } | null>(null);
    const [showPassword, setShowPassword] = useState(false);
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const [formData, setFormData] = useState({
        title: "",
        description: "",
        cover_image_url: "",
        primary_color: "#6366F1",
        secondary_color: "#06B6D4",
        custom_message: "",
        allow_comments: true,
        allow_favorites: true,
        allow_callbacks: true,
        password_protected: false,
        password: "",
        expires_at: "",
        client_name: "",
        client_email: "",
        items: [] as any[],
    });

    const { data: talentsData, isLoading: loadingTalents } = useQuery({
        queryKey: ["agency-talents"],
        queryFn: () => packageApi.listTalents(),
        enabled: open && showTalentSelector,
    });

    const createMutation = useMutation({
        mutationFn: (data: any) => packageApi.createPackage(data),
        onSuccess: () => {
            toast({
                title: "Package Created",
                description: "Your talent portal has been published successfully!",
            });
            queryClient.invalidateQueries({ queryKey: ["agency-packages"] });
            onOpenChange(false);
            resetForm();
        },
    });

    const resetForm = () => {
        setStep(0);
        setFormData({
            title: "",
            description: "",
            cover_image_url: "",
            primary_color: "#6366F1",
            secondary_color: "#06B6D4",
            custom_message: "",
            allow_comments: true,
            allow_favorites: true,
            allow_callbacks: true,
            password_protected: false,
            password: "",
            expires_at: "",
            client_name: "",
            client_email: "",
            items: [],
        });
    };

    const nextStep = async () => {
        if (step === 0 && !formData.title) return toast({ title: "Required", description: "Title is required", variant: "destructive" });
        if (step === 1 && formData.items.length === 0) return toast({ title: "Empty", description: "Please select at least one talent", variant: "destructive" });

        setIsNavigating(true);
        // Artificial delay to prevent double-click and show feedback
        await new Promise(r => setTimeout(r, 400));
        setStep((s) => Math.min(s + 1, STEPS.length - 1));
        setIsNavigating(false);
    };

    const prevStep = () => setStep((s) => Math.max(s - 1, 0));

    const toggleTalentSelection = (talent: any) => {
        const isSelected = formData.items.some((item) => item.talent_id === talent.id);
        if (isSelected) {
            setFormData({
                ...formData,
                items: formData.items.filter((item) => item.talent_id !== talent.id),
            });
        } else {
            setFormData({
                ...formData,
                items: [...formData.items, { talent_id: talent.id, asset_ids: [], talent }],
            });
        }
    };

    const updateTalentAssets = (talentId: string, assetIds: string[]) => {
        setFormData({
            ...formData,
            items: formData.items.map(item =>
                item.talent_id === talentId ? { ...item, asset_ids: assetIds } : item
            )
        });
    };

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="max-w-4xl h-[85vh] flex flex-col p-0 overflow-hidden bg-white/95 backdrop-blur-xl rounded-2xl border-none shadow-[0_32px_128px_-12px_rgba(0,0,0,0.1)]">
                    {/* Header */}
                    <div className="p-10 pb-0">
                        <div className="flex justify-between items-start mb-8">
                            <div>
                                <DialogTitle className="text-2xl font-black text-gray-900 tracking-tight">
                                    Create a New Talent Package
                                </DialogTitle>
                                <p className="text-sm text-gray-500 font-medium mt-1">
                                    Build a beautiful portfolio package to showcase your talent to clients
                                </p>
                            </div>
                        </div>

                        {/* Step Bar */}
                        <div className="flex items-center gap-0 mb-10 max-w-2xl mx-auto">
                            {STEPS.map((s, i) => (
                                <React.Fragment key={s.id}>
                                    <div className="flex items-center gap-3">
                                        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-[10px] font-black transition-all duration-500 ${step >= i ? "bg-indigo-600 text-white shadow-xl shadow-indigo-100" : "bg-gray-100 text-gray-400"}`}>
                                            {step > i ? <Check className="w-5 h-5" /> : i + 1}
                                        </div>
                                        <span className={`text-[10px] uppercase font-black tracking-widest ${step >= i ? "text-gray-900" : "text-gray-500"}`}>
                                            {s.title}
                                        </span>
                                    </div>
                                    {i < STEPS.length - 1 && (
                                        <div className="flex-1 mx-6 h-1 bg-gray-300" />
                                    )}
                                </React.Fragment>
                            ))}
                        </div>
                    </div>

                    {/* Body */}
                    <div className="flex-1 overflow-y-auto px-10 pb-10">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={step}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.3 }}
                                className="space-y-8"
                            >
                                {step === 0 && (
                                    <div className="space-y-8 max-w-2xl mx-auto w-full">
                                        <div className="space-y-3">
                                            <Label className="text-[11px] font-bold uppercase tracking-wider text-gray-600">Package Title *</Label>
                                            <Input
                                                placeholder="e.g. Summer Campaign 2026"
                                                value={formData.title}
                                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                                className="h-12 bg-gray-50 border border-gray-200 focus:border-indigo-600 focus:bg-white rounded-lg px-4 transition-all duration-300 font-medium placeholder:text-gray-400"
                                            />
                                        </div>
                                        <div className="space-y-3">
                                            <Label className="text-[11px] font-bold uppercase tracking-wider text-gray-600">Introduction Note</Label>
                                            <Textarea
                                                placeholder="Share the vision for this selection..."
                                                value={formData.description}
                                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                                className="min-h-[120px] bg-gray-50 border border-gray-200 focus:border-indigo-600 focus:bg-white rounded-lg px-4 py-3 transition-all duration-300 font-medium placeholder:text-gray-400"
                                            />
                                        </div>
                                        <div className="space-y-3">
                                            <Label className="text-[11px] font-bold uppercase tracking-wider text-gray-600">Cover Image URL</Label>
                                            <Input
                                                placeholder="https://images.unsplash.com/..."
                                                value={formData.cover_image_url}
                                                onChange={(e) => setFormData({ ...formData, cover_image_url: e.target.value })}
                                                className="h-12 bg-gray-50 border border-gray-200 focus:border-indigo-600 focus:bg-white rounded-lg px-4 transition-all duration-300 font-medium placeholder:text-gray-400"
                                            />
                                        </div>

                                        <div className="p-8 bg-gray-50/50 backdrop-blur-sm rounded-[2rem] border border-gray-100 space-y-8">
                                            <div className="flex items-center gap-3">
                                                <Palette className="w-5 h-5 text-indigo-600" />
                                                <h4 className="text-sm font-black text-gray-900 tracking-tight">Agency Branding</h4>
                                            </div>
                                            <div className="grid grid-cols-2 gap-8">
                                                <div className="space-y-4">
                                                    <Label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Primary Accent</Label>
                                                    <div className="flex items-center gap-3 bg-white p-3 rounded-2xl border border-gray-100 shadow-sm shadow-gray-100">
                                                        <input
                                                            type="color"
                                                            value={formData.primary_color}
                                                            onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                                                            className="w-full h-10 cursor-pointer rounded-xl overflow-hidden border-none p-0"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="space-y-4">
                                                    <Label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Secondary Accent</Label>
                                                    <div className="flex items-center gap-3 bg-white p-3 rounded-2xl border border-gray-100 shadow-sm shadow-gray-100">
                                                        <input
                                                            type="color"
                                                            value={formData.secondary_color}
                                                            onChange={(e) => setFormData({ ...formData, secondary_color: e.target.value })}
                                                            className="w-full h-10 cursor-pointer rounded-xl overflow-hidden border-none p-0"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="space-y-3">
                                                <Label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Custom Footer Message</Label>
                                                <Textarea
                                                    placeholder="A personal note for the client..."
                                                    value={formData.custom_message}
                                                    onChange={(e) => setFormData({ ...formData, custom_message: e.target.value })}
                                                    className="bg-gray-50 border border-gray-200 focus:border-indigo-600 focus:bg-white rounded-2xl px-6 transition-all duration-300 min-h-[80px]"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {step === 1 && (
                                    <div className="space-y-8 max-w-3xl mx-auto w-full">
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <h3 className="text-xl font-black text-gray-900 tracking-tight">Selected Talents</h3>
                                                <p className="text-sm font-medium text-gray-700">Select talents and pick their best assets for this package</p>
                                            </div>
                                            <Button
                                                onClick={() => setShowTalentSelector(true)}
                                                className="h-10 px-6 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md shadow-indigo-300 rounded-lg flex items-center gap-2"
                                            >
                                                <Plus className="w-5 h-5" /> Add Talent
                                            </Button>
                                        </div>

                                        <div className="space-y-4">
                                            <AnimatePresence mode="popLayout">
                                                {formData.items.map((item, idx) => (
                                                    <motion.div
                                                        key={item.talent_id}
                                                        layout
                                                        initial={{ opacity: 0, scale: 0.95 }}
                                                        animate={{ opacity: 1, scale: 1 }}
                                                        exit={{ opacity: 0, scale: 0.95 }}
                                                        className="group flex items-center justify-between p-4 bg-white border border-gray-200 rounded-2xl hover:border-indigo-200 hover:shadow-lg hover:shadow-indigo-50 transition-all duration-300"
                                                    >
                                                        <div className="flex items-center gap-6">
                                                            <div className="hidden sm:block p-2 text-gray-200 group-hover:text-indigo-200 transition-colors cursor-grab active:cursor-grabbing">
                                                                <GripVertical className="w-5 h-5" />
                                                            </div>
                                                            <div className="w-16 h-16 rounded-[1.25rem] bg-gray-100 overflow-hidden shadow-inner flex-shrink-0">
                                                                <img src={item.talent.profile_photo_url} className="w-full h-full object-cover grayscale-[0.2] group-hover:grayscale-0 transition-all duration-500" />
                                                            </div>
                                                            <div>
                                                                <h5 className="font-black text-gray-900 tracking-tight text-lg">{item.talent.full_name}</h5>
                                                                <div className="flex items-center gap-2 mt-1">
                                                                    <Badge variant="secondary" className="bg-gray-100 text-gray-700 text-[9px] font-bold uppercase tracking-wider border-none px-2 rounded-md">
                                                                        {item.asset_ids.length} Assets
                                                                    </Badge>
                                                                    <p className="text-[10px] text-gray-600 font-bold uppercase tracking-widest">Selected</p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-4">
                                                            <Button
                                                                onClick={() => setActiveTalentForAssets({ id: item.talent_id, name: item.talent.full_name })}
                                                                className={`h-10 px-6 rounded-full border-none text-xs font-bold uppercase tracking-wider gap-2 transition-all duration-300 ${item.asset_ids.length > 0 ? "bg-green-100 text-green-700 hover:bg-green-200" : "bg-indigo-100 text-indigo-700 hover:bg-indigo-200"}`}
                                                            >
                                                                <Layers className="w-4 h-4" />
                                                                {item.asset_ids.length > 0 ? "Update Selection" : "Select Assets"}
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => toggleTalentSelection(item.talent)}
                                                                className="h-10 w-10 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all duration-300"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </Button>
                                                        </div>
                                                    </motion.div>
                                                ))}
                                            </AnimatePresence>
                                            {formData.items.length === 0 && (
                                                <div className="p-20 text-center border-2 border-dashed border-gray-200 rounded-[2rem] bg-white">
                                                    <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm shadow-gray-100">
                                                        <User className="w-8 h-8 text-gray-300" />
                                                    </div>
                                                    <p className="text-gray-600 font-black text-sm uppercase tracking-widest">No talents added yet</p>
                                                    <p className="text-gray-400 text-xs mt-2 font-medium">Add talent from your roster to start building the package</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {step === 2 && (
                                    <div className="max-w-2xl space-y-12 py-4 mx-auto w-full">
                                        <div className="space-y-8">
                                            <div className="space-y-1">
                                                <h3 className="text-2xl font-black text-gray-900 tracking-tighter">Package Controls</h3>
                                                <p className="text-sm text-gray-400 font-medium">Fine-tune the client experience and permissions</p>
                                            </div>
                                            <div className="space-y-4">
                                                {[
                                                    { id: 'allow_comments', label: 'Client Feedback', desc: 'Allow clients to leave notes on specific talents' },
                                                    { id: 'allow_favorites', label: 'Interest Tracking', desc: 'Let clients favorite talents to shortlist them' },
                                                    { id: 'allow_callbacks', label: 'Callback Requests', desc: 'Clients can directly request inquiries or callbacks' },
                                                    { id: 'password_protected', label: 'Access Control', desc: 'Secure this package with a private password' },
                                                ].map((s) => (
                                                    <div key={s.id} className="flex items-center justify-between p-6 bg-white border-2 border-gray-50 rounded-3xl hover:border-indigo-50/50 transition-all duration-300">
                                                        <div className="space-y-1">
                                                            <Label className="text-base font-black text-gray-900 tracking-tight block">{s.label}</Label>
                                                            <p className="text-xs text-gray-600 font-medium leading-relaxed max-w-[280px]">{s.desc}</p>
                                                        </div>
                                                        <Switch
                                                            checked={(formData as any)[s.id]}
                                                            onCheckedChange={(val) => setFormData({ ...formData, [s.id]: val })}
                                                            className="data-[state=checked]:bg-indigo-600 scale-110"
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        <AnimatePresence>
                                            {formData.password_protected && (
                                                <motion.div
                                                    initial={{ opacity: 0, height: 0, y: -20 }}
                                                    animate={{ opacity: 1, height: 'auto', y: 0 }}
                                                    exit={{ opacity: 0, height: 0, y: -20 }}
                                                    className="space-y-3"
                                                >
                                                    <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Gateway Password</Label>
                                                    <div className="relative">
                                                        <Input
                                                            type={showPassword ? "text" : "password"}
                                                            placeholder="Create a secure password..."
                                                            value={formData.password}
                                                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                                            className="h-12 border border-gray-200 bg-gray-50 focus:bg-white focus:border-indigo-600 rounded-lg px-4 pr-10 transition-all duration-300"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => setShowPassword((prev) => !prev)}
                                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                                            aria-label={showPassword ? "Hide password" : "Show password"}
                                                        >
                                                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                        </button>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>

                                        <div className="space-y-4 pt-4">
                                            <div className="flex items-center gap-3 mb-2">
                                                <Calendar className="w-5 h-5 text-indigo-600" />
                                                <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Privacy Expiration</Label>
                                            </div>
                                            <Input
                                                type="date"
                                                value={formData.expires_at}
                                                onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
                                                className="h-12 bg-gray-50 border border-gray-200 focus:border-indigo-600 focus:bg-white rounded-lg px-4 transition-all duration-300 font-medium"
                                            />
                                            <p className="text-xs text-gray-500 font-medium">Leave empty for an evergreen package link</p>
                                        </div>
                                    </div>
                                )}

                                {step === 3 && (
                                    <div className="max-w-2xl space-y-10 py-4 mx-auto w-full">
                                        <div className="space-y-6">
                                            <div className="space-y-1">
                                                <h3 className="text-2xl font-black text-gray-900 tracking-tight">Ready to send?</h3>
                                                <p className="text-sm text-gray-500 font-medium">Complete the recipient details to publish the package</p>
                                            </div>
                                            <div className="grid grid-cols-2 gap-6">
                                                <div className="space-y-3">
                                                    <Label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Client Contact *</Label>
                                                    <Input
                                                        placeholder="e.g. John Doe"
                                                        value={formData.client_name}
                                                        onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
                                                        className="h-12 bg-gray-50 border border-gray-200 focus:border-indigo-600 focus:bg-white rounded-lg px-4 transition-all duration-300 font-medium"
                                                    />
                                                </div>
                                                <div className="space-y-3">
                                                    <Label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Delivery Email *</Label>
                                                    <Input
                                                        type="email"
                                                        placeholder="client@company.com"
                                                        value={formData.client_email}
                                                        onChange={(e) => setFormData({ ...formData, client_email: e.target.value })}
                                                        className="h-12 bg-gray-50 border border-gray-200 focus:border-indigo-600 focus:bg-white rounded-lg px-4 transition-all duration-300 font-medium"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="p-10 bg-white rounded-[1.75rem] border border-gray-200 shadow-sm relative overflow-hidden min-h-[190px]">
                                            <div className="absolute top-4 right-4 opacity-10">
                                                <Send className="w-28 h-28 text-indigo-600" />
                                            </div>
                                            <h4 className="text-[11px] font-black uppercase tracking-[0.25em] text-gray-500 mb-4 flex items-center gap-2">
                                                <span className="w-2 h-2 rounded-full bg-indigo-500" />
                                                Package Summary
                                            </h4>
                                            <div className="space-y-3 relative z-10">
                                                <div className="flex items-baseline gap-3">
                                                    <h5 className="text-xl font-black text-gray-900 tracking-tight leading-none">{formData.title || 'Untitled Selection'}</h5>
                                                </div>
                                                <div className="flex flex-wrap gap-3 mt-3">
                                                    <Badge className="bg-gray-100 text-gray-700 border-none px-3 py-1 rounded-lg font-bold text-[10px] uppercase tracking-widest">
                                                        {formData.items.length} Talents
                                                    </Badge>
                                                    <Badge className="bg-gray-100 text-gray-700 border-none px-3 py-1 rounded-lg font-bold text-[10px] uppercase tracking-widest">
                                                        {formData.items.reduce((acc, it) => acc + it.asset_ids.length, 0)} Assets
                                                    </Badge>
                                                    {formData.password_protected && (
                                                        <Badge className="bg-indigo-600 text-white border-none px-3 py-1 rounded-lg font-bold text-[10px] uppercase tracking-widest">
                                                            Password Protected
                                                        </Badge>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        </AnimatePresence>
                    </div>

                    {/* Footer */}
                    <div className="p-10 bg-gray-50/50 backdrop-blur-md border-t border-gray-100 flex items-center justify-between">
                        <Button
                            variant="ghost"
                            onClick={() => {
                                if (step === 0) onOpenChange(false);
                                else prevStep();
                            }}
                            className="h-10 px-6 font-bold text-sm rounded-lg border-2 border-gray-200 text-gray-700 hover:bg-gray-50"
                        >
                            {step === 0 ? 'Cancel' : <><ArrowLeft className="w-4 h-4 mr-2" /> Back</>}
                        </Button>

                        <div className="flex gap-4">
                            {step < STEPS.length - 1 ? (
                                <Button
                                    onClick={nextStep}
                                    disabled={isNavigating}
                                    className="h-10 px-6 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md shadow-indigo-300 rounded-lg group"
                                >
                                    {isNavigating ? (
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    ) : (
                                        <span className="flex items-center gap-2">Continue <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" /></span>
                                    )}
                                </Button>
                            ) : (
                                <Button
                                    onClick={() => createMutation.mutate(formData)}
                                    disabled={createMutation.isPending}
                                    className="h-10 px-6 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md shadow-indigo-300 rounded-lg group flex items-center gap-2"
                                >
                                    {createMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                                    Publish & Send
                                </Button>
                            )}
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Talent Selector Overlay Modal */}
            <Dialog open={showTalentSelector} onOpenChange={setShowTalentSelector}>
                <DialogContent className="max-w-2xl rounded-[3rem] p-10 border-none bg-white/95 backdrop-blur-xl shadow-2xl">
                    <DialogHeader className="mb-8">
                        <DialogTitle className="text-2xl font-black text-gray-900 tracking-tight">
                            Create a New Talent Package
                        </DialogTitle>
                        <p className="text-sm text-gray-500 font-medium mt-1">
                            Build a beautiful portfolio package to showcase your talent to clients
                        </p>
                    </DialogHeader>

                    <div className="relative mb-8">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                            placeholder="Filter by name or category..."
                            className="pl-11 h-12 rounded-lg bg-gray-50 border border-gray-200 focus:bg-white focus:border-indigo-600 transition-all duration-300 font-medium"
                        />
                    </div>

                    <ScrollArea className="h-[450px] pr-4">
                        <div className="grid grid-cols-2 gap-4">
                            {Array.isArray(talentsData) && talentsData.map((talent: any) => {
                                const isSelected = formData.items.some(i => i.talent_id === talent.id);
                                return (
                                    <Card
                                        key={talent.id}
                                        onClick={() => toggleTalentSelection(talent)}
                                        className={`p-5 cursor-pointer rounded-[2rem] border-2 transition-all duration-500 flex items-center gap-5 ${isSelected ? "border-indigo-600 bg-indigo-50/30 shadow-lg shadow-indigo-100/20" : "border-gray-50 hover:border-gray-100 bg-white"}`}
                                    >
                                        <div className="w-16 h-16 rounded-2xl overflow-hidden bg-gray-100 flex-shrink-0 shadow-inner">
                                            <img src={talent.profile_photo_url} className="w-full h-full object-cover grayscale-[0.5] group-hover:grayscale-0 transition-all duration-500" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <h6 className="font-black text-gray-900 truncate tracking-tight text-base">{talent.full_name}</h6>
                                            <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-0.5">{talent.categories?.[0] || 'Member'}</p>
                                        </div>
                                        {isSelected && (
                                            <div className="bg-indigo-600 rounded-full p-1 shadow-md shadow-indigo-200">
                                                <Check className="w-4 h-4 text-white" />
                                            </div>
                                        )}
                                    </Card>
                                );
                            })}
                        </div>
                    </ScrollArea>

                    <Button
                        onClick={async () => {
                            setIsNavigating(true);
                            await new Promise(r => setTimeout(r, 400));
                            setShowTalentSelector(false);
                            setIsNavigating(false);
                        }}
                        disabled={isNavigating}
                        className="w-full mt-8 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg h-12 font-bold tracking-wider text-sm shadow-md shadow-indigo-200"
                    >
                        {isNavigating ? (
                            <Loader2 className="w-5 h-5 animate-spin mr-3" />
                        ) : null}
                        Confirm Selection ({formData.items.length})
                    </Button>
                </DialogContent>
            </Dialog>

            {/* Asset Selector Modal */}
            <AssetSelector
                open={!!activeTalentForAssets}
                onOpenChange={(open) => !open && setActiveTalentForAssets(null)}
                talentId={activeTalentForAssets?.id || ""}
                talentName={activeTalentForAssets?.name || ""}
                selectedAssets={formData.items.find(i => i.talent_id === activeTalentForAssets?.id)?.asset_ids || []}
                onSelect={(assetIds) => activeTalentForAssets && updateTalentAssets(activeTalentForAssets.id, assetIds)}
            />
        </>
    );
}
