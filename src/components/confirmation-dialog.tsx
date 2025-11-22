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
import { AlertTriangle, Trash2 } from "lucide-react";

interface ConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  destructive?: boolean;
  loading?: boolean;
}

export function ConfirmationDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "ยืนยัน",
  cancelLabel = "ยกเลิก",
  onConfirm,
  destructive = false,
  loading = false,
}: ConfirmationDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            {destructive ? (
              <div className="rounded-full bg-red-500/10 p-2">
                <AlertTriangle className="w-5 h-5 text-red-500" />
              </div>
            ) : (
              <div className="rounded-full bg-blue-500/10 p-2">
                <AlertTriangle className="w-5 h-5 text-blue-500" />
              </div>
            )}
            <AlertDialogTitle>{title}</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="pt-2">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>
            {cancelLabel}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={loading}
            className={
              destructive
                ? "bg-red-500 hover:bg-red-600"
                : "bg-blue-500 hover:bg-blue-600"
            }
          >
            {loading ? "กำลังดำเนินการ..." : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function DeleteConfirmation({
  open,
  onOpenChange,
  itemName,
  onConfirm,
  loading,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemName: string;
  onConfirm: () => void;
  loading?: boolean;
}) {
  return (
    <ConfirmationDialog
      open={open}
      onOpenChange={onOpenChange}
      title="ยืนยันการลบ"
      description={`คุณแน่ใจหรือไม่ที่จะลบ "${itemName}"? การกระทำนี้ไม่สามารถย้อนกลับได้`}
      confirmLabel="ลบ"
      onConfirm={onConfirm}
      destructive
      loading={loading}
    />
  );
}
