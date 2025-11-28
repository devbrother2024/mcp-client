import { GoogleGenAI, Type } from '@google/genai';
import { NextRequest } from 'next/server';
import { getMCPClientManager } from '@/lib/mcp-client';
import type { ToolCall, ToolCallImage } from '@/lib/chat-storage';

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

interface SSEEvent {
  type: 'tool_call' | 'tool_result' | 'text' | 'error' | 'done';
  data: unknown;
}

function formatSSE(event: SSEEvent): string {
  return `event: ${event.type}\ndata: ${JSON.stringify(event.data)}\n\n`;
}

// Convert MCP tool schema to Gemini FunctionDeclaration format
function convertMCPToolToFunctionDeclaration(tool: {
  name: string;
  description?: string;
  inputSchema?: Record<string, unknown>;
}) {
  return {
    name: tool.name,
    description: tool.description || '',
    parameters: tool.inputSchema
      ? convertJsonSchemaToGemini(tool.inputSchema)
      : { type: Type.OBJECT, properties: {} },
  };
}

// Convert JSON Schema to Gemini schema format
function convertJsonSchemaToGemini(schema: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  if (schema.type === 'object') {
    result.type = Type.OBJECT;
    if (schema.properties) {
      result.properties = {};
      for (const [key, value] of Object.entries(schema.properties as Record<string, unknown>)) {
        (result.properties as Record<string, unknown>)[key] = convertJsonSchemaToGemini(
          value as Record<string, unknown>
        );
      }
    }
    if (schema.required) {
      result.required = schema.required;
    }
  } else if (schema.type === 'array') {
    result.type = Type.ARRAY;
    if (schema.items) {
      result.items = convertJsonSchemaToGemini(schema.items as Record<string, unknown>);
    }
  } else if (schema.type === 'string') {
    result.type = Type.STRING;
  } else if (schema.type === 'number' || schema.type === 'integer') {
    result.type = Type.NUMBER;
  } else if (schema.type === 'boolean') {
    result.type = Type.BOOLEAN;
  } else {
    result.type = Type.STRING;
  }

  if (schema.description) {
    result.description = schema.description;
  }

  return result;
}

// System instruction for tool calling
const SYSTEM_INSTRUCTION = `You are a helpful AI assistant with access to various tools.

IMPORTANT RULES FOR TOOL CALLING:
1. When calling any tool/function, ALWAYS translate the arguments to English, regardless of the user's input language.
2. For example, if a user asks in Korean "우주에서 날아다니는 앵무새 이미지 생성해줘", you should call the image generation tool with the English prompt "A parrot flying in space".
3. After receiving tool results, respond to the user in their original language (e.g., Korean if they asked in Korean).
4. This applies to ALL tool arguments including prompts, queries, search terms, file names, etc.

Always translate tool arguments to English for better compatibility with external services.`;

export async function POST(request: NextRequest) {
  try {
    const { message, history } = await request.json();

    if (!message || typeof message !== 'string') {
      return Response.json({ error: 'Message is required' }, { status: 400 });
    }

    if (!process.env.GEMINI_API_KEY) {
      return Response.json({ error: 'GEMINI_API_KEY is not configured' }, { status: 500 });
    }

    // Get connected MCP clients and their tools
    const mcpManager = getMCPClientManager();
    const connectedServerIds = mcpManager.getConnectedServerIds();

    // Collect all tools from all connected servers
    const allTools: Array<{
      serverId: string;
      name: string;
      description?: string;
      inputSchema?: Record<string, unknown>;
    }> = [];

    for (const serverId of connectedServerIds) {
      try {
        const tools = await mcpManager.listTools(serverId);
        for (const tool of tools) {
          allTools.push({
            serverId,
            name: tool.name,
            description: tool.description,
            inputSchema: tool.inputSchema,
          });
        }
      } catch (e) {
        console.error(`Failed to list tools for server ${serverId}:`, e);
      }
    }

    const encoder = new TextEncoder();
    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          const toolCallsResult: ToolCall[] = [];

          // Build contents from history
          const contents = [...(history || [])];

          if (allTools.length > 0) {
            // Convert MCP tools to Gemini function declarations
            const functionDeclarations = allTools.map((tool) =>
              convertMCPToolToFunctionDeclaration(tool)
            );

            // Create a map to find serverId by tool name
            const toolServerMap = new Map<string, string>();
            for (const tool of allTools) {
              toolServerMap.set(tool.name, tool.serverId);
            }

            // First call to get function calls
            let response = await ai.models.generateContent({
              model: 'gemini-2.0-flash-001',
              contents: [...contents, { role: 'user', parts: [{ text: message }] }],
              config: {
                systemInstruction: SYSTEM_INSTRUCTION,
                tools: [{ functionDeclarations }],
              },
            });

            // Function calling loop
            const maxIterations = 10;
            let iteration = 0;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const conversationParts: any[] = [
              ...contents,
              { role: 'user', parts: [{ text: message }] },
            ];

            while (
              response.functionCalls &&
              response.functionCalls.length > 0 &&
              iteration < maxIterations
            ) {
              iteration++;

              // Process each function call
              const functionResponses: Array<{ name: string; response: unknown }> = [];

              for (const fc of response.functionCalls) {
                const toolName = fc.name || 'unknown';
                const toolArgs = (fc.args as Record<string, unknown>) || {};
                const serverId = toolServerMap.get(toolName);

                const toolCall: ToolCall = {
                  name: toolName,
                  args: toolArgs,
                  serverId: serverId,
                };

                // Send tool_call event
                controller.enqueue(
                  encoder.encode(
                    formatSSE({
                      type: 'tool_call',
                      data: toolCall,
                    })
                  )
                );

                // Execute the tool
                let result: string;
                const images: ToolCallImage[] = [];
                const startTime = Date.now();

                try {
                  if (serverId) {
                    const toolResult = await mcpManager.callTool(serverId, toolName, toolArgs);
                    // Extract text and images from result content
                    const textParts: string[] = [];
                    for (const c of toolResult.content) {
                      if (c.text) {
                        textParts.push(c.text);
                      } else if (c.data && c.mimeType) {
                        // Image data
                        images.push({
                          data: c.data,
                          mimeType: c.mimeType,
                        });
                        textParts.push(`[Image: ${c.mimeType}]`);
                      } else {
                        textParts.push(JSON.stringify(c));
                      }
                    }
                    result = textParts.join('\n');
                  } else {
                    result = `Error: Tool "${toolName}" not found`;
                  }
                } catch (e) {
                  result = `Error executing tool: ${e instanceof Error ? e.message : 'Unknown error'}`;
                }

                const duration = Date.now() - startTime;
                toolCall.result = result;
                toolCall.duration = duration;
                if (images.length > 0) {
                  toolCall.images = images;
                }

                // Send tool_result event
                controller.enqueue(
                  encoder.encode(
                    formatSSE({
                      type: 'tool_result',
                      data: toolCall,
                    })
                  )
                );

                toolCallsResult.push(toolCall);
                functionResponses.push({
                  name: toolName,
                  response: { result },
                });
              }

              // Add model's function call response and function results to conversation
              conversationParts.push({
                role: 'model',
                parts: response.functionCalls.map((fc) => ({
                  functionCall: { name: fc.name, args: fc.args },
                })),
              });

              conversationParts.push({
                role: 'user',
                parts: functionResponses.map((fr) => ({
                  functionResponse: { name: fr.name, response: fr.response },
                })),
              });

              // Continue the conversation with function results
              response = await ai.models.generateContent({
                model: 'gemini-2.0-flash-001',
                contents: conversationParts,
                config: {
                  systemInstruction: SYSTEM_INSTRUCTION,
                  tools: [{ functionDeclarations }],
                },
              });
            }

            // Send the final text response
            const text = response.text || '';
            if (text) {
              controller.enqueue(
                encoder.encode(
                  formatSSE({
                    type: 'text',
                    data: text,
                  })
                )
              );
            }
          } else {
            // No MCP tools connected, use regular chat streaming
            const chat = ai.chats.create({
              model: 'gemini-2.0-flash-001',
              history: history || [],
            });

            const stream = await chat.sendMessageStream({ message });

            for await (const chunk of stream) {
              const text = chunk.text || '';
              if (text) {
                controller.enqueue(
                  encoder.encode(
                    formatSSE({
                      type: 'text',
                      data: text,
                    })
                  )
                );
              }
            }
          }

          // Send done event
          controller.enqueue(
            encoder.encode(
              formatSSE({
                type: 'done',
                data: { toolCalls: toolCallsResult },
              })
            )
          );

          controller.close();
        } catch (error) {
          console.error('Stream error:', error);
          controller.enqueue(
            encoder.encode(
              formatSSE({
                type: 'error',
                data: error instanceof Error ? error.message : 'Unknown error',
              })
            )
          );
          controller.close();
        }
      },
    });

    return new Response(readableStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Chat API error:', error);
    return Response.json({ error: 'Failed to process chat request' }, { status: 500 });
  }
}
