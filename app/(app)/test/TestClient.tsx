"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { createWorker } from "tesseract.js";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  IconArrowLeft,
  IconCamera,
  IconUpload,
  IconLoader,
  IconSettings,
  IconBrain,
  IconFileText,
  IconLayoutGrid,
  IconCheck,
  IconCopy,
  IconSend,
  IconRefresh,
  IconX,
  IconEye,
  IconEyeOff,
  IconChevronDown,
  IconChevronUp,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { parseReceiptTextCustomAction } from "@/lib/actions/gemini";

const DEFAULT_SYSTEM_PROMPT = `You are a receipt parsing assistant. Extract items, quantities, and prices from the raw OCR receipt text.
Make sure the prices returned for each item are inclusive of tax. If tax/pajak, service charge, or any fee is listed in the receipt, calculate the overall tax/fee percentage and distribute it by adding it to each item's price proportionally.
Return the output strictly in JSON format matching this schema:
{
  "items": [
    { "name": "string (cleaned item name)", "price": number (price including tax) }
  ]
}
Do not include markdown tags, code blocks, or extra text. Return ONLY the raw JSON string.`;

const MODEL_PRESETS = [
  { value: "gemini-2.5-flash-lite", label: "Gemini 2.5 Flash Lite (Default)" },
  { value: "gemini-2.5-flash", label: "Gemini 2.5 Flash" },
  { value: "gemini-2.5-pro", label: "Gemini 2.5 Pro" },
  { value: "gemini-1.5-flash", label: "Gemini 1.5 Flash" },
  { value: "gemini-1.5-pro", label: "Gemini 1.5 Pro" },
  { value: "custom", label: "Custom Model..." },
];

const OCR_LANGUAGES = [
  { value: "eng+jpn", label: "English + Japanese (eng+jpn)" },
  { value: "eng+ind", label: "English + Indonesian (eng+ind)" },
  { value: "eng", label: "English only (eng)" },
  { value: "jpn", label: "Japanese only (jpn)" },
  { value: "ind", label: "Indonesian only (ind)" },
];

export default function TestClient() {
  // Config States
  const [model, setModel] = useState("gemini-2.5-flash-lite");
  const [customModel, setCustomModel] = useState("");
  const [systemPrompt, setSystemPrompt] = useState(DEFAULT_SYSTEM_PROMPT);
  const [ocrLang, setOcrLang] = useState("eng+jpn");
  const [showSettings, setShowSettings] = useState(false);

  // File & OCR States
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [ocrText, setOcrText] = useState("");
  const [isOcrRunning, setIsOcrRunning] = useState(false);
  const [ocrProgress, setOcrProgress] = useState("");

  // AI states
  const [isAiRunning, setIsAiRunning] = useState(false);
  const [rawResponse, setRawResponse] = useState("");
  const [parsedItems, setParsedItems] = useState<any[]>([]);
  const [copied, setCopied] = useState(false);

  // Clean up preview URL
  useEffect(() => {
    return () => {
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageFile(file);
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }
    setImagePreview(URL.createObjectURL(file));
    setOcrText(""); // Reset OCR text on new file
  };

  const clearImage = () => {
    setImageFile(null);
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }
    setImagePreview(null);
    setOcrText("");
  };

  // Tesseract OCR runner
  const runOCR = async () => {
    if (!imageFile) {
      toast.error("Please upload an image first.");
      return;
    }

    setIsOcrRunning(true);
    setOcrProgress("Initializing Tesseract OCR...");

    try {
      const worker = await createWorker(ocrLang);
      
      // Monitor progress if supported by worker config, otherwise generic status
      setOcrProgress("Reading text from receipt image...");
      
      const { data: { text } } = await worker.recognize(imageFile);
      await worker.terminate();

      if (!text || !text.trim()) {
        toast.error("OCR returned empty text. Please try another image.");
        setOcrText("");
      } else {
        setOcrText(text);
        toast.success("OCR Text extraction complete!");
      }
    } catch (err) {
      console.error("OCR error:", err);
      toast.error("Failed to extract text from image.");
    } finally {
      setIsOcrRunning(false);
      setOcrProgress("");
    }
  };

  // Gemini parser runner
  const sendToAI = async () => {
    if (!ocrText || !ocrText.trim()) {
      toast.error("Please provide OCR text first.");
      return;
    }

    setIsAiRunning(true);
    setRawResponse("");
    setParsedItems([]);

    const finalModel = model === "custom" ? customModel : model;
    if (!finalModel) {
      toast.error("Please specify a custom model name.");
      setIsAiRunning(false);
      return;
    }

    try {
      const res = await parseReceiptTextCustomAction(ocrText, finalModel, systemPrompt);

      if (res.success && res.data) {
        const dataStr = JSON.stringify(res.data, null, 2);
        setRawResponse(dataStr);
        
        if (Array.isArray(res.data.items)) {
          setParsedItems(res.data.items);
          toast.success("AI parsed receipt items successfully!");
        } else {
          toast.warning("AI succeeded but did not return a standard items array.");
        }
      } else {
        toast.error(res.error || "Failed to process receipt text with AI.");
        setRawResponse(JSON.stringify(res, null, 2));
      }
    } catch (err) {
      console.error("AI error:", err);
      toast.error("An unexpected error occurred during AI parsing.");
      setRawResponse(String(err));
    } finally {
      setIsAiRunning(false);
    }
  };

  const copyToClipboard = () => {
    if (!rawResponse) return;
    navigator.clipboard.writeText(rawResponse);
    setCopied(true);
    toast.success("JSON copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const totalAmount = parsedItems.reduce((sum, item) => sum + (Number(item.price) || 0), 0);

  return (
    <div className="flex flex-col gap-6 pb-20">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/settings" className="p-2 hover:bg-muted rounded-full transition-colors">
          <IconArrowLeft className="size-5" />
        </Link>
        <div>
          <h1 className="text-xl font-bold tracking-tight">OCR & AI Test Dashboard</h1>
          <p className="text-xs text-muted-foreground">Admin Testing Room — Authorized Emails Only</p>
        </div>
      </div>

      {/* 1. Settings Section (Collapsible) */}
      <div className="border border-border/40 rounded-2xl bg-card overflow-hidden">
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="w-full flex items-center justify-between p-4 bg-muted/20 hover:bg-muted/40 transition-colors"
        >
          <div className="flex items-center gap-2">
            <IconSettings className="size-5 text-primary" />
            <div className="text-left">
              <span className="text-sm font-semibold block text-foreground">AI & OCR Configuration</span>
              <span className="text-xs text-muted-foreground">
                Model: {model === "custom" ? customModel || "not specified" : model}
              </span>
            </div>
          </div>
          {showSettings ? <IconChevronUp className="size-4" /> : <IconChevronDown className="size-4" />}
        </button>

        <AnimatePresence initial={false}>
          {showSettings && (
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: "auto" }}
              exit={{ height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="p-4 border-t border-border/20 flex flex-col gap-4 bg-card">
                {/* Model Select */}
                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs font-bold text-muted-foreground uppercase">Gemini Model</Label>
                  <Select value={model} onValueChange={setModel}>
                    <SelectTrigger className="rounded-xl">
                      <SelectValue placeholder="Select Gemini Model" />
                    </SelectTrigger>
                    <SelectContent>
                      {MODEL_PRESETS.map((preset) => (
                        <SelectItem key={preset.value} value={preset.value}>
                          {preset.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Custom Model Input */}
                {model === "custom" && (
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col gap-1.5"
                  >
                    <Label className="text-xs font-bold text-muted-foreground uppercase">Custom Model Identifier</Label>
                    <Input
                      placeholder="e.g. gemini-2.5-pro-experimental"
                      value={customModel}
                      onChange={(e) => setCustomModel(e.target.value)}
                      className="rounded-xl"
                    />
                  </motion.div>
                )}

                {/* OCR Language */}
                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs font-bold text-muted-foreground uppercase">OCR Languages</Label>
                  <Select value={ocrLang} onValueChange={setOcrLang}>
                    <SelectTrigger className="rounded-xl">
                      <SelectValue placeholder="Select OCR Language" />
                    </SelectTrigger>
                    <SelectContent>
                      {OCR_LANGUAGES.map((lang) => (
                        <SelectItem key={lang.value} value={lang.value}>
                          {lang.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Prompt Textarea */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold text-muted-foreground uppercase">System Prompt</Label>
                    <button
                      onClick={() => setSystemPrompt(DEFAULT_SYSTEM_PROMPT)}
                      className="text-[10px] text-primary hover:underline flex items-center gap-0.5"
                    >
                      <IconRefresh className="size-3" /> Reset Default
                    </button>
                  </div>
                  <textarea
                    rows={6}
                    value={systemPrompt}
                    onChange={(e) => setSystemPrompt(e.target.value)}
                    className="w-full text-xs bg-muted/30 border border-border/40 rounded-xl p-3 focus:outline-none focus:border-ring focus:ring-1 focus:ring-ring font-mono"
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 2. OCR Segment */}
      <div className="flex flex-col gap-4 border border-border/40 p-5 rounded-2xl bg-card">
        <div className="flex items-center gap-2 pb-2 border-b border-border/20">
          <IconFileText className="size-5 text-primary" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">Step 1: OCR Text Extraction</h2>
        </div>

        {/* Upload Buttons */}
        <div className="flex gap-2">
          <input
            type="file"
            id="test-camera"
            accept="image/*"
            capture="environment"
            onChange={handleFileChange}
            className="hidden"
            disabled={isOcrRunning}
          />
          <input
            type="file"
            id="test-upload"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
            disabled={isOcrRunning}
          />

          <Button
            type="button"
            variant="outline"
            className="flex-1 rounded-xl flex items-center gap-2 cursor-pointer h-11"
            onClick={() => document.getElementById("test-camera")?.click()}
            disabled={isOcrRunning}
          >
            <IconCamera className="size-4" />
            Camera
          </Button>

          <Button
            type="button"
            variant="outline"
            className="flex-1 rounded-xl flex items-center gap-2 cursor-pointer h-11"
            onClick={() => document.getElementById("test-upload")?.click()}
            disabled={isOcrRunning}
          >
            <IconUpload className="size-4" />
            Upload File
          </Button>
        </div>

        {/* Image Preview Container */}
        {imagePreview && (
          <div className="relative rounded-xl overflow-hidden border border-border/40 bg-muted/20 flex flex-col items-center justify-center p-4">
            <button
              onClick={clearImage}
              className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-black/80 text-white rounded-full transition-colors z-10"
            >
              <IconX className="size-4" />
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imagePreview}
              alt="Receipt Preview"
              className="max-h-60 rounded-lg object-contain w-full"
            />
          </div>
        )}

        {/* Execute OCR Button */}
        {imageFile && (
          <Button
            onClick={runOCR}
            disabled={isOcrRunning}
            className="w-full rounded-xl cursor-pointer bg-primary text-primary-foreground font-semibold h-10 hover:bg-primary/95 flex items-center justify-center gap-2"
          >
            {isOcrRunning ? (
              <>
                <IconLoader className="size-4 animate-spin" />
                <span>Extracting Text...</span>
              </>
            ) : (
              <>
                <IconRefresh className="size-4" />
                <span>Run OCR (Tesseract)</span>
              </>
            )}
          </Button>
        )}

        {/* OCR Progress text */}
        {isOcrRunning && ocrProgress && (
          <p className="text-xs text-center text-primary font-medium animate-pulse">{ocrProgress}</p>
        )}

        {/* Editable OCR text output */}
        <div className="flex flex-col gap-1.5 mt-2">
          <Label className="text-xs font-bold text-muted-foreground uppercase">Extracted Text (Editable)</Label>
          <textarea
            rows={8}
            placeholder="Extract text from an image or paste your own raw receipt text here to test AI parsing..."
            value={ocrText}
            onChange={(e) => setOcrText(e.target.value)}
            className="w-full text-sm bg-muted/20 border border-border/40 rounded-xl p-3 focus:outline-none focus:border-ring focus:ring-1 focus:ring-ring font-mono"
          />
        </div>
      </div>

      {/* 3. AI Parsing Segment */}
      <div className="flex flex-col gap-4 border border-border/40 p-5 rounded-2xl bg-card">
        <div className="flex items-center gap-2 pb-2 border-b border-border/20">
          <IconBrain className="size-5 text-primary" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">Step 2: AI Receipt Parsing</h2>
        </div>

        {/* Send to AI Button */}
        <Button
          onClick={sendToAI}
          disabled={isAiRunning || !ocrText.trim()}
          className="w-full rounded-xl cursor-pointer bg-primary text-primary-foreground font-semibold h-11 hover:bg-primary/95 flex items-center justify-center gap-2"
        >
          {isAiRunning ? (
            <>
              <IconLoader className="size-4 animate-spin" />
              <span>Analyzing Receipt...</span>
            </>
          ) : (
            <>
              <IconSend className="size-4" />
              <span>Send to Gemini AI</span>
            </>
          )}
        </Button>

        {/* Parsing Outputs */}
        {(rawResponse || parsedItems.length > 0 || isAiRunning) && (
          <div className="flex flex-col gap-4 mt-2">
            {/* Visualized parsed items list */}
            {parsedItems.length > 0 && (
              <div className="flex flex-col gap-2 p-4 rounded-xl border border-primary/20 bg-primary/5">
                <Label className="text-xs font-bold text-primary uppercase">Parsed Receipt Items</Label>
                <div className="flex flex-col gap-2 divide-y divide-border/20 mt-1">
                  {parsedItems.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center pt-2 first:pt-0 text-sm">
                      <span className="font-medium text-foreground">{item.name || "Unknown Item"}</span>
                      <span className="font-bold text-foreground font-mono">
                        {typeof item.price === "number" ? item.price.toLocaleString() : String(item.price)}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between items-center border-t border-primary/20 pt-2.5 mt-2 font-bold text-foreground">
                  <span>Calculated Total</span>
                  <span className="font-mono text-base">{totalAmount.toLocaleString()}</span>
                </div>
              </div>
            )}

            {/* Raw JSON result */}
            {rawResponse && (
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-muted-foreground uppercase">Raw AI Response JSON</Label>
                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={copyToClipboard}
                    className="h-7 px-2 text-[10px] text-muted-foreground hover:text-foreground rounded-lg"
                  >
                    {copied ? (
                      <>
                        <IconCheck className="size-3 text-emerald-500" />
                        <span className="text-emerald-500 font-semibold">Copied</span>
                      </>
                    ) : (
                      <>
                        <IconCopy className="size-3" />
                        <span>Copy JSON</span>
                      </>
                    )}
                  </Button>
                </div>
                <pre className="w-full max-h-60 overflow-y-auto text-xs bg-muted/40 border border-border/40 rounded-xl p-3 font-mono text-foreground whitespace-pre-wrap select-all">
                  {rawResponse}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
