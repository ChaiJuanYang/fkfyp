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
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { ChartOptions } from 'chart.js';

interface ECGChartProps {
  type: "normal" | "mi";
  width?: number;
  height?: number;
}

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const InteractiveECGChart = () => {
  // Generate one complete ECG cycle (1000ms)
  const generateECGData = () => {
    const dataPoints = [];
    for (let t = 0; t <= 1000; t += 2) { // 2ms resolution
      let voltage = 0;
      
      // P Wave (120-200ms)
      if (t >= 120 && t < 200) {
        voltage = 0.25 * Math.sin(Math.PI * (t - 120) / 80);
      }
      // PR Segment (200-320ms)
      else if (t >= 200 && t < 320) {
        voltage = 0;
      }
      // QRS Complex (320-400ms)
      else if (t >= 320 && t < 400) {
        if (t < 340) voltage = -0.2 * ((t - 320) / 20); // Q wave
        else if (t < 380) voltage = 1.5 * (1 - Math.abs((t - 360) / 20)); // R wave
        else voltage = -0.5 * ((400 - t) / 20); // S wave
      }
      // ST Segment (400-520ms)
      else if (t >= 400 && t < 520) {
        voltage = 0;
      }
      // T Wave (520-640ms)
      else if (t >= 520 && t < 640) {
        voltage = 0.35 * Math.sin(Math.PI * (t - 520) / 120);
      }
      // TP Segment (640-1000ms)
      else {
        voltage = 0;
      }
      
      dataPoints.push(voltage);
    }
    return dataPoints;
  };

  const ecgData = {
    labels: Array.from({length: 501}, (_, i) => i*2), // 0-1000ms in 2ms steps
    datasets: [{
      label: 'ECG Voltage',
      data: generateECGData(),
      borderColor: '#3b82f6',
      backgroundColor: 'rgba(59, 130, 246, 0.1)',
      borderWidth: 2,
      tension: 0.1,
      pointRadius: 0,
      pointHoverRadius: 6,
      fill: true
    }]
  };

  const segmentInfo = {
    '120-200ms': 'P Wave: Atrial Depolarization',
    '200-320ms': 'PR Segment: AV Node Delay',
    '320-400ms': 'QRS Complex: Ventricular Depolarization',
    '400-520ms': 'ST Segment: Early Repolarization',
    '520-640ms': 'T Wave: Ventricular Repolarization',
    '640-1000ms': 'TP Segment: Diastolic Period'
  };

  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      tooltip: {
        callbacks: {
          label: (context) => {
            const time = parseInt(context.label.replace('ms', ''));
            for (const [range, info] of Object.entries(segmentInfo)) {
              const [start, end] = range.split('-').map(s => parseInt(s.replace('ms', '')));
              if (time >= start && time <= end) return info;
            }
            return 'Baseline (0mV)';
          }
        }
      },
      legend: { display: false },
      title: {
        display: true,
        text: 'Single Cardiac Cycle (1000ms)',
        font: { size: 16 }
      }
    },
    scales: {
      x: {
        type: 'linear',
        title: { 
                    display: true, 
          text: 'Time (ms)', 
          font: { weight: 'bold' } 
        },
        min: 0,
        max: 1000,
        ticks: {
          stepSize: 100,
          callback: (value) => `${value}ms`,
          autoSkip: false 
        },
        grid: {
          display: false // Remove x-axis grid
        }
      },
      y: {
        title: { 
          display: true, 
          text: 'Voltage (mV)', 
          font: { weight: 'bold' } 
        },
        min: -1,
        max: 2,
        ticks: {
          stepSize: 0.5,
          callback: (value) => `${value}mV`
        },
        grid: {
          display: false // Remove y-axis grid
        }
      }
    },
    interaction: {
      intersect: false,
      mode: 'index' as const,
    }
  };

  return (
    <div className="w-full h-[500px]  rounded-xl shadow-lg">
      <Line options={options} data={ecgData} />
    </div>
  );
};

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
      <SidebarInset className="px-4 md:px-6 lg:px-8">
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

        <main className="py-6 space-y-8">
        <h1 className="text-3xl font-bold text-White-900 mb-2">Myocardial Infarction</h1>
          {/* Myocardial Infarction Section */}
          <section className="rounded-xl border border-white p-6 flex flex-col md:flex-row gap-6 items-center">           
           <div className="md:w-1/3">
              <img 
                src="./HeartArteryBlock.jpg" 
                alt="Blocked Coronary Artery"
                className="rounded-lg object-cover w-full h-auto shadow-md"
              />
            </div>
            <div className="md:w-2/3">
              
              <h2 className="text-2xl font-bold text-white-900 mb-3">Understanding Heart Attacks</h2>
              <div className="space-y-3 text-gray-300">
                <p className="text-lg">
                  <b>Cardiovascular Diseases (CVDs)</b> - Leading global cause of death, accounting for 
                  <span className="text-red-400"> 17.9 million lives annually</span> (WHO). 
                </p>
                <div className="bg-[#2a2a3a] p-4 rounded-lg border-l-4 border-red-500">
                  <h3 className="font-semibold text-white mb-2">Myocardial Infarction (MI)</h3>
                  <p>
                    A <span className="text-red-400 font-medium">medical emergency</span> occurring when coronary artery blockage causes 
                    <span className="text-red-400"> irreversible heart muscle death</span> within:
                  </p>
                  <ul className="list-[square] pl-5 mt-2 space-y-1 text-sm">
                    <li><b>20-40 minutes</b> of complete ischemia</li>
                    <li><b>6 hours</b> for complete transmural necrosis</li>
                  </ul>
                </div>
              </div>
            </div>
          </section>

          {/* ECG Leads Section */}
          <section className="rounded-xl border border-white shadow-sm lg:h-[350px] p-6 mb-8 ">
            <div className="flex flex-col md:flex-row gap-6 h-full">
              {/* ECG Image - Left Side (70% width) */}
              <div className="rounded-xl md:w-2/3 h-full min-h-[250px] overflow-hidden"> {/* Added min-h for mobile */}
                <img 
                  src="./12LeadECG.jpeg" 
                  alt="12 ECG Lead Placement Diagram"
                  className="rounded-lg object-contain w-full h-full shadow-md"
                />
              </div>

              {/* Lead Info Cards - Right Side (30% width, scrollable) */}
              <div className="md:w-1/3 h-full flex flex-col"> {/* Changed to flex-col */}
                <h1 className="text-3xl font-bold text-white-900 mb-4">12 ECG Leads</h1>
                <div className="flex-1 overflow-y-auto pr-2 space-y-3"> {/* Added flex-1 and space-y */}
                  {/* Bipolar Lead Card (open by default) */}
                  <details className="group" open>
                    <summary className="flex justify-between items-center p-3 bg-red-50 rounded-lg cursor-pointer sticky top-0 z-10">
                      <h3 className="font-bold text-gray-900">Bipolar LEAD I-III</h3>
                      <svg className="w-5 h-5 text-white-500 group-open:rotate-180 transition-transform" 
                          xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </summary>
                    <div className="p-3 mt-1 rounded-b-lg bg-[#181818] border-t-0">
                      <ul className="space-y-2 text-white-700">
                        <li>• Measured by potential difference between two electrodes</li>
                        <li>• Einthoven's Triangle</li>
                        <li>• Connecting Left Arm, Right Arm, Left Leg</li>
                      </ul>
                    </div>
                  </details>

                  {/* Augmented Leads Card */}
                  <details className="group">
                    <summary className="flex justify-between items-center p-3 bg-blue-50 rounded-lg cursor-pointer sticky top-0 z-10">
                      <h3 className="font-bold text-gray-900">aVR, aVL, aVF</h3>
                      <svg className="w-5 h-5 text-white-500 group-open:rotate-180 transition-transform" 
                          xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </summary>
                    <div className="p-3 mt-1 bg-[#181818] rounded-b-lg border-t-0">
                      <ul className="space-y-2 text-sm text-white-700">
                        <li>• Around Wilson CT</li>
                        <li>• Virtual Point</li>
                        <li>• Averaging electrical potential of 3 limb electrodes</li>
                        <li>• Connecting Right Arm, Left Arm, Left Leg</li>
                      </ul>
                    </div>
                  </details>

                  {/* Precordial Leads Card */}
                  <details className="group">
                    <summary className="flex justify-between items-center p-3 bg-green-50 rounded-lg cursor-pointer sticky top-0 z-10">
                      <h3 className="font-bold text-gray-900">V1 to V6</h3>
                      <svg className="w-5 h-5 text-white-500 group-open:rotate-180 transition-transform" 
                          xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </summary>
                    <div className="p-3 mt-1 bg-[#181818] rounded-b-lg border-t-0">
                      <ul className="space-y-2 text-sm text-white-700">
                        <li>• Precordial Leads</li>
                        <li>• 6 Different Leads</li>
                        <li>• Positioned along the chest wall</li>
                      </ul>
                    </div>
                  </details>
                </div>
              </div>
            </div>
          </section>
          
          {/* Interactive ECG Section */}
          <section className=" border border-white rounded-xl shadow-sm p-6 mb-8 h-[890px]">
          <h1 className="text-3xl font-bold text-white-900 mb-2">Interactive ECG Intervals</h1>
            <p className="text-white-600 mb-4">Hover over the ECG to learn about each segment</p>
            
            {/* ECG Chart - Full Width */}
            <div className="h-[500px] mb-8">
              <InteractiveECGChart />
            </div>

            {/* ECG Segments - Horizontal Scrollable Cards */}
            <div className="overflow-x-auto pb-4">
              <div className="flex space-x-4 w-max min-w-full">
                {/* P Wave Card */}
                <div className=" p-4 bg-white rounded-lg border border-gray-200 flex-shrink-0 w-64 hover:bg-[#e9e9e9] transition-colors duration-300">
                  <h3 className="font-bold text-gray-800 mb-2">P Wave (120-200ms)</h3>
                  <p className="text-sm text-gray-700">
                    A small bump showing the atria squeezing to push blood into the ventricles, known as <b>Atrial Depolarization</b>.
                  </p>
                </div>

                {/* PR Segment Card */}
                <div className=" p-4 bg-white rounded-lg border border-gray-200 flex-shrink-0 w-64 hover:bg-[#e9e9e9] transition-colors duration-300">
                  <h3 className="font-bold text-gray-800 mb-2">PR Segment (200-320ms)</h3>
                  <p className="text-sm text-gray-700">
                  A brief pause as the electrical signal travels through the heart’s middle
        (AV node) before the ventricles fire.
                  </p>
                </div>

                {/* QRS Complex Card */}
                <div className="p-4 bg-white rounded-lg border border-gray-200 flex-shrink-0 w-64 hover:bg-[#e9e9e9] transition-colors duration-300">
                  <h3 className="font-bold text-gray-800 mb-2">QRS Complex (320-400ms)</h3>
                  <p className="text-sm text-gray-700">
                    The sharp spike when the ventricles contract and pump blood out to the body, represents <b>Ventricular Depolarization</b>. 
                  </p>
                </div>

                {/* ST Segment Card */}
                <div className=" p-4 bg-white rounded-lg border border-gray-200 flex-shrink-0 w-64 hover:bg-[#e9e9e9] transition-colors duration-300">
                  <h3 className="font-bold text-gray-800 mb-2">ST Segment (400-520ms)</h3>
                  <p className="text-sm text-gray-700">
                    The flat line after the big spike, represents <b>Early Ventricular Repolarization</b>. If elevation is seen, it may indicate MI.
                  </p>
                </div>

                {/* T Wave Card */}
                <div className=" p-4 bg-white rounded-lg border border-gray-200 flex-shrink-0 w-64 hover:bg-[#e9e9e9] transition-colors duration-300">
                  <h3 className="font-bold text-gray-800 mb-2">T Wave (520-640ms)</h3>
                  <p className="text-sm text-gray-700">
                    A gentle wave showing the ventricles “resetting” electrically before the next beat, representing <b>Ventricular Repolarization</b>. Inversion may indicate Ischemia.
                  </p>
                </div>

                {/* TP Segment Card */}
                <div className=" p-4 bg-white rounded-lg border border-gray-200 flex-shrink-0 w-64 hover:bg-[#e9e9e9] transition-colors duration-300">
                  <h3 className="font-bold text-gray-800 mb-2">TP Segment (640-1000ms)</h3>
                  <p className="text-sm text-gray-700">
                    The resting stretch when the heart is fully relaxed between beats.
                  </p>
                </div>
              </div>
            </div>

          </section>

         {/* ECG Comparison Section */}
          <section className="border border-white rounded-xl shadow-sm p-6 bg-[#181818] ">
            <h2 className="text-2xl font-bold text-white mb-6">ECG Comparison</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Normal ECG Card */}
              <div className=" border border-white rounded-xl p-4 shadow-md hover:bg-[#2a2a3a] transition-colors duration-300">
                <div className="flex justify-center mb-4">
                  <ECGChart type="normal" width={300} height={300} />
                </div>
                <h3 className="font-semibold text-green-600 text-lg mb-3">Normal ECG Pattern</h3>
                <ul className="space-y-2 text-sm text-white-700">
                  <li className="flex items-start">
                    <span className="text-green-500 mr-2">✓</span>
                    <span>Regular rhythm (60-100 bpm)</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-500 mr-2">✓</span>
                    <span>No pathological Q waves or inverted T waves</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-500 mr-2">✓</span>
                    <span>ST segment sits at baseline</span>
                  </li>
                </ul>
              </div>

              {/* MI ECG Card */}
              <div className="border border-white rounded-xl p-4 shadow-md hover:bg-[#2a2a3a] transition-colors duration-300">
                <div className="flex justify-center mb-4">
                  <ECGChart type="mi" width={300} height={300} />
                </div>
                <h3 className="font-semibold text-red-600 text-lg mb-3">Myocardial Infarction ECG Pattern</h3>
                <ul className="space-y-2 text-sm text-white-700">
                  <li className="flex items-start">
                    <span className="text-red-500 mr-2">⚠️</span>
                    <span>ST segment elevation (STEMI) indicates acute injury</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-red-500 mr-2">⚠️</span>
                    <span>Pathological Q waves (>40ms) indicates necrosis</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-red-500 mr-2">⚠️</span>
                    <span>T wave inversion indicates ongoing ischemia/reperfusion</span>
                  </li>
                 </ul>
              </div>
            </div>

            {/* Key Differences Section */}
            <div className="mt-8  rounded-lg p-4 border border-white">
              <h3 className="font-bold text-white-800 mb-3">Key Differences</h3>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white-200">
                    <th className="text-left py-2 text-blue-700">Feature</th>
                    <th className="text-left py-2 text-green-600">Normal ECG</th>
                    <th className="text-left py-2 text-red-600">MI ECG</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-white">
                    <td className="py-2 font-medium">ST Segment</td>
                    <td className="py-2">Isoelectric (flat)</td>
                    <td className="py-2">Elevated or depressed</td>
                  </tr>
                  <tr className="border-b border-blue-100">
                    <td className="py-2 font-medium">Q Waves</td>
                    <td className="py-2">Small/normal</td>
                    <td className="py-2">Wide (>40ms) and deep</td>
                  </tr>
                  <tr className="border-b border-blue-100">
                    <td className="py-2 font-medium">T Waves</td>
                    <td className="py-2">Upright</td>
                    <td className="py-2">Inverted or peaked</td>
                  </tr>
                  <tr>
                    <td className="py-2 font-medium">Rhythm</td>
                    <td className="py-2">Regular</td>
                    <td className="py-2">May be irregular</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}