import React, { useEffect, useMemo, useRef, useState } from "react";
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
import {
  createAgencyStorageFolder,
  deleteAgencyStorageFile,
  getAgencyStorageFileSignedUrl,
  getAgencyStorageUsage,
  listAgencyStorageFilesPaged,
  listAgencyStorageFoldersPaged,
  uploadAgencyStorageFile,
} from "@/api/functions";
import { useToast } from "@/components/ui/use-toast";

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

type StorageUsage = {
  used_bytes: number;
  limit_bytes: number;
};

type StorageFolder = {
  id: string;
  name: string;
  parent_id: string | null;
  created_at: string;
};

type StorageFile = {
  id: string;
  file_name: string;
  folder_id: string | null;
  size_bytes: number;
  mime_type: string | null;
  created_at: string;
};

const isPreviewableImage = (mimeType: string | null) => {
  if (!mimeType) return false;
  return mimeType.toLowerCase().startsWith("image/");
};

const fileExtension = (name: string) => {
  const base = name.split("?")[0];
  const idx = base.lastIndexOf(".");
  if (idx === -1) return "";
  return base.slice(idx + 1).toLowerCase();
};

const bytesToHuman = (bytes: number) => {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.min(
    units.length - 1,
    Math.floor(Math.log(bytes) / Math.log(1024)),
  );
  const v = bytes / Math.pow(1024, i);
  const rounded = i === 0 ? Math.round(v) : Math.round(v * 10) / 10;
  return `${rounded} ${units[i]}`;
};

const isoToShortDate = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

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
  folderName,
  onFolderNameChange,
  onCreate,
}: {
  isOpen: boolean;
  onClose: () => void;
  folderName: string;
  onFolderNameChange: (v: string) => void;
  onCreate: () => void;
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
            value={folderName}
            onChange={(e) => onFolderNameChange(e.target.value)}
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
        <Button
          className="h-11 px-6 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl"
          onClick={onCreate}
          disabled={!folderName.trim()}
        >
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
  const { toast } = useToast();
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchTerm, setSearchTerm] = useState("");
  const [isNewFolderModalOpen, setIsNewFolderModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedFileForPreview, setSelectedFileForPreview] =
    useState<FileItem | null>(null);
  const [selectedFileForShare, setSelectedFileForShare] =
    useState<FileItem | null>(null);

  const [usage, setUsage] = useState<StorageUsage | null>(null);
  const [folders, setFolders] = useState<StorageFolder[]>([]);
  const [files, setFiles] = useState<StorageFile[]>([]);
  const [thumbnailUrlByFileId, setThumbnailUrlByFileId] = useState<
    Record<string, string>
  >({});
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMoreFolders, setIsLoadingMoreFolders] = useState(false);
  const [isLoadingMoreFiles, setIsLoadingMoreFiles] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const FOLDERS_PAGE_SIZE = 5;
  const FILES_PAGE_SIZE = 10;
  const [foldersOffset, setFoldersOffset] = useState(0);
  const [filesOffset, setFilesOffset] = useState(0);
  const [hasMoreFolders, setHasMoreFolders] = useState(true);
  const [hasMoreFiles, setHasMoreFiles] = useState(true);

  const folderNameById = useMemo(() => {
    const m = new Map<string, string>();
    folders.forEach((f) => m.set(f.id, f.name));
    return m;
  }, [folders]);

  const filteredFiles = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return files;
    return files.filter((f) => f.file_name.toLowerCase().includes(q));
  }, [files, searchTerm]);

  useEffect(() => {
    let canceled = false;
    const loadThumbnails = async () => {
      const previewable = filteredFiles.filter(
        (f) => isPreviewableImage(f.mime_type) && !thumbnailUrlByFileId[f.id],
      );

      if (previewable.length === 0) return;

      const results = await Promise.allSettled(
        previewable.map(async (f) => {
          const resp: any = await getAgencyStorageFileSignedUrl(f.id);
          const url = resp?.url;
          if (!url) throw new Error("missing signed url");
          return { fileId: f.id, url: String(url) };
        }),
      );

      if (canceled) return;
      setThumbnailUrlByFileId((prev) => {
        const next = { ...prev };
        results.forEach((r) => {
          if (r.status !== "fulfilled") return;
          next[r.value.fileId] = r.value.url;
        });
        return next;
      });
    };

    loadThumbnails();
    return () => {
      canceled = true;
    };
  }, [filteredFiles, thumbnailUrlByFileId]);

  const loadInitial = async (folderId: string | null) => {
    setIsLoading(true);
    try {
      setFolders([]);
      setFiles([]);
      setFoldersOffset(0);
      setFilesOffset(0);
      setHasMoreFolders(true);
      setHasMoreFiles(true);

      const [u, f, fl] = await Promise.all([
        getAgencyStorageUsage(),
        listAgencyStorageFoldersPaged({ limit: FOLDERS_PAGE_SIZE, offset: 0 }),
        listAgencyStorageFilesPaged({
          folder_id: folderId || undefined,
          limit: FILES_PAGE_SIZE,
          offset: 0,
        }),
      ]);
      const foldersPage = ((f as any) || []) as StorageFolder[];
      const filesPage = ((fl as any) || []) as StorageFile[];
      setUsage(u as any);
      setFolders(foldersPage);
      setFiles(filesPage);
      setFoldersOffset(foldersPage.length);
      setFilesOffset(filesPage.length);
      setHasMoreFolders(foldersPage.length === FOLDERS_PAGE_SIZE);
      setHasMoreFiles(filesPage.length === FILES_PAGE_SIZE);
    } catch (e: any) {
      toast({
        title: "Failed to load storage",
        description: String(e?.message || e),
        variant: "destructive" as any,
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadInitial(activeFolderId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFolderId]);

  const loadMoreFolders = async () => {
    if (isLoadingMoreFolders || !hasMoreFolders) return;
    setIsLoadingMoreFolders(true);
    try {
      const page = (await listAgencyStorageFoldersPaged({
        limit: FOLDERS_PAGE_SIZE,
        offset: foldersOffset,
      })) as any;
      const rows = (page || []) as StorageFolder[];
      setFolders((prev) => [...prev, ...rows]);
      setFoldersOffset((prev) => prev + rows.length);
      setHasMoreFolders(rows.length === FOLDERS_PAGE_SIZE);
    } catch (e: any) {
      toast({
        title: "Failed to load more folders",
        description: String(e?.message || e),
        variant: "destructive" as any,
      });
    } finally {
      setIsLoadingMoreFolders(false);
    }
  };

  const loadMoreFiles = async () => {
    if (isLoadingMoreFiles || !hasMoreFiles) return;
    setIsLoadingMoreFiles(true);
    try {
      const page = (await listAgencyStorageFilesPaged({
        folder_id: activeFolderId || undefined,
        limit: FILES_PAGE_SIZE,
        offset: filesOffset,
      })) as any;
      const rows = (page || []) as StorageFile[];
      setFiles((prev) => [...prev, ...rows]);
      setFilesOffset((prev) => prev + rows.length);
      setHasMoreFiles(rows.length === FILES_PAGE_SIZE);
    } catch (e: any) {
      toast({
        title: "Failed to load more files",
        description: String(e?.message || e),
        variant: "destructive" as any,
      });
    } finally {
      setIsLoadingMoreFiles(false);
    }
  };

  const onCreateFolder = async () => {
    const name = newFolderName.trim();
    if (!name) return;
    try {
      await createAgencyStorageFolder({
        name,
        parent_id: null,
      });
      setNewFolderName("");
      setIsNewFolderModalOpen(false);
      await loadInitial(activeFolderId);
      toast({
        title: "Folder created",
        description: name,
      });
    } catch (e: any) {
      toast({
        title: "Failed to create folder",
        description: String(e?.message || e),
        variant: "destructive" as any,
      });
    }
  };

  const onPickFiles = () => {
    fileInputRef.current?.click();
  };

  const onUploadFiles = async (picked: FileList | null) => {
    if (!picked || picked.length === 0) return;
    setIsUploading(true);
    try {
      for (const file of Array.from(picked)) {
        await uploadAgencyStorageFile({
          file,
          folder_id: activeFolderId || undefined,
        });
      }
      await loadInitial(activeFolderId);
      toast({
        title: "Upload complete",
        description: `${picked.length} file(s) uploaded.`,
      });
    } catch (e: any) {
      const msg = String(e?.message || e);
      toast({
        title: "Upload failed",
        description: msg.includes("storage_quota_exceeded")
          ? "Storage quota exceeded. Upgrade your plan to increase storage."
          : msg,
        variant: "destructive" as any,
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const onDownloadFile = async (fileId: string) => {
    try {
      const resp: any = await getAgencyStorageFileSignedUrl(fileId);
      const url = resp?.url;
      if (!url) throw new Error("missing signed url");
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (e: any) {
      toast({
        title: "Failed to download file",
        description: String(e?.message || e),
        variant: "destructive" as any,
      });
    }
  };

  const onDeleteFile = async (fileId: string) => {
    try {
      await deleteAgencyStorageFile(fileId);
      await loadInitial(activeFolderId);
      toast({
        title: "File deleted",
      });
    } catch (e: any) {
      toast({
        title: "Failed to delete file",
        description: String(e?.message || e),
        variant: "destructive" as any,
      });
    }
  };

  const usagePct = useMemo(() => {
    if (!usage) return 0;
    if (usage.limit_bytes <= 0) return 0;
    return Math.min(
      100,
      Math.max(0, (usage.used_bytes / usage.limit_bytes) * 100),
    );
  }, [usage]);

  return (
    <div className="space-y-8">
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
            onClick={onPickFiles}
            disabled={isUploading}
            className="h-9 px-3 sm:h-11 sm:px-6 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl flex items-center gap-2 text-xs sm:text-sm"
          >
            <Upload className="w-4 h-4 sm:w-5 sm:h-5" />
            {isUploading ? "Uploading..." : "Upload Files"}
          </Button>
        </div>
      </div>

      <Card className="p-6 bg-white border border-gray-100 rounded-2xl">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <HardDrive className="w-5 h-5 text-indigo-600" />
            <span className="text-base font-bold text-gray-900">
              Storage Usage
            </span>
          </div>
          <span className="text-sm font-bold text-gray-900">
            <span className="text-indigo-600">
              {bytesToHuman(usage?.used_bytes || 0)}
            </span>{" "}
            of {bytesToHuman(usage?.limit_bytes || 0)} used
          </span>
        </div>
        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden mb-3">
          <div
            className="h-full bg-indigo-600 rounded-full"
            style={{ width: `${usagePct}%` }}
          />
        </div>
        <div className="flex justify-between items-center">
          <p className="text-sm text-gray-500 font-medium">
            {bytesToHuman(
              Math.max(0, (usage?.limit_bytes || 0) - (usage?.used_bytes || 0)),
            )}{" "}
            remaining
          </p>
          <Button
            variant="link"
            className="text-indigo-600 font-bold p-0 h-auto"
            asChild
          >
            <a href="/agencysubscribe">Billing & Subscription</a>
          </Button>
        </div>
      </Card>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => onUploadFiles(e.target.files)}
      />

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
            <div className="flex bg-gray-100 p-1 rounded-xl">
              <Button
                variant={viewMode === "grid" ? "secondary" : "ghost"}
                size="sm"
                className={`h-10 px-4 rounded-lg font-bold ${viewMode === "grid" ? "shadow-sm bg-white" : "text-gray-500"}`}
                onClick={() => setViewMode("grid")}
              >
                <Grid className="w-4 h-4 mr-2" />
                Grid
              </Button>
              <Button
                variant={viewMode === "list" ? "secondary" : "ghost"}
                size="sm"
                className={`h-10 px-4 rounded-lg font-bold ${viewMode === "list" ? "shadow-sm bg-white" : "text-gray-500"}`}
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
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-bold text-gray-900">Folders</h3>
          <Button
            variant="ghost"
            className="font-bold text-gray-600"
            onClick={() => setActiveFolderId(null)}
          >
            All
          </Button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-6">
          {folders.map((folder) => (
            <div key={folder.id} onClick={() => setActiveFolderId(folder.id)}>
              <FolderCard
                folder={{
                  id: folder.id,
                  name: folder.name,
                  fileCount: files.filter((f) => f.folder_id === folder.id)
                    .length,
                  totalSize: "",
                  type: "others",
                }}
              />
            </div>
          ))}
        </div>
        <div className="flex justify-center">
          <Button
            variant="outline"
            className="h-10 px-5 rounded-xl font-bold"
            onClick={loadMoreFolders}
            disabled={!hasMoreFolders || isLoadingMoreFolders}
          >
            {isLoadingMoreFolders
              ? "Loading..."
              : hasMoreFolders
                ? "Load more folders"
                : "No more folders"}
          </Button>
        </div>
      </div>

      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-bold text-gray-900">Files</h3>
          <span className="text-sm text-gray-500 font-medium">
            {filteredFiles.length} files
          </span>
        </div>

        {isLoading ? (
          <Card className="p-6 bg-white border border-gray-100 rounded-2xl">
            <p className="text-sm font-bold text-gray-700">Loading...</p>
          </Card>
        ) : viewMode === "list" ? (
          <div className="space-y-3">
            {filteredFiles.map((f) => (
              <div
                key={f.id}
                className="flex items-center justify-between p-4 bg-white border border-gray-100 rounded-2xl"
              >
                <div className="min-w-0">
                  <p className="text-sm font-bold text-gray-900 truncate">
                    {f.file_name}
                  </p>
                  <p className="text-xs text-gray-500 font-medium">
                    {bytesToHuman(f.size_bytes)} •{" "}
                    {isoToShortDate(f.created_at)}
                    {f.folder_id
                      ? ` • ${folderNameById.get(f.folder_id) || "Folder"}`
                      : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant="outline"
                    className="h-9 px-3 rounded-xl font-bold"
                    onClick={() => onDownloadFile(f.id)}
                  >
                    Download
                  </Button>
                  <Button
                    variant="outline"
                    className="h-9 px-3 rounded-xl font-bold text-red-600 border-red-200"
                    onClick={() => onDeleteFile(f.id)}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
            {filteredFiles.map((f) => (
              <Card
                key={f.id}
                className="p-4 bg-white border border-gray-100 rounded-2xl"
              >
                <div className="aspect-video bg-gray-50 rounded-xl overflow-hidden mb-3 flex items-center justify-center">
                  {thumbnailUrlByFileId[f.id] ? (
                    <img
                      src={thumbnailUrlByFileId[f.id]}
                      alt={f.file_name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-1.5">
                      <File
                        className={`w-8 h-8 ${isPreviewableImage(f.mime_type) ? "text-emerald-500" : "text-gray-400"}`}
                      />
                      <span className="text-[10px] font-black uppercase text-gray-400">
                        {fileExtension(f.file_name) || "file"}
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-gray-900 truncate">
                      {f.file_name}
                    </p>
                    <p className="text-xs text-gray-500 font-medium mt-1">
                      {bytesToHuman(f.size_bytes)}
                    </p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="w-8 h-8 rounded-xl"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="end"
                      className="w-40 rounded-xl"
                    >
                      <DropdownMenuItem
                        className="font-bold text-gray-700 cursor-pointer"
                        onClick={() => onDownloadFile(f.id)}
                      >
                        <Download className="w-4 h-4 mr-2" /> Download
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="font-bold text-red-600 cursor-pointer"
                        onClick={() => onDeleteFile(f.id)}
                      >
                        <Trash2 className="w-4 h-4 mr-2" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </Card>
            ))}
          </div>
        )}

        <div className="flex justify-center">
          <Button
            variant="outline"
            className="h-10 px-5 rounded-xl font-bold"
            onClick={loadMoreFiles}
            disabled={!hasMoreFiles || isLoadingMoreFiles || isLoading}
          >
            {isLoadingMoreFiles
              ? "Loading..."
              : hasMoreFiles
                ? "Load more files"
                : "No more files"}
          </Button>
        </div>
      </div>

      <NewFolderModal
        isOpen={isNewFolderModalOpen}
        onClose={() => setIsNewFolderModalOpen(false)}
        folderName={newFolderName}
        onFolderNameChange={setNewFolderName}
        onCreate={onCreateFolder}
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
