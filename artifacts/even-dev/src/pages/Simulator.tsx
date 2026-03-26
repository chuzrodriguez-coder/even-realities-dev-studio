import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { useModel } from "@/context/ModelContext";
import { useLayoutText } from "@/hooks/use-display";
import { RefreshCw, Play, MonitorPlay } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Simulator() {
  const { model } = useModel();
  const [text, setText] = useState("Hello Even Realities Developer!\n\nThis is the display simulator.\nType text here to see how it formats on the glasses HUD.");
  const [activePage, setActivePage] = useState(0);

  const layoutMutation = useLayoutText();

  const handleSimulate = () => {
    if (!text.trim()) return;
    layoutMutation.mutate({
      model: model as "G1" | "G2",
      text,
      maxWidthPx: model === "G1" ? 488 : 640,
      linesPerScreen: model === "G1" ? 5 : 7,
    });
    setActivePage(0);
  };

  const layoutData = layoutMutation.data;
  const isG2 = model === "G2";
  
  // Dimensions for visual representation
  const width = isG2 ? 640 : 576;
  const height = isG2 ? 350 : 136;
  const scale = isG2 ? 0.6 : 0.8; // Scale down for UI fitting

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
            <MonitorPlay className="w-8 h-8 text-primary" />
            Display Simulator
          </h1>
          <p className="text-muted-foreground mt-1">
            Test how text and layouts render on the {model} monochrome display.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Input */}
        <div className="lg:col-span-5 space-y-4">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground flex justify-between items-center">
                <span>Content Payload</span>
                <Badge variant="outline">{model} specs</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea 
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Enter text to display on glasses..."
                className="h-64 font-mono text-sm"
              />
              <Button 
                className="w-full font-bold" 
                onClick={handleSimulate}
                isLoading={layoutMutation.isPending}
              >
                <Play className="w-4 h-4 mr-2" fill="currentColor" />
                Render on HUD
              </Button>
            </CardContent>
          </Card>

          {layoutData && (
            <Card className="bg-black/60 border-primary/20">
              <CardContent className="p-4 space-y-3 font-mono text-xs">
                <div className="flex justify-between text-muted-foreground">
                  <span>Pages Generated:</span>
                  <span className="text-primary font-bold">{layoutData.totalPages}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>BLE Packets:</span>
                  <span className="text-primary font-bold">{layoutData.totalPackets}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Display Width:</span>
                  <span className="text-foreground">{layoutData.displayWidthPx}px</span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column: Display Render */}
        <div className="lg:col-span-7 space-y-4">
          <Card className="overflow-hidden border-white/10 bg-[#050505]">
            <div className="border-b border-white/5 bg-black/40 px-4 py-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-red-500"></div>
                <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                <span className="ml-2 text-xs font-mono text-muted-foreground">lens_preview.render</span>
              </div>
              <Badge variant="default" className="text-[10px]">
                {width} x {height} px
              </Badge>
            </div>
            
            <div className="p-8 flex items-center justify-center min-h-[400px] relative bg-grid-white/[0.02]">
              {/* The "Lens" Container */}
              <div 
                className="relative overflow-hidden bg-black rounded-lg border border-primary/30 shadow-[0_0_50px_hsla(var(--primary)/0.15)] flex items-center justify-center transition-all duration-500"
                style={{
                  width: `${width * scale}px`,
                  height: `${height * scale}px`,
                }}
              >
                {/* CRT Scanline effect */}
                <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,3px_100%] z-10 mix-blend-overlay"></div>
                
                {layoutData && layoutData.pages.length > 0 ? (
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={activePage}
                      initial={{ opacity: 0, filter: "blur(4px)" }}
                      animate={{ opacity: 1, filter: "blur(0px)" }}
                      exit={{ opacity: 0, filter: "blur(4px)", transition: { duration: 0.1 } }}
                      className="w-full h-full p-4 flex flex-col justify-start relative z-0"
                    >
                      {layoutData.pages[activePage].lines.map((line, i) => (
                        <div 
                          key={i} 
                          className="font-mono phosphor-text whitespace-pre text-left"
                          style={{ 
                            fontSize: `${21 * scale}px`,
                            lineHeight: 1.5
                          }}
                        >
                          {line || " "}
                        </div>
                      ))}
                    </motion.div>
                  </AnimatePresence>
                ) : (
                  <div className="text-primary/30 font-mono text-sm phosphor-text animate-pulse">
                    NO SIGNAL
                  </div>
                )}
              </div>
            </div>
          </Card>

          {/* Page Controls */}
          {layoutData && layoutData.totalPages > 1 && (
            <div className="flex justify-center gap-2">
              {Array.from({ length: layoutData.totalPages }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => setActivePage(i)}
                  className={cn(
                    "w-10 h-2 rounded-full transition-all duration-300",
                    activePage === i ? "bg-primary shadow-[0_0_10px_hsla(var(--primary)/0.5)]" : "bg-white/10 hover:bg-white/20"
                  )}
                  aria-label={`Go to page ${i + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
