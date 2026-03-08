import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  ChevronRight, 
  ChevronDown, 
  Search, 
  Filter, 
  User, 
  Briefcase, 
  Image as ImageIcon, 
  Video, 
  CheckCircle2, 
  AlertCircle,
  MessageSquare,
  Send,
  ExternalLink,
  Eye,
  MoreVertical,
  Download,
  Loader2,
  RefreshCw
} from "lucide-react";
import { 
  listOfferDeliverables, 
  reviewOfferDeliverable,
  listAgencyOfferPackages
} from "@/api/functions";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/use-toast";

interface Deliverable {
  id: string;
  offer_id: string;
  asset_url: string;
  asset_type: string;
  status: string;
  caption?: string;
  agency_review_note?: string;
  brand_review_note?: string;
  creator_id?: string;
  created_at: string;
  meta?: any;
}

interface CampaignNode {
  id: string;
  name: string;
  offers: any[];
}

export function AgencyDeliverablesView() {
  const [campaigns, setCampaigns] = useState<CampaignNode[]>([]);
  const [expandedCampaigns, setExpandedCampaigns] = useState<Set<string>>(new Set());
  const [expandedOffers, setExpandedOffers] = useState<Set<string>>(new Set());
  const [deliverablesMap, setDeliverablesMap] = useState<Record<string, Deliverable[]>>({});
  const [loading, setLoading] = useState(true);
  const [loadingDeliverables, setLoadingDeliverables] = useState<Record<string, boolean>>({});
  const [reviewing, setReviewing] = useState<string | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const getSession = async () => {
      if (supabase) {
        const { data: { session } } = await supabase.auth.getSession();
        setAuthToken(session?.access_token || null);
      }
    };
    getSession();
  }, []);

  const fetchHierarchy = async () => {
    setLoading(true);
    try {
      const resp = await listAgencyOfferPackages();
      const items = resp.items || [];
      
      const grouped: Record<string, CampaignNode> = {};
      items.forEach((item: any) => {
        const campaignId = item.brand_campaign_id || item.brand_campaigns?.id;
        const campaignName = item.brand_campaigns?.name || item.brand_campaign_name || "Untitled Campaign";
        
        if (campaignId) {
          if (!grouped[campaignId]) {
            grouped[campaignId] = {
              id: campaignId,
              name: campaignName,
              offers: []
            };
          }
          grouped[campaignId].offers.push(item);
        }
      });
      
      setCampaigns(Object.values(grouped));
    } catch (error) {
      console.error("Failed to fetch deliverables hierarchy", error);
      toast({
        title: "Error",
        description: "Failed to load campaigns hierarchy.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHierarchy();
  }, []);

  const toggleCampaign = (id: string) => {
    const next = new Set(expandedCampaigns);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpandedCampaigns(next);
  };

  const toggleOffer = async (offerId: string) => {
    const next = new Set(expandedOffers);
    if (next.has(offerId)) {
      next.delete(offerId);
    } else {
      next.add(offerId);
      if (!deliverablesMap[offerId]) {
        fetchDeliverables(offerId);
      }
    }
    setExpandedOffers(next);
  };

  const fetchDeliverables = async (offerId: string) => {
    setLoadingDeliverables(prev => ({ ...prev, [offerId]: true }));
    try {
      const resp = await listOfferDeliverables(offerId);
      setDeliverablesMap(prev => ({ ...prev, [offerId]: resp.deliverables || [] }));
    } catch (error) {
      console.error("Failed to fetch deliverables", error);
    } finally {
      setLoadingDeliverables(prev => ({ ...prev, [offerId]: false }));
    }
  };

  const handleReview = async (offerId: string, delId: string, status: string, note?: string) => {
    setReviewing(delId);
    try {
      await reviewOfferDeliverable(offerId, delId, { status, note });
      toast({
        title: "Success",
        description: `Deliverable ${status.replace(/_/g, " ")}.`,
      });
      fetchDeliverables(offerId);
    } catch (error: any) {
      toast({
        title: "Review failed",
        description: error.message || "Failed to update status.",
        variant: "destructive"
      });
    } finally {
      setReviewing(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "submitted":
        return <Badge className="bg-blue-100 text-blue-700 border-blue-200">Pending Review</Badge>;
      case "approved":
        return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">Approved</Badge>;
      case "changes_requested":
        return <Badge className="bg-rose-100 text-rose-700 border-rose-200">Changes Req.</Badge>;
      default:
        return <Badge variant="outline" className="capitalize">{status.replace(/_/g, " ")}</Badge>;
    }
  };

  const getPublicUrl = (del: Deliverable) => {
    if (!del || !del.asset_url) return "";
    if (del.asset_url.startsWith("http")) return del.asset_url;
    // Use the proxy endpoint
    const baseUrl = `/api/campaign-offers/${del.offer_id}/deliverables/${del.id}/file`;
    return authToken ? `${baseUrl}?token=${authToken}` : baseUrl;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-primary/60" />
        <p className="text-sm text-gray-400 font-medium">Building directory tree...</p>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8 pb-20"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black text-gray-900 font-syne tracking-tight">Deliverables</h1>
          <p className="text-gray-500 mt-1 font-medium">Review, approve, or request changes for talent submissions.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="bg-white border-gray-200 shadow-sm" onClick={fetchHierarchy}>
            <RefreshCw className="w-4 h-4 mr-2" /> Refresh List
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        {campaigns.length === 0 ? (
          <Card className="p-24 text-center bg-white/50 backdrop-blur-sm border-dashed border-2 rounded-3xl">
            <div className="bg-gray-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Briefcase className="w-8 h-8 text-gray-300" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 font-syne">No deliverables yet</h3>
            <p className="text-gray-500 max-w-xs mx-auto mt-2 text-sm text-center">Once talents start uploading content for your active campaigns, they will appear here.</p>
          </Card>
        ) : (
          campaigns.map((camp, campIdx) => (
            <motion.div 
              key={camp.id} 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: campIdx * 0.05 }}
              className="border border-gray-200 rounded-2xl bg-white overflow-hidden shadow-sm hover:shadow-md transition-all"
            >
              <div 
                className={`p-5 flex items-center justify-between cursor-pointer transition-colors ${expandedCampaigns.has(camp.id) ? 'bg-gray-50' : 'hover:bg-gray-50/50'}`}
                onClick={() => toggleCampaign(camp.id)}
              >
                <div className="flex items-center gap-4">
                  <div className="bg-gray-900 text-white p-2.5 rounded-xl shadow-lg ring-4 ring-gray-100">
                    <Briefcase className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 font-syne text-lg">{camp.name}</h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] font-bold text-primary uppercase tracking-[0.15em]">{camp.offers.length} Talents</span>
                      <span className="w-1 h-1 rounded-full bg-gray-300" />
                      <span className="text-[10px] text-gray-400 font-medium">Active Campaign</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <AnimatePresence mode="wait">
                    {expandedCampaigns.has(camp.id) ? (
                      <motion.div initial={{ rotate: 0 }} animate={{ rotate: 180 }} key="up">
                        <ChevronDown className="w-6 h-6 text-gray-400" />
                      </motion.div>
                    ) : (
                      <motion.div initial={{ rotate: 0 }} animate={{ rotate: 0 }} key="down">
                        <ChevronRight className="w-6 h-6 text-gray-400" />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {expandedCampaigns.has(camp.id) && (
                <div className="bg-gray-50/50 border-t border-gray-100">
                  {camp.offers.map((offer) => (
                    <div key={offer.id} className="border-l-[3px] border-primary/30 ml-6">
                      <div 
                        className={`p-4 flex items-center justify-between cursor-pointer transition-colors border-b border-gray-100/50 ${expandedOffers.has(offer.id) ? 'bg-white' : 'hover:bg-white/80'}`}
                        onClick={() => toggleOffer(offer.id)}
                      >
                        <div className="flex items-center gap-4">
                          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 border-2 border-white shadow-sm flex items-center justify-center text-[12px] font-bold text-gray-700 uppercase">
                            {(offer.talent_name || offer.campaign_offers?.offer_title)?.[0] || <User className="w-4 h-4" />}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-gray-900 font-syne">
                              {offer.talent_name || offer.campaign_offers?.offer_title || "Unknown Talent"}
                            </p>
                            <p className="text-[10px] text-gray-500 font-medium">{offer.offer_title || offer.campaign_offers?.offer_title}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          {getStatusBadge(offer.status)}
                          {expandedOffers.has(offer.id) ? <ChevronDown className="w-5 h-5 text-gray-300" /> : <ChevronRight className="w-5 h-5 text-gray-300" />}
                        </div>
                      </div>

                      <AnimatePresence>
                        {expandedOffers.has(offer.id) && (
                          <motion.div 
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden bg-white/40"
                          >
                            <div className="p-6">
                              {loadingDeliverables[offer.id] ? (
                                <div className="py-12 flex flex-col items-center justify-center gap-3">
                                  <Loader2 className="w-8 h-8 animate-spin text-primary/30" />
                                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Loading assets</p>
                                </div>
                              ) : !deliverablesMap[offer.id] || deliverablesMap[offer.id].length === 0 ? (
                                <div className="py-12 text-center">
                                  <div className="p-3 bg-gray-50 rounded-full w-fit mx-auto mb-3">
                                    <ImageIcon className="w-6 h-6 text-gray-300" />
                                  </div>
                                  <p className="text-xs text-gray-400 font-medium italic">The talent hasn't uploaded any content yet.</p>
                                </div>
                              ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                                  {deliverablesMap[offer.id].map((del) => (
                                    <Card key={del.id} className="overflow-hidden border-gray-200 bg-white shadow-sm ring-1 ring-gray-100 hover:shadow-xl transition-all group">
                                      <div className="aspect-[4/3] bg-gray-50 relative">
                                        {del.asset_type === "image" ? (
                                          <img 
                                            src={getPublicUrl(del)} 
                                            alt={del.caption || "Deliverable"} 
                                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                          />
                                        ) : (
                                          <div className="w-full h-full flex items-center justify-center bg-gray-900">
                                            <Video className="w-12 h-12 text-blue-400/40" />
                                          </div>
                                        )}
                                        
                                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-3">
                                          <div className="flex items-center gap-2">
                                            <Button variant="secondary" size="sm" className="h-9 px-4 rounded-xl font-bold" asChild>
                                              <a href={getPublicUrl(del)} target="_blank" rel="noreferrer">
                                                <Eye className="w-4 h-4 mr-2" /> View Full
                                              </a>
                                            </Button>
                                            <Button variant="secondary" size="icon" className="h-9 w-9 rounded-xl font-bold" asChild>
                                              <a href={getPublicUrl(del)} download target="_blank" rel="noreferrer">
                                                <Download className="w-4 h-4" />
                                              </a>
                                            </Button>
                                          </div>
                                        </div>

                                        <div className="absolute top-3 left-3">
                                          {getStatusBadge(del.status)}
                                        </div>
                                      </div>
                                      
                                      <div className="p-4 space-y-4">
                                        <div className="space-y-1">
                                          <div className="flex items-center justify-between">
                                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{new Date(del.created_at).toLocaleDateString()}</span>
                                            <span className="text-[10px] font-bold text-primary/60 uppercase">{del.asset_type}</span>
                                          </div>
                                          <p className="text-xs text-gray-600 font-medium line-clamp-2 leading-relaxed">
                                            {del.caption || <span className="text-gray-300 italic">No caption provided</span>}
                                          </p>
                                        </div>

                                        <div className="flex items-center gap-2 pt-2 border-t border-gray-50">
                                          <Button 
                                            size="sm" 
                                            className="flex-1 h-9 rounded-xl font-bold shadow-lg shadow-primary/20 bg-primary hover:bg-primary/90"
                                            onClick={() => handleReview(offer.id, del.id, "approved")}
                                            disabled={!!reviewing || del.status === "approved"}
                                          >
                                            {reviewing === del.id ? <Loader2 className="w-4 h-4 animate-spin" /> : "Approve"}
                                          </Button>
                                          <Button 
                                            variant="outline"
                                            size="sm" 
                                            className="flex-1 h-9 rounded-xl font-bold border-rose-100 text-rose-600 hover:bg-rose-50 hover:border-rose-200"
                                            onClick={() => {
                                              const note = prompt("Enter feedback for the talent:");
                                              if (note) handleReview(offer.id, del.id, "changes_requested", note);
                                            }}
                                            disabled={!!reviewing}
                                          >
                                            Feedback
                                          </Button>
                                        </div>

                                        {del.brand_review_note && (
                                          <div className="mt-3 p-3 bg-blue-50/50 rounded-xl border border-blue-100">
                                            <div className="flex items-center gap-1.5 mb-1 text-[9px] font-black text-blue-700 uppercase tracking-widest">
                                              <Send className="w-3 h-3" /> Brand Feedback
                                            </div>
                                            <p className="text-[11px] text-blue-900 leading-snug">{del.brand_review_note}</p>
                                          </div>
                                        )}
                                      </div>
                                    </Card>
                                  ))}
                                </div>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          ))
        )}
      </div>
    </motion.div>
  );
}
