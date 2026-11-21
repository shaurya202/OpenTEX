import { NextResponse } from 'next/server';
import { executePublikAction } from '@/lib/publik';
import {
  DEFAULT_CONVERSION_SETTINGS,
  type ConversionModel,
  type ConversionSettings,
} from '@/types/mathwrite';

const MCP_TOOLS = [
  {
    name: 'get_balance',
    description: 'Check the active OpenTEX plan and page allowance (always Free Unlimited).',
    inputSchema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'plan_conversion',
    description: 'Estimate file/page counts and verify zero cost before converting files.',
    inputSchema: {
      type: 'object',
      properties: {
        files: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              fileName: { type: 'string' },
              pages: { type: 'number' },
            },
          },
        },
        fileCount: { type: 'number' },
        pageCount: { type: 'number' },
      },
    },
  },
  {
    name: 'convert_files',
    description: 'Convert handwritten math images or PDFs to LaTeX via Publik AI.',
    inputSchema: {
      type: 'object',
      properties: {
        fileName: { type: 'string' },
        mimeType: { type: 'string' },
        fileDataUrl: { type: 'string' },
        model: { type: 'string', enum: ['professional', 'turbo'] },
        promptHint: { type: 'string' },
        files: { type: 'array', items: { type: 'object' } },
      },
    },
  },
  {
    name: 'get_job_status',
    description: 'Check the completion status of an OpenTEX conversion job.',
    inputSchema: {
      type: 'object',
      properties: {
        jobId: { type: 'string' },
      },
    },
  },
  {
    name: 'get_conversion_settings',
    description: 'Retrieve default LaTeX conversion settings and available Publik AI models.',
    inputSchema: { type: 'object', properties: {}, required: [] },
  },
];

async function invokeMcpTool(
  toolName: string,
  args: Record<string, unknown> = {}
): Promise<unknown> {
  switch (toolName) {
    case 'get_balance':
      return {
        plan: 'Free Unlimited',
        creditsLeft: 'unlimited',
        pageLimit: 200,
        price: '$0',
      };

    case 'plan_conversion': {
      const files = Array.isArray(args.files)
        ? (args.files as Array<{ fileName?: string; name?: string; pages?: number }>)
        : [];
      const normalized = files.map((f, i) => ({
        fileName: f.fileName || f.name || `document_${i + 1}.pdf`,
        pages: Number(f.pages) || 1,
      }));
      const fileCount =
        typeof args.fileCount === 'number' ? args.fileCount : normalized.length || 1;
      const pageCount =
        typeof args.pageCount === 'number'
          ? args.pageCount
          : normalized.reduce((sum, f) => sum + f.pages, 0) || fileCount;
      return {
        files: normalized,
        fileCount,
        pageCount,
        totalPages: pageCount,
        cost: 0,
        free: true,
      };
    }

    case 'convert_files': {
      const inputFiles = Array.isArray(args.files) && args.files.length > 0
        ? (args.files as Array<Record<string, unknown>>)
        : [args];

      const settings: ConversionSettings = {
        ...DEFAULT_CONVERSION_SETTINGS,
        ...((args.settings as Partial<ConversionSettings>) || {}),
      };
      const defaultModel: ConversionModel =
        args.model === 'turbo' ? 'turbo' : 'professional';

      const results = await Promise.all(
        inputFiles.map(async (f, index) => {
          const rawName = typeof f.fileName === 'string' && f.fileName.trim()
            ? f.fileName
            : typeof f.name === 'string' && f.name.trim()
              ? f.name
              : `document_${index + 1}.pdf`;
          const mimeType =
            typeof f.mimeType === 'string' && f.mimeType.trim()
              ? f.mimeType
              : 'application/pdf';
          const model: ConversionModel =
            f.model === 'turbo' ? 'turbo' : defaultModel;
          const out = await executePublikAction({
            action: 'convertToLatex',
            fileName: rawName,
            mimeType,
            fileDataUrl: typeof f.fileDataUrl === 'string' ? f.fileDataUrl : undefined,
            model,
            settings,
            promptHint: typeof f.promptHint === 'string' ? f.promptHint : undefined,
          });
          return {
            fileName: rawName,
            latex: out.result,
            provider: out.provider,
            model: out.model,
          };
        })
      );

      return {
        jobId: `ot_job_${Date.now()}`,
        status: 'completed',
        cost: 0,
        free: true,
        results,
      };
    }

    case 'get_job_status':
      return {
        jobId: typeof args.jobId === 'string' ? args.jobId : 'ot_job_completed',
        status: 'completed',
        progress: 100,
        free: true,
      };

    case 'get_conversion_settings':
      return {
        defaultSettings: DEFAULT_CONVERSION_SETTINGS,
        availableModels: ['professional', 'turbo'],
      };

    default:
      throw new Error(`Unknown MCP tool: ${toolName}`);
  }
}

export async function GET() {
  return NextResponse.json({
    name: 'opentex-mcp',
    version: '1.0.0',
    plan: 'Free Unlimited',
    tools: MCP_TOOLS,
  });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;

    // JSON-RPC 2.0 support
    if (body.jsonrpc === '2.0' || typeof body.method === 'string') {
      const id = body.id ?? null;
      const method = body.method;
      const params = (body.params as Record<string, unknown>) || {};

      if (method === 'initialize') {
        return NextResponse.json({
          jsonrpc: '2.0',
          id,
          result: {
            protocolVersion: '2024-11-05',
            serverInfo: { name: 'opentex-mcp', version: '1.0.0' },
            capabilities: { tools: {} },
          },
        });
      }

      if (method === 'tools/list') {
        return NextResponse.json({
          jsonrpc: '2.0',
          id,
          result: { tools: MCP_TOOLS },
        });
      }

      if (method === 'tools/call') {
        const toolName = String(params.name || '');
        const toolArgs = (params.arguments as Record<string, unknown>) || {};
        try {
          const data = await invokeMcpTool(toolName, toolArgs);
          return NextResponse.json({
            jsonrpc: '2.0',
            id,
            result: {
              content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
              structuredContent: data,
            },
          });
        } catch (err) {
          return NextResponse.json(
            {
              jsonrpc: '2.0',
              id,
              error: {
                code: -32602,
                message: err instanceof Error ? err.message : 'Tool execution error',
              },
            },
            { status: 400 }
          );
        }
      }

      return NextResponse.json(
        {
          jsonrpc: '2.0',
          id,
          error: { code: -32601, message: `Method not found: ${String(method)}` },
        },
        { status: 404 }
      );
    }

    // Direct { tool, arguments } invocation
    const toolName = typeof body.tool === 'string' ? body.tool : typeof body.name === 'string' ? body.name : '';
    if (!toolName) {
      return NextResponse.json(
        { error: 'Missing "tool" or JSON-RPC "method" in request body.' },
        { status: 400 }
      );
    }

    const args = (body.arguments as Record<string, unknown>) || {};
    const result = await invokeMcpTool(toolName, args);
    return NextResponse.json({ tool: toolName, result });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Invalid MCP request';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
