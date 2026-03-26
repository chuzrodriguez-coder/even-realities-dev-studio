import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { useFeatures, useCreateFeature, useUpdateFeature, useDeleteFeature } from "@/hooks/use-features";
import { Code2, Plus, Edit2, Trash2, Code, Settings, Power } from "lucide-react";
import { format } from "date-fns";
import type { Feature } from "@workspace/api-client-react/src/generated/api.schemas";

// Simple modal implementation for ensuring complete file generation without complex radix dependencies
function Modal({ isOpen, onClose, title, children }: { isOpen: boolean, onClose: () => void, title: string, children: React.ReactNode }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-card w-full max-w-2xl rounded-xl border border-white/10 shadow-2xl flex flex-col max-h-[90vh]">
        <div className="p-4 border-b border-white/10 flex justify-between items-center">
          <h2 className="text-lg font-bold text-foreground">{title}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-white">&times;</button>
        </div>
        <div className="p-6 overflow-y-auto terminal-scrollbar flex-1">
          {children}
        </div>
      </div>
    </div>
  );
}

export default function Features() {
  const { data: featureData, isLoading } = useFeatures();
  const createMut = useCreateFeature();
  const updateMut = useUpdateFeature();
  const deleteMut = useDeleteFeature();

  const [isModalOpen, setModalOpen] = useState(false);
  const [editingFeature, setEditingFeature] = useState<Feature | null>(null);

  // Form State
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [model, setModel] = useState<"G1"|"G2"|"both">("both");
  const [category, setCategory] = useState("custom");
  const [code, setCode] = useState("");
  
  const openNew = () => {
    setEditingFeature(null);
    setName(""); setDesc(""); setModel("both"); setCategory("custom"); setCode("// Your typescript code here\n");
    setModalOpen(true);
  };

  const openEdit = (f: Feature) => {
    setEditingFeature(f);
    setName(f.name); setDesc(f.description); setModel(f.targetModel as any); setCategory(f.category); setCode(f.code || "");
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!name || !desc) return alert("Name and description required");
    
    const payload = {
      name, description: desc, targetModel: model, category: category as any, code, isEnabled: true
    };

    if (editingFeature) {
      await updateMut.mutateAsync({ id: editingFeature.id, data: payload });
    } else {
      await createMut.mutateAsync(payload);
    }
    setModalOpen(false);
  };

  const toggleStatus = (f: Feature) => {
    updateMut.mutate({ id: f.id, data: { isEnabled: !f.isEnabled } });
  };

  const handleDelete = (id: string) => {
    if (confirm("Delete this feature?")) deleteMut.mutate(id);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
            <Code2 className="w-8 h-8 text-primary" />
            Feature Workbench
          </h1>
          <p className="text-muted-foreground mt-1">
            Develop and manage custom applications for the glasses.
          </p>
        </div>
        <Button onClick={openNew}>
          <Plus className="w-4 h-4 mr-2" /> New Feature
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64 text-primary">Loading features...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {featureData?.features.map((feat) => (
            <Card key={feat.id} className={cn("transition-all duration-300 hover:shadow-[0_0_20px_hsla(var(--primary)/0.15)]", !feat.isEnabled && "opacity-60")}>
              <CardHeader className="pb-3 border-b border-white/5">
                <div className="flex justify-between items-start">
                  <Badge variant={feat.targetModel === "both" ? "secondary" : "default"}>{feat.targetModel}</Badge>
                  <button 
                    onClick={() => toggleStatus(feat)}
                    className={cn("p-1.5 rounded-full transition-colors", feat.isEnabled ? "bg-primary/20 text-primary" : "bg-white/5 text-muted-foreground")}
                  >
                    <Power className="w-4 h-4" />
                  </button>
                </div>
                <CardTitle className="mt-3 text-xl">{feat.name}</CardTitle>
                <div className="text-xs text-primary font-mono bg-primary/10 inline-block px-2 py-0.5 rounded w-max mt-2">
                  {feat.category}
                </div>
              </CardHeader>
              <CardContent className="py-4">
                <p className="text-sm text-muted-foreground line-clamp-3 min-h-[60px]">{feat.description}</p>
                <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground font-mono">
                  <span className="flex items-center gap-1"><Code className="w-3 h-3" /> {feat.code ? "Code attached" : "No code"}</span>
                  <span className="flex items-center gap-1"><Settings className="w-3 h-3" /> Config</span>
                </div>
              </CardContent>
              <CardFooter className="bg-black/20 border-t border-white/5 flex justify-between items-center py-3">
                <span className="text-[10px] text-muted-foreground">Upd: {format(new Date(feat.updatedAt), "MMM d, yyyy")}</span>
                <div className="flex gap-2">
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-400" onClick={() => openEdit(feat)}>
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:bg-red-500/20" onClick={() => handleDelete(feat.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardFooter>
            </Card>
          ))}
          {featureData?.features.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center p-12 border border-dashed border-white/10 rounded-xl bg-black/20">
              <Code2 className="w-12 h-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">No features built yet</h3>
              <p className="text-muted-foreground text-center max-w-md mb-6">Create your first custom script or application to run on the Even Realities glasses.</p>
              <Button onClick={openNew}>Start Building</Button>
            </div>
          )}
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setModalOpen(false)} title={editingFeature ? "Edit Feature" : "New Feature"}>
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase">Feature Name</label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Pomodoro Timer" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase">Category</label>
              <select value={category} onChange={e => setCategory(e.target.value)} className="w-full h-10 rounded-md border border-border bg-input/50 px-3 text-sm text-foreground focus:outline-none focus:border-primary">
                <option value="display">Display / UI</option>
                <option value="ai">AI Integration</option>
                <option value="teleprompter">Teleprompter</option>
                <option value="notification">Notification</option>
                <option value="custom">Custom Script</option>
              </select>
            </div>
          </div>
          
          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground uppercase">Description</label>
            <Input value={desc} onChange={e => setDesc(e.target.value)} placeholder="What does this feature do?" />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground uppercase">Target Hardware</label>
            <div className="flex gap-4">
              {(["G1", "G2", "both"] as const).map(m => (
                <label key={m} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="radio" name="model" checked={model === m} onChange={() => setModel(m)} className="accent-primary" />
                  <span className="uppercase">{m}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-2 pt-2">
            <label className="text-xs font-semibold text-muted-foreground uppercase flex justify-between">
              <span>Implementation Code (JS/TS)</span>
            </label>
            <Textarea 
              value={code} 
              onChange={e => setCode(e.target.value)} 
              className="font-mono text-sm h-64 bg-[#0d0d0d] text-primary/90 border-white/10" 
              spellCheck={false}
            />
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} isLoading={createMut.isPending || updateMut.isPending}>
              {editingFeature ? "Save Changes" : "Create Feature"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
