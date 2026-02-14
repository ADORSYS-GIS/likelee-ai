import React from "react";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ContractEditorProps {
  body: string;
  format: "markdown" | "html";
  onChangeBody: (value: string) => void;
  onChangeFormat: (value: "markdown" | "html") => void;
  variables: string[];
  placeholder?: string;
  readOnly?: boolean;
}

export const ContractEditor: React.FC<ContractEditorProps> = ({
  body,
  format,
  onChangeBody,
  onChangeFormat,
  variables,
  placeholder,
  readOnly = false,
}) => {
  const insertVariable = (variable: string) => {
    if (readOnly) return;
    onChangeBody(body + variable);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-1">
          <Label className="text-sm font-bold text-slate-900">
            Contract Format
          </Label>
          {!readOnly ? (
            <Select
              value={format}
              onValueChange={(val) => onChangeFormat(val as any)}
            >
              <SelectTrigger className="w-[180px] bg-white border-slate-200 shadow-sm rounded-lg h-10">
                <SelectValue placeholder="Select format" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="markdown">Markdown</SelectItem>
                <SelectItem value="html">HTML</SelectItem>
              </SelectContent>
            </Select>
          ) : (
            <div className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-600 font-medium">
              {format.toUpperCase()}
            </div>
          )}
        </div>
      </div>

      <div className="p-5 bg-indigo-50/40 border border-indigo-100 rounded-2xl shadow-sm">
        <h4 className="text-sm font-bold text-indigo-900 mb-4 flex items-center gap-2">
          <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full" />
          Available Variables:
        </h4>
        <div className="flex flex-wrap gap-2">
          {variables.map((variable) => (
            <button
              key={variable}
              type="button"
              onClick={() => insertVariable(variable)}
              disabled={readOnly}
              className={`text-[11px] font-bold px-3 py-1.5 rounded-lg border transition-all ${
                readOnly
                  ? "bg-slate-50 text-slate-400 border-slate-200 cursor-default"
                  : "bg-white text-indigo-600 border-indigo-100 hover:border-indigo-300 hover:shadow-sm active:scale-95"
              }`}
            >
              {variable}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-sm font-bold text-slate-900">
          Contract Body
        </Label>
        <Textarea
          value={body}
          onChange={(e) => onChangeBody(e.target.value)}
          readOnly={readOnly}
          placeholder={placeholder || "Write your contract here..."}
          className="min-h-[400px] bg-white border-slate-200 rounded-xl shadow-sm focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-700 leading-relaxed font-mono text-sm p-6"
        />
      </div>
    </div>
  );
};
