"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  TrendingUp,
  ShoppingBag,
  Sparkles,
  Target,
  Zap,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AdAccount {
  id: string;
  accountName: string;
  accountId: string;
  platform: string;
  isActive: boolean;
}

interface Campaign {
  id: string;
  name: string;
  status: string;
  objective: string;
  daily_budget?: string;
  lifetime_budget?: string;
}

interface CampaignAnalysis {
  analysis: string;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  score: number;
}

interface ProductSuggestion {
  name: string;
  category: string;
  description: string;
  estimatedCost: number;
  estimatedPrice: number;
  profitMargin: number;
  demandScore: number;
  competitionLevel: string;
  reason: string;
}

export default function AIDashboardPage() {
  const { toast } = useToast();

  const [adAccounts, setAdAccounts] = useState<AdAccount[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<string>("");
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(
    null
  );
  const [analysis, setAnalysis] = useState<CampaignAnalysis | null>(null);
  const [productSuggestions, setProductSuggestions] = useState<
    ProductSuggestion[]
  >([]);

  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [loadingCampaigns, setLoadingCampaigns] = useState(false);
  const [analyzingCampaign, setAnalyzingCampaign] = useState(false);
  const [generatingProducts, setGeneratingProducts] = useState(false);

  // Product suggestion form
  const [category, setCategory] = useState("");
  const [trend, setTrend] = useState("");
  const [budget, setBudget] = useState("");

  useEffect(() => {
    fetchAdAccounts();
  }, []);

  useEffect(() => {
    if (selectedAccount) {
      fetchCampaigns();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAccount]);

  const fetchAdAccounts = async () => {
    setLoadingAccounts(true);
    try {
      const response = await fetch("/api/ad-accounts");
      if (!response.ok) {
        throw new Error("Failed to load ad accounts");
      }

      const data = await response.json();
      const facebookAccounts: AdAccount[] = (data || []).filter(
        (acc: AdAccount) => acc.platform === "FACEBOOK"
      );

      setAdAccounts(facebookAccounts);

      if (facebookAccounts.length > 0) {
        setSelectedAccount(facebookAccounts[0].id);
      }
    } catch (error) {
      console.error(error);
      toast({
        title: "ผิดพลาด",
        description: "ไม่สามารถโหลดบัญชีโฆษณาได้",
        variant: "destructive",
      });
    } finally {
      setLoadingAccounts(false);
    }
  };

  const fetchCampaigns = async () => {
    if (!selectedAccount) return;
    setLoadingCampaigns(true);
    try {
      const response = await fetch(
        `/api/facebook-ads/campaigns?adAccountId=${selectedAccount}`
      );
      if (!response.ok) {
        throw new Error("Failed to fetch campaigns");
      }

      const data = await response.json();
      setCampaigns(data?.data || []);
    } catch (error) {
      console.error(error);
      toast({
        title: "ผิดพลาด",
        description: "ไม่สามารถโหลดแคมเปญได้",
        variant: "destructive",
      });
    } finally {
      setLoadingCampaigns(false);
    }
  };

  const analyzeCampaign = async (campaign: Campaign) => {
    setSelectedCampaign(campaign);
    setAnalyzingCampaign(true);
    setAnalysis(null);

    try {
      // ดึง insight จาก Facebook ก่อน
      const insightsResponse = await fetch(
        `/api/facebook-ads/insights?adAccountId=${selectedAccount}&campaignId=${
          campaign.id
        }&campaignName=${encodeURIComponent(campaign.name)}`
      );

      if (!insightsResponse.ok) {
        throw new Error("Failed to fetch insights");
      }

      const insightsData = await insightsResponse.json();

      if (!insightsData.data || insightsData.data.length === 0) {
        toast({
          title: "ผิดพลาด",
          description: "ยังไม่มีข้อมูล insights สำหรับแคมเปญนี้",
          variant: "destructive",
        });
        return;
      }

      const insights = insightsData.data[0];

      // ส่งให้ AI วิเคราะห์
      const analyzeResponse = await fetch("/api/ai/analyze-campaign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignId: campaign.id,
          insights,
        }),
      });

      if (!analyzeResponse.ok) {
        throw new Error("Failed to analyze campaign");
      }

      const analysisData: CampaignAnalysis = await analyzeResponse.json();
      setAnalysis(analysisData);

      toast({
        title: "สำเร็จ!",
        description: "วิเคราะห์แคมเปญเรียบร้อยแล้ว",
      });
    } catch (error: any) {
      console.error(error);
      toast({
        title: "ผิดพลาด",
        description: error?.message || "ไม่สามารถวิเคราะห์แคมเปญได้",
        variant: "destructive",
      });
    } finally {
      setAnalyzingCampaign(false);
    }
  };

  const generateProductSuggestions = async () => {
    setGeneratingProducts(true);
    try {
      const response = await fetch("/api/ai/suggest-products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category,
          trend,
          budget: budget ? parseFloat(budget) : undefined,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate suggestions");
      }

      const suggestions: ProductSuggestion[] = await response.json();
      setProductSuggestions(suggestions || []);

      toast({
        title: "สำเร็จ!",
        description: `AI แนะนำสินค้าให้ ${suggestions.length} รายการ`,
      });
    } catch (error: any) {
      console.error(error);
      toast({
        title: "ผิดพลาด",
        description:
          error?.message || "ไม่สามารถให้คำแนะนำสินค้าได้ กรุณาลองใหม่อีกครั้ง",
        variant: "destructive",
      });
    } finally {
      setGeneratingProducts(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-400";
    if (score >= 60) return "text-yellow-400";
    return "text-red-400";
  };

  const getCompetitionColor = (level: string) => {
    if (level === "LOW") return "bg-green-500/80 text-white";
    if (level === "MEDIUM") return "bg-yellow-500/80 text-black";
    return "bg-red-500/80 text-white";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-4xl font-bold text-gradient-purple mb-1">
            AI Dashboard
          </h1>
          <p className="text-gray-400">
            ให้ AI ช่วยวิเคราะห์แคมเปญโฆษณาและแนะนำสินค้าให้อัตโนมัติ
          </p>
        </div>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        >
          <Sparkles className="w-8 h-8 text-purple-400" />
        </motion.div>
      </motion.div>

      {/* Ad Account Selector */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="premium-card hover-glow">
          <CardHeader>
            <CardTitle className="text-white">
              เลือก Facebook Ad Account
            </CardTitle>
            <CardDescription className="text-gray-400">
              เลือกบัญชีโฆษณาที่ต้องการให้ AI วิเคราะห์
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Select
              value={selectedAccount}
              onValueChange={setSelectedAccount}
              disabled={loadingAccounts || adAccounts.length === 0}
            >
              <SelectTrigger className="bg-white/5 border-white/20 text-white">
                <SelectValue
                  placeholder={
                    loadingAccounts ? "กำลังโหลดบัญชี..." : "เลือกบัญชีโฆษณา"
                  }
                />
              </SelectTrigger>
              <SelectContent className="bg-black border-white/10 text-white">
                {adAccounts.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.accountName} ({account.accountId})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {adAccounts.length === 0 && !loadingAccounts && (
              <p className="text-sm text-red-400 mt-2">
                ไม่พบบัญชีโฆษณา Facebook ที่เชื่อมต่อไว้
              </p>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Tabs defaultValue="campaigns" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 bg-white/5 border border-white/10">
            <TabsTrigger
              value="campaigns"
              className="flex items-center gap-2 text-gray-200 data-[state=active]:bg-gradient-purple data-[state=active]:text-white"
            >
              <Target className="w-4 h-4" />
              Campaign Analysis
            </TabsTrigger>
            <TabsTrigger
              value="products"
              className="flex items-center gap-2 text-gray-200 data-[state=active]:bg-gradient-pink data-[state=active]:text-white"
            >
              <ShoppingBag className="w-4 h-4" />
              Product Suggestions
            </TabsTrigger>
          </TabsList>

          {/* Campaign Analysis Tab */}
          <TabsContent value="campaigns" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Campaigns List */}
              <Card className="premium-card hover-glow">
                <CardHeader>
                  <CardTitle className="text-white">แคมเปญ</CardTitle>
                  <CardDescription className="text-gray-400">
                    เลือกแคมเปญที่ต้องการให้ AI วิเคราะห์
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {loadingCampaigns ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
                    </div>
                  ) : campaigns.length === 0 ? (
                    <p className="text-center text-gray-400 py-8">
                      ยังไม่มีแคมเปญในบัญชีนี้
                    </p>
                  ) : (
                    campaigns.map((campaign) => (
                      <motion.div
                        key={campaign.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        whileHover={{ scale: 1.02 }}
                        className="p-4 rounded-xl border border-white/10 bg-white/5 space-y-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <h3 className="font-semibold text-white">
                              {campaign.name}
                            </h3>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <Badge
                                variant={
                                  campaign.status === "ACTIVE"
                                    ? "default"
                                    : "secondary"
                                }
                                className={
                                  campaign.status === "ACTIVE"
                                    ? "bg-green-500/80 text-white"
                                    : "bg-gray-500/60 text-white"
                                }
                              >
                                {campaign.status}
                              </Badge>
                              <span className="text-xs text-gray-400">
                                {campaign.objective}
                              </span>
                            </div>
                          </div>
                        </div>
                        <Button
                          onClick={() => analyzeCampaign(campaign)}
                          disabled={
                            (analyzingCampaign &&
                              selectedCampaign?.id === campaign.id) ||
                            !selectedAccount
                          }
                          className="w-full bg-gradient-purple hover:opacity-90 text-white"
                        >
                          {analyzingCampaign &&
                          selectedCampaign?.id === campaign.id ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              กำลังวิเคราะห์...
                            </>
                          ) : (
                            <>
                              <Zap className="w-4 h-4 mr-2" />
                              Analyze with AI
                            </>
                          )}
                        </Button>
                      </motion.div>
                    ))
                  )}
                </CardContent>
              </Card>

              {/* Analysis Results */}
              <Card className="premium-card hover-glow">
                <CardHeader>
                  <CardTitle className="text-white">ผลการวิเคราะห์ AI</CardTitle>
                  <CardDescription className="text-gray-400">
                    {selectedCampaign
                      ? selectedCampaign.name
                      : "เลือกแคมเปญจากด้านซ้ายเพื่อดูผลวิเคราะห์"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <AnimatePresence mode="wait">
                    {analysis ? (
                      <motion.div
                        key="analysis"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="space-y-6"
                      >
                        {/* Score */}
                        <div className="text-center">
                          <div
                            className={`text-6xl font-bold ${getScoreColor(
                              analysis.score
                            )}`}
                          >
                            {analysis.score}
                          </div>
                          <p className="text-sm text-gray-400 mt-2">
                            Optimization Score
                          </p>
                        </div>

                        {/* Analysis */}
                        <div>
                          <h4 className="font-semibold mb-2 text-white">
                            ภาพรวมการวิเคราะห์
                          </h4>
                          <p className="text-sm text-gray-300">
                            {analysis.analysis}
                          </p>
                        </div>

                        {/* Strengths */}
                        <div>
                          <h4 className="font-semibold mb-2 flex items-center gap-2 text-white">
                            <TrendingUp className="w-4 h-4 text-green-400" />
                            จุดเด่นของแคมเปญ
                          </h4>
                          <ul className="space-y-1">
                            {analysis.strengths.map((strength, idx) => (
                              <motion.li
                                key={idx}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: idx * 0.05 }}
                                className="text-sm text-green-300 flex items-start gap-2"
                              >
                                <span>•</span>
                                <span>{strength}</span>
                              </motion.li>
                            ))}
                          </ul>
                        </div>

                        {/* Weaknesses */}
                        <div>
                          <h4 className="font-semibold mb-2 flex items-center gap-2 text-white">
                            <Target className="w-4 h-4 text-red-400" />
                            จุดที่ควรปรับปรุง
                          </h4>
                          <ul className="space-y-1">
                            {analysis.weaknesses.map((weakness, idx) => (
                              <motion.li
                                key={idx}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: idx * 0.05 }}
                                className="text-sm text-red-300 flex items-start gap-2"
                              >
                                <span>•</span>
                                <span>{weakness}</span>
                              </motion.li>
                            ))}
                          </ul>
                        </div>

                        {/* Recommendations */}
                        <div>
                          <h4 className="font-semibold mb-2 flex items-center gap-2 text-white">
                            <Sparkles className="w-4 h-4 text-purple-400" />
                            คำแนะนำจาก AI
                          </h4>
                          <ul className="space-y-2">
                            {analysis.recommendations.map((rec, idx) => (
                              <motion.li
                                key={idx}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: idx * 0.05 }}
                                className="text-sm bg-purple-500/10 border border-purple-500/30 p-3 rounded-lg text-gray-100"
                              >
                                {rec}
                              </motion.li>
                            ))}
                          </ul>
                        </div>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="empty"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex flex-col items-center justify-center py-12 text-gray-400"
                      >
                        <Sparkles className="w-16 h-16 mb-4 opacity-30 text-purple-400" />
                        <p>ยังไม่มีผลการวิเคราะห์</p>
                        <p className="text-sm mt-1">
                          เลือกแคมเปญด้านซ้ายแล้วกด &quot;Analyze with AI&quot;
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Product Suggestions Tab */}
          <TabsContent value="products" className="space-y-6">
            {/* Input Form */}
            <Card className="premium-card hover-glow">
              <CardHeader>
                <CardTitle className="text-white">
                  พารามิเตอร์สำหรับแนะนำสินค้า
                </CardTitle>
                <CardDescription className="text-gray-400">
                  ใส่เงื่อนไขที่ต้องการ แล้วให้ AI แนะนำสินค้าที่มีโอกาสทำกำไร
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="category" className="text-gray-200">
                      หมวดหมู่สินค้า
                    </Label>
                    <Input
                      id="category"
                      placeholder="เช่น Supplement, Skincare"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="bg-white/5 border-white/20 text-white placeholder:text-gray-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="trend" className="text-gray-200">
                      เทรนด์ / แนวโน้ม
                    </Label>
                    <Input
                      id="trend"
                      placeholder="เช่น Healthy, Minimalist"
                      value={trend}
                      onChange={(e) => setTrend(e.target.value)}
                      className="bg-white/5 border-white/20 text-white placeholder:text-gray-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="budget" className="text-gray-200">
                      งบประมาณโดยประมาณ (฿)
                    </Label>
                    <Input
                      id="budget"
                      type="number"
                      placeholder="เช่น 50000"
                      value={budget}
                      onChange={(e) => setBudget(e.target.value)}
                      className="bg-white/5 border-white/20 text-white placeholder:text-gray-500"
                    />
                  </div>
                </div>
                <Button
                  onClick={generateProductSuggestions}
                  disabled={generatingProducts}
                  className="w-full mt-4 bg-gradient-pink hover:opacity-90 text-white"
                >
                  {generatingProducts ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      กำลังให้ AI แนะนำสินค้า...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Generate AI Suggestions
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Suggestions Grid */}
            <AnimatePresence>
              {productSuggestions.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                >
                  {productSuggestions.map((product, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: idx * 0.05 }}
                      whileHover={{ scale: 1.03 }}
                    >
                      <Card className="premium-card h-full">
                        <CardHeader>
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1">
                              <CardTitle className="text-lg text-white">
                                {product.name}
                              </CardTitle>
                              <CardDescription className="text-gray-400">
                                {product.category}
                              </CardDescription>
                            </div>
                            <Badge
                              className={getCompetitionColor(
                                product.competitionLevel
                              )}
                            >
                              {product.competitionLevel}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <p className="text-sm text-gray-300">
                            {product.description}
                          </p>

                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <div>
                              <p className="text-gray-400">ต้นทุนโดยประมาณ</p>
                              <p className="font-semibold text-white">
                                ฿{product.estimatedCost.toLocaleString()}
                              </p>
                            </div>
                            <div>
                              <p className="text-gray-400">ราคาขายแนะนำ</p>
                              <p className="font-semibold text-white">
                                ฿{product.estimatedPrice.toLocaleString()}
                              </p>
                            </div>
                            <div>
                              <p className="text-gray-400">กำไรต่อชิ้น</p>
                              <p className="font-semibold text-green-400">
                                {product.profitMargin}%
                              </p>
                            </div>
                            <div>
                              <p className="text-gray-400">Demand Score</p>
                              <p
                                className={`font-semibold ${getScoreColor(
                                  product.demandScore
                                )}`}
                              >
                                {product.demandScore}/100
                              </p>
                            </div>
                          </div>

                          <div className="pt-2 border-t border-white/10">
                            <p className="text-xs text-gray-400 mb-1">
                              ทำไม AI ถึงแนะนำสินค้าให้นี้
                            </p>
                            <p className="text-sm bg-purple-500/10 border border-purple-500/30 p-2 rounded text-gray-100">
                              {product.reason}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  );
}
