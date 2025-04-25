"use client";
import React, { useEffect, useRef } from "react";
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

interface ECGChartProps {
  type: "normal" | "mi";
  width?: number;
  height?: number;
}

const ECGChart: React.FC<ECGChartProps> = ({
  type,
  width = 800,
  height = 200,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // returns one cardiac cycle of 'length' samples
  const generateECGData = (length: number, shiftMs: number = 0): number[] => {
    // 1) first build the un-shifted cycle
    const base: number[] = [];
    for (let i = 0; i < length; i++) {
      const timeMs = i % 1000;
      let value = 0;
      if (type === "normal") {
        if (timeMs < 100) {
          value = 0.25 * Math.sin((Math.PI * timeMs) / 100);
        } else if (timeMs < 180) {
          value = 0;
        } else if (timeMs < 280) {
          if (timeMs < 200) {
            value = -0.2 * ((timeMs - 180) / 20);
          } else if (timeMs < 240) {
            value = 1.5 * (1 - Math.abs((timeMs - 220) / 20));
          } else {
            value = -0.5 * ((280 - timeMs) / 40);
          }
        } else if (timeMs < 400) {
          value = 0;
        } else if (timeMs < 600) {
          value = 0.35 * Math.sin((Math.PI * (timeMs - 400)) / 200);
        } else {
          value = 0;
        }
      } else if (type === "mi") {
        if (timeMs < 100) {
          // P‐wave
          value = 0.25 * Math.sin((Math.PI * timeMs) / 100);
        }
        else if (timeMs < 180) {
          // PR segment
          value = 0;
        }
        else if (timeMs < 280) {
          // QRS
          if (timeMs < 200) {
            value = -0.2 * ((timeMs - 180) / 20);
          } else if (timeMs < 240) {
            value = 1.5 * (1 - Math.abs((timeMs - 220) / 20));
          } else {
            value = -0.5 * ((280 - timeMs) / 40);
          }
        }
        else if (timeMs < 600) {
          // ST‐elevation: smooth half‐sine from 0 → 0.8
          const stPhase = (timeMs - 280) / (600 - 280);      //wavelength
          value = 0.3 * Math.sin(Math.PI * stPhase);
        }
        else {
          // TP flat
          value = 0;
        }

      }
  
      base.push(value);
    }
  
    // 2) compute how many samples that shift corresponds to
    const shiftSamples = Math.round((shiftMs / 1000) * length);
  
    // 3) rotate the array right by shiftSamples
    const shifted = Array.from({ length }, (_, i) =>
      base[(i - shiftSamples + length) % length] ?? 0
    );
  
    return shifted;
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.translate(0.5, 0.5);

    // draw grid
    ctx.clearRect(0, 0, width, height);
    ctx.strokeStyle = "#e0e0e0";
    ctx.lineWidth = 0.5;
    for (let y = 0; y <= height; y += height / 10) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
    for (let x = 0; x <= width; x += width / 5) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    // draw ECG trace
    const samples = generateECGData(1000,200);
    const stepX = width / samples.length;
    const verticalOffset = 41
    const midY = height / 2 + verticalOffset;
    const scaleY = height / 3;

    ctx.beginPath();
    ctx.strokeStyle = type === "normal" ? "#00a8ff" : "#ff4757";
    ctx.lineWidth = 2;
    ctx.lineCap = "butt";
    ctx.lineJoin = "miter";

    samples.forEach((v, i) => {
      const x = i * stepX;
      const y = midY - v * scaleY;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.stroke();
    const annotations: { label: string; timeMs: number }[] = [
      { label: "P", timeMs:  250 },  // mid-P-wave ~50 ms
      { label: "Q", timeMs: 395 },  // start of QRS
      { label: "R", timeMs: 420 },  // R-peak
      { label: "S", timeMs: 440 },  // end of QRS
      { label: "T", timeMs: 700 },  // mid-T-wave
    ];
    
    // 2) style your text
    ctx.fillStyle = type === "normal" ? "#00a8ff" : "#ff4757";
    ctx.font = "bold 14px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    
    // 3) loop and draw each label
    annotations.forEach(({ label, timeMs }) => {
      // compute sample index and coords
      const idx = Math.round((timeMs / 1000) * samples.length);
      const x = idx * stepX;
      const y = midY - samples[idx] * scaleY;
      
      // offset label a little above the wave
      if (label === "Q" || label === "S") {
        // put Q & S below
        ctx.textBaseline = "top";
        ctx.fillText(label, x, y + 20 );
      } else {
        // P, R, T above
        ctx.textBaseline = "bottom";
        ctx.fillText(label, x, y - 15);
      }
    });
  }, [type, width, height]);

  return (
    <div
      style={{
        width,
        height,
        borderRadius: "50%",
        overflow: "hidden",
        border: "2px solid #e0e0e0",
        boxSizing: "border-box",
      }}
    >
      <canvas ref={canvasRef} />
    </div>
  );
};

export default function MyocardialInfarctionPage() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="overflow-hidden px-4 md:px-6 lg:px-8">
        <header className="border-b">
          <div className="flex h-16 items-center gap-2 px-3">
            <SidebarTrigger />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="/">Home</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>About MI</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>

        <main className="py-6">
          <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Myocardial Infarction</h1>
          <div className="flex flex-col md:flex-row items-center gap-6 mb-8">
            <div className="w-full md:w-1/3">
            <img 
                src={"./test.png"} 
                alt="Heart Illustration"
                className="rounded-lg object-cover w-full h-auto max-h-64"
              />
            </div>
            
            {/* Text content on the right */}
            <div className="w-full md:w-2/3">
              <h1 className="text-3xl font-bold tracking-tight mb-2">Understanding Myocardial Infarction</h1>
              <p className="text-muted-foreground">
                Myocardial Infarction (MI): commonly known as a heart attack. 
              
                A medical condition that requires rapid and precise diagnosis to prevent fatal outcomes
              </p>
            </div>
          </div>
          </div>

          <div className={styles.ecgChartsGrid}>
            <div className= {styles.ecgChartsCard}>
              <ECGChart type="normal" width={300} height={300} />
            </div>
            
            <div className= {styles.ecgChartsCard}>
              <ECGChart type="mi" width={300} height={300} />
            </div>
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}

