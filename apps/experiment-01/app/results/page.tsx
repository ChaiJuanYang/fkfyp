"use client";
import React from "react";
import { useState, useEffect } from "react";
import { FileText, CheckCircle, X, CalendarDays, Clock, CheckSquare, Square } from "lucide-react";
import { RiLineChartLine } from "@remixicon/react";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
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
import styles from "./styles.module.scss";
import { supabase } from "../supabaseClient";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
  } from "@/components/ui/dialog";
import { Progress } from "@radix-ui/react-progress";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";


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
const Result = () =>{
    const [history, setHistory] = useState<HistoryItem[] | null>(null);
    const [viewingHistoryItem, setViewingHistoryItem] = useState<ECGData | null>(
    null
    );
    const [loading, setLoading] = useState(false);
    const [activeModalData, setActiveModalData] = useState<ECGData | null>(null);
    const [isResultModalOpen, setIsResultModalOpen] = useState(false);
    const [predictionResult, setPredictionResult] = useState<ECGData | null>(
        null
    );
    const ECGChartDisplayComponent = dynamic(
    () => import("@/components/zoomable-linecharts"),
    {
        ssr: false,
        loading: () => <div>Loading ECG charts...</div>,
    }
    );

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

    useEffect(() => {
        const authToken = localStorage.getItem(
          "sb-onroqajvamgdrnrjnzzu-auth-token"
        );
        if (!authToken) {
          console.error("User not authenticated");
          return;
        }
    
        const { user } = JSON.parse(authToken);
        getHistory(user.email);
      }, []);
      
    const handleViewHistoryItem = (item: HistoryItem) => {
        const historyItemData: ECGData = {
          fileName: item.file.split("/").pop() || "Unknown file",
          norm_prob: item.norm_prob,
          mi_prob: item.mi_prob,
          confidence: Math.max(item.norm_prob, item.mi_prob),
          prediction: item.class === "NORM" ? 0 : 1,
          ecg_data: item.ecg_data,
        };
    
        setPredictionResult(historyItemData);
        setActiveModalData(historyItemData);
        setIsResultModalOpen(true);
      };
    
    
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
                <div className="space-y-2">
                    <p className="text-sm font-medium">Normal Probability</p>
                    <div className="flex items-center gap-3">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                        className="bg-green-500 h-2 rounded-full" 
                        style={{ width: `${dataToDisplay.norm_prob}%` }}
                        />
                    </div>
                    <span className="text-sm text-gray-600 w-8">
                        {dataToDisplay.norm_prob}%
                    </span>
                    </div>
                </div>
                <div className="space-y-2">
                    <p className="text-sm font-medium">MI Probability</p>
                    <div className="flex items-center gap-3">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                        className="bg-red-500 h-2 rounded-full" 
                        style={{ width: `${dataToDisplay.mi_prob}%` }}
                        />
                    </div>
                    <span className="text-sm text-gray-600 w-8">
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
          </DialogContent>
        </Dialog>
      );
    };

return (
    <SidebarProvider>
        <AppSidebar />
        <SidebarInset className="overflow-hidden px-4 md:px-6 lg:px-8">
        {/* Breadcrumb Header */}
        <header className="border-b">
            <div className="flex h-16 items-center gap-2 px-3">
            <SidebarTrigger />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <Breadcrumb>
                <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                    <BreadcrumbLink href="#">
                    <span className="sr-only">History</span>
                    </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                    <BreadcrumbPage>Results</BreadcrumbPage>
                </BreadcrumbItem>
                </BreadcrumbList>
            </Breadcrumb>
            </div>
        </header>

        {/* Main Content */}
        <div className={styles.History}>
            <h1>History</h1>
            <div className={styles.mainContent}>
            {loading ? (
                <div className={styles.loadingState}>
                <div className={styles.spinner}></div>
                <h2>Loading your history…</h2>
                </div>
            ) : !history || history.length === 0 ? (
                <div className={styles.emptyState}>
                <FileText size={32} className={styles.emptyIcon} />
                <h2>No history found</h2>
                <p>Upload your first ECG to see results here</p>
                </div>
            ) : (
                <div className={styles.cardList}>
                {history.map((item, idx) => (
                    <div
                    key={idx}
                    className={`${styles.card} ${
                        item.class === "NORM" ? styles.normal : styles.abnormal
                    }`}
                    style={{ cursor: "default" }}
                    >
                    {/* Card Header */}
                    <div className={styles.cardHeader}>
                        <div className={styles.statusIndicator}>
                        {item.class === "NORM" ? (
                            <CheckCircle size={18} className={styles.successIcon} />
                        ) : (
                            <X size={18} className={styles.errorIcon} />
                        )}
                        <span>{item.class}</span>
                        </div>
                        <span className={styles.date}>
                        <CalendarDays size={14} className={styles.icon} />
                        {new Date(item.created_at).toLocaleDateString()}
                        </span>
                    </div>

                    {/* Probability Rings */}
                    <div className={styles.probabilityRow}>
                        {/* Normal */}
                        <div className={styles.probabilityRing}>
                        <div className={styles.ringContainer}>
                            <div className={styles.ringBackground} />
                            <div
                            className={styles.ringFill}
                            style={{
                                borderColor: "#10B981",
                                clipPath: `polygon(0 0, 100% 0, 100% ${item.norm_prob}%, 0 ${item.norm_prob}%)`,
                            }}
                            />
                            <div className={styles.ringCenter}>
                            <span className={styles.ringValue}>
                                {item.norm_prob.toFixed(0)}%
                            </span>
                            <span className={styles.ringLabel}>Normal</span>
                            </div>
                        </div>
                        </div>

                        {/* MI */}
                        <div className={styles.probabilityRing}>
                        <div className={styles.ringContainer}>
                            <div className={styles.ringBackground} />
                            <div
                            className={styles.ringFill}
                            style={{
                                borderColor: "#EF4444",
                                clipPath: `polygon(0 0, 100% 0, 100% ${item.mi_prob}%, 0 ${item.mi_prob}%)`,
                            }}
                            />
                            <div className={styles.ringCenter}>
                            <span className={styles.ringValue}>
                                {item.mi_prob.toFixed(0)}%
                            </span>
                            <span className={styles.ringLabel}>MI</span>
                            </div>
                        </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className={styles.time}>
                        <div className={styles.clockTime}>
                            <Clock size={14} className={styles.icon} />
                            {new Date(item.created_at).toLocaleTimeString()}
                        </div>
                        <div className={styles.chart}>
                            <p>
                                <strong>File:</strong> {item.file.split("/").pop()}
                            </p>
                        </div>
                    
                        </div>
                        <div className="w-full mt-2">
                            <Button className="w-full flex items-center justify-center gap-2"
                                onClick={(e) => {
                                    e.stopPropagation(); // Prevent event bubbling
                                    console.log("Button clicked:", item);
                                    handleViewHistoryItem(item);
                                }}
                                style={{ cursor: "pointer" }}
                            >
                                View Full Results 
                            </Button>
                        </div>
                    </div>
                ))}
                </div>
            )}
            </div>
        </div>
        </SidebarInset>
        <ResultModal />
    </SidebarProvider>
    );
};

export default Result;
