import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Folder,
  FolderPlus,
  Upload,
  Search,
  HardDrive,
  MoreVertical,
  Edit,
  Trash2,
  FileText,
  Eye,
  Download,
  X,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  createBrandStorageFolder,
  deleteBrandStorageFile,
  deleteBrandStorageFolder,
  getBrandStorageFileSignedUrl,
  getBrandStorageUsage,
  listBrandStorageFilesPaged,
  listBrandStorageFoldersPaged,
  updateBrandStorageFolder,
  uploadBrandStorageFile,
} from "@/api/functions";
import { useToast } from "@/components/ui/use-toast";

type StorageUsage = { used_bytes: number; limit_bytes: number };
type StorageFolder = { id: string; name: string; parent_id: string | null; is_default?: boolean; created_at: string; file_count?: number };
type StorageFile = { id: string; file_name: string; folder_id: string | null; size_bytes: number; mime_type: string | null; source_type?: string; generation_id?: string; created_at: string; public_url?: string | null };

const MAX_UPLOAD_BYTES = 500 * 1024 * 1024;

const isPreviewableImage = (mimeType: string | null) =>
  !!mimeType && mimeType.toLowerCase().startsWith("image/");

const bytesToHuman = (bytes: unknown) => {
  const n = typeof bytes === "number" ? bytes : typeof bytes === "string" ? Number(bytes) : 0;
  if (!Number.isFinite(n) || n <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.min(units.length - 1, Math.floor(Math.log(n) / Math.log(1024)));
  const v = n / Math.pow(1024, i);
  const rounded = i === 0 ? Math.round(v) : Math.round(v * 10) / 10;
  return `${rounded} ${units[i]}`;
};

const isoToShortDate = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
};

export default function BrandFileStorageView() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [usage, setUsage] = useState<StorageUsage | null>(null);
  const [folders, setFolders] = useState<StorageFolder[]>([]);
  const [files, setFiles] = useState<StorageFile[]>([]);
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sourceFilter, setSourceFilter] = useState<"all" | "upload" | "studio_generation">("all");
  const [thumbnailUrlByFileId, setThumbnailUrlByFileId] = useState<Record<string, string>>({});

  const [createFolderOpen, setCreateFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [renameFolderOpen, setRenameFolderOpen] = useState(false);
  const [renameFolderId, setRenameFolderId] = useState<string | null>(null);
  const [renameFolderName, setRenameFolderName] = useState("");
  const [deleteFolderOpen, setDeleteFolderOpen] = useState(false);
  const [deleteFolderId, setDeleteFolderId] = useState<string | null>(null);
  const [deleteFileOpen, setDeleteFileOpen] = useState(false);
  const [deleteFileId, setDeleteFileId] = useState<string | null>(null);

  const [uploading, setUploading] = useState(false);
  const [uploadFolderId, setUploadFolderId] = useState<string | null>(null);

  const loadUsage = async () => {
    try {
      const data = await getBrandStorageUsage();
      setUsage(data);
    } catch {}
  };

  const loadFolders = async () => {
    try {
      const data = await listBrandStorageFoldersPaged({ limit: 100 });
      setFolders(Array.isArray(data) ? data : []);
    } catch {}
  };

  const loadFiles = async (folderId: string | null) => {
    try {
      const params: any = { limit: 100 };
      if (folderId) {
        params.folder_id = folderId;
        params.root_only = false;
      } else {
        params.root_only = true;
      }
      const data = await listBrandStorageFilesPaged(params);
      setFiles(Array.isArray(data) ? data : []);
    } catch {}
  };

  useEffect(() => {
    loadUsage();
    loadFolders();
  }, []);

  useEffect(() => {
    loadFiles(activeFolderId);
  }, [activeFolderId]);

  useEffect(() => {
    const previewable = files.filter((f) => isPreviewableImage(f.mime_type) && f.public_url);
    const map: Record<string, string> = {};
    const loadThumbnails = async () => {
      for (const f of previewable) {
        if (f.public_url) {
          map[f.id] = f.public_url;
          continue;
        }
        try {
          const data = await getBrandStorageFileSignedUrl(f.id);
          if (data?.url) map[f.id] = data.url;
        } catch {}
      }
      setThumbnailUrlByFileId((prev) => {
        const merged = { ...prev, ...map };
        if (JSON.stringify(merged) === JSON.stringify(prev)) return prev;
        return merged;
      });
    };
    loadThumbnails();
  }, [files]);

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    try {
      await createBrandStorageFolder({ name: newFolderName.trim() });
      setCreateFolderOpen(false);
      setNewFolderName("");
      loadFolders();
      loadUsage();
    } catch (e: any) {
      toast({ title: "Error creating folder", description: e?.message, variant: "destructive" });
    }
  };

  const handleRenameFolder = async () => {
    if (!renameFolderId || !renameFolderName.trim()) return;
    try {
      await updateBrandStorageFolder(renameFolderId, { name: renameFolderName.trim() });
      setRenameFolderOpen(false);
      setRenameFolderId(null);
      setRenameFolderName("");
      loadFolders();
    } catch (e: any) {
      toast({ title: "Error renaming folder", description: e?.message, variant: "destructive" });
    }
  };

  const handleDeleteFolder = async () => {
    if (!deleteFolderId) return;
    try {
      await deleteBrandStorageFolder(deleteFolderId);
      setDeleteFolderOpen(false);
      setDeleteFolderId(null);
      if (activeFolderId === deleteFolderId) setActiveFolderId(null);
      loadFolders();
      loadUsage();
      loadFiles(activeFolderId === deleteFolderId ? null : activeFolderId);
    } catch (e: any) {
      toast({ title: "Error deleting folder", description: e?.message, variant: "destructive" });
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    if (file.size > MAX_UPLOAD_BYTES) {
      toast({ title: "File too large", description: "Maximum upload size is 500 MB", variant: "destructive" });
      return;
    }

    setUploading(true);
    try {
      await uploadBrandStorageFile({
        file,
        folder_id: uploadFolderId ?? activeFolderId ?? undefined,
      });
      loadFiles(activeFolderId);
      loadUsage();
      toast({ title: "File uploaded" });
    } catch (e: any) {
      const msg = e?.message ?? "Unknown error";
      toast({
        title: msg.includes("quota") ? "Storage quota exceeded" : "Upload failed",
        description: msg.includes("quota") ? "Upgrade your plan for more storage" : msg,
        variant: "destructive",
      });
    }
    setUploading(false);
  };

  const handleDeleteFile = async () => {
    if (!deleteFileId) return;
    try {
      await deleteBrandStorageFile(deleteFileId);
      setDeleteFileOpen(false);
      setDeleteFileId(null);
      loadFiles(activeFolderId);
      loadUsage();
    } catch (e: any) {
      toast({ title: "Error deleting file", description: e?.message, variant: "destructive" });
    }
  };

  const handleDownload = async (file: StorageFile) => {
    try {
      let url = file.public_url ?? "";
      if (!url) {
        const data = await getBrandStorageFileSignedUrl(file.id);
        url = data?.url ?? "";
      }
      if (url) {
        const a = document.createElement("a");
        a.href = url;
        a.download = file.file_name;
        a.target = "_blank";
        a.click();
      }
    } catch (e: any) {
      toast({ title: "Download failed", description: e?.message, variant: "destructive" });
    }
  };

  const filteredFiles = useMemo(() => {
    let result = files;
    if (searchQuery) {
      result = result.filter((f) => f.file_name.toLowerCase().includes(searchQuery.toLowerCase()));
    }
    if (sourceFilter !== "all") {
      result = result.filter((f) => (f.source_type || "upload") === sourceFilter);
    }
    return result;
  }, [files, searchQuery, sourceFilter]);

  const usagePercent = usage ? Math.min(100, (usage.used_bytes / usage.limit_bytes) * 100) : 0;
  const usageColor = usagePercent > 90 ? "bg-red-500" : usagePercent > 70 ? "bg-amber-500" : "bg-indigo-500";

  const breadcrumb = () => {
    if (!activeFolderId) return null;
    const folder = folders.find((f) => f.id === activeFolderId);
    return (
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <button onClick={() => setActiveFolderId(null)} className="hover:text-indigo-600 transition-colors">Root</button>
        <span>/</span>
        <span className="text-gray-900 font-medium">{folder?.name ?? "Folder"}</span>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Storage usage */}
      {usage && (
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <HardDrive className="w-5 h-5 text-indigo-600" />
              <span className="font-bold text-gray-900">Asset Library</span>
            </div>
            <span className="text-sm text-gray-500">
              {bytesToHuman(usage.used_bytes)} / {bytesToHuman(usage.limit_bytes)}
            </span>
          </div>
          <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
            <div className={`h-full rounded-full ${usageColor} transition-all`} style={{ width: `${usagePercent}%` }} />
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="relative flex-1 max-w-xs">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search files…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 pl-9 pr-4 rounded-xl border border-gray-200 bg-white text-sm outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
          {breadcrumb()}
          <Tabs value={sourceFilter} onValueChange={(v) => setSourceFilter(v as any)} className="hidden sm:block">
            <TabsList className="bg-gray-100 rounded-xl p-1 h-9">
              <TabsTrigger value="all" className="rounded-lg px-3 text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm">All</TabsTrigger>
              <TabsTrigger value="upload" className="rounded-lg px-3 text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm">Uploaded</TabsTrigger>
              <TabsTrigger value="studio_generation" className="rounded-lg px-3 text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm">Studio</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => navigate("/studio")}
            className="h-10 rounded-xl border-purple-200 text-purple-700 hover:bg-purple-50 hover:text-purple-800 font-semibold"
          >
            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            Studio
          </Button>
          <Button
            variant="outline"
            onClick={() => { setUploadFolderId(null); setCreateFolderOpen(true); }}
            className="h-10 rounded-xl border-gray-200 font-semibold"
          >
            <FolderPlus className="w-4 h-4 mr-2" /> New Folder
          </Button>
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="h-10 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold"
          >
            <Upload className="w-4 h-4 mr-2" /> {uploading ? "Uploading…" : "Upload"}
          </Button>
          <input ref={fileInputRef} type="file" className="sr-only" onChange={handleUpload} />
        </div>
      </div>

      {/* Folders */}
      {!activeFolderId && folders.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {folders.map((folder) => (
            <div
              key={folder.id}
              onClick={() => setActiveFolderId(folder.id)}
              className="group bg-white rounded-2xl p-4 border border-gray-100 shadow-sm hover:shadow-md hover:border-indigo-200 cursor-pointer transition-all"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <Folder className="w-8 h-8 text-indigo-500" />
                  {folder.is_default && (
                    <span className="px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded text-xs font-medium">Default</span>
                  )}
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button onClick={(e) => e.stopPropagation()} className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-lg hover:bg-gray-100">
                      <MoreVertical className="w-4 h-4 text-gray-400" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setRenameFolderId(folder.id); setRenameFolderName(folder.name); setRenameFolderOpen(true); }}>
                      <Edit className="w-4 h-4 mr-2" /> Rename
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setDeleteFolderId(folder.id); setDeleteFolderOpen(true); }} className="text-red-600 focus:text-red-600">
                      <Trash2 className="w-4 h-4 mr-2" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <p className="mt-2 text-sm font-semibold text-gray-900 truncate">{folder.name}</p>
              <p className="text-xs text-gray-400">{folder.file_count ?? 0} file{(folder.file_count ?? 0) === 1 ? "" : "s"}</p>
            </div>
          ))}
        </div>
      )}

      {/* Files */}
      {filteredFiles.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {filteredFiles.map((file) => {
            const thumbUrl = thumbnailUrlByFileId[file.id];
            return (
              <div
                key={file.id}
                className="group bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-indigo-200 overflow-hidden transition-all"
              >
                <div className="aspect-square bg-gray-50 flex items-center justify-center relative">
                  {file.source_type === "studio_generation" && (
                    <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                      <Sparkles className="w-3 h-3" />
                      Studio
                    </div>
                  )}
                  {thumbUrl ? (
                    <img src={thumbUrl} alt={file.file_name} className="w-full h-full object-cover" />
                  ) : (
                    <FileText className="w-10 h-10 text-gray-300" />
                  )}
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="p-1.5 rounded-lg bg-white/90 shadow hover:bg-white"><MoreVertical className="w-3.5 h-3.5 text-gray-600" /></button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {isPreviewableImage(file.mime_type) && (
                          <DropdownMenuItem onClick={() => { const url = thumbUrl || file.public_url; if (url) window.open(url, "_blank"); }}>
                            <Eye className="w-4 h-4 mr-2" /> Preview
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => handleDownload(file)}>
                          <Download className="w-4 h-4 mr-2" /> Download
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => { setDeleteFileId(file.id); setDeleteFileOpen(true); }} className="text-red-600 focus:text-red-600">
                          <Trash2 className="w-4 h-4 mr-2" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
                <div className="p-3">
                  <p className="text-sm font-semibold text-gray-900 truncate">{file.file_name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{bytesToHuman(file.size_bytes)} · {isoToShortDate(file.created_at)}</p>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-16">
          <Folder className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400 font-medium">No files yet</p>
          <p className="text-gray-300 text-sm mt-1">Upload files or create a folder to get started</p>
        </div>
      )}

      {/* Create Folder Dialog */}
      <Dialog open={createFolderOpen} onOpenChange={setCreateFolderOpen}>
        <DialogContent className="sm:max-w-[500px] rounded-3xl p-0 overflow-hidden border-none shadow-2xl">
          <DialogHeader className="p-6 border-b border-gray-100 bg-white">
            <DialogTitle className="text-xl font-bold text-gray-900">New Folder</DialogTitle>
            <DialogDescription className="text-gray-500 font-medium">Enter a name for the new folder.</DialogDescription>
          </DialogHeader>
          <div className="p-6 bg-white">
            <Label className="text-sm font-bold text-gray-700 ml-1">Folder name</Label>
            <Input
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              className="h-12 rounded-xl border-gray-200 bg-white font-medium pl-4 shadow-sm focus:ring-2 focus:ring-indigo-500/20 mt-2"
              placeholder="Folder name"
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && handleCreateFolder()}
            />
          </div>
          <DialogFooter className="p-6 pt-0 gap-2 bg-white">
            <Button variant="outline" onClick={() => setCreateFolderOpen(false)} className="h-11 px-6 rounded-xl border-gray-200 font-bold">Cancel</Button>
            <Button onClick={handleCreateFolder} className="h-11 px-6 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl">Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename Folder Dialog */}
      <Dialog open={renameFolderOpen} onOpenChange={setRenameFolderOpen}>
        <DialogContent className="sm:max-w-[500px] rounded-3xl p-0 overflow-hidden border-none shadow-2xl">
          <DialogHeader className="p-6 border-b border-gray-100 bg-white">
            <DialogTitle className="text-xl font-bold text-gray-900">Rename Folder</DialogTitle>
            <DialogDescription className="text-gray-500 font-medium">Enter a new name for the folder.</DialogDescription>
          </DialogHeader>
          <div className="p-6 bg-white">
            <Label className="text-sm font-bold text-gray-700 ml-1">Folder name</Label>
            <Input
              value={renameFolderName}
              onChange={(e) => setRenameFolderName(e.target.value)}
              className="h-12 rounded-xl border-gray-200 bg-white font-medium pl-4 shadow-sm focus:ring-2 focus:ring-indigo-500/20 mt-2"
              placeholder="Folder name"
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && handleRenameFolder()}
            />
          </div>
          <DialogFooter className="p-6 pt-0 gap-2 bg-white">
            <Button variant="outline" onClick={() => setRenameFolderOpen(false)} className="h-11 px-6 rounded-xl border-gray-200 font-bold">Cancel</Button>
            <Button onClick={handleRenameFolder} className="h-11 px-6 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl">Rename</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Folder AlertDialog */}
      <AlertDialog open={deleteFolderOpen} onOpenChange={setDeleteFolderOpen}>
        <AlertDialogContent className="rounded-3xl border-none shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-bold text-gray-900">Delete Folder</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-500 font-medium">
              This will permanently delete the folder and all files inside it. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-11 px-6 rounded-xl font-bold">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteFolder} className="h-11 px-6 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete File AlertDialog */}
      <AlertDialog open={deleteFileOpen} onOpenChange={setDeleteFileOpen}>
        <AlertDialogContent className="rounded-3xl border-none shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-bold text-gray-900">Delete File</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-500 font-medium">
              This will permanently delete this file. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-11 px-6 rounded-xl font-bold">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteFile} className="h-11 px-6 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
