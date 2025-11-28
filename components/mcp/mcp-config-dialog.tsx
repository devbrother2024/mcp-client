'use client';

import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, Upload, Loader2, X, Check, AlertCircle } from 'lucide-react';
import { useMCP } from '@/contexts/mcp-context';

interface MCPConfigDialogProps {
  onClose: () => void;
}

export function MCPConfigDialog({ onClose }: MCPConfigDialogProps) {
  const { exportConfig, importConfig } = useMCP();
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ imported: number; errors: string[] } | null>(null);
  const [mergeMode, setMergeMode] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    exportConfig();
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportResult(null);

    try {
      const result = await importConfig(file, mergeMode);
      setImportResult(result);
    } catch (error) {
      setImportResult({
        imported: 0,
        errors: [error instanceof Error ? error.message : 'Import failed'],
      });
    } finally {
      setIsImporting(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <Card className="w-full max-w-md">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>설정 가져오기/내보내기</CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Export Section */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium">내보내기</h3>
            <p className="text-muted-foreground text-xs">
              등록된 모든 MCP 서버 설정을 JSON 파일로 내보냅니다.
            </p>
            <Button onClick={handleExport} variant="outline" className="w-full">
              <Download className="mr-2 h-4 w-4" />
              설정 내보내기
            </Button>
          </div>

          <div className="border-t" />

          {/* Import Section */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium">가져오기</h3>
            <p className="text-muted-foreground text-xs">
              JSON 파일에서 MCP 서버 설정을 가져옵니다.
            </p>

            {/* Merge Mode Toggle */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="merge-mode"
                checked={mergeMode}
                onChange={(e) => setMergeMode(e.target.checked)}
                className="h-4 w-4 rounded border"
              />
              <label htmlFor="merge-mode" className="text-sm">
                기존 서버와 병합 (체크 해제시 기존 서버 삭제)
              </label>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileChange}
              className="hidden"
            />

            <Button
              onClick={handleImportClick}
              variant="outline"
              className="w-full"
              disabled={isImporting}
            >
              {isImporting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  가져오는 중...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  설정 가져오기
                </>
              )}
            </Button>
          </div>

          {/* Import Result */}
          {importResult && (
            <div
              className={`rounded-md p-3 ${
                importResult.errors.length > 0 && importResult.imported === 0
                  ? 'bg-destructive/10'
                  : importResult.errors.length > 0
                    ? 'bg-yellow-500/10'
                    : 'bg-green-500/10'
              }`}
            >
              <div className="flex items-start gap-2">
                {importResult.errors.length > 0 && importResult.imported === 0 ? (
                  <AlertCircle className="text-destructive mt-0.5 h-4 w-4" />
                ) : importResult.errors.length > 0 ? (
                  <AlertCircle className="mt-0.5 h-4 w-4 text-yellow-500" />
                ) : (
                  <Check className="mt-0.5 h-4 w-4 text-green-500" />
                )}
                <div>
                  <p className="text-sm font-medium">
                    {importResult.imported}개 서버 가져오기 완료
                  </p>
                  {importResult.errors.length > 0 && (
                    <ul className="text-muted-foreground mt-1 text-xs">
                      {importResult.errors.map((error, idx) => (
                        <li key={idx}>• {error}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
