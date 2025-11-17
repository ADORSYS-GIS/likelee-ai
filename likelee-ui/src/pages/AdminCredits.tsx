import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Shield, Coins, Plus, Minus, Users, Search } from "lucide-react";

export default function AdminCredits() {
  const [searchEmail, setSearchEmail] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [creditAmount, setCreditAmount] = useState("");
  const [planType, setPlanType] = useState("free");
  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const { data: allUsers } = useQuery({
    queryKey: ['allUsers'],
    queryFn: () => base44.entities.User.list(),
    enabled: currentUser?.role === 'admin'
  });

  const { data: allCredits } = useQuery({
    queryKey: ['allCredits'],
    queryFn: () => base44.entities.StudioCredits.list('-updated_date', 50),
    enabled: currentUser?.role === 'admin'
  });

  const { data: selectedUserCredits } = useQuery({
    queryKey: ['userCredits', selectedUser],
    queryFn: async () => {
      const result = await base44.entities.StudioCredits.filter({ user_email: selectedUser });
      return result[0];
    },
    enabled: !!selectedUser
  });

  const addCreditsMutation = useMutation({
    mutationFn: async ({ email, amount, plan }) => {
      const existing = await base44.entities.StudioCredits.filter({ user_email: email });
      
      if (existing[0]) {
        return await base44.entities.StudioCredits.update(existing[0].id, {
          credits_balance: existing[0].credits_balance + amount,
          plan_type: plan
        });
      } else {
        return await base44.entities.StudioCredits.create({
          user_email: email,
          credits_balance: amount,
          plan_type: plan,
          monthly_limit: plan === 'lite' ? 300 : plan === 'pro' ? 2000 : 0
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allCredits'] });
      queryClient.invalidateQueries({ queryKey: ['userCredits'] });
      setCreditAmount("");
    }
  });

  const removeCreditsMutation = useMutation({
    mutationFn: async ({ email, amount }) => {
      const existing = await base44.entities.StudioCredits.filter({ user_email: email });
      
      if (existing[0]) {
        const newBalance = Math.max(0, existing[0].credits_balance - amount);
        return await base44.entities.StudioCredits.update(existing[0].id, {
          credits_balance: newBalance
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allCredits'] });
      queryClient.invalidateQueries({ queryKey: ['userCredits'] });
      setCreditAmount("");
    }
  });

  const filteredUsers = allUsers?.filter(u => 
    u.email.toLowerCase().includes(searchEmail.toLowerCase()) ||
    u.full_name?.toLowerCase().includes(searchEmail.toLowerCase())
  );

  if (currentUser?.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <Card className="p-8 max-w-md text-center">
          <Shield className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600">You need admin privileges to access this page.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className="w-8 h-8 text-indigo-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Credit Management</h1>
                <p className="text-sm text-gray-600">Admin Dashboard</p>
              </div>
            </div>
            <Badge className="bg-indigo-100 text-indigo-700">Admin</Badge>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left: User Selection */}
          <div className="lg:col-span-1">
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Users className="w-5 h-5 text-gray-600" />
                <h2 className="text-lg font-bold text-gray-900">Select User</h2>
              </div>

              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    value={searchEmail}
                    onChange={(e) => setSearchEmail(e.target.value)}
                    placeholder="Search by email or name..."
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2 max-h-96 overflow-y-auto">
                {filteredUsers?.map((user) => {
                  const userCredits = allCredits?.find(c => c.user_email === user.email);
                  return (
                    <button
                      key={user.id}
                      onClick={() => setSelectedUser(user.email)}
                      className={`w-full p-3 text-left rounded-lg border-2 transition-all ${
                        selectedUser === user.email
                          ? 'border-indigo-500 bg-indigo-50'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      <p className="font-medium text-gray-900 text-sm">{user.full_name || 'No name'}</p>
                      <p className="text-xs text-gray-600 mb-2">{user.email}</p>
                      <div className="flex items-center gap-2">
                        <Badge className="text-xs bg-yellow-100 text-yellow-700">
                          {userCredits?.credits_balance || 0} credits
                        </Badge>
                        {userCredits?.plan_type && (
                          <Badge className="text-xs bg-gray-100 text-gray-700">
                            {userCredits.plan_type}
                          </Badge>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </Card>
          </div>

          {/* Right: Credit Management */}
          <div className="lg:col-span-2">
            {selectedUser ? (
              <div className="space-y-6">
                {/* Current Balance */}
                <Card className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-lg font-bold text-gray-900 mb-1">Current Balance</h2>
                      <p className="text-sm text-gray-600">{selectedUser}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-4xl font-bold text-gray-900">
                        {selectedUserCredits?.credits_balance || 0}
                      </p>
                      <p className="text-sm text-gray-600">credits</p>
                    </div>
                  </div>

                  {selectedUserCredits && (
                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200">
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Plan Type</p>
                        <Badge className="bg-indigo-100 text-indigo-700">
                          {selectedUserCredits.plan_type}
                        </Badge>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Monthly Limit</p>
                        <p className="font-medium text-gray-900">
                          {selectedUserCredits.monthly_limit || 'Unlimited'}
                        </p>
                      </div>
                    </div>
                  )}
                </Card>

                {/* Add Credits */}
                <Card className="p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Plus className="w-5 h-5 text-green-600" />
                    <h2 className="text-lg font-bold text-gray-900">Add Credits</h2>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Credit Amount
                      </label>
                      <Input
                        type="number"
                        value={creditAmount}
                        onChange={(e) => setCreditAmount(e.target.value)}
                        placeholder="Enter amount..."
                        min="0"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Plan Type
                      </label>
                      <Select value={planType} onValueChange={setPlanType}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="free">Free</SelectItem>
                          <SelectItem value="lite">Lite ($15/mo)</SelectItem>
                          <SelectItem value="pro">Pro (Custom)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <Button
                      onClick={() => addCreditsMutation.mutate({
                        email: selectedUser,
                        amount: parseInt(creditAmount),
                        plan: planType
                      })}
                      disabled={!creditAmount || addCreditsMutation.isPending}
                      className="w-full bg-green-600 hover:bg-green-700"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add {creditAmount || '0'} Credits
                    </Button>
                  </div>
                </Card>

                {/* Remove Credits */}
                <Card className="p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Minus className="w-5 h-5 text-red-600" />
                    <h2 className="text-lg font-bold text-gray-900">Remove Credits</h2>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Credit Amount
                      </label>
                      <Input
                        type="number"
                        value={creditAmount}
                        onChange={(e) => setCreditAmount(e.target.value)}
                        placeholder="Enter amount..."
                        min="0"
                      />
                    </div>

                    <Button
                      onClick={() => removeCreditsMutation.mutate({
                        email: selectedUser,
                        amount: parseInt(creditAmount)
                      })}
                      disabled={!creditAmount || removeCreditsMutation.isPending}
                      variant="destructive"
                      className="w-full"
                    >
                      <Minus className="w-4 h-4 mr-2" />
                      Remove {creditAmount || '0'} Credits
                    </Button>
                  </div>
                </Card>

                {/* Quick Actions */}
                <Card className="p-6">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Quick Actions</h3>
                  <div className="grid grid-cols-3 gap-3">
                    {[100, 500, 1000].map(amount => (
                      <Button
                        key={amount}
                        onClick={() => addCreditsMutation.mutate({
                          email: selectedUser,
                          amount: amount,
                          plan: planType
                        })}
                        variant="outline"
                        size="sm"
                      >
                        +{amount}
                      </Button>
                    ))}
                  </div>
                </Card>
              </div>
            ) : (
              <Card className="p-12 text-center">
                <Coins className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Select a User
                </h3>
                <p className="text-gray-600">
                  Choose a user from the left to manage their credits
                </p>
              </Card>
            )}
          </div>
        </div>

        {/* All Users Overview */}
        <Card className="p-6 mt-8">
          <h2 className="text-lg font-bold text-gray-900 mb-4">All Users Overview</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">User</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Email</th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">Credits</th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">Plan</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {allUsers?.map((user) => {
                  const userCredits = allCredits?.find(c => c.user_email === user.email);
                  return (
                    <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4 text-sm text-gray-900">{user.full_name || 'No name'}</td>
                      <td className="py-3 px-4 text-sm text-gray-600">{user.email}</td>
                      <td className="py-3 px-4 text-center">
                        <Badge className="bg-yellow-100 text-yellow-700">
                          {userCredits?.credits_balance || 0}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Badge className="bg-gray-100 text-gray-700">
                          {userCredits?.plan_type || 'none'}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Button
                          onClick={() => setSelectedUser(user.email)}
                          variant="ghost"
                          size="sm"
                        >
                          Manage
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}