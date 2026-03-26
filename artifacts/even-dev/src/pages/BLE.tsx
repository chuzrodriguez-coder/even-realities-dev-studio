import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { useModel } from "@/context/ModelContext";
import { useBleCommands, useSendCommand, useClearCommands } from "@/hooks/use-ble";
import { Bluetooth, Send, Trash2, Activity, ShieldCheck, TerminalSquare } from "lucide-react";
import { format } from "date-fns";
import { cn, formatHex } from "@/lib/utils";

export default function BLE() {
  const { model } = useModel();
  const [target, setTarget] = useState<"left" | "right" | "both">("left");
  const [commandType, setCommandType] = useState("text");
  const [payloadStr, setPayloadStr] = useState('{\n  "text": "Hello Even"\n}');
  const [rawHex, setRawHex] = useState("");

  const { data: logData, isLoading: isLoadingLog } = useBleCommands();
  const sendMutation = useSendCommand();
  const clearMutation = useClearCommands();

  const handleSend = () => {
    let parsedPayload;
    try {
      if (payloadStr.trim()) parsedPayload = JSON.parse(payloadStr);
    } catch (e) {
      alert("Invalid JSON in payload");
      return;
    }

    sendMutation.mutate({
      model: model as "G1" | "G2",
      target,
      commandType: commandType as any,
      payload: parsedPayload,
      rawHex: rawHex || undefined,
    });
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
            <Bluetooth className="w-8 h-8 text-primary" />
            BLE Protocol Workbench
          </h1>
          <p className="text-muted-foreground mt-1">
            Construct and simulate dual-BLE architecture commands to the glasses.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Command Builder */}
        <div className="lg:col-span-5 space-y-4">
          <Card>
            <CardHeader className="border-b border-white/5 pb-4">
              <CardTitle className="text-base flex items-center gap-2">
                <TerminalSquare className="w-5 h-5 text-primary" /> 
                Command Builder
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-5">
              
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Target Arm</label>
                <div className="flex bg-black/40 p-1 rounded-md border border-white/5">
                  {(["left", "right", "both"] as const).map(t => (
                    <button
                      key={t}
                      onClick={() => setTarget(t)}
                      className={cn(
                        "flex-1 py-1.5 text-sm font-medium rounded capitalize transition-all",
                        target === t ? "bg-white/10 text-white shadow-sm" : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Command Type</label>
                <select 
                  value={commandType}
                  onChange={(e) => setCommandType(e.target.value)}
                  className="w-full h-10 rounded-md border border-border bg-input/50 px-3 text-sm text-foreground focus:outline-none focus:border-primary"
                >
                  <option value="text">Text (0x15/0x16/0x20)</option>
                  <option value="image">Image BMP (0x15)</option>
                  <option value="microphone_on">Mic On (0x0E 0x01)</option>
                  <option value="ai_response">AI Response (0xF5)</option>
                  <option value="teleprompter">Teleprompter (G2)</option>
                  <option value="raw">Raw Hex Custom</option>
                </select>
              </div>

              {commandType === "raw" ? (
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Raw Hex</label>
                  <Input 
                    value={rawHex}
                    onChange={(e) => setRawHex(e.target.value)}
                    placeholder="e.g. 0x0E 0x01"
                    className="font-mono text-primary"
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Payload (JSON)</label>
                  <Textarea 
                    value={payloadStr}
                    onChange={(e) => setPayloadStr(e.target.value)}
                    className="font-mono text-xs h-32 text-blue-300"
                    spellCheck={false}
                  />
                </div>
              )}

              <Button 
                className="w-full" 
                onClick={handleSend}
                isLoading={sendMutation.isPending}
              >
                <Send className="w-4 h-4 mr-2" />
                Transmit Payload
              </Button>

            </CardContent>
          </Card>
        </div>

        {/* Command Log */}
        <div className="lg:col-span-7 flex flex-col h-[calc(100vh-12rem)] min-h-[500px]">
          <Card className="flex-1 flex flex-col overflow-hidden bg-[#0A0A0A] border-white/10">
            <div className="border-b border-white/5 px-4 py-3 flex items-center justify-between bg-black/60 shrink-0">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-primary animate-pulse" />
                <span className="font-mono text-sm text-foreground font-semibold">BLE Stream Activity</span>
                {logData && <Badge variant="secondary" className="ml-2 bg-white/5">{logData.total} packets</Badge>}
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => clearMutation.mutate()}
                className="h-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="w-4 h-4 mr-2" /> Clear
              </Button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-3 terminal-scrollbar">
              {isLoadingLog ? (
                <div className="text-muted-foreground font-mono text-sm animate-pulse">Initializing BLE sniffer...</div>
              ) : !logData || logData.commands.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-50">
                  <ShieldCheck className="w-12 h-12 mb-3" />
                  <p className="font-mono text-sm">Listening for connections...</p>
                </div>
              ) : (
                logData.commands.map((cmd) => (
                  <div key={cmd.id} className="border border-white/5 rounded-lg bg-white/[0.02] overflow-hidden font-mono text-xs">
                    <div className="px-3 py-2 flex items-center justify-between border-b border-white/5 bg-black/20">
                      <div className="flex items-center gap-3">
                        <span className="text-muted-foreground">[{format(new Date(cmd.timestamp), "HH:mm:ss.SSS")}]</span>
                        <Badge variant="outline" className={cn(
                          "border",
                          cmd.target === "left" ? "text-blue-400 border-blue-400/30" : 
                          cmd.target === "right" ? "text-orange-400 border-orange-400/30" : 
                          "text-purple-400 border-purple-400/30"
                        )}>
                          {cmd.model} • {cmd.target}
                        </Badge>
                        <span className="font-bold text-foreground">{cmd.commandType}</span>
                      </div>
                      <Badge variant={cmd.status === "ack" ? "success" : cmd.status === "nack" ? "destructive" : "warning"}>
                        {cmd.status.toUpperCase()}
                      </Badge>
                    </div>
                    
                    <div className="p-3 space-y-2">
                      <div className="text-gray-300">
                        <span className="text-muted-foreground mr-2">DESC</span> {cmd.description}
                      </div>
                      
                      {cmd.responseHex && (
                        <div className="text-primary mt-2">
                          <span className="text-primary/50 mr-2">RESP</span> {formatHex(cmd.responseHex)}
                        </div>
                      )}

                      {cmd.packets && cmd.packets.length > 0 && (
                        <div className="mt-3 bg-black/40 rounded p-2 border border-white/5 max-h-32 overflow-y-auto terminal-scrollbar">
                          {cmd.packets.map((p, idx) => (
                            <div key={idx} className="flex gap-4 mb-1 opacity-80 hover:opacity-100 transition-opacity">
                              <span className="text-muted-foreground w-8 text-right">#{p.index}</span>
                              <span className={p.side === "left" ? "text-blue-300" : "text-orange-300"}>[{p.side[0].toUpperCase()}]</span>
                              <span className="text-gray-400 break-all">{formatHex(p.hexBytes)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
