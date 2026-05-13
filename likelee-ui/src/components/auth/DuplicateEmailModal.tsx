import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type DuplicateEmailModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
};

export function DuplicateEmailModal({
  open,
  onOpenChange,
  title = "Account already exists",
  description = "This email is already registered. Please sign in with the existing account or use a different email.",
}: DuplicateEmailModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md border-2 border-black bg-white">
        <DialogHeader className="pr-8 text-left">
          <DialogTitle className="text-xl font-black text-[#1B1C23]">
            {title}
          </DialogTitle>
          <DialogDescription className="pt-2 text-sm leading-6 text-gray-700">
            {description}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            className="bg-black text-white hover:bg-gray-900"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
