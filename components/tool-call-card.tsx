'use client';

import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  ChevronDown,
  ChevronUp,
  Wrench,
  Clock,
  CheckCircle2,
  Loader2,
  Image as ImageIcon,
  Download,
} from 'lucide-react';
import type { ToolCall } from '@/lib/chat-storage';
import { cn } from '@/lib/utils';

interface ToolCallCardProps {
  toolCall: ToolCall;
  isLoading?: boolean;
}

export function ToolCallCard({ toolCall, isLoading = false }: ToolCallCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const hasArgs = toolCall.args && Object.keys(toolCall.args).length > 0;
  const hasResult = toolCall.result !== undefined;
  const hasImages = toolCall.images && toolCall.images.length > 0;

  // Get image source (URL or base64)
  const getImageSrc = (img: { data?: string; url?: string; mimeType: string }) => {
    if (img.url) return img.url;
    if (img.data) return `data:${img.mimeType};base64,${img.data}`;
    return '';
  };

  // Download image handler
  const handleDownload = async (
    img: { data?: string; url?: string; mimeType: string },
    index: number
  ) => {
    const extension = img.mimeType.split('/')[1] || 'png';
    const link = document.createElement('a');

    if (img.url) {
      // URL인 경우 fetch해서 blob으로 다운로드
      try {
        const response = await fetch(img.url);
        const blob = await response.blob();
        link.href = URL.createObjectURL(blob);
      } catch {
        // fetch 실패 시 직접 URL 사용
        link.href = img.url;
      }
    } else if (img.data) {
      link.href = `data:${img.mimeType};base64,${img.data}`;
    }

    link.download = `${toolCall.name}-${index + 1}.${extension}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Card
      className={cn(
        'my-2 overflow-hidden border transition-all duration-200',
        isLoading
          ? 'border-[oklch(0.6_0.15_200_/_0.4)] bg-[oklch(0.15_0.02_200_/_0.3)]'
          : 'border-[oklch(0.35_0.1_145_/_0.4)] bg-[oklch(0.15_0.02_145_/_0.2)]'
      )}
    >
      <div
        className="flex cursor-pointer items-center justify-between px-4 py-3"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'flex h-8 w-8 items-center justify-center rounded-lg',
              isLoading ? 'bg-[oklch(0.6_0.15_200_/_0.2)]' : 'bg-[oklch(0.5_0.15_145_/_0.2)]'
            )}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin text-[oklch(0.7_0.15_200)]" />
            ) : hasImages ? (
              <ImageIcon className="h-4 w-4 text-[oklch(0.7_0.15_145)]" />
            ) : (
              <Wrench className="h-4 w-4 text-[oklch(0.7_0.15_145)]" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-medium">{toolCall.name}</span>
              {!isLoading && <CheckCircle2 className="h-3.5 w-3.5 text-[oklch(0.7_0.15_145)]" />}
              {hasImages && (
                <span className="rounded-full bg-[oklch(0.5_0.15_280_/_0.2)] px-2 py-0.5 text-xs text-[oklch(0.7_0.15_280)]">
                  {toolCall.images!.length} image{toolCall.images!.length > 1 ? 's' : ''}
                </span>
              )}
            </div>
            {toolCall.duration !== undefined && (
              <div className="flex items-center gap-1 text-xs text-[oklch(0.5_0.02_260)]">
                <Clock className="h-3 w-3" />
                <span>{toolCall.duration}ms</span>
              </div>
            )}
          </div>
        </div>
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>
      </div>

      {/* Image preview (always visible when images exist) */}
      {hasImages && (
        <div className="border-t border-[oklch(0.25_0.02_260_/_0.3)] px-4 py-3">
          <div className="grid gap-3">
            {toolCall.images!.map((img, index) => {
              const imageSrc = getImageSrc(img);
              if (!imageSrc) return null;

              return (
                <div key={index} className="group relative">
                  <div className="overflow-hidden rounded-lg border border-[oklch(0.25_0.02_260_/_0.4)] bg-[oklch(0.08_0.01_260)]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={imageSrc}
                      alt={`Generated image ${index + 1}`}
                      className="max-h-96 w-full object-contain"
                    />
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="absolute top-2 right-2 h-8 gap-1.5 bg-[oklch(0.15_0.01_260_/_0.9)] opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDownload(img, index);
                    }}
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span className="text-xs">저장</span>
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {isExpanded && (
        <CardContent
          className={cn(
            'px-4 py-3',
            hasImages
              ? 'border-t border-[oklch(0.25_0.02_260_/_0.3)]'
              : 'border-t border-[oklch(0.25_0.02_260_/_0.3)]'
          )}
        >
          {hasArgs && (
            <div className="mb-3">
              <div className="mb-1 text-xs font-medium text-[oklch(0.5_0.02_260)]">Arguments</div>
              <pre className="overflow-x-auto rounded-lg bg-[oklch(0.1_0.01_260)] p-3 text-xs">
                <code className="text-[oklch(0.8_0.02_260)]">
                  {JSON.stringify(toolCall.args, null, 2)}
                </code>
              </pre>
            </div>
          )}

          {hasResult && (
            <div>
              <div className="mb-1 text-xs font-medium text-[oklch(0.5_0.02_260)]">Result</div>
              <pre className="max-h-48 overflow-auto rounded-lg bg-[oklch(0.1_0.01_260)] p-3 text-xs">
                <code className="break-words whitespace-pre-wrap text-[oklch(0.8_0.02_260)]">
                  {typeof toolCall.result === 'string'
                    ? toolCall.result
                    : JSON.stringify(toolCall.result, null, 2)}
                </code>
              </pre>
            </div>
          )}

          {!hasArgs && !hasResult && (
            <p className="text-xs text-[oklch(0.5_0.02_260)]">No additional details available</p>
          )}
        </CardContent>
      )}
    </Card>
  );
}

interface ToolCallListProps {
  toolCalls: ToolCall[];
  isLoading?: boolean;
}

export function ToolCallList({ toolCalls, isLoading = false }: ToolCallListProps) {
  if (toolCalls.length === 0) return null;

  return (
    <div className="space-y-2">
      {toolCalls.map((toolCall, index) => (
        <ToolCallCard
          key={`${toolCall.name}-${index}`}
          toolCall={toolCall}
          isLoading={isLoading && index === toolCalls.length - 1}
        />
      ))}
    </div>
  );
}
