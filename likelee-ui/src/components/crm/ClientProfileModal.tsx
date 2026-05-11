import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Building2,
  Plus,
  RefreshCw,
  Users,
  Mail,
  Phone,
  History,
  FileText,
  Calendar,
  Edit,
  Trash2,
  TrendingUp,
  File,
  Loader2,
  Download,
} from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/components/ui/use-toast";
import { parseBackendError } from "@/utils/errorParser";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import * as crmApi from "@/api/crm";
import { listBookings } from "@/api/functions";
import { Client } from "@/types/crm";
import AddContactModal from "./AddContactModal";
import LogCommunicationModal from "./LogCommunicationModal";
import { useTranslation } from "react-i18next";

const ClientProfileModal = ({
  client,
  isOpen,
  onClose,
  onEdit,
  onDelete,
}: {
  client: Client;
  isOpen: boolean;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) => {
  const { t } = useTranslation("agency");
  const [isAddContactOpen, setIsAddContactOpen] = useState(false);
  const [isLogCommOpen, setIsLogCommOpen] = useState(false);
  const [notes, setNotes] = useState(client.notes || "");
  const [isUploading, setIsUploading] = useState(false);
  const [fetchingUrlId, setFetchingUrlId] = useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: contacts = [], isLoading: isLoadingContacts } = useQuery({
    queryKey: ["client-contacts", client.id],
    queryFn: async () => {
      const resp = await crmApi.listContacts(client.id);
      return resp as any[];
    },
    enabled: !!client.id && isOpen,
  });

  const { data: communications = [], isLoading: isLoadingComms } = useQuery({
    queryKey: ["client-communications", client.id],
    queryFn: async () => {
      const resp = await crmApi.listCommunications(client.id);
      const data = resp as any[];
      // Add mock data for "new company" for demonstration if empty
      if (
        data.length === 0 &&
        client.name.toLowerCase().includes("new company")
      ) {
        return [
          {
            id: "mock-1",
            type: "email",
            subject: "Follow-up on Proposal",
            content:
              "Sent the updated proposal for the spring campaign. Waiting for feedback.",
            occurred_at: new Date(Date.now() - 86400000 * 2).toISOString(),
          },
          {
            id: "mock-2",
            type: "call",
            subject: "Initial Discovery Call",
            content:
              "Discussed talent requirements and budget ranges. Client is interested in commercial models.",
            occurred_at: new Date(Date.now() - 86400000 * 5).toISOString(),
          },
        ];
      }
      return data;
    },
    enabled: !!client.id && isOpen,
  });

  const { data: bookings = [], isLoading: isLoadingBookings } = useQuery({
    queryKey: ["client-bookings", client.id],
    queryFn: async () => {
      const resp = await listBookings({ client_id: client.id });
      return resp as any[];
    },
    enabled: !!client.id && isOpen,
  });

  const { data: files = [], isLoading: isLoadingFiles } = useQuery({
    queryKey: ["client-files", client.id],
    queryFn: async () => {
      const resp = await crmApi.listFiles(client.id);
      return resp as any[];
    },
    enabled: !!client.id && isOpen,
  });

  const updateNotesMutation = useMutation({
    mutationFn: (newNotes: string) =>
      crmApi.updateClient(client.id, { notes: newNotes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agency-clients"] });
      toast({
        title: t(
          "agencyDashboard.clientCRM.modal.profile.toasts.notesSavedTitle",
        ),
        description: t(
          "agencyDashboard.clientCRM.modal.profile.toasts.notesSavedDescription",
        ),
      });
    },
    onError: (error: any) => {
      toast({
        title: t("agencyDashboard.clientCRM.toasts.errorTitle"),
        description: `Failed to save notes: ${parseBackendError(error)}`,
        variant: "destructive",
      });
    },
  });

  const uploadFileMutation = useMutation({
    mutationFn: (file: File) => crmApi.uploadFile(client.id, file),
    onMutate: () => setIsUploading(true),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-files", client.id] });
      toast({
        title: t(
          "agencyDashboard.clientCRM.modal.profile.toasts.fileUploadedTitle",
        ),
        description: t(
          "agencyDashboard.clientCRM.modal.profile.toasts.fileUploadedDescription",
        ),
      });
    },
    onError: (error: any) => {
      toast({
        title: t(
          "agencyDashboard.clientCRM.modal.profile.toasts.uploadFailedTitle",
        ),
        description: `Failed to upload document: ${parseBackendError(error)}`,
        variant: "destructive",
      });
    },
    onSettled: () => setIsUploading(false),
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadFileMutation.mutate(file);
    }
  };

  const handleViewFile = async (file: any) => {
    if (file.public_url) {
      window.open(file.public_url, "_blank");
      return;
    }

    try {
      setFetchingUrlId(file.id);
      const resp = await crmApi.getSignedUrl(client.id, file.id);
      if (resp && (resp as any).url) {
        window.open((resp as any).url, "_blank");
      }
    } catch (error: any) {
      toast({
        title: t("agencyDashboard.clientCRM.toasts.errorTitle"),
        description: `Failed to get access to file: ${parseBackendError(error)}`,
        variant: "destructive",
      });
    } finally {
      setFetchingUrlId(null);
    }
  };

  const totalRevenueCents = bookings.reduce(
    (sum: number, b: any) => sum + (b.rate_cents || 0),
    0,
  );
  const totalRevenue = (() => {
    const dollars = totalRevenueCents / 100;
    if (dollars >= 1000) {
      return `$${(dollars / 1000).toLocaleString(undefined, {
        maximumFractionDigits: 1,
      })}K`;
    }
    return dollars.toLocaleString(undefined, {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    });
  })();
  const totalBookingsCount = bookings.length;
  const lastBooking =
    bookings.length > 0
      ? new Date(
          Math.max(...bookings.map((b: any) => new Date(b.date).getTime())),
        ).toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
          year: "numeric",
        })
      : t("agencyDashboard.clientCRM.modal.profile.common.never");

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="w-[95vw] sm:max-w-[900px] p-0 overflow-hidden rounded-2xl border-none max-h-[90vh] flex flex-col">
          <div className="p-4 sm:p-8 pb-3 sm:pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-center flex-shrink-0">
                <Building2 className="w-5 h-5 sm:w-6 sm:h-6 text-gray-400" />
              </div>
              <div className="flex items-center gap-2 min-w-0">
                <DialogTitle className="text-lg sm:text-2xl font-bold text-gray-900 truncate">
                  {client.name}
                </DialogTitle>
                <Badge className="bg-green-100 text-green-700 border-none font-bold text-[10px] flex-shrink-0">
                  {t(`agencyDashboard.clientCRM.status.${client.status}`, {
                    defaultValue: client.status,
                  })}
                </Badge>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-hidden flex flex-col px-4 sm:px-8">
            <Tabs
              defaultValue="overview"
              className="flex-1 flex flex-col overflow-hidden"
            >
              {/* Scrollable tab bar on mobile */}
              <div className="overflow-x-auto -mx-1 px-1 mb-4 sm:mb-6 shrink-0">
                <TabsList className="inline-flex w-max sm:w-full justify-start bg-gray-50/50 p-1 rounded-xl h-10 sm:h-12 gap-0.5">
                  {[
                    {
                      value: "overview",
                      label: t(
                        "agencyDashboard.clientCRM.modal.profile.tabs.overview",
                      ),
                    },
                    {
                      value: "contacts",
                      label: t(
                        "agencyDashboard.clientCRM.modal.profile.tabs.contacts",
                      ),
                    },
                    {
                      value: "communications",
                      label: t(
                        "agencyDashboard.clientCRM.modal.profile.tabs.communications",
                      ),
                    },
                    {
                      value: "bookings",
                      label: t(
                        "agencyDashboard.clientCRM.modal.profile.tabs.bookings",
                      ),
                    },
                    {
                      value: "files",
                      label: t(
                        "agencyDashboard.clientCRM.modal.profile.tabs.filesNotes",
                      ),
                    },
                  ].map((tab) => (
                    <TabsTrigger
                      key={tab.value}
                      value={tab.value}
                      className="rounded-lg data-[state=active]:bg-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-sm font-bold text-xs sm:text-sm transition-all px-3 sm:px-4 capitalize whitespace-nowrap"
                    >
                      {tab.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>

              <div className="flex-1 overflow-y-auto pr-2 -mr-2 pb-8">
                <TabsContent value="overview" className="space-y-6 mt-0">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                    <Card className="p-6 border-gray-100 rounded-2xl shadow-sm">
                      <div className="flex items-center gap-2 mb-4">
                        <Building2 className="w-5 h-5 text-gray-400" />
                        <h4 className="font-bold text-gray-900">
                          {t(
                            "agencyDashboard.clientCRM.modal.profile.sections.companyInformation",
                          )}
                        </h4>
                      </div>
                      <div className="space-y-4">
                        <div>
                          <p className="text-xs text-gray-600 font-bold uppercase tracking-wider">
                            {t(
                              "agencyDashboard.clientCRM.modal.profile.fields.industry",
                            )}
                          </p>
                          <p className="text-sm font-bold text-gray-900">
                            {t(
                              `agencyDashboard.clientCRM.industries.${client.industry}`,
                              {
                                defaultValue: client.industry,
                              },
                            )}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600 font-bold uppercase tracking-wider">
                            {t(
                              "agencyDashboard.clientCRM.modal.profile.fields.website",
                            )}
                          </p>
                          <p className="text-sm font-bold text-gray-900">
                            {client.website}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600 font-bold uppercase tracking-wider">
                            {t(
                              "agencyDashboard.clientCRM.modal.profile.fields.nextFollowUp",
                            )}
                          </p>
                          <p className="text-sm font-bold text-indigo-600">
                            {client.nextFollowUp}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600 font-bold uppercase tracking-wider mb-2">
                            {t(
                              "agencyDashboard.clientCRM.modal.profile.fields.tags",
                            )}
                          </p>
                          <div className="flex gap-2">
                            {client.tags.map((tag) => (
                              <Badge
                                key={tag}
                                variant="outline"
                                className="text-[10px] font-bold text-gray-500 border-gray-200"
                              >
                                {t(`agencyDashboard.clientCRM.tags.${tag}`, {
                                  defaultValue: tag,
                                })}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    </Card>

                    <Card className="p-6 border-gray-100 rounded-2xl shadow-sm">
                      <div className="flex items-center gap-2 mb-4">
                        <TrendingUp className="w-5 h-5 text-gray-400" />
                        <h4 className="font-bold text-gray-900">
                          {t(
                            "agencyDashboard.clientCRM.modal.profile.sections.clientPreferences",
                          )}
                        </h4>
                      </div>
                      <div className="space-y-4">
                        <div>
                          <p className="text-xs text-gray-600 font-bold uppercase tracking-wider">
                            {t(
                              "agencyDashboard.clientCRM.modal.profile.fields.preferredTalentTypes",
                            )}
                          </p>
                          <p className="text-sm font-bold text-gray-900">
                            {client.preferences?.talentTypes?.join(", ") || "—"}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600 font-bold uppercase tracking-wider">
                            {t(
                              "agencyDashboard.clientCRM.modal.profile.fields.budgetRange",
                            )}
                          </p>
                          <p className="text-sm font-bold text-gray-900">
                            {client.preferences?.budgetRange || "—"}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600 font-bold uppercase tracking-wider">
                            {t(
                              "agencyDashboard.clientCRM.modal.profile.fields.bookingLeadTime",
                            )}
                          </p>
                          <p className="text-sm font-bold text-gray-900">
                            {client.preferences?.leadTime || "—"}
                          </p>
                        </div>
                      </div>
                    </Card>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-bold text-gray-900">
                      {t(
                        "agencyDashboard.clientCRM.modal.profile.sections.clientMetrics",
                      )}
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                      <Card className="p-4 bg-white border-gray-100 rounded-2xl text-center shadow-sm">
                        <span className="text-2xl font-bold text-indigo-600 block">
                          {totalRevenue}
                        </span>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                          {t("agencyDashboard.clientCRM.stats.totalRevenue")}
                        </span>
                      </Card>
                      <Card className="p-4 bg-white border-gray-100 rounded-2xl text-center shadow-sm">
                        <span className="text-2xl font-bold text-emerald-600 block">
                          {totalBookingsCount}
                        </span>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                          {t(
                            "agencyDashboard.clientCRM.modal.profile.metrics.totalBookings",
                          )}
                        </span>
                      </Card>
                      <Card className="p-4 bg-white border-gray-100 rounded-2xl text-center shadow-sm">
                        <span className="text-2xl font-bold text-blue-600 block">
                          {client.metrics?.packagesSent || 0}
                        </span>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                          {t(
                            "agencyDashboard.clientCRM.modal.profile.metrics.packagesSent",
                          )}
                        </span>
                      </Card>
                      <Card className="p-4 bg-white border-gray-100 rounded-2xl text-center shadow-sm">
                        <span className="text-2xl font-bold text-orange-600 block">
                          {lastBooking}
                        </span>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                          {t("agencyDashboard.clientCRM.filters.lastBooking")}
                        </span>
                      </Card>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="contacts" className="space-y-6 mt-0">
                  <div className="flex justify-between items-center">
                    <h4 className="font-bold text-gray-900">
                      {t(
                        "agencyDashboard.clientCRM.modal.profile.sections.contactList",
                      )}
                    </h4>
                    <Button
                      onClick={() => setIsAddContactOpen(true)}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-2 rounded-lg flex items-center gap-2 text-sm"
                    >
                      <Plus className="w-4 h-4" />
                      {t(
                        "agencyDashboard.clientCRM.modal.profile.actions.addContact",
                      )}
                    </Button>
                  </div>

                  <div className="space-y-3">
                    {isLoadingContacts ? (
                      <div className="text-center py-12 text-gray-400 font-bold">
                        <RefreshCw className="w-8 h-8 mx-auto mb-3 animate-spin" />
                        {t(
                          "agencyDashboard.clientCRM.modal.profile.states.loadingContacts",
                        )}
                      </div>
                    ) : contacts.length === 0 ? (
                      <div className="text-center py-16 border-2 border-dashed border-gray-100 rounded-2xl bg-gray-50/30">
                        <Users className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                        <p className="text-gray-400 font-bold">
                          {t(
                            "agencyDashboard.clientCRM.modal.profile.states.noContacts",
                          )}
                        </p>
                      </div>
                    ) : (
                      contacts.map((contact) => (
                        <Card
                          key={contact.id}
                          className="p-4 border-gray-100 rounded-2xl shadow-sm hover:shadow-md transition-shadow flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 bg-white group"
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 font-bold text-lg group-hover:bg-indigo-100 transition-colors flex-shrink-0">
                              {contact.name.charAt(0)}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h5 className="font-bold text-gray-900">
                                  {contact.name}
                                </h5>
                                {contact.is_primary && (
                                  <Badge className="bg-indigo-100 text-indigo-700 border-none text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter">
                                    {t(
                                      "agencyDashboard.clientCRM.modal.profile.common.primary",
                                    )}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-gray-500 font-bold">
                                {contact.role ||
                                  t(
                                    "agencyDashboard.clientCRM.modal.profile.common.noRole",
                                  )}
                              </p>
                            </div>
                          </div>
                          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 text-xs font-bold pl-14 sm:pl-0">
                            <div className="flex items-center gap-2 text-gray-600">
                              <div className="p-1.5 bg-gray-50 rounded-lg flex-shrink-0">
                                <Mail className="w-3.5 h-3.5 text-gray-400" />
                              </div>
                              <span className="truncate">
                                {contact.email || "—"}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-gray-600">
                              <div className="p-1.5 bg-gray-50 rounded-lg flex-shrink-0">
                                <Phone className="w-3.5 h-3.5 text-gray-400" />
                              </div>
                              {contact.phone || "—"}
                            </div>
                          </div>
                        </Card>
                      ))
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="communications" className="space-y-6 mt-0">
                  <div className="flex justify-between items-center">
                    <h4 className="font-bold text-gray-900">
                      {t(
                        "agencyDashboard.clientCRM.modal.profile.sections.communicationHistory",
                      )}
                    </h4>
                    <Button
                      onClick={() => setIsLogCommOpen(true)}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-2 rounded-lg flex items-center gap-2 text-sm"
                    >
                      <Plus className="w-4 h-4" />
                      {t(
                        "agencyDashboard.clientCRM.modal.profile.actions.logCommunication",
                      )}
                    </Button>
                  </div>

                  <div className="space-y-4">
                    {isLoadingComms ? (
                      <div className="text-center py-12 text-gray-400 font-bold">
                        <RefreshCw className="w-8 h-8 mx-auto mb-3 animate-spin" />
                        {t(
                          "agencyDashboard.clientCRM.modal.profile.states.loadingHistory",
                        )}
                      </div>
                    ) : communications.length === 0 ? (
                      <div className="text-center py-16 border-2 border-dashed border-gray-100 rounded-2xl bg-gray-50/30">
                        <History className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                        <p className="text-gray-400 font-bold">
                          {t(
                            "agencyDashboard.clientCRM.modal.profile.states.noCommunications",
                          )}
                        </p>
                      </div>
                    ) : (
                      <Accordion
                        type="single"
                        collapsible
                        className="w-full space-y-4"
                      >
                        {communications.map((comm) => (
                          <AccordionItem
                            key={comm.id}
                            value={comm.id}
                            className="group border-gray-100 rounded-2xl shadow-sm bg-white px-5 border"
                          >
                            <AccordionTrigger className="hover:no-underline py-4">
                              <div className="flex items-center gap-3 text-left">
                                <div className="p-2 bg-gray-50 rounded-lg shrink-0">
                                  {comm.type === "email" && (
                                    <Mail className="w-4 h-4 text-indigo-500" />
                                  )}
                                  {comm.type === "call" && (
                                    <Phone className="w-4 h-4 text-emerald-500" />
                                  )}
                                  {comm.type === "meeting" && (
                                    <Users className="w-4 h-4 text-blue-500" />
                                  )}
                                  {comm.type === "other" && (
                                    <FileText className="w-4 h-4 text-gray-500" />
                                  )}
                                </div>
                                <div>
                                  <h5 className="font-bold text-gray-900">
                                    {comm.subject}
                                  </h5>
                                  <p className="text-[10px] text-gray-400 font-black uppercase tracking-wider">
                                    {comm.type} •{" "}
                                    {new Date(
                                      comm.occurred_at,
                                    ).toLocaleDateString(undefined, {
                                      month: "short",
                                      day: "numeric",
                                      year: "numeric",
                                    })}
                                  </p>
                                  <p className="text-sm text-gray-500 font-medium line-clamp-2 mt-2 group-data-[state=open]:hidden">
                                    {comm.content}
                                  </p>
                                </div>
                              </div>
                            </AccordionTrigger>
                            <AccordionContent className="pb-4">
                              <div className="pt-4 border-t border-gray-50">
                                <p className="text-sm text-gray-600 font-medium leading-relaxed">
                                  {comm.content}
                                </p>
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        ))}
                      </Accordion>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="bookings" className="space-y-6 mt-0">
                  <div className="flex justify-between items-center">
                    <h4 className="font-bold text-gray-900">
                      {t(
                        "agencyDashboard.clientCRM.modal.profile.sections.bookingsHistory",
                      )}
                    </h4>
                  </div>

                  <div className="space-y-4">
                    {isLoadingBookings ? (
                      <div className="text-center py-12 text-gray-400 font-bold">
                        <RefreshCw className="w-8 h-8 mx-auto mb-3 animate-spin" />
                        {t(
                          "agencyDashboard.clientCRM.modal.profile.states.loadingBookings",
                        )}
                      </div>
                    ) : bookings.length === 0 ? (
                      <div className="text-center py-16 border-2 border-dashed border-gray-100 rounded-2xl bg-gray-50/30">
                        <Calendar className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                        <p className="text-gray-400 font-bold">
                          {t(
                            "agencyDashboard.clientCRM.modal.profile.states.noBookings",
                          )}
                        </p>
                      </div>
                    ) : (
                      bookings.map((booking: any) => (
                        <Card
                          key={booking.id}
                          className="p-5 border-gray-100 rounded-2xl shadow-sm bg-white hover:shadow-md transition-shadow"
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                                <Users className="w-6 h-6" />
                              </div>
                              <div>
                                <h5 className="font-bold text-gray-900">
                                  {booking.talent_name ||
                                    t(
                                      "agencyDashboard.clientCRM.modal.profile.common.unknownTalent",
                                    )}
                                </h5>
                                <div className="flex items-center gap-2 mt-1">
                                  <Badge
                                    className={`${
                                      booking.status === "confirmed"
                                        ? "bg-green-100 text-green-700"
                                        : booking.status === "pending"
                                          ? "bg-yellow-100 text-yellow-700"
                                          : "bg-gray-100 text-gray-700"
                                    } border-none text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter`}
                                  >
                                    {booking.status}
                                  </Badge>
                                  <span className="text-[10px] text-gray-400 font-black uppercase tracking-wider">
                                    {booking.type}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-bold text-gray-900">
                                {new Date(booking.date).toLocaleDateString(
                                  undefined,
                                  {
                                    month: "short",
                                    day: "numeric",
                                    year: "numeric",
                                  },
                                )}
                              </p>
                              <p className="text-[10px] text-gray-400 font-black uppercase tracking-wider mt-1">
                                {booking.location ||
                                  t(
                                    "agencyDashboard.clientCRM.modal.profile.common.noLocation",
                                  )}
                              </p>
                            </div>
                          </div>
                        </Card>
                      ))
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="files" className="space-y-6 mt-0">
                  <Card className="p-6 border-gray-100 rounded-2xl shadow-sm space-y-4">
                    <h4 className="font-bold text-gray-900">
                      {t(
                        "agencyDashboard.clientCRM.modal.profile.sections.notes",
                      )}
                    </h4>
                    <Textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder={t(
                        "agencyDashboard.clientCRM.modal.profile.placeholders.notes",
                      )}
                      className="min-h-[120px] bg-white border-gray-200 rounded-xl resize-none font-medium"
                    />
                    <Button
                      onClick={() => updateNotesMutation.mutate(notes)}
                      disabled={updateNotesMutation.isPending}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 rounded-xl"
                    >
                      {updateNotesMutation.isPending ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : null}
                      {t(
                        "agencyDashboard.clientCRM.modal.profile.actions.saveNotes",
                      )}
                    </Button>
                  </Card>

                  <Card className="p-6 border-gray-100 rounded-2xl shadow-sm space-y-6">
                    <div className="flex justify-between items-center">
                      <h4 className="font-bold text-gray-900">
                        {t(
                          "agencyDashboard.clientCRM.modal.profile.sections.filesDocuments",
                        )}
                      </h4>
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                      <Button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-2 rounded-lg flex items-center gap-2 text-sm"
                      >
                        {isUploading ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Plus className="w-4 h-4" />
                        )}
                        {t(
                          "agencyDashboard.clientCRM.modal.profile.actions.uploadFile",
                        )}
                      </Button>
                    </div>

                    <div className="space-y-3">
                      {isLoadingFiles ? (
                        <div className="text-center py-12 text-gray-400 font-bold">
                          <RefreshCw className="w-8 h-8 mx-auto mb-3 animate-spin" />
                          {t(
                            "agencyDashboard.clientCRM.modal.profile.states.loadingDocuments",
                          )}
                        </div>
                      ) : files.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50/50">
                          <File className="w-12 h-12 text-gray-300 mb-3" />
                          <p className="text-gray-500 font-bold">
                            {t(
                              "agencyDashboard.clientCRM.modal.profile.states.noFiles",
                            )}
                          </p>
                        </div>
                      ) : (
                        files.map((file: any) => (
                          <Card
                            key={file.id}
                            className="p-4 border-gray-100 rounded-2xl shadow-sm hover:shadow-md transition-shadow flex justify-between items-center bg-white group"
                          >
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                                <FileText className="w-5 h-5" />
                              </div>
                              <div>
                                <h5 className="font-bold text-gray-900 text-sm">
                                  {file.file_name}
                                </h5>
                                <p className="text-[10px] text-gray-400 font-black uppercase tracking-wider">
                                  {t(
                                    "agencyDashboard.clientCRM.modal.profile.common.added",
                                  )}{" "}
                                  {new Date(
                                    file.created_at,
                                  ).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-gray-400 hover:text-indigo-600 font-bold flex items-center gap-2"
                              disabled={fetchingUrlId === file.id}
                              onClick={() => handleViewFile(file)}
                            >
                              {fetchingUrlId === file.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Download className="w-4 h-4" />
                              )}
                              {t(
                                "agencyDashboard.clientCRM.modal.profile.actions.viewFile",
                              )}
                            </Button>
                          </Card>
                        ))
                      )}
                    </div>
                  </Card>
                </TabsContent>
              </div>
            </Tabs>
          </div>

          <div className="p-4 sm:p-8 pt-4 sm:pt-6 border-t border-gray-100 bg-white shrink-0">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
              <div className="flex gap-2 sm:gap-3">
                <Button
                  variant="outline"
                  onClick={onEdit}
                  className="h-9 sm:h-11 px-4 sm:px-6 rounded-xl border-gray-200 text-gray-700 font-bold hover:bg-gray-50 transition-colors text-xs sm:text-sm"
                >
                  <Edit className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
                  {t(
                    "agencyDashboard.clientCRM.modal.profile.actions.editClient",
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={onDelete}
                  className="h-9 sm:h-11 px-4 sm:px-6 rounded-xl border-red-100 text-red-500 hover:bg-red-50 font-bold transition-colors text-xs sm:text-sm"
                >
                  <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
                  {t("agencyDashboard.clientCRM.actions.deleteClient")}
                </Button>
              </div>
              <Button
                onClick={onClose}
                className="h-9 sm:h-11 px-6 sm:px-10 bg-gray-900 hover:bg-gray-800 text-white font-bold rounded-xl shadow-lg shadow-gray-200 transition-all active:scale-95 text-xs sm:text-sm"
              >
                {t("agencyDashboard.clientCRM.modal.profile.actions.close")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AddContactModal
        clientId={client.id}
        isOpen={isAddContactOpen}
        onClose={() => setIsAddContactOpen(false)}
      />

      <LogCommunicationModal
        clientId={client.id}
        contacts={contacts}
        isOpen={isLogCommOpen}
        onClose={() => setIsLogCommOpen(false)}
      />
    </>
  );
};

export default ClientProfileModal;
