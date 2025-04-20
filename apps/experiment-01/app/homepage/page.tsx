"use client";
import React from "react";
import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Building,
  DollarSign,
  FileText,
  ChartBar,
  Bell,
  X,
  CalendarDays,
  Users,
  CheckCircle,
  Clock,
  TrendingUp,
  Plus,
  MoreHorizontal,
  ChevronDown,
  CheckSquare,
  Square,
} from "lucide-react";
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AppSidebar } from "@/components/app-sidebar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { RiHome2Line, RiLineChartLine, RiScanLine } from "@remixicon/react";
import {
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  Line,
  LineChart,
} from "recharts";
import { MetricCard } from "@/components/ui/MetricCard";
import { RecentEvents } from "@/components/ui/RecentEvents";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { LineChartPulse } from "@/components/ui/LineChartPulse";
import CommissionClaimsCard from "@/components/ui/CommissionClaimsCard";
import UpcomingAppointmentsCard from "@/components/ui/UpcomingAppointmentsCard";
import "@/components/index.css";
import { supabase } from "../supabaseClient";
import { Input } from "@/components/ui/input";
import { FileUp } from "lucide-react";
import DisplayCards from "@/components/display-cards";
import { Sparkles } from "lucide-react";
import styles from "./styles.module.scss";
import { get } from "http";
import ECGChartDisplay from "@/components/zoomable-linecharts";
import dynamic from "next/dynamic";

// Define TypeScript interfaces for our data
interface ECGData {
  fileName: string;
  norm_prob: number;
  mi_prob: number;
  confidence: number;
  prediction: number;
  ecg_data: number[][];
}

interface HistoryItem {
  created_at: string;
  norm_prob: number;
  mi_prob: number;
  class: string;
  file: string;
  ecg_data: number[][];
  email?: string;
}

const Homepage = () => {
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [email, setEmail] = useState("");
  const [isResultModalOpen, setIsResultModalOpen] = useState(false);
  const [predictionResult, setPredictionResult] = useState<ECGData | null>(
    null
  );
  const [history, setHistory] = useState<HistoryItem[] | null>(null);
  const [viewingHistoryItem, setViewingHistoryItem] = useState<ECGData | null>(
    null
  );
  const [activeModalData, setActiveModalData] = useState<ECGData | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const router = useRouter();
  // Greeting based on time of day
  const currentHour = new Date().getHours();
  let greeting = "Good morning";
  if (currentHour >= 12 && currentHour < 17) {
    greeting = "Good afternoon";
  } else if (currentHour >= 17) {
    greeting = "Good evening";
  }

  const bgColor = isDarkMode ? "bg-[#121212]" : "bg-white";
  const borderColor = isDarkMode ? "border-gray-800" : "border-gray-200";
  const textColor = isDarkMode ? "text-white" : "text-gray-900";
  const gridColor = isDarkMode ? "#333" : "#e5e7eb";
  const labelColor = isDarkMode ? "#888" : "#666";

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };

  const ECGChartDisplayComponent = dynamic(
    () => import("@/components/zoomable-linecharts"),
    {
      ssr: false,
      loading: () => <div>Loading ECG charts...</div>,
    }
  ); // here 

  useEffect(() => {
    const authToken = localStorage.getItem(
      "sb-onroqajvamgdrnrjnzzu-auth-token"
    );
    if (!authToken) {
      console.error("User not authenticated");
      return;
    }

    const { user } = JSON.parse(authToken);
    setEmail(user.email);
    setUserInfo(user.email);
    getHistory(user.email);

    const fetchDashboardData = async () => {
      const stats = await getUserECGStats(user.email);
      setEcgStats(stats);
    };
    fetchDashboardData();
  }, []);

  async function setUserInfo(email: string) {
    const { data, error } = await supabase
      .from("permission")
      .select("*")
      .eq("email", email)
      .single();

    if (error) {
      const { error: insertError } = await supabase.from("permission").insert({
        email: email,
        perm: 0,
      });
    }
  }

  async function getHistory(email: string) {
    const { data, error } = await supabase
      .from("history")
      .select("*")
      .eq("email", email)
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    // Parse the ECG data from string to JSON for each history item
    const parsedData = data.map((item: any) => ({
      ...item,
      ecg_data: item.ecg_data ? JSON.parse(item.ecg_data) : [],
    }));

    console.log("history", parsedData);
    setHistory(parsedData);
  }

  const handleViewHistoryItem = (item: HistoryItem) => {
    const historyItemData: ECGData = {
      fileName: item.file.split("/").pop() || "Unknown file",
      norm_prob: item.norm_prob,
      mi_prob: item.mi_prob,
      confidence: Math.max(item.norm_prob, item.mi_prob),
      prediction: item.class === "NORM" ? 0 : 1,
      ecg_data: item.ecg_data,
    };

    setViewingHistoryItem(historyItemData);
    setActiveModalData(historyItemData);
    setIsResultModalOpen(true);
  };
  const getUserECGStats = async (email: string) => {
    const { data, error } = await supabase
      .from('history')
      .select('*')
      .eq('email', email);
  
    if (error) {
      console.error('Error fetching ECG stats:', error);
      return null;
    }
  
    const totalECGs = data.length;
    const normCount = data.filter(item => item.class === 'NORM').length;
    const miCount = data.filter(item => item.class === 'MI').length;
  
    return {
      totalECGs,
      normCount,
      miCount,
      normPercentage: totalECGs > 0 ? Math.round((normCount / totalECGs) * 100) : 0,
      miPercentage: totalECGs > 0 ? Math.round((miCount / totalECGs) * 100) : 0,
      lastUpload: data.length > 0 ? new Date(data[0].created_at) : null
    };
  };
  
  const [ecgStats, setEcgStats] = useState<{
    totalECGs: number;
    normCount: number;
    miCount: number;
    normPercentage: number;
    miPercentage: number;
    lastUpload: Date | null;
  } | null>(null);

  const ResultModal = () => {
    const dataToDisplay = activeModalData;

    // State for selected leads
    const [selectedLeads, setSelectedLeads] = useState<number[]>(
      Array.from({ length: 12 }, (_, i) => i)
    ); // Default all leads selected

    // Lead names for display
    const leadNames = [
      "Lead I",
      "Lead II",
      "Lead III",
      "aVR",
      "aVL",
      "aVF",
      "V1",
      "V2",
      "V3",
      "V4",
      "V5",
      "V6",
    ];

    const toggleLead = (leadIndex: number) => {
      if (selectedLeads.includes(leadIndex)) {
        // Don't allow deselecting all leads
        if (selectedLeads.length > 1) {
          setSelectedLeads(selectedLeads.filter((i) => i !== leadIndex));
        }
      } else {
        setSelectedLeads([...selectedLeads, leadIndex]);
      }
    };

    if (!dataToDisplay) return null;

    return (
      <Dialog open={isResultModalOpen} onOpenChange={setIsResultModalOpen}>
        <DialogContent className="sm:max-w-[90%] max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>ECG Results for {dataToDisplay.fileName}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-sm font-medium">Normal Probability</p>
                <div className="flex items-center gap-2">
                  <Progress value={dataToDisplay.norm_prob} className="h-2" />
                  <span className="text-sm text-muted-foreground">
                    {dataToDisplay.norm_prob}%
                  </span>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium">MI Probability</p>
                <div className="flex items-center gap-2">
                  <Progress value={dataToDisplay.mi_prob} className="h-2" />
                  <span className="text-sm text-muted-foreground">
                    {dataToDisplay.mi_prob}%
                  </span>
                </div>
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">Prediction</p>
              <p
                className={`text-sm font-semibold ${
                  dataToDisplay.prediction === 0
                    ? "text-green-500"
                    : "text-red-500"
                }`}
              >
                {dataToDisplay.prediction === 0
                  ? "Normal"
                  : "Myocardial Infarction"}
              </p>
            </div>

            <div className="mt-4">
              <h3 className="text-sm font-medium mb-2">
                Select Leads to Display
              </h3>
              <div className="flex flex-wrap gap-2">
                {leadNames.map((name, index) => (
                  <div
                    key={index}
                    className="flex items-center space-x-2 cursor-pointer"
                    onClick={() => toggleLead(index)}
                  >
                    {selectedLeads.includes(index) ? (
                      <CheckSquare className="h-4 w-4 text-primary" />
                    ) : (
                      <Square className="h-4 w-4 text-muted-foreground" />
                    )}
                    <label className="text-sm font-medium leading-none cursor-pointer">
                      {name}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* ECG Display Section */}
            {dataToDisplay.ecg_data && (
              <div className="mt-6">
                <h3 className="text-lg font-medium mb-4">12-Lead ECG</h3>
                <ECGChartDisplayComponent
                  ecgData={dataToDisplay.ecg_data}
                  sampleRate={100}
                  leadLabels={leadNames}
                  visibleLeads={selectedLeads}
                />
              </div>
            )}
          </div>
            <div className="w-full mt-2">
                <Button className="w-full flex items-center justify-center gap-2"
                    onClick={(e) => {
                      router.push('/results');
                    }}
                    style={{ cursor: "pointer" }}
                >
                    View All Results 
                </Button>
            </div>
        </DialogContent>
      </Dialog>
    );
  };

  const handleUpload = async () => {
    if (files.length === 0) {
      alert("No files selected!");
      return;
    }

    setIsUploading(true);

    // Check if any file is not a .dat file
    const invalidFiles = files.filter((file) => !file.name.endsWith(".dat"));
    if (invalidFiles.length > 0) {
      alert("Error: Please upload .dat file");
      setIsUploading(false);
      setUploadSuccess(false);
      return;
    } else if (files.length > 1) {
      alert("Please only upload one file");
      setIsUploading(false);
      setUploadSuccess(false);
      return;
    }

    // Get user email from local storage
    const authToken = localStorage.getItem(
      "sb-onroqajvamgdrnrjnzzu-auth-token"
    );
    if (!authToken) {
      alert("Error: User not authenticated");
      setIsUploading(false);
      return;
    }

    const { user } = JSON.parse(authToken);
    const userEmail = user.email;

    try {
      const currentDate = new Date();
      const folderName = currentDate.toISOString().replace(/[:.]/g, "-");
      const basePath = `${userEmail}/ECG/${folderName}/`;

      for (const file of files) {
        const sanitizedFileName = file.name
          .replace(/\s+/g, "_")
          .replace(/[^a-zA-Z0-9_.-]/g, "");

        const filePath = `${basePath}${sanitizedFileName}`;
        const { data, error } = await supabase.storage
          .from("file")
          .upload(filePath, file);

        if (error) {
          alert(`Error uploading file ${file.name}: ${error.message}`);
          continue;
        }

        try {
          const formData = new FormData();
          formData.append("file", file);

          // Uncomment the appropriate endpoint
          const response = await fetch(
            "https://test-485822052532.asia-southeast1.run.app/predict",
            {
              method: "POST",
              body: formData,
            }
          );

          // const response = await fetch("http://127.0.0.1:5000/predict", {
          //   method: "POST",
          //   body: formData,
          // });

          if (!response.ok) {
            throw new Error(`API call failed with status ${response.status}`);
          }

          const result = await response.json();
          console.log("Prediction result:", result);

          // Create result object
          const resultData: ECGData = {
            fileName: file.name,
            norm_prob: result.norm_prob,
            mi_prob: result.mi_prob,
            confidence: result.confidence,
            prediction: result.prediction,
            ecg_data: result.ecg_data,
          };

          // Store in database
          const { error: insertError } = await supabase.from("history").insert({
            email: userEmail,
            file: filePath,
            norm_prob: result.norm_prob,
            mi_prob: result.mi_prob,
            class: result.prediction === 0 ? "NORM" : "MI",
            ecg_data: JSON.stringify(result.ecg_data),
          });

          if (insertError) {
            console.error("Error inserting into history:", insertError);
          }
          // Set prediction result and open modal
          await getHistory(email);
          setPredictionResult(resultData);
          setActiveModalData(resultData);
          setIsResultModalOpen(true);
        } catch (apiError: any) {
          alert(`Error processing ${file.name}: ${apiError}`);
        }
      }

      setUploadSuccess(true);
      setFiles([]);
    } catch (error: any) {
      alert(`Upload failed: ${error}`);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    email && (
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset className="overflow-hidden px-4 md:px-6 lg:px-8">
          {/* Header */}
          <header className="border-b">
            {/* Top Row: Breadcrumb and User Dropdown */}
            <div className="flex h-16 shrink-0 items-center gap-2">
              <div className="flex flex-1 items-center gap-2 px-3">
                <SidebarTrigger className="-ms-4" />
                <Separator orientation="vertical" className="mr-2 h-4" />
                <Breadcrumb>
                  <BreadcrumbList>
                    <BreadcrumbItem className="hidden md:block">
                      <BreadcrumbLink href="#">
                        <RiHome2Line size={22} aria-hidden="true" />
                        <span className="sr-only">Homepage</span>
                      </BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator className="hidden md:block" />
                    <BreadcrumbItem>
                      <BreadcrumbPage>Homepage</BreadcrumbPage>
                    </BreadcrumbItem>
                  </BreadcrumbList>
                </Breadcrumb>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <div className="flex flex-1 flex-col gap-4 lg:gap-6 py-4 lg:py-6 relative">
            <div className="h-[calc(100vh-4rem)] overflow-auto pb-6">
              {/* CSS Grid Dashboard Layout */}
              {/* Welcome Message - Now with fixed positioning */}
              <div className="welcome sticky top-0 z-10 mb-4">
                <div
                  className={`dashboard-card ${bgColor} rounded-2xl border ${borderColor} p-8 shadow-lg`}
                >
                  {/* Full-width greeting message */}
                  <div className="w-full">
                    <h2 className={`text-xl font-semibold ${textColor}`}>
                      {greeting}, {email}
                    </h2>
                  </div>

                  <div className = "dashboard-card-content">

                    <div className="dashboard-grid mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {/* Total ECGs Card */}
                    <Card className="p-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-medium">Total ECGs Analyzed</h3>
                        <FileText className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <p className="mt-2 text-2xl font-bold">
                        {ecgStats?.totalECGs || 0}
                      </p>
                    </Card>

                    {/* Normal Results Card */}
                    <Card className="p-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-medium">Normal Results</h3>
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      </div>
                      <p className="mt-2 text-2xl font-bold">
                        {ecgStats?.normCount || 0}
                      </p>
                    </Card>

                    {/* MI Results Card */}
                    <Card className="p-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-medium">Myocardial Infarction Detected</h3>
                        <X className="h-4 w-4 text-red-500" />
                      </div>
                      <p className="mt-2 text-2xl font-bold">
                        {ecgStats?.miCount || 0}
                      </p>
                    </Card>
                  </div>
                  </div>

                  {/* File upload section moved below */}
                  <div className="mt-6 border-2 border-dashed border-muted p-6 rounded-lg text-center">
                    <Input
                      type="file"
                      id="documents"
                      multiple
                      className="hidden"
                      onChange={handleFileChange}
                      required
                      accept=".dat"
                    />
                    <label
                      htmlFor="documents"
                      className="cursor-pointer flex flex-col items-center gap-2"
                    >
                      <FileUp className="h-8 w-8 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        Click to upload ECG data
                      </span>
                    </label>
                    {files.length > 0 && (
                      <div className="mt-4 text-sm text-muted-foreground">
                        {files.length} file(s) selected
                      </div>
                    )}
                  </div>

                  {/* Upload button */}
                  <Button
                    onClick={handleUpload}
                    disabled={isUploading || files.length === 0}
                    className="mt-4 w-full"
                  >
                    {isUploading ? "Uploading..." : "Save files"}
                  </Button>

                  {/* Upload success message */}
                  {uploadSuccess && (
                    <div className="mt-4 text-sm text-green-500">
                      File & Result saved successfully!
                    </div>
                  )}
                </div>
              </div>
              
            </div>
          </div>
        </SidebarInset>
        <ResultModal />
      </SidebarProvider>
    )
  );
};

export default Homepage;