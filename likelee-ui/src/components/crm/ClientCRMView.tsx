import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  TrendingUp,
  Users,
  DollarSign,
  Clock,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import * as crmApi from "@/api/crm";
import { Client } from "@/types/crm";
import ClientCard from "./ClientCard";
import AddClientModal from "./AddClientModal";
import EditClientModal from "./EditClientModal";
import ClientProfileModal from "./ClientProfileModal";

const ClientCRMView = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [stageFilter, setStageFilter] = useState("all");
  const [sortBy, setSortBy] = useState("last-booking");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [isEditClientOpen, setIsEditClientOpen] = useState(false);
  const [isDeleteClientOpen, setIsDeleteClientOpen] = useState(false);
  const [clientToEdit, setClientToEdit] = useState<any>(null);
  const [clientToDelete, setClientToDelete] = useState<any>(null);

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const deleteClientMutation = useMutation({
    mutationFn: (id: string) => crmApi.deleteClient(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agency-clients"] });
      toast({
        title: "Success",
        description: "Client deleted successfully",
      });
      setIsDeleteClientOpen(false);
      setClientToDelete(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete client",
        variant: "destructive",
      });
    },
  });

  const handleDeleteClient = () => {
    if (clientToDelete) {
      deleteClientMutation.mutate(clientToDelete.id);
    }
  };

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ["agency-clients"],
    queryFn: async () => {
      const resp = await crmApi.listClients();
      return (resp as any[]).map((c: any) => ({
        id: c.id,
        name: c.company,
        status: c.status,
        industry: c.industry || "Unknown",
        website: c.website || "",
        contacts: c.metrics?.contacts || 0,
        totalRevenue: c.metrics?.revenue || "$0",
        bookings: c.metrics?.bookings || 0,
        lastBooking: c.metrics?.lastBookingDate || "Never",
        nextFollowUp: c.next_follow_up_date
          ? new Date(c.next_follow_up_date).toLocaleDateString()
          : "None",
        next_follow_up_date: c.next_follow_up_date,
        tags: c.tags || [],
        notes: c.notes || "",
        preferences: c.preferences || {
          talentTypes: [],
          budgetRange: "",
          leadTime: "",
        },
        metrics: {
          revenue: c.metrics?.revenue || "$0",
          revenue_cents: c.metrics?.revenue_cents || 0,
          bookings: c.metrics?.bookings || 0,
          packagesSent: c.metrics?.packagesSent || 0,
          lastBookingDate: c.metrics?.lastBookingDate || "Never",
          contacts: c.metrics?.contacts || 0,
        },
      }));
    },
  });

  const filteredClients = clients.filter((client: Client) => {
    const matchesSearch =
      client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.industry.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStage =
      stageFilter === "all" ||
      client.status.toLowerCase().includes(stageFilter.toLowerCase());
    return matchesSearch && matchesStage;
  });

  return (
    <div className="space-y-8">

      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Client Relationship Management
          </h1>
          <p className="text-gray-600 font-medium">
            Manage client relationships, track communications, and monitor
            pipeline
          </p>
        </div>
        <Button
          onClick={() => setIsAddModalOpen(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 py-2 rounded-xl flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Add Client
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="p-6 bg-green-50/50 border-green-100 rounded-2xl">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
            <span className="text-base font-bold text-green-800">
              Active Clients
            </span>
          </div>
          <span className="text-3xl font-bold text-green-900">
            {clients.filter((c) => (c.bookings || 0) > 0).length}
          </span>
        </Card>
        <Card className="p-6 bg-blue-50/50 border-blue-100 rounded-2xl">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <span className="text-base font-bold text-blue-800">Prospects</span>
          </div>
          <span className="text-3xl font-bold text-blue-900">
            {clients.filter((c) => c.status === "Prospect" || c.status === "Lead").length}
          </span>
        </Card>
        <Card className="p-6 bg-purple-50/50 border-purple-100 rounded-2xl">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <DollarSign className="w-5 h-5 text-purple-600" />
            </div>
            <span className="text-base font-bold text-purple-800">
              Total Revenue
            </span>
          </div>
          <span className="text-3xl font-bold text-purple-900">
            {(() => {
              const totalCents = clients.reduce((sum, c) => sum + (c.metrics?.revenue_cents || 0), 0);
              const totalDollars = totalCents / 100;
              if (totalDollars >= 1000) {
                return `$${(totalDollars / 1000).toLocaleString(undefined, { maximumFractionDigits: 1 })}K`;
              }
              return `$${totalDollars.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
            })()}
          </span>
        </Card>
        <Card className="p-6 bg-orange-50/50 border-orange-100 rounded-2xl">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Clock className="w-5 h-5 text-orange-600" />
            </div>
            <span className="text-base font-bold text-orange-800">
              Follow-ups Due
            </span>
          </div>
          <span className="text-3xl font-bold text-orange-900">
            {clients.filter(c => {
              if (!c.next_follow_up_date) return false;
              const d = new Date(c.next_follow_up_date);
              return d <= new Date();
            }).length}
          </span>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-6">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <Input
            placeholder="Search clients..."
            className="pl-12 h-12 bg-white border-gray-100 rounded-xl text-base"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Select value={stageFilter} onValueChange={setStageFilter}>
          <SelectTrigger className="w-full md:w-56 h-12 bg-white border-gray-100 rounded-xl text-base">
            <SelectValue placeholder="All Stages" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Stages</SelectItem>
            <SelectItem value="leads">Leads</SelectItem>
            <SelectItem value="prospects">Prospects</SelectItem>
            <SelectItem value="active">Active Clients</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-full md:w-56 h-12 bg-white border-gray-100 rounded-xl text-base">
            <SelectValue placeholder="Last Booking" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="last-booking">Last Booking</SelectItem>
            <SelectItem value="revenue">Total Revenue</SelectItem>
            <SelectItem value="name">Company Name</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Client List */}
      <div className="space-y-4">
        {filteredClients.map((client) => (
          <ClientCard
            key={client.id}
            client={client}
            onViewProfile={() => setSelectedClient(client)}
          />
        ))}
      </div>

      <AddClientModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
      />
      {selectedClient && (
        <ClientProfileModal
          client={selectedClient}
          isOpen={!!selectedClient}
          onClose={() => setSelectedClient(null)}
          onEdit={() => {
            setClientToEdit(selectedClient);
            setIsEditClientOpen(true);
          }}
          onDelete={() => {
            setClientToDelete(selectedClient);
            setIsDeleteClientOpen(true);
          }}
        />
      )}

      {clientToEdit && (
        <EditClientModal
          client={clientToEdit}
          isOpen={isEditClientOpen}
          onClose={() => {
            setIsEditClientOpen(false);
            setClientToEdit(null);
          }}
        />
      )}

      <Dialog open={isDeleteClientOpen} onOpenChange={setIsDeleteClientOpen}>
        <DialogContent className="sm:max-w-[425px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-gray-900">
              Delete Client?
            </DialogTitle>
            <DialogDescription className="text-gray-500">
              Are you sure you want to delete{" "}
              <span className="font-bold text-gray-900">
                {clientToDelete?.company}
              </span>
              ? This action cannot be undone and will remove all associated data.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setIsDeleteClientOpen(false)}
              className="rounded-xl font-bold border-gray-200"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteClient}
              disabled={deleteClientMutation.isPending}
              className="rounded-xl font-bold bg-red-600 hover:bg-red-700"
            >
              {deleteClientMutation.isPending ? "Deleting..." : "Delete Client"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ClientCRMView;
