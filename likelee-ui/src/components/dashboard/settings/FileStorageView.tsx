import React, { useState } from "react";
import {
  Folder,
  FolderPlus,
  Upload,
  Search,
  Grid,
  List,
  HardDrive,
  MoreVertical,
  FolderOpen,
  Edit,
  Trash2,
  FileText,
  File,
  Eye,
  Download,
  Share2,
  X,
  Copy,
  Link,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface FileItem {
  id: string;
  name: string;
  type: "pdf" | "docx" | "jpg" | "png";
  size: string;
  folder: string;
  uploadedBy: string;
  uploadedAt: string;
  thumbnailUrl?: string;
}

interface FolderItem {
  id: string;
  name: string;
  fileCount: number;
  totalSize: string;
  type: string;
}

const MOCK_FOLDERS: FolderItem[] = [
  {
    id: "1",
    name: "Talent Files",
    fileCount: 124,
    totalSize: "4.2 GB",
    type: "talent",
  },
  {
    id: "2",
    name: "Client Contracts",
    fileCount: 45,
    totalSize: "1.8 GB",
    type: "client",
  },
  {
    id: "3",
    name: "Booking Documents",
    fileCount: 89,
    totalSize: "3.1 GB",
    type: "booking",
  },
  {
    id: "4",
    name: "Receipts & Expenses",
    fileCount: 156,
    totalSize: "2.1 GB",
    type: "expense",
  },
  {
    id: "5",
    name: "Marketing Materials",
    fileCount: 67,
    totalSize: "1.2 GB",
    type: "marketing",
  },
];

const MOCK_FILES: FileItem[] = [
  {
    id: "1",
    name: "Emma_Contract_2024.pdf",
    type: "pdf",
    size: "245 KB",
    folder: "Talent Files",
    uploadedBy: "John Doe",
    uploadedAt: "Jan 10, 2024",
    thumbnailUrl:
      "https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=400&h=300&fit=crop",
  },
  {
    id: "2",
    name: "Vogue_Shoot_Callsheet.pdf",
    type: "pdf",
    size: "186 KB",
    folder: "Booking Documents",
    uploadedBy: "Jane Smith",
    uploadedAt: "Jan 9, 2024",
    thumbnailUrl:
      "https://images.unsplash.com/photo-1497215728101-856f4ea42174?w=400&h=300&fit=crop",
  },
  {
    id: "3",
    name: "Milan_Headshot_2024.jpg",
    type: "jpg",
    size: "3.2 MB",
    folder: "Talent Files",
    uploadedBy: "John Doe",
    uploadedAt: "Jan 8, 2024",
    thumbnailUrl:
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=300&fit=crop",
  },
  {
    id: "4",
    name: "Client_Brief_Nike.docx",
    type: "docx",
    size: "124 KB",
    folder: "Client Contracts",
    uploadedBy: "Sarah Wilson",
    uploadedAt: "Jan 7, 2024",
    thumbnailUrl:
      "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=400&h=300&fit=crop",
  },
];

const StorageUsageCard = () => (
  <Card className="p-6 bg-white border border-gray-100 rounded-2xl">
    <div className="flex justify-between items-center mb-4">
      <div className="flex items-center gap-2">
        <HardDrive className="w-5 h-5 text-indigo-600" />
        <span className="text-base font-bold text-gray-900">Storage Usage</span>
      </div>
      <span className="text-sm font-bold text-gray-900">
        <span className="text-indigo-600">12.4 GB</span> of 50 GB used
      </span>
    </div>
    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden mb-3">
      <div
        className="h-full bg-indigo-600 rounded-full"
        style={{ width: "24.8%" }}
      />
    </div>
    <div className="flex justify-between items-center">
      <p className="text-sm text-gray-500 font-medium">
        37.6 GB remaining • Professional Plan
      </p>
      <Button variant="link" className="text-indigo-600 font-bold p-0 h-auto">
        Upgrade Plan
      </Button>
    </div>
  </Card>
);

const FolderCard = ({ folder }: { folder: FolderItem }) => {
  const getFolderColor = (type: string) => {
    switch (type) {
      case "talent":
        return "text-indigo-500";
      case "client":
        return "text-emerald-500";
      case "booking":
        return "text-blue-500";
      case "expense":
        return "text-orange-500";
      case "marketing":
        return "text-purple-500";
      default:
        return "text-gray-500";
    }
  };

  const getFolderBg = (type: string) => {
    switch (type) {
      case "talent":
        return "bg-indigo-50/50";
      case "client":
        return "bg-emerald-50/50";
      case "booking":
        return "bg-blue-50/50";
      case "expense":
        return "bg-orange-50/50";
      case "marketing":
        return "bg-purple-50/50";
      default:
        return "bg-gray-50/50";
    }
  };

  return (
    <Card className="p-6 bg-white border border-gray-100 rounded-2xl hover:border-indigo-200 hover:shadow-md transition-all cursor-pointer group relative overflow-hidden">
      <div className="flex justify-between items-start mb-6 relative z-10">
        <div
          className={`w-14 h-14 ${getFolderBg(folder.type)} rounded-2xl flex items-center justify-center transition-transform group-hover:scale-105 shadow-sm border border-white/50`}
        >
          <div className="relative">
            <Folder
              className={`w-8 h-8 ${getFolderColor(folder.type)} fill-current opacity-20`}
            />
            <Folder
              className={`absolute inset-0 w-8 h-8 ${getFolderColor(folder.type)}`}
            />
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="icon"
              variant="ghost"
              className="w-8 h-8 rounded-lg text-gray-300 hover:text-gray-600 hover:bg-gray-50"
            >
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40 rounded-xl">
            <DropdownMenuItem className="font-bold text-gray-700 cursor-pointer">
              <FolderOpen className="w-4 h-4 mr-2" /> Open
            </DropdownMenuItem>
            <DropdownMenuItem className="font-bold text-gray-700 cursor-pointer">
              <Edit className="w-4 h-4 mr-2" /> Rename
            </DropdownMenuItem>
            <DropdownMenuItem className="font-bold text-red-600 cursor-pointer">
              <Trash2 className="w-4 h-4 mr-2" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="relative z-10">
        <h4 className="text-base font-bold text-gray-900 mb-1 group-hover:text-indigo-600 transition-colors">
          {folder.name}
        </h4>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-600 font-bold">
            {folder.fileCount} files
          </span>
          <span className="text-xs text-gray-400">•</span>
          <span className="text-xs text-gray-500 font-bold">
            {folder.totalSize}
          </span>
        </div>
      </div>
    </Card>
  );
};

const FileCard = ({
  file,
  onPreview,
  onShare,
}: {
  file: FileItem;
  onPreview: (file: FileItem) => void;
  onShare: (file: FileItem) => void;
}) => (
  <Card className="overflow-hidden bg-white border border-gray-100 rounded-2xl hover:shadow-md transition-shadow group max-w-[280px]">
    <div className="aspect-video bg-gray-50 flex items-center justify-center relative">
      {file.thumbnailUrl ? (
        <img
          src={file.thumbnailUrl}
          alt={file.name}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="flex flex-col items-center gap-2">
          {file.type === "pdf" && <FileText className="w-8 h-8 text-red-500" />}
          {file.type === "docx" && (
            <FileText className="w-8 h-8 text-blue-500" />
          )}
          {file.type === "jpg" && <File className="w-8 h-8 text-emerald-500" />}
          <span className="text-[10px] font-black uppercase text-gray-400">
            {file.type}
          </span>
        </div>
      )}
      <div className="absolute top-2 right-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="icon"
              variant="secondary"
              className="w-7 h-7 rounded-lg bg-white/90 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <MoreVertical className="w-3.5 h-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40 rounded-xl">
            <DropdownMenuItem
              onClick={() => onPreview(file)}
              className="font-bold text-gray-700 cursor-pointer"
            >
              <Eye className="w-4 h-4 mr-2" /> Preview
            </DropdownMenuItem>
            <DropdownMenuItem className="font-bold text-gray-700 cursor-pointer">
              <Download className="w-4 h-4 mr-2" /> Download
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onShare(file)}
              className="font-bold text-gray-700 cursor-pointer"
            >
              <Share2 className="w-4 h-4 mr-2" /> Share Link
            </DropdownMenuItem>
            <DropdownMenuItem className="font-bold text-red-600 cursor-pointer">
              <Trash2 className="w-4 h-4 mr-2" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
    <div className="p-2.5">
      <h5 className="text-[13px] font-bold text-gray-900 truncate mb-1">
        {file.name}
      </h5>
      <div className="flex justify-between items-center">
        <div className="flex flex-col">
          <span className="text-[10px] text-gray-600 font-bold">
            {file.size}
          </span>
          <span className="text-[10px] text-gray-500 font-bold">
            {file.uploadedAt}
          </span>
        </div>
        <Badge
          variant="outline"
          className="text-[9px] font-bold text-gray-700 border-gray-200 px-1.5 py-0 bg-gray-50/50"
        >
          {file.folder}
        </Badge>
      </div>
    </div>
  </Card>
);

const FileRow = ({
  file,
  onPreview,
  onShare,
}: {
  file: FileItem;
  onPreview: (file: FileItem) => void;
  onShare: (file: FileItem) => void;
}) => (
  <div className="flex items-center justify-between p-4 bg-white border border-gray-100 rounded-2xl hover:shadow-sm transition-shadow group">
    <div className="flex items-center gap-4 flex-1">
      <div className="w-10 h-10 bg-gray-50 rounded-lg flex items-center justify-center">
        {file.type === "pdf" && <FileText className="w-5 h-5 text-red-500" />}
        {file.type === "docx" && <FileText className="w-5 h-5 text-blue-500" />}
        {file.type === "jpg" && <File className="w-5 h-5 text-emerald-500" />}
      </div>
      <div className="flex-1 min-w-0">
        <h5 className="text-sm font-bold text-gray-900 truncate">
          {file.name}
        </h5>
        <p className="text-xs text-gray-600 font-bold">
          {file.size} • <span className="text-indigo-600">{file.folder}</span> •
          Uploaded by <span className="text-gray-900">{file.uploadedBy}</span>{" "}
          on {file.uploadedAt}
        </p>
      </div>
    </div>
    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
      <Button
        size="icon"
        variant="ghost"
        className="w-8 h-8 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"
        onClick={() => onPreview(file)}
      >
        <Eye className="w-4 h-4" />
      </Button>
      <Button
        size="icon"
        variant="ghost"
        className="w-8 h-8 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg"
      >
        <Download className="w-4 h-4" />
      </Button>
      <Button
        size="icon"
        variant="ghost"
        className="w-8 h-8 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
        onClick={() => onShare(file)}
      >
        <Share2 className="w-4 h-4" />
      </Button>
      <Button
        size="icon"
        variant="ghost"
        className="w-8 h-8 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg"
      >
        <Trash2 className="w-4 h-4" />
      </Button>
    </div>
  </div>
);

const NewFolderModal = ({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) => (
  <Dialog open={isOpen} onOpenChange={onClose}>
    <DialogContent className="sm:max-w-[425px] rounded-2xl">
      <DialogHeader>
        <DialogTitle className="text-xl font-bold text-gray-900">
          Create New Folder
        </DialogTitle>
        <DialogDescription className="text-gray-500 font-medium">
          Organize your files into folders
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-4 py-4">
        <div className="space-y-2">
          <Label className="text-sm font-bold text-gray-700">Folder Name</Label>
          <Input
            placeholder="e.g., Q1 2024 Campaigns"
            className="h-11 rounded-xl border-gray-200"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-sm font-bold text-gray-700">Folder Type</Label>
          <Select>
            <SelectTrigger className="h-11 rounded-xl border-gray-200">
              <SelectValue placeholder="Select type..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="talent">Talent Files</SelectItem>
              <SelectItem value="client">Client Files</SelectItem>
              <SelectItem value="booking">Booking Files</SelectItem>
              <SelectItem value="expense">Expense Files</SelectItem>
              <SelectItem value="marketing">Marketing Files</SelectItem>
              <SelectItem value="others">others</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <DialogFooter className="gap-2">
        <Button
          variant="outline"
          onClick={onClose}
          className="h-11 px-6 rounded-xl border-gray-200 font-bold"
        >
          Cancel
        </Button>
        <Button className="h-11 px-6 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl">
          Create Folder
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

const UploadFilesModal = ({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) => (
  <Dialog open={isOpen} onOpenChange={onClose}>
    <DialogContent className="sm:max-w-[500px] rounded-2xl">
      <DialogHeader>
        <DialogTitle className="text-xl font-bold text-gray-900">
          Upload Files
        </DialogTitle>
        <DialogDescription className="text-gray-500 font-medium">
          Upload documents, images, or other files to your storage
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-6 py-4">
        <div className="border-2 border-dashed border-gray-200 rounded-2xl p-10 flex flex-col items-center justify-center bg-gray-50/50 hover:bg-gray-50 transition-colors cursor-pointer group">
          <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <Upload className="w-6 h-6 text-indigo-600" />
          </div>
          <p className="text-sm font-bold text-gray-900 mb-1">
            Click to upload or drag and drop
          </p>
          <p className="text-xs text-gray-500 font-medium">
            PDF, DOC, JPG, PNG up to 50MB
          </p>
        </div>
        <div className="space-y-2">
          <Label className="text-sm font-bold text-gray-700">
            Save to folder
          </Label>
          <Select>
            <SelectTrigger className="h-11 rounded-xl border-gray-200">
              <SelectValue placeholder="Select a folder..." />
            </SelectTrigger>
            <SelectContent>
              {MOCK_FOLDERS.map((folder) => (
                <SelectItem key={folder.id} value={folder.id}>
                  {folder.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <DialogFooter className="gap-2">
        <Button
          variant="outline"
          onClick={onClose}
          className="h-11 px-6 rounded-xl border-gray-200 font-bold"
        >
          Cancel
        </Button>
        <Button className="h-11 px-6 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl">
          Upload Files
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

const FilePreviewModal = ({
  file,
  isOpen,
  onClose,
}: {
  file: FileItem | null;
  isOpen: boolean;
  onClose: () => void;
}) => {
  if (!file) return null;
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[900px] rounded-3xl p-0 overflow-hidden border-none shadow-2xl">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-white">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center border border-gray-100">
              {file.type === "pdf" && (
                <FileText className="w-6 h-6 text-red-500" />
              )}
              {file.type === "docx" && (
                <FileText className="w-6 h-6 text-blue-500" />
              )}
              {file.type === "jpg" && (
                <File className="w-6 h-6 text-emerald-500" />
              )}
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-gray-900">
                {file.name}
              </DialogTitle>
              <p className="text-sm text-gray-500 font-medium">
                {file.size} • Uploaded by {file.uploadedBy} on {file.uploadedAt}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="rounded-xl hover:bg-gray-50"
          >
            <X className="w-5 h-5 text-gray-400" />
          </Button>
        </div>
        <div className="p-10 bg-gray-50/50 flex items-center justify-center min-h-[500px] relative group">
          {file.thumbnailUrl ? (
            <div className="relative">
              <img
                src={file.thumbnailUrl}
                alt={file.name}
                className="max-w-full max-h-[600px] rounded-2xl shadow-2xl border-4 border-white transition-transform group-hover:scale-[1.01]"
              />
              <div className="absolute inset-0 rounded-2xl shadow-inner pointer-events-none" />
            </div>
          ) : (
            <div className="flex flex-col items-center gap-6 p-12 bg-white rounded-3xl shadow-sm border border-gray-100">
              <div className="w-20 h-20 bg-gray-50 rounded-2xl flex items-center justify-center">
                {file.type === "pdf" && (
                  <FileText className="w-10 h-10 text-red-500" />
                )}
                {file.type === "docx" && (
                  <FileText className="w-10 h-10 text-blue-500" />
                )}
              </div>
              <div className="text-center">
                <p className="text-gray-900 font-bold text-lg mb-1">
                  Preview not available
                </p>
                <p className="text-gray-500 text-sm font-medium">
                  Please download the file to view its content
                </p>
              </div>
              <Button className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl px-8">
                Download Now
              </Button>
            </div>
          )}
        </div>
        <div className="p-6 border-t border-gray-100 flex justify-between items-center bg-white">
          <div className="flex gap-2">
            <Badge
              variant="outline"
              className="bg-gray-50 text-gray-600 border-gray-200 font-bold px-3 py-1 rounded-lg"
            >
              {file.folder}
            </Badge>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              className="h-11 px-6 rounded-xl border-gray-200 font-bold text-gray-700 hover:bg-gray-50"
            >
              Close Preview
            </Button>
            <Button className="h-11 px-6 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl flex items-center gap-2 shadow-lg shadow-indigo-200">
              <Download className="w-4 h-4" />
              Download File
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const ShareFileModal = ({
  file,
  isOpen,
  onClose,
}: {
  file: FileItem | null;
  isOpen: boolean;
  onClose: () => void;
}) => {
  if (!file) return null;
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] rounded-3xl p-0 overflow-hidden border-none shadow-2xl">
        <div className="p-6 border-b border-gray-100 bg-white">
          <div className="flex justify-between items-start mb-1">
            <DialogTitle className="text-xl font-bold text-gray-900">
              Share File
            </DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="rounded-xl -mr-2 -mt-2"
            >
              <X className="w-5 h-5 text-gray-400" />
            </Button>
          </div>
          <DialogDescription className="text-gray-500 font-medium">
            Generate a secure shareable link for{" "}
            <span className="text-gray-900 font-bold">{file.name}</span>
          </DialogDescription>
        </div>

        <div className="p-6 space-y-6 bg-gray-50/30">
          <div className="space-y-2.5">
            <Label className="text-sm font-bold text-gray-700 ml-1">
              Share Link
            </Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  readOnly
                  value={`https://agency.likelee.ai/share/${file.id}`}
                  className="h-12 rounded-xl border-gray-200 bg-white font-medium pl-4 pr-10 shadow-sm focus:ring-2 focus:ring-indigo-500/20"
                />
                <Link className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              </div>
              <Button className="h-12 px-5 rounded-xl bg-white border border-gray-200 text-gray-700 font-bold hover:bg-gray-50 shadow-sm flex items-center gap-2">
                <Copy className="w-4 h-4" />
                Copy
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2.5">
              <Label className="text-sm font-bold text-gray-700 ml-1">
                Link Expiration
              </Label>
              <Select defaultValue="7-days">
                <SelectTrigger className="h-12 rounded-xl border-gray-200 bg-white shadow-sm">
                  <SelectValue placeholder="Select expiration..." />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="24-hours" className="font-medium">
                    24 Hours
                  </SelectItem>
                  <SelectItem value="7-days" className="font-medium">
                    7 Days
                  </SelectItem>
                  <SelectItem value="30-days" className="font-medium">
                    30 Days
                  </SelectItem>
                  <SelectItem value="never" className="font-medium">
                    Never
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2.5">
              <Label className="text-sm font-bold text-gray-700 ml-1">
                Access Level
              </Label>
              <Select defaultValue="view">
                <SelectTrigger className="h-12 rounded-xl border-gray-200 bg-white shadow-sm">
                  <SelectValue placeholder="Select access..." />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="view" className="font-medium">
                    View Only
                  </SelectItem>
                  <SelectItem value="download" className="font-medium">
                    Can Download
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 bg-white border border-gray-100 rounded-2xl shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <Label
                  className="text-sm font-bold text-gray-700 cursor-pointer"
                  htmlFor="require-password"
                >
                  Require password
                </Label>
                <p className="text-[11px] text-gray-500 font-medium">
                  Add an extra layer of security
                </p>
              </div>
            </div>
            <Checkbox
              id="require-password"
              className="rounded-md w-5 h-5 border-gray-300"
            />
          </div>
        </div>

        <div className="p-6 border-t border-gray-100 flex justify-end gap-3 bg-white">
          <Button
            variant="outline"
            onClick={onClose}
            className="h-12 px-6 rounded-xl border-gray-200 font-bold text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </Button>
          <Button className="h-12 px-8 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl flex items-center gap-2 shadow-lg shadow-indigo-200">
            <Share2 className="w-4 h-4" />
            Create Share Link
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const FileStorageView = () => {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchTerm, setSearchTerm] = useState("");
  const [isNewFolderModalOpen, setIsNewFolderModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedFileForPreview, setSelectedFileForPreview] =
    useState<FileItem | null>(null);
  const [selectedFileForShare, setSelectedFileForShare] =
    useState<FileItem | null>(null);

  return (
    <div className="space-y-8">
      {/* Demo Mode Alert */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-center justify-center gap-3 shadow-sm">
        <p className="text-sm font-bold text-blue-800">
          <span className="font-black">Demo Mode:</span> This is a preview of
          the Agency Dashboard for talent and modeling agencies.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <Folder className="w-8 h-8 text-indigo-600" />
            File Storage
          </h1>
          <p className="text-gray-600 font-medium">
            Organize and manage your agency files
          </p>
        </div>
        <div className="flex gap-2 sm:gap-3">
          <Button
            variant="outline"
            onClick={() => setIsNewFolderModalOpen(true)}
            className="h-9 px-3 sm:h-11 sm:px-6 rounded-xl border-gray-200 font-bold flex items-center gap-2 text-xs sm:text-sm"
          >
            <FolderPlus className="w-4 h-4 sm:w-5 sm:h-5" />
            New Folder
          </Button>
          <Button
            onClick={() => setIsUploadModalOpen(true)}
            className="h-9 px-3 sm:h-11 sm:px-6 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl flex items-center gap-2 text-xs sm:text-sm"
          >
            <Upload className="w-4 h-4 sm:w-5 sm:h-5" />
            Upload Files
          </Button>
        </div>
      </div>

      <StorageUsageCard />

      <div className="space-y-4">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              placeholder="Search files by name..."
              className="pl-12 h-12 bg-white border-gray-100 rounded-xl text-base"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-3 w-full md:w-auto">
            <Select defaultValue="name-asc">
              <SelectTrigger className="h-12 bg-white border-gray-100 rounded-xl text-base flex-1 md:w-48">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name-asc">Name (A-Z)</SelectItem>
                <SelectItem value="name-desc">Name (Z-A)</SelectItem>
                <SelectItem value="date-desc">Date (Newest)</SelectItem>
                <SelectItem value="date-asc">Date (Oldest)</SelectItem>
                <SelectItem value="size-desc">Size (Largest)</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex bg-gray-100 p-1 rounded-xl">
              <Button
                variant={viewMode === "grid" ? "white" : "ghost"}
                size="sm"
                className={`h-10 px-4 rounded-lg font-bold ${viewMode === "grid" ? "shadow-sm" : "text-gray-500"}`}
                onClick={() => setViewMode("grid")}
              >
                <Grid className="w-4 h-4 mr-2" />
                Grid
              </Button>
              <Button
                variant={viewMode === "list" ? "white" : "ghost"}
                size="sm"
                className={`h-10 px-4 rounded-lg font-bold ${viewMode === "list" ? "shadow-sm" : "text-gray-500"}`}
                onClick={() => setViewMode("list")}
              >
                <List className="w-4 h-4 mr-2" />
                List
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <h3 className="text-lg font-bold text-gray-900">Folders</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-6">
          {MOCK_FOLDERS.map((folder) => (
            <FolderCard key={folder.id} folder={folder} />
          ))}
        </div>
      </div>

      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-bold text-gray-900">Recent Files</h3>
          <span className="text-sm text-gray-500 font-medium">
            {MOCK_FILES.length} files
          </span>
        </div>

        {viewMode === "grid" ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
            {MOCK_FILES.map((file) => (
              <FileCard
                key={file.id}
                file={file}
                onPreview={setSelectedFileForPreview}
                onShare={setSelectedFileForShare}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {MOCK_FILES.map((file) => (
              <FileRow
                key={file.id}
                file={file}
                onPreview={setSelectedFileForPreview}
                onShare={setSelectedFileForShare}
              />
            ))}
          </div>
        )}
      </div>

      <NewFolderModal
        isOpen={isNewFolderModalOpen}
        onClose={() => setIsNewFolderModalOpen(false)}
      />
      <UploadFilesModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
      />
      <FilePreviewModal
        file={selectedFileForPreview}
        isOpen={!!selectedFileForPreview}
        onClose={() => setSelectedFileForPreview(null)}
      />
      <ShareFileModal
        file={selectedFileForShare}
        isOpen={!!selectedFileForShare}
        onClose={() => setSelectedFileForShare(null)}
      />
    </div>
  );
};

export default FileStorageView;
