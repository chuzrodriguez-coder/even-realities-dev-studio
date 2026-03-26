import React from "react";
import { BookOpen, Terminal, Smartphone, Zap } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

export default function Reference() {
  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      <div className="space-y-2 border-b border-white/10 pb-6">
        <h1 className="text-4xl font-bold tracking-tight text-white flex items-center gap-3">
          <BookOpen className="w-10 h-10 text-primary" />
          Protocol Reference
        </h1>
        <p className="text-lg text-muted-foreground">
          Core BLE protocol specifications for Even Realities G1 and G2 glasses.
        </p>
      </div>

      <div className="space-y-8">
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-white flex items-center gap-2">
            <Zap className="w-6 h-6 text-primary" />
            Core Architecture
          </h2>
          <Card>
            <CardContent className="p-6 text-sm text-gray-300 leading-relaxed space-y-4">
              <p>
                Both G1 and G2 utilize a <strong>Dual BLE Connection</strong> architecture. Each arm of the glasses requires a separate Bluetooth connection.
              </p>
              <div className="bg-primary/10 border border-primary/20 p-4 rounded-lg text-primary font-medium">
                <strong>Rule of thumb:</strong> Always send commands to the LEFT side first. Only send to the RIGHT side after receiving a successful acknowledgment (ACK) from the left, unless a command specifically targets only one side (e.g., right microphone activation).
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-white">G1 Specifications</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg text-primary">Display</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-2 text-gray-300">
                <p>• Resolution: <strong>576 × 136 px</strong></p>
                <p>• Colors: 1-bit Monochrome (Green)</p>
                <p>• Max text width: 488px</p>
                <p>• Lines per screen: 5 (default 21pt font)</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg text-primary">Key Commands</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-2 text-gray-300 font-mono">
                <div className="flex justify-between border-b border-white/5 pb-1"><span>Mic Activate (Right)</span> <span className="text-primary">0x0E 0x01</span></div>
                <div className="flex justify-between border-b border-white/5 pb-1"><span>AI Trigger (from Lens)</span> <span className="text-primary">0xF5 0x17</span></div>
                <div className="flex justify-between border-b border-white/5 pb-1"><span>Image Packet Header</span> <span className="text-primary">0x15</span></div>
                <div className="flex justify-between border-b border-white/5 pb-1"><span>Image End Sequence</span> <span className="text-primary">0x20 0x0D 0x0E</span></div>
                <div className="flex justify-between"><span>CRC32-XZ Check</span> <span className="text-primary">0x16</span></div>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-white">G2 Specifications</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg text-primary">Display (Even HAO 2.0)</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-2 text-gray-300">
                <p>• Resolution: <strong>640 × 350 px</strong></p>
                <p>• Refresh Rate: 60Hz</p>
                <p>• Colors: Green monochrome</p>
                <p>• Brightness: 1,200 nits</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg text-primary">Teleprompter Flow</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-2 text-gray-300 font-mono">
                <div className="flex gap-3"><Badge>1</Badge> <span>Auth Packets (x7)</span></div>
                <div className="flex gap-3"><Badge>2</Badge> <span>Config: 0x0E-20 (type=2)</span></div>
                <div className="flex gap-3"><Badge>3</Badge> <span>Init: 0x06-20 (type=1)</span></div>
                <div className="flex gap-3"><Badge>4</Badge> <span>Pages: 0x06-20 (type=3)</span></div>
                <div className="flex gap-3"><Badge>5</Badge> <span>Marker: 0x06-20 (type=255)</span></div>
                <div className="flex gap-3"><Badge>6</Badge> <span>Sync: 0x80-00 (type=14)</span></div>
              </CardContent>
            </Card>
          </div>
        </section>
        
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-white flex items-center gap-2">
            <Terminal className="w-6 h-6 text-primary" />
            Image Transmission (BMP)
          </h2>
          <Card>
            <CardContent className="p-6 text-sm text-gray-300 space-y-4">
              <p>Image transmission uses 1-bit BMP format (576x136 for G1).</p>
              <ol className="list-decimal pl-5 space-y-2">
                <li>Divide BMP into <strong>194-byte</strong> payload packets.</li>
                <li>Prefix with <code className="text-primary font-mono bg-black/50 px-1 rounded">0x15</code> and SyncID. First packet includes 4-byte storage address.</li>
                <li>Transmit in parallel to Left and Right arms.</li>
                <li>Send end sequence <code className="text-primary font-mono bg-black/50 px-1 rounded">[0x20, 0x0D, 0x0E]</code>.</li>
                <li>Wait for ACK, then send CRC32-XZ validation via <code className="text-primary font-mono bg-black/50 px-1 rounded">0x16</code>.</li>
              </ol>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}
