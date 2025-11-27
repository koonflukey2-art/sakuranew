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
  }, [selectedAccount]);

  const fetchAdAccounts = async () => {
    setLoadingAccounts(true);
    try {
      const response = await fetch("/api/ad-accounts");
      if (response.ok) {
        const data = await response.json();
        const facebookAccounts = data.filter(
          (acc: AdAccount) => acc.platform === "FACEBOOK"
        );
        setAdAccounts(facebookAccounts);
        if (facebookAccounts.length > 0) {
          setSelectedAccount(facebookAccounts[0].id);
        }
      } else {
        toast({
          title: "ผิดพลาด",
          description: "Failed to load ad accounts",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "ผิดพลาด",
        description: "Failed to load ad accounts",
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
      if (response.ok) {
        const data = await response.json();
        setCampaigns(data.data || []);
      } else {
        toast({
          title: "ผิดพลาด",
          description: "Failed to fetch campaigns",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "ผิดพลาด",
        description: "Failed to fetch campaigns",
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
      // First fetch insights
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
          description: "No insights data available for this campaign",
          variant: "destructive",
        });
        return;
      }

      const insights = insightsData.data[0];

      // Then analyze with AI
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
        description: "Campaign analyzed successfully!",
      });
    } catch (error: any) {
      toast({
        title: "ผิดพลาด",
        description: error?.message || "Failed to analyze campaign",
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
      setProductSuggestions(suggestions);
      toast({
        title: "สำเร็จ!",
        description: `Generated ${suggestions.length} product suggestions!`,
      });
    } catch (error: any) {
      toast({
        title: "ผิดพลาด",
        description: error?.message || "Failed to generate suggestions",
        variant: "destructive",
      });
    } finally {
      setGeneratingProducts(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-500";
    if (score >= 60) return "text-yellow-500";
    return "text-red-500";
  };

  const getCompetitionColor = (level: string) => {
    if (level === "LOW") return "bg-green-500";
    if (level === "MEDIUM") return "bg-yellow-500";
    return "bg-red-500";
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            AI Dashboard
          </h1>
          <p className="text-muted-foreground mt-2">
            AI-powered insights for your campaigns and products
          </p>
        </div>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        >
          <Sparkles className="w-8 h-8 text-purple-500" />
        </motion.div>
      </motion.div>

      {/* Ad Account Selector */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card>
          <CardHeader>
            <CardTitle>Select Facebook Ad Account</CardTitle>
            <CardDescription>
              Choose an account to analyze campaigns
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Select
              value={selectedAccount}
              onValueChange={setSelectedAccount}
              disabled={loadingAccounts}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    loadingAccounts ? "Loading accounts..." : "Select ad account"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {adAccounts.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.accountName} ({account.accountId})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="campaigns" className="flex items-center gap-2">
              <Target className="w-4 h-4" />
              Campaign Analysis
            </TabsTrigger>
            <TabsTrigger value="products" className="flex items-center gap-2">
              <ShoppingBag className="w-4 h-4" />
              Product Suggestions
            </TabsTrigger>
          </TabsList>

          {/* Campaign Analysis Tab */}
          <TabsContent value="campaigns" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Campaigns List */}
              <Card>
                <CardHeader>
                  <CardTitle>Campaigns</CardTitle>
                  <CardDescription>Select a campaign to analyze</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {loadingCampaigns ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin" />
                    </div>
                  ) : campaigns.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      No campaigns found
                    </p>
                  ) : (
                    campaigns.map((campaign) => (
                      <motion.div
                        key={campaign.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        whileHover={{ scale: 1.02 }}
                        className="p-4 border rounded-lg space-y-2"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="font-semibold">{campaign.name}</h3>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge
                                variant={
                                  campaign.status === "ACTIVE"
                                    ? "default"
                                    : "secondary"
                                }
                              >
                                {campaign.status}
                              </Badge>
                              <span className="text-sm text-muted-foreground">
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
                          className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                        >
                          {analyzingCampaign &&
                          selectedCampaign?.id === campaign.id ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Analyzing...
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
              <Card>
                <CardHeader>
                  <CardTitle>AI Analysis</CardTitle>
                  <CardDescription>
                    {selectedCampaign
                      ? selectedCampaign.name
                      : "Select a campaign to see analysis"}
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
                          <p className="text-sm text-muted-foreground mt-2">
                            Optimization Score
                          </p>
                        </div>

                        {/* Analysis */}
                        <div>
                          <h4 className="font-semibold mb-2">Analysis</h4>
                          <p className="text-sm text-muted-foreground">
                            {analysis.analysis}
                          </p>
                        </div>

                        {/* Strengths */}
                        <div>
                          <h4 className="font-semibold mb-2 flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-green-500" />
                            Strengths
                          </h4>
                          <ul className="space-y-1">
                            {analysis.strengths.map((strength, idx) => (
                              <motion.li
                                key={idx}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: idx * 0.1 }}
                                className="text-sm text-green-600 flex items-start gap-2"
                              >
                                <span>•</span>
                                <span>{strength}</span>
                              </motion.li>
                            ))}
                          </ul>
                        </div>

                        {/* Weaknesses */}
                        <div>
                          <h4 className="font-semibold mb-2 flex items-center gap-2">
                            <Target className="w-4 h-4 text-red-500" />
                            Areas to Improve
                          </h4>
                          <ul className="space-y-1">
                            {analysis.weaknesses.map((weakness, idx) => (
                              <motion.li
                                key={idx}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: idx * 0.1 }}
                                className="text-sm text-red-600 flex items-start gap-2"
                              >
                                <span>•</span>
                                <span>{weakness}</span>
                              </motion.li>
                            ))}
                          </ul>
                        </div>

                        {/* Recommendations */}
                        <div>
                          <h4 className="font-semibold mb-2 flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-purple-500" />
                            AI Recommendations
                          </h4>
                          <ul className="space-y-2">
                            {analysis.recommendations.map((rec, idx) => (
                              <motion.li
                                key={idx}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: idx * 0.1 }}
                                className="text-sm bg-gradient-to-r from-purple-50 to-pink-50 p-3 rounded-lg"
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
                        className="flex flex-col items-center justify-center py-12 text-muted-foreground"
                      >
                        <Sparkles className="w-16 h-16 mb-4 opacity-20" />
                        <p>No analysis yet</p>
                        <p className="text-sm mt-1">
                          Select a campaign and click &quot;Analyze with AI&quot;
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
            <Card>
              <CardHeader>
                <CardTitle>Product Suggestion Parameters</CardTitle>
                <CardDescription>
                  Enter your criteria and let AI suggest profitable products
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    <Input
                      id="category"
                      placeholder="e.g., Electronics, Fashion"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="trend">Trend</Label>
                    <Input
                      id="trend"
                      placeholder="e.g., Sustainable, Minimalist"
                      value={trend}
                      onChange={(e) => setTrend(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="budget">Budget (THB)</Label>
                    <Input
                      id="budget"
                      type="number"
                      placeholder="e.g., 50000"
                      value={budget}
                      onChange={(e) => setBudget(e.target.value)}
                    />
                  </div>
                </div>
                <Button
                  onClick={generateProductSuggestions}
                  disabled={generatingProducts}
                  className="w-full mt-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                >
                  {generatingProducts ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generating Suggestions...
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
                      transition={{ delay: idx * 0.1 }}
                      whileHover={{ scale: 1.05 }}
                    >
                      <Card className="h-full hover:shadow-lg transition-shadow">
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <CardTitle className="text-lg">
                                {product.name}
                              </CardTitle>
                              <CardDescription>
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
                          <p className="text-sm text-muted-foreground">
                            {product.description}
                          </p>

                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div>
                              <p className="text-muted-foreground">Cost</p>
                              <p className="font-semibold">
                                ฿{product.estimatedCost.toLocaleString()}
                              </p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Price</p>
                              <p className="font-semibold">
                                ฿{product.estimatedPrice.toLocaleString()}
                              </p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">
                                Profit Margin
                              </p>
                              <p className="font-semibold text-green-600">
                                {product.profitMargin}%
                              </p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">
                                Demand Score
                              </p>
                              <p
                                className={`font-semibold ${getScoreColor(
                                  product.demandScore
                                )}`}
                              >
                                {product.demandScore}/100
                              </p>
                            </div>
                          </div>

                          <div className="pt-2 border-t">
                            <p className="text-xs text-muted-foreground mb-1">
                              Why this product?
                            </p>
                            <p className="text-sm bg-gradient-to-r from-purple-50 to-pink-50 p-2 rounded">
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
