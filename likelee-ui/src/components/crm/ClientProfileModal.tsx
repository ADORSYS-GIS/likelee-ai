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
        title: "Notes Saved",
        description: "The client notes have been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
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
        title: "File Uploaded",
        description: "The document has been uploaded successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Upload Failed",
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
        title: "Error",
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
      : "Never";

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[900px] p-0 overflow-hidden rounded-2xl border-none max-h-[90vh] flex flex-col">
          <div className="p-8 pb-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-center">
                <Building2 className="w-6 h-6 text-gray-400" />
              </div>
              <div className="flex items-center gap-3">
                <DialogTitle className="text-2xl font-bold text-gray-900">
                  {client.name}
                </DialogTitle>
                <Badge className="bg-green-100 text-green-700 border-none font-bold text-[10px]">
                  {client.status}
                </Badge>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-hidden flex flex-col px-8">
            <Tabs
              defaultValue="overview"
              className="flex-1 flex flex-col overflow-hidden"
            >
              <TabsList className="w-full justify-start bg-gray-50/50 p-1 rounded-xl h-12 mb-6 shrink-0">
                <TabsTrigger
                  value="overview"
                  className="flex-1 rounded-lg data-[state=active]:bg-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-sm font-bold text-sm transition-all"
                >
                  Overview
                </TabsTrigger>
                <TabsTrigger
                  value="contacts"
                  className="flex-1 rounded-lg data-[state=active]:bg-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-sm font-bold text-sm transition-all"
                >
                  Contacts
                </TabsTrigger>
                <TabsTrigger
                  value="communications"
                  className="flex-1 rounded-lg data-[state=active]:bg-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-sm font-bold text-sm transition-all"
                >
                  Communications
                </TabsTrigger>
                <TabsTrigger
                  value="bookings"
                  className="flex-1 rounded-lg data-[state=active]:bg-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-sm font-bold text-sm transition-all"
                >
                  Bookings
                </TabsTrigger>
                <TabsTrigger
                  value="files"
                  className="flex-1 rounded-lg data-[state=active]:bg-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-sm font-bold text-sm transition-all"
                >
                  Files & Notes
                </TabsTrigger>
              </TabsList>

              <div className="flex-1 overflow-y-auto pr-2 -mr-2 pb-8">
                <TabsContent value="overview" className="space-y-6 mt-0">
                  <div className="grid grid-cols-2 gap-6">
                    <Card className="p-6 border-gray-100 rounded-2xl shadow-sm">
                      <div className="flex items-center gap-2 mb-4">
                        <Building2 className="w-5 h-5 text-gray-400" />
                        <h4 className="font-bold text-gray-900">
                          Company Information
                        </h4>
                      </div>
                      <div className="space-y-4">
                        <div>
                          <p className="text-xs text-gray-600 font-bold uppercase tracking-wider">
                            Industry
                          </p>
                          <p className="text-sm font-bold text-gray-900">
                            {client.industry}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600 font-bold uppercase tracking-wider">
                            Website
                          </p>
                          <p className="text-sm font-bold text-gray-900">
                            {client.website}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600 font-bold uppercase tracking-wider">
                            Next Follow-up
                          </p>
                          <p className="text-sm font-bold text-indigo-600">
                            {client.nextFollowUp}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600 font-bold uppercase tracking-wider mb-2">
                            Tags
                          </p>
                          <div className="flex gap-2">
                            {client.tags.map((tag) => (
                              <Badge
                                key={tag}
                                variant="outline"
                                className="text-[10px] font-bold text-gray-500 border-gray-200"
                              >
                                {tag}
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
                          Client Preferences
                        </h4>
                      </div>
                      <div className="space-y-4">
                        <div>
                          <p className="text-xs text-gray-600 font-bold uppercase tracking-wider">
                            Preferred Talent Types
                          </p>
                          <p className="text-sm font-bold text-gray-900">
                            {client.preferences?.talentTypes?.join(", ") || "—"}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600 font-bold uppercase tracking-wider">
                            Budget Range
                          </p>
                          <p className="text-sm font-bold text-gray-900">
                            {client.preferences?.budgetRange || "—"}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600 font-bold uppercase tracking-wider">
                            Booking Lead Time
                          </p>
                          <p className="text-sm font-bold text-gray-900">
                            {client.preferences?.leadTime || "—"}
                          </p>
                        </div>
                      </div>
                    </Card>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-bold text-gray-900">Client Metrics</h4>
                    <div className="grid grid-cols-4 gap-4">
                      <Card className="p-4 bg-white border-gray-100 rounded-2xl text-center shadow-sm">
                        <span className="text-2xl font-bold text-indigo-600 block">
                          {totalRevenue}
                        </span>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                          Total Revenue
                        </span>
                      </Card>
                      <Card className="p-4 bg-white border-gray-100 rounded-2xl text-center shadow-sm">
                        <span className="text-2xl font-bold text-emerald-600 block">
                          {totalBookingsCount}
                        </span>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                          Total Bookings
                        </span>
                      </Card>
                      <Card className="p-4 bg-white border-gray-100 rounded-2xl text-center shadow-sm">
                        <span className="text-2xl font-bold text-blue-600 block">
                          {client.metrics?.packagesSent || 0}
                        </span>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                          Packages Sent
                        </span>
                      </Card>
                      <Card className="p-4 bg-white border-gray-100 rounded-2xl text-center shadow-sm">
                        <span className="text-2xl font-bold text-orange-600 block">
                          {lastBooking}
                        </span>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                          Last Booking
                        </span>
                      </Card>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="contacts" className="space-y-6 mt-0">
                  <div className="flex justify-between items-center">
                    <h4 className="font-bold text-gray-900">Contact List</h4>
                    <Button
                      onClick={() => setIsAddContactOpen(true)}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-2 rounded-lg flex items-center gap-2 text-sm"
                    >
                      <Plus className="w-4 h-4" />
                      Add Contact
                    </Button>
                  </div>

                  <div className="space-y-3">
                    {isLoadingContacts ? (
                      <div className="text-center py-12 text-gray-400 font-bold">
                        <RefreshCw className="w-8 h-8 mx-auto mb-3 animate-spin" />
                        Loading contacts...
                      </div>
                    ) : contacts.length === 0 ? (
                      <div className="text-center py-16 border-2 border-dashed border-gray-100 rounded-2xl bg-gray-50/30">
                        <Users className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                        <p className="text-gray-400 font-bold">
                          No contacts added yet
                        </p>
                      </div>
                    ) : (
                      contacts.map((contact) => (
                        <Card
                          key={contact.id}
                          className="p-4 border-gray-100 rounded-2xl shadow-sm hover:shadow-md transition-shadow flex justify-between items-center bg-white group"
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 font-bold text-lg group-hover:bg-indigo-100 transition-colors">
                              {contact.name.charAt(0)}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h5 className="font-bold text-gray-900">
                                  {contact.name}
                                </h5>
                                {contact.is_primary && (
                                  <Badge className="bg-indigo-100 text-indigo-700 border-none text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter">
                                    Primary
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-gray-500 font-bold">
                                {contact.role || "No role specified"}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-6 text-xs font-bold">
                            <div className="flex items-center gap-2 text-gray-600">
                              <div className="p-1.5 bg-gray-50 rounded-lg">
                                <Mail className="w-3.5 h-3.5 text-gray-400" />
                              </div>
                              {contact.email || "—"}
                            </div>
                            <div className="flex items-center gap-2 text-gray-600">
                              <div className="p-1.5 bg-gray-50 rounded-lg">
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
                      Communication History
                    </h4>
                    <Button
                      onClick={() => setIsLogCommOpen(true)}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-2 rounded-lg flex items-center gap-2 text-sm"
                    >
                      <Plus className="w-4 h-4" />
                      Log Communication
                    </Button>
                  </div>

                  <div className="space-y-4">
                    {isLoadingComms ? (
                      <div className="text-center py-12 text-gray-400 font-bold">
                        <RefreshCw className="w-8 h-8 mx-auto mb-3 animate-spin" />
                        Loading history...
                      </div>
                    ) : communications.length === 0 ? (
                      <div className="text-center py-16 border-2 border-dashed border-gray-100 rounded-2xl bg-gray-50/30">
                        <History className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                        <p className="text-gray-400 font-bold">
                          No communications logged yet
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
                      Bookings History
                    </h4>
                  </div>

                  <div className="space-y-4">
                    {isLoadingBookings ? (
                      <div className="text-center py-12 text-gray-400 font-bold">
                        <RefreshCw className="w-8 h-8 mx-auto mb-3 animate-spin" />
                        Loading bookings...
                      </div>
                    ) : bookings.length === 0 ? (
                      <div className="text-center py-16 border-2 border-dashed border-gray-100 rounded-2xl bg-gray-50/30">
                        <Calendar className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                        <p className="text-gray-400 font-bold">
                          No bookings found for this client
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
                                  {booking.talent_name || "Unknown Talent"}
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
                                {booking.location || "No location"}
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
                    <h4 className="font-bold text-gray-900">Notes</h4>
                    <Textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Enter client notes, preferences, or internal details..."
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
                      Save Notes
                    </Button>
                  </Card>

                  <Card className="p-6 border-gray-100 rounded-2xl shadow-sm space-y-6">
                    <div className="flex justify-between items-center">
                      <h4 className="font-bold text-gray-900">
                        Files & Documents
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
                        Upload File
                      </Button>
                    </div>

                    <div className="space-y-3">
                      {isLoadingFiles ? (
                        <div className="text-center py-12 text-gray-400 font-bold">
                          <RefreshCw className="w-8 h-8 mx-auto mb-3 animate-spin" />
                          Loading documents...
                        </div>
                      ) : files.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50/50">
                          <File className="w-12 h-12 text-gray-300 mb-3" />
                          <p className="text-gray-500 font-bold">
                            No files uploaded yet
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
                                  Added{" "}
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
                              View
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

          <div className="p-8 pt-6 border-t border-gray-100 bg-white shrink-0">
            <div className="flex justify-between items-center">
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={onEdit}
                  className="h-11 px-6 rounded-xl border-gray-200 text-gray-700 font-bold hover:bg-gray-50 transition-colors"
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Client
                </Button>
                <Button
                  variant="outline"
                  onClick={onDelete}
                  className="h-11 px-6 rounded-xl border-red-100 text-red-500 hover:bg-red-50 font-bold transition-colors"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Client
                </Button>
              </div>
              <Button
                onClick={onClose}
                className="h-11 px-10 bg-gray-900 hover:bg-gray-800 text-white font-bold rounded-xl shadow-lg shadow-gray-200 transition-all active:scale-95"
              >
                Close
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
