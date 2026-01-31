import React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Filter, User, Tag, ChevronDown } from "lucide-react";

export const MapFilters = () => {
  return (
    <div className="flex flex-wrap items-center gap-3 mb-8">
      <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-xl border border-gray-100">
        <Filter className="w-3.5 h-3.5 text-gray-400" />
        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
          Filters
        </span>
      </div>

      <div className="w-full md:w-44">
        <Select defaultValue="all">
          <SelectTrigger className="bg-white border-gray-200 rounded-xl h-10 font-bold text-gray-700 hover:border-indigo-200 hover:bg-indigo-50/30 transition-all">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
              <SelectValue placeholder="All Status" />
            </div>
          </SelectTrigger>
          <SelectContent className="rounded-xl border-gray-100 shadow-xl">
            <SelectItem value="all" className="font-bold text-gray-700">
              All Status
            </SelectItem>
            <SelectItem value="new" className="font-bold text-gray-700">
              New
            </SelectItem>
            <SelectItem value="contacted" className="font-bold text-gray-700">
              Contacted
            </SelectItem>
            <SelectItem value="meeting" className="font-bold text-gray-700">
              Meeting
            </SelectItem>
            <SelectItem value="signed" className="font-bold text-gray-700">
              Signed
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="w-full md:w-44">
        <Select defaultValue="all">
          <SelectTrigger className="bg-white border-gray-200 rounded-xl h-10 font-bold text-gray-700 hover:border-indigo-200 hover:bg-indigo-50/30 transition-all">
            <div className="flex items-center gap-2">
              <Tag className="w-3.5 h-3.5 text-gray-400" />
              <SelectValue placeholder="All Categories" />
            </div>
          </SelectTrigger>
          <SelectContent className="rounded-xl border-gray-100 shadow-xl">
            <SelectItem value="all" className="font-bold text-gray-700">
              All Categories
            </SelectItem>
            <SelectItem value="model" className="font-bold text-gray-700">
              Model
            </SelectItem>
            <SelectItem value="actor" className="font-bold text-gray-700">
              Actor
            </SelectItem>
            <SelectItem value="influencer" className="font-bold text-gray-700">
              Influencer
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="w-full md:w-44">
        <Select defaultValue="all">
          <SelectTrigger className="bg-white border-gray-200 rounded-xl h-10 font-bold text-gray-700 hover:border-indigo-200 hover:bg-indigo-50/30 transition-all">
            <div className="flex items-center gap-2">
              <User className="w-3.5 h-3.5 text-gray-400" />
              <SelectValue placeholder="All Scouts" />
            </div>
          </SelectTrigger>
          <SelectContent className="rounded-xl border-gray-100 shadow-xl">
            <SelectItem value="all" className="font-bold text-gray-700">
              All Scouts
            </SelectItem>
            <SelectItem value="agent1" className="font-bold text-gray-700">
              Agent Smith
            </SelectItem>
            <SelectItem value="agent2" className="font-bold text-gray-700">
              Agent Doe
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};
