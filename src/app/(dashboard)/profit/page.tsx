"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Calculator,
  ChevronLeft,
  ChevronRight,
  Save,
  FileText,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";

interface Product {
  id: string;
  name: string;
  category: string;
}

interface FormData {
  // Step 1
  useExistingProduct: boolean;
  existingProductId: string; // ✅ เพิ่ม: เก็บ id กันชื่อซ้ำ + select ทำงานชัวร์
  productName: string;
  productCategory: string;
  businessType: string;

  // Step 2
  sellPrice: number;
  vatPercent: number;
  cogs: number;
  salesChannel: string;
  platformPercent: number;
  shippingPercent: number;
  kolCommissionPercent: number;
  packingCost: number;
  shippingCost: number;

  // Step 3
  profitGoalPeriod: string;
  profitGoalAmount: number;
  adCostPerOrder: number;
}

export default function ProfitCalculatorPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);

  useEffect(() => {
    const checkAccess = async () => {
      try {
        const response = await fetch("/api/check-permission?page=profit");
        const data = await response.json();
        if (!data.hasAccess) {
          router.push("/");
        } else {
          setHasAccess(true);
        }
      } catch (error) {
        router.push("/");
      }
    };
    checkAccess();
  }, [router]);

  const [formData, setFormData] = useState<FormData>({
    useExistingProduct: false,
    existingProductId: "",
    productName: "",
    productCategory: "",
    businessType: "ยิงแอด",

    sellPrice: 0,
    vatPercent: 7,
    cogs: 0,
    salesChannel: "เว็บไซต์ตัวเอง",
    platformPercent: 0,
    shippingPercent: 0,
    kolCommissionPercent: 0,
    packingCost: 0,
    shippingCost: 0,

    profitGoalPeriod: "ต่อเดือน",
    profitGoalAmount: 0,
    adCostPerOrder: 0,
  });

  // ✅ update แบบ functional กันค่าทับกัน (แก้อาการ select แล้วไม่ติด)
  const updateFormData = (field: keyof FormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Fetch products
  useEffect(() => {
    if (formData.useExistingProduct) {
      fetchProducts();
    } else {
      // กลับมา "สร้างสินค้าใหม่" -> เคลียร์ selection เดิม
      setFormData((prev) => ({
        ...prev,
        existingProductId: "",
        productName: "",
        productCategory: "",
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.useExistingProduct]);

  const fetchProducts = async () => {
    try {
      setLoadingProducts(true);
      const response = await fetch("/api/products");
      if (!response.ok) throw new Error("Failed to fetch products");
      const data = await response.json();
      setProducts(Array.isArray(data) ? data : []);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถโหลดข้อมูลสินค้าได้",
      });
    } finally {
      setLoadingProducts(false);
    }
  };

  // Calculations for Step 2
  const vat = formData.sellPrice * (formData.vatPercent / 100);
  const platformFee = formData.sellPrice * (formData.platformPercent / 100);
  const shippingFee = formData.sellPrice * (formData.shippingPercent / 100);
  const kolCommission =
    formData.sellPrice * (formData.kolCommissionPercent / 100);

  const totalCost =
    formData.cogs +
    platformFee +
    shippingFee +
    kolCommission +
    formData.packingCost +
    formData.shippingCost;

  const grossProfit = formData.sellPrice - vat - totalCost;

  // Calculations for Step 3
  const netProfit = grossProfit - formData.adCostPerOrder;
  const breakEvenROAS =
    totalCost > 0 && formData.adCostPerOrder > 0
      ? totalCost / formData.adCostPerOrder
      : 0;

  const targetOrders =
    netProfit > 0 ? Math.ceil(formData.profitGoalAmount / netProfit) : 0;
  const targetRevenue = targetOrders * formData.sellPrice;
  const adBudget = targetOrders * formData.adCostPerOrder;

  const handleNext = () => {
    if (currentStep === 1) {
      if (formData.useExistingProduct) {
        if (!formData.existingProductId) {
          toast({
            variant: "destructive",
            title: "กรุณาเลือกสินค้า",
            description: "เลือกสินค้าที่มีอยู่แล้วก่อนกดถัดไป",
          });
          return;
        }
      } else {
        if (!formData.productName || !formData.productCategory || !formData.businessType) {
          toast({
            variant: "destructive",
            title: "กรุณากรอกข้อมูลให้ครบ",
            description: "กรุณากรอกชื่อสินค้า หมวดหมู่ และประเภทธุรกิจ",
          });
          return;
        }
      }
    } else if (currentStep === 2) {
      if (formData.sellPrice <= 0 || formData.cogs <= 0) {
        toast({
          variant: "destructive",
          title: "กรุณากรอกข้อมูลให้ครบ",
          description: "กรุณากรอกราคาขายและต้นทุนสินค้า",
        });
        return;
      }
    }

    setCurrentStep((s) => s + 1);
  };

  const handleBack = () => setCurrentStep((s) => s - 1);

  const handleSave = () => {
    toast({
      title: "บันทึกสำเร็จ",
      description: "บันทึกผลการคำนวณเรียบร้อยแล้ว",
    });

    setCurrentStep(1);
    setFormData({
      useExistingProduct: false,
      existingProductId: "",
      productName: "",
      productCategory: "",
      businessType: "ยิงแอด",
      sellPrice: 0,
      vatPercent: 7,
      cogs: 0,
      salesChannel: "เว็บไซต์ตัวเอง",
      platformPercent: 0,
      shippingPercent: 0,
      kolCommissionPercent: 0,
      packingCost: 0,
      shippingCost: 0,
      profitGoalPeriod: "ต่อเดือน",
      profitGoalAmount: 0,
      adCostPerOrder: 0,
    });
  };

  const handleGenerateReport = () => {
    toast({
      title: "กำลังสร้างรายงาน",
      description: "กำลังสร้างรายงานทุกแพลตฟอร์ม...",
    });
  };

  const progress = (currentStep / 3) * 100;

  if (hasAccess === null) {
    return <div className="p-6">กำลังตรวจสอบสิทธิ์...</div>;
  }

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      <div>
        <h1 className="text-xl md:text-2xl font-bold">คำนวณกำไร (Advanced)</h1>
        <p className="text-sm md:text-base text-muted-foreground">
          เครื่องมือคำนวณกำไรแบบละเอียด 3 ขั้นตอน
        </p>
      </div>

      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span
            className={
              currentStep === 1
                ? "font-bold text-primary"
                : "text-muted-foreground"
            }
          >
            1️⃣ ข้อมูลสินค้า
          </span>
          <span
            className={
              currentStep === 2
                ? "font-bold text-primary"
                : "text-muted-foreground"
            }
          >
            2️⃣ คำนวณต้นทุน
          </span>
          <span
            className={
              currentStep === 3
                ? "font-bold text-primary"
                : "text-muted-foreground"
            }
          >
            3️⃣ เป้าหมายและผลลัพธ์
          </span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground overflow-x-auto pb-2">
        <Badge variant={currentStep === 1 ? "default" : "outline"}>Step 1</Badge>
        <ChevronRight className="h-4 w-4 flex-shrink-0" />
        <Badge variant={currentStep === 2 ? "default" : "outline"}>Step 2</Badge>
        <ChevronRight className="h-4 w-4 flex-shrink-0" />
        <Badge variant={currentStep === 3 ? "default" : "outline"}>Step 3</Badge>
      </div>

      {/* Step 1: ข้อมูลสินค้า */}
      {currentStep === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
              <Calculator className="h-5 w-5" />
              ข้อมูลสินค้า
            </CardTitle>
            <CardDescription>กรอกข้อมูลพื้นฐานของสินค้า</CardDescription>
          </CardHeader>

          <CardContent className="space-y-4 md:space-y-6">
            {/* ✅ FIX: กล่อง toggle ไม่ให้ "ขาวทับขาว" */}
            <div className="flex items-center justify-between gap-3 p-4 rounded-xl border border-white/10 bg-white/5">
              <div className="flex items-center gap-3">
                <Switch
                  checked={formData.useExistingProduct}
                  onCheckedChange={(checked) =>
                    updateFormData("useExistingProduct", checked)
                  }
                />
                <Label className="cursor-pointer text-slate-100">
                  {formData.useExistingProduct ? "เลือกสินค้าเดิม" : "สร้างสินค้าใหม่"}
                </Label>
              </div>

              {formData.useExistingProduct && (
                <span className="text-xs text-slate-300">
                  {loadingProducts ? "กำลังโหลดสินค้า..." : `${products.length} รายการ`}
                </span>
              )}
            </div>

            {/* ชื่อสินค้า */}
            {formData.useExistingProduct ? (
              <div className="space-y-2">
                <Label className="text-slate-100">เลือกสินค้า</Label>

                <Select
                  value={formData.existingProductId}
                  onValueChange={(productId) => {
                    const product = products.find((p) => p.id === productId);
                    if (!product) return;

                    // ✅ set ทีเดียวกัน ไม่ทับ state กัน
                    setFormData((prev) => ({
                      ...prev,
                      existingProductId: product.id,
                      productName: product.name,
                      productCategory: product.category,
                    }));
                  }}
                >
                  <SelectTrigger className="bg-black/40 border-white/10 text-slate-100">
                    <SelectValue placeholder="เลือกสินค้า" />
                  </SelectTrigger>

                  <SelectContent className="bg-slate-950 text-slate-100 border-slate-800">
                    {loadingProducts ? (
                      <SelectItem value="loading" disabled className="text-slate-300">
                        กำลังโหลด...
                      </SelectItem>
                    ) : products.length === 0 ? (
                      <SelectItem value="empty" disabled className="text-slate-300">
                        ยังไม่มีสินค้าในระบบ
                      </SelectItem>
                    ) : (
                      products.map((p) => (
                        <SelectItem
                          key={p.id}
                          value={p.id}
                          className="text-slate-100 focus:bg-purple-500/20 focus:text-slate-100"
                        >
                          {p.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>

                {/* แสดง category ที่ถูกเติมอัตโนมัติ */}
                {formData.productName && (
                  <p className="text-xs text-slate-400">
                    หมวดหมู่: <span className="text-slate-200">{formData.productCategory || "-"}</span>
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <Label className="text-slate-100">ชื่อสินค้า</Label>
                <Input
                  placeholder="กรอกชื่อสินค้า"
                  value={formData.productName}
                  onChange={(e) => updateFormData("productName", e.target.value)}
                  className="bg-black/40 border-white/10 text-slate-100 placeholder:text-slate-500"
                />
              </div>
            )}

            {/* หมวดหมู่ */}
            <div className="space-y-2">
              <Label className="text-slate-100">หมวดหมู่</Label>
              <Input
                placeholder="เช่น 'Skincare', 'กันแดด', 'เครื่องสำอาง'"
                value={formData.productCategory}
                onChange={(e) => updateFormData("productCategory", e.target.value)}
                disabled={formData.useExistingProduct}
                className="bg-black/40 border-white/10 text-slate-100 placeholder:text-slate-500 disabled:opacity-60"
              />
            </div>

            {/* ประเภทธุรกิจ */}
            <div className="space-y-2">
              <Label className="text-slate-100">ประเภทธุรกิจ</Label>
              <Select
                value={formData.businessType}
                onValueChange={(value) => updateFormData("businessType", value)}
              >
                <SelectTrigger className="bg-black/40 border-white/10 text-slate-100">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-950 text-slate-100 border-slate-800">
                  <SelectItem value="ยิงแอด">ยิงแอด (ยิงโฆษณา)</SelectItem>
                  <SelectItem value="Facebook Shop">Facebook Shop</SelectItem>
                  <SelectItem value="TikTok Shop">TikTok Shop</SelectItem>
                  <SelectItem value="Shopee">Shopee</SelectItem>
                  <SelectItem value="Lazada">Lazada</SelectItem>
                  <SelectItem value="อื่นๆ">อื่นๆ</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* ปุ่ม */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button
                variant="outline"
                className="w-full sm:flex-1 border-white/15 text-slate-100 hover:bg-white/5"
                onClick={handleGenerateReport}
              >
                <FileText className="h-4 w-4 mr-2" />
                สรุปรายงานทุกแพลตฟอร์ม
              </Button>
              <Button onClick={handleNext} className="w-full sm:flex-1">
                ถัดไป
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2 */}
      {currentStep === 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg md:text-xl">คำนวณต้นทุน</CardTitle>
            <CardDescription>กรอกข้อมูลต้นทุนและค่าใช้จ่ายต่างๆ</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 md:space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>ราคาขาย (฿)</Label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={formData.sellPrice || ""}
                    onChange={(e) =>
                      updateFormData("sellPrice", parseFloat(e.target.value) || 0)
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>VAT (%)</Label>
                  <Input
                    type="number"
                    placeholder="7"
                    value={formData.vatPercent}
                    onChange={(e) =>
                      updateFormData("vatPercent", parseFloat(e.target.value) || 7)
                    }
                  />
                  <p className="text-xs text-muted-foreground">VAT = ฿{vat.toFixed(2)}</p>
                </div>

                <div className="space-y-2">
                  <Label>ต้นทุนสินค้า COGS (฿)</Label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={formData.cogs || ""}
                    onChange={(e) =>
                      updateFormData("cogs", parseFloat(e.target.value) || 0)
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>ช่องทางขาย</Label>
                  <Select
                    value={formData.salesChannel}
                    onValueChange={(value) => updateFormData("salesChannel", value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="เว็บไซต์ตัวเอง">เว็บไซต์ตัวเอง</SelectItem>
                      <SelectItem value="Facebook Shop">Facebook Shop</SelectItem>
                      <SelectItem value="TikTok Shop">TikTok Shop</SelectItem>
                      <SelectItem value="Shopee">Shopee</SelectItem>
                      <SelectItem value="Lazada">Lazada</SelectItem>
                      <SelectItem value="Facebook Ads - ข้อความ">Facebook Ads - ข้อความ</SelectItem>
                      <SelectItem value="Facebook Ads - เว็บไซต์">Facebook Ads - เว็บไซต์</SelectItem>
                      <SelectItem value="TikTok Ads">TikTok Ads</SelectItem>
                      <SelectItem value="อื่นๆ">อื่นๆ</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>ค่าแพลตฟอร์ม (%)</Label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={formData.platformPercent || ""}
                    onChange={(e) =>
                      updateFormData("platformPercent", parseFloat(e.target.value) || 0)
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    ค่าแพลตฟอร์ม = ฿{platformFee.toFixed(2)}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>ค่าจัดส่ง (%)</Label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={formData.shippingPercent || ""}
                    onChange={(e) =>
                      updateFormData("shippingPercent", parseFloat(e.target.value) || 0)
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    ค่าจัดส่ง = ฿{shippingFee.toFixed(2)}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>ค่าคอมมิชชั่น KOL (%)</Label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={formData.kolCommissionPercent || ""}
                    onChange={(e) =>
                      updateFormData(
                        "kolCommissionPercent",
                        parseFloat(e.target.value) || 0
                      )
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    ค่าคอมมิชชั่น = ฿{kolCommission.toFixed(2)}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>ค่าแพ็ค (฿)</Label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={formData.packingCost || ""}
                    onChange={(e) =>
                      updateFormData("packingCost", parseFloat(e.target.value) || 0)
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>ค่าส่ง (฿)</Label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={formData.shippingCost || ""}
                    onChange={(e) =>
                      updateFormData("shippingCost", parseFloat(e.target.value) || 0)
                    }
                  />
                </div>

                <div className="bg-white/5 border border-white/10 p-4 rounded-lg space-y-3 mt-4">
                  <h3 className="font-semibold text-sm text-slate-100">
                    สรุปผล (Auto-calculate)
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">ต้นทุนรวม:</span>
                      <span className="font-bold">฿{totalCost.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">กำไรขั้นต้น:</span>
                      <span className={`font-bold ${grossProfit >= 0 ? "text-green-400" : "text-red-400"}`}>
                        ฿{grossProfit.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">ยอดขายเป้าหมาย:</span>
                      <span className="font-bold">฿{formData.sellPrice.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button variant="outline" className="w-full sm:w-auto" onClick={handleBack}>
                <ChevronLeft className="h-4 w-4 mr-2" />
                ย้อนกลับ
              </Button>
              <Button onClick={handleNext} className="w-full sm:flex-1">
                ถัดไป
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3 */}
      {currentStep === 3 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg md:text-xl">เป้าหมายและผลลัพธ์</CardTitle>
            <CardDescription>กรอกเป้าหมายและดูผลการคำนวณ</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 md:space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>เป้าหมายกำไร</Label>
                  <Select
                    value={formData.profitGoalPeriod}
                    onValueChange={(value) => updateFormData("profitGoalPeriod", value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ต่อเดือน">ต่อเดือน</SelectItem>
                      <SelectItem value="ต่อวัน">ต่อวัน</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>จำนวนเป้าหมายกำไร (฿)</Label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={formData.profitGoalAmount || ""}
                    onChange={(e) =>
                      updateFormData("profitGoalAmount", parseFloat(e.target.value) || 0)
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>ค่าใช้จ่ายโฆษณา/ต่อออเดอร์ (฿)</Label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={formData.adCostPerOrder || ""}
                    onChange={(e) =>
                      updateFormData("adCostPerOrder", parseFloat(e.target.value) || 0)
                    }
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="bg-white/5 border border-white/10 p-4 md:p-6 rounded-lg space-y-4">
                  <h3 className="font-semibold text-base md:text-lg">📊 ผลการคำนวณ</h3>

                  <div className="space-y-3">
                    <div className="flex justify-between items-center gap-2">
                      <span className="text-xs sm:text-sm text-muted-foreground">
                        กำไร{formData.profitGoalPeriod}/หน่วย:
                      </span>
                      <span className={`font-bold text-base md:text-lg ${netProfit >= 0 ? "text-green-400" : "text-red-400"}`}>
                        ฿{netProfit.toFixed(2)}
                      </span>
                    </div>

                    <div className="flex justify-between items-center gap-2">
                      <span className="text-xs sm:text-sm text-muted-foreground">จุดคุ้มทุน ROAS:</span>
                      <span className="font-bold text-base md:text-lg text-blue-400">
                        {breakEvenROAS.toFixed(2)}
                      </span>
                    </div>

                    <div className="flex justify-between items-center gap-2">
                      <span className="text-xs sm:text-sm text-muted-foreground">ยอดขายเป้าหมาย:</span>
                      <span className="font-bold text-base md:text-lg">
                        ฿{targetRevenue.toLocaleString()}
                      </span>
                    </div>

                    <div className="flex justify-between items-center gap-2">
                      <span className="text-xs sm:text-sm text-muted-foreground">จำนวนออเดอร์:</span>
                      <span className="font-bold text-base md:text-lg text-purple-400">
                        {targetOrders.toLocaleString()} ออเดอร์
                      </span>
                    </div>

                    <div className="flex justify-between items-center gap-2">
                      <span className="text-xs sm:text-sm text-muted-foreground">งบโฆษณา:</span>
                      <span className="font-bold text-base md:text-lg text-orange-400">
                        ฿{adBudget.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                {netProfit < 0 && (
                  <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-lg">
                    <p className="text-sm text-red-200">
                      ⚠️ <strong>คำเตือน:</strong> กำไรติดลบ กรุณาปรับราคาขายหรือลดต้นทุน
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button variant="outline" className="w-full sm:w-auto" onClick={handleBack}>
                <ChevronLeft className="h-4 w-4 mr-2" />
                ย้อนกลับ
              </Button>
              <Button onClick={handleSave} className="w-full sm:flex-1">
                <Save className="h-4 w-4 mr-2" />
                บันทึกผลลัพธ์
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
