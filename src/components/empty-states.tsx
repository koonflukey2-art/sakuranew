import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Package,
  Megaphone,
  Wallet,
  Users,
  FileBarChart,
  Plus,
} from "lucide-react";

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardContent className="flex flex-col items-center justify-center py-16">
        <div className="rounded-full bg-slate-700/50 p-6 mb-4">
          {icon}
        </div>
        <h3 className="text-xl font-semibold text-white mb-2">{title}</h3>
        <p className="text-slate-400 text-center max-w-md mb-6">{description}</p>
        {action && (
          <Button onClick={action.onClick}>
            <Plus className="w-4 h-4 mr-2" />
            {action.label}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export function EmptyProducts({ onAdd }: { onAdd: () => void }) {
  return (
    <EmptyState
      icon={<Package className="w-12 h-12 text-slate-400" />}
      title="ยังไม่มีสินค้า"
      description="เริ่มต้นเพิ่มสินค้าแรกของคุณเพื่อจัดการสต็อกและติดตามยอดขาย"
      action={{ label: "เพิ่มสินค้าแรก", onClick: onAdd }}
    />
  );
}

export function EmptyCampaigns({ onCreate }: { onCreate: () => void }) {
  return (
    <EmptyState
      icon={<Megaphone className="w-12 h-12 text-slate-400" />}
      title="ยังไม่มีแคมเปญ"
      description="สร้างแคมเปญโฆษณาแรกเพื่อเริ่มต้นการตลาดของคุณ"
      action={{ label: "สร้างแคมเปญ", onClick: onCreate }}
    />
  );
}

export function EmptyBudgets({ onAdd }: { onAdd: () => void }) {
  return (
    <EmptyState
      icon={<Wallet className="w-12 h-12 text-slate-400" />}
      title="ยังไม่มีงบประมาณ"
      description="เพิ่มงบประมาณเพื่อวางแผนและติดตามค่าใช้จ่าย"
      action={{ label: "เพิ่มงบประมาณ", onClick: onAdd }}
    />
  );
}

export function EmptyUsers() {
  return (
    <EmptyState
      icon={<Users className="w-12 h-12 text-slate-400" />}
      title="ไม่พบผู้ใช้"
      description="ยังไม่มีผู้ใช้ในระบบ หรือลองเปลี่ยนตัวกรอง"
    />
  );
}

export function EmptyReports() {
  return (
    <EmptyState
      icon={<FileBarChart className="w-12 h-12 text-slate-400" />}
      title="ยังไม่มีข้อมูล"
      description="เริ่มต้นเพิ่มสินค้าและแคมเปญเพื่อดูรายงาน"
    />
  );
}
