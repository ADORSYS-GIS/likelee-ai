import React, { useEffect, useMemo, useState } from "react";
import {
  Search,
  Plus,
  ChevronRight,
  Building2,
  User,
  Mail,
  Phone,
  CreditCard,
  MapPin,
  Globe,
  Calendar,
  Edit,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { getAgencyClients } from "@/api/functions";
import { AddClientModal } from "../Modals/AddClientModal";
import { MergeClientsModal } from "../Modals/MergeClientsModal";

export const ClientDatabaseTab = () => {
  const [clients, setClients] = useState<any[]>([]);
  const [addClientOpen, setAddClientOpen] = useState(false);
  const [mergeOpen, setMergeOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [selectedClientForEdit, setSelectedClientForEdit] = useState<any>(null);
  const [search, setSearch] = useState("");

  // Load clients from backend on mount
  useEffect(() => {
    (async () => {
      try {
        const rows = await getAgencyClients();
        const arr = Array.isArray(rows) ? rows : [];
        const mapped = arr.map((r: any) => ({
          id: r.id,
          company: r.company,
          contact: r.contact_name || "",
          email: r.email || "",
          phone: r.phone || "",
          terms: r.terms || "Net 30",
          industryTags: r.industry_tags || [],
          revenue: r.revenue || 0,
          bookings_count: r.bookings_count || 0,
        }));
        setClients(mapped);
      } catch (_e) {
        setClients([]);
      }
    })();
  }, []);

  const totalRevenue = useMemo(
    () => clients.reduce((acc, c: any) => acc + (c.revenue || 0), 0),
    [clients],
  );
  const stats = [
    { label: "Total Clients", value: clients.length.toString() },
    { label: "Active This Month", value: "1" },
    { label: "Total Revenue", value: `$${totalRevenue}` },
    {
      label: "Avg. Booking Value",
      value: `$${(totalRevenue / (clients.length || 1)).toFixed(0)}`,
    },
  ];

  const handleMerge = (sourceId: string, targetId: string) => {
    setClients((prev) => prev.filter((c) => c.id !== sourceId));
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Client Database</h2>
          <p className="text-gray-500 font-medium text-sm mt-1">
            Manage your client relationships and booking history
          </p>
        </div>
        <Button
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
          onClick={() => setAddClientOpen(true)}
        >
          <Plus className="w-4 h-4 mr-2" /> Add Client
        </Button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {stats.map((s) => (
          <Card
            key={s.label}
            className="p-6 bg-white border border-gray-200 shadow-sm rounded-xl"
          >
            <p className="text-xs font-bold text-gray-500 uppercase mb-2">
              {s.label}
            </p>
            <p className="text-4xl font-extrabold text-gray-900">{s.value}</p>
          </Card>
        ))}
      </div>

      <Card className="p-6 bg-white border border-gray-200 shadow-sm rounded-xl space-y-6">
        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search by company name..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select defaultValue="all">
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Industries</SelectItem>
              <SelectItem value="fashion">Fashion</SelectItem>
              <SelectItem value="beauty">Beauty</SelectItem>
              <SelectItem value="fitness">Fitness</SelectItem>
              <SelectItem value="commercial">Commercial</SelectItem>
              <SelectItem value="editorial">Editorial</SelectItem>
              <SelectItem value="ecommerce">E-commerce</SelectItem>
              <SelectItem value="advertising">Advertising</SelectItem>
              <SelectItem value="filmtv">Film/TV</SelectItem>
            </SelectContent>
          </Select>
          <Select defaultValue="name">
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Company Name</SelectItem>
              <SelectItem value="bookings">Most Bookings</SelectItem>
              <SelectItem value="revenue">Highest Revenue</SelectItem>
              <SelectItem value="recent">Recent Activity</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            className="font-bold text-gray-700"
            onClick={() => setMergeOpen(true)}
          >
            Merge Duplicates
          </Button>
        </div>

        <div className="overflow-hidden">
          {clients.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                      Company
                    </th>
                    <th className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                      Contact
                    </th>
                    <th className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                      Industries
                    </th>
                    <th className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                      Bookings
                    </th>
                    <th className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                      Revenue
                    </th>
                    <th className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {clients
                    .filter((c) =>
                      c.company
                        ?.toLowerCase()
                        .includes(search.trim().toLowerCase()),
                    )
                    .map((client) => (
                      <tr
                        key={client.id}
                        className="hover:bg-gray-50/50 cursor-pointer group transition-colors"
                        onClick={() => setSelectedClient(client)}
                      >
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="font-bold text-gray-900">
                            {client.company}
                          </div>
                          <div className="text-xs text-gray-500">
                            {client.email}
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-700">
                            {client.contact}
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="flex gap-1">
                            {(client.industryTags || [])
                              .slice(0, 2)
                              .map((t: string) => (
                                <Badge
                                  key={t}
                                  variant="secondary"
                                  className="text-[10px] bg-indigo-50 text-indigo-700 border-none font-bold"
                                >
                                  {t}
                                </Badge>
                              ))}
                            {(client.industryTags || []).length > 2 && (
                              <Badge
                                variant="secondary"
                                className="text-[10px] bg-gray-50 text-gray-500 border-none font-bold"
                              >
                                +{(client.industryTags || []).length - 2}
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="text-sm font-bold text-gray-900">
                            {client.bookings_count || 0}
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="text-sm font-extrabold text-green-600">
                            ${(client.revenue || 0).toLocaleString()}
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-right">
                          <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-600 transition-colors inline" />
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="border border-dashed border-gray-300 rounded-xl p-12 flex flex-col items-center justify-center text-center h-[300px]">
              <div className="bg-gray-50 p-4 rounded-full mb-4">
                <Building2 className="w-12 h-12 text-gray-400" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                No clients yet
              </h3>
              <p className="text-gray-500 max-w-md mb-4">
                Start adding clients to track your business relationships
              </p>
              <Button
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
                onClick={() => setAddClientOpen(true)}
              >
                <Plus className="w-4 h-4 mr-2" /> Add First Client
              </Button>
            </div>
          )}
        </div>
      </Card>

      <AddClientModal
        open={addClientOpen}
        onOpenChange={(open) => {
          setAddClientOpen(open);
          if (!open) setSelectedClientForEdit(null);
        }}
        onAdd={(newClient) => {
          setClients((prev) => {
            const exists = prev.find((c) => c.id === newClient.id);
            if (exists) {
              return prev.map((c) => (c.id === newClient.id ? newClient : c));
            }
            return [...prev, newClient];
          });
          if (selectedClient && selectedClient.id === newClient.id) {
            setSelectedClient(newClient);
          }
        }}
        initialData={selectedClientForEdit}
      />
      <MergeClientsModal
        open={mergeOpen}
        onOpenChange={setMergeOpen}
        clients={clients}
        onMerge={handleMerge}
      />

      {selectedClient && (
        <ClientProfileDrawer
          client={selectedClient}
          open={!!selectedClient}
          onOpenChange={(open) => !open && setSelectedClient(null)}
          onEdit={(client) => {
            setSelectedClientForEdit(client);
            setAddClientOpen(true);
          }}
          onDelete={(id) => {
            setClients((prev) => prev.filter((c) => c.id !== id));
            setSelectedClient(null);
          }}
        />
      )}
    </div>
  );
};

const ClientProfileDrawer = ({
  client,
  open,
  onOpenChange,
  onEdit,
  onDelete,
}: {
  client: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (client: any) => void;
  onDelete: (id: string) => void;
}) => {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-xl overflow-y-auto">
        <SheetHeader className="border-b pb-6 mb-6">
          <div className="flex items-center gap-4 mb-3">
            <div className="w-16 h-16 bg-white border-2 border-gray-900 rounded-xl flex items-center justify-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <Building2 className="w-8 h-8 text-gray-900" />
            </div>
            <div>
              <SheetTitle className="text-2xl font-black text-gray-900">
                {client.company}
              </SheetTitle>
              <div className="flex gap-2 mt-1">
                {(client.industryTags || []).map((t: string) => (
                  <Badge
                    key={t}
                    className="bg-indigo-100 text-indigo-700 hover:bg-indigo-200 border-none font-bold text-[10px]"
                  >
                    {t}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => onEdit(client)}
            >
              <Edit className="w-4 h-4 text-gray-600" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 border-red-200 hover:bg-red-50"
              onClick={() => onDelete(client.id)}
            >
              <Trash2 className="w-4 h-4 text-red-600" />
            </Button>
          </div>
        </SheetHeader>

        <div className="space-y-8">
          {/* Quick Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                Total Revenue
              </p>
              <p className="text-2xl font-black text-green-600">
                ${(client.revenue || 0).toLocaleString()}
              </p>
            </div>
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                Total Bookings
              </p>
              <p className="text-2xl font-black text-gray-900">
                {client.bookings_count || 0}
              </p>
            </div>
          </div>

          {/* Contact Details */}
          <div className="space-y-4">
            <h4 className="font-bold text-gray-900 border-b pb-2">
              Primary Contact
            </h4>
            <div className="grid grid-cols-2 gap-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-50 rounded-lg">
                  <User className="w-4 h-4 text-indigo-600" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase">
                    Name
                  </p>
                  <p className="text-sm font-bold text-gray-900">
                    {client.contact}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-50 rounded-lg">
                  <Mail className="w-4 h-4 text-indigo-600" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase">
                    Email
                  </p>
                  <p className="text-sm font-bold text-gray-900">
                    {client.email || "—"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-50 rounded-lg">
                  <Phone className="w-4 h-4 text-indigo-600" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase">
                    Phone
                  </p>
                  <p className="text-sm font-bold text-gray-900">
                    {client.phone || "—"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-50 rounded-lg">
                  <CreditCard className="w-4 h-4 text-indigo-600" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase">
                    Terms
                  </p>
                  <p className="text-sm font-bold text-gray-900">
                    {client.terms || "Net 15"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Address & Links */}
          <div className="space-y-4">
            <h4 className="font-bold text-gray-900 border-b pb-2">
              Location & Links
            </h4>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
                <p className="text-sm text-gray-600">
                  {client.address || "No address provided"}
                </p>
              </div>
              <div className="flex items-start gap-3">
                <Globe className="w-4 h-4 text-gray-400 mt-0.5" />
                <p className="text-sm text-indigo-600 font-medium hover:underline cursor-pointer">
                  {client.website || "No website provided"}
                </p>
              </div>
            </div>
          </div>

          {/* Recent Bookings Section */}
          <div className="space-y-4">
            <div className="flex justify-between items-center border-b pb-2">
              <h4 className="font-bold text-gray-900">Recent Bookings</h4>
              <Button
                variant="ghost"
                className="text-xs h-6 font-bold text-indigo-600"
              >
                View All
              </Button>
            </div>
            <div className="bg-gray-50 rounded-xl p-8 flex flex-col items-center justify-center text-center">
              <Calendar className="w-8 h-8 text-gray-300 mb-2" />
              <p className="text-sm text-gray-500">No booking history yet</p>
            </div>
          </div>

          <div className="pt-4 sticky bottom-0 bg-white pb-6">
            <Button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-12 rounded-xl text-lg shadow-lg">
              Create New Booking
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
