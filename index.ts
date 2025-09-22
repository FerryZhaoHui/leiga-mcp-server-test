#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequest,
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
  Tool,
  Prompt,
} from "@modelcontextprotocol/sdk/types.js";
import dotenv from "dotenv";
import { z } from 'zod';
import { LeigaOpenAPIClient } from "./LeigaOpenAPIClient.js";
import { CommentListItem, CreateIssueDTO, SearchIssueDTO, CreateCommentDTO, ProjectMemberListDTO, OrgMemberListDTO } from "./types.js";


class LeigaMCPClient {
  private client: LeigaOpenAPIClient;

  constructor(clientId: string, secret: string) {
    if (!clientId || !secret) throw new Error("LEIGA_CLIENT_ID and LEIGA_SECRET environment variable is required");
    this.client = new LeigaOpenAPIClient({ clientId, secret });
  }

  async getIssue(issueId: string) {
    const result = await this.client.getIssueDeail(issueId);
    if (!result) throw new Error(`Issue ${issueId} not found`);
    const data = result.data;
    return {
      id: data.id,
      issueNumber: data.data.issueNumber,
      summary: data.data.summary,
      description: data.data.description,
      priority: data.data?.priorityVO?.name,
      status: data.data.statusVO.name,
      assignee: data.data?.assigneeVO?.name,
      projectId: data.data?.projectId,
      url: this.client.getIssueUrl(data.id, data.data?.projectId),
    };
  }

  async searchIssues(args: SearchIssueDTO) {
    const result = await this.client.searchIssueList(args);
    return result.data;
  }

  async myIssues(args: SearchIssueDTO) {
    args.assignee = "currentAuthedUser";
    const result = await this.client.searchIssueList(args);
    return result.data;
  }

  async createIssue(args: CreateIssueDTO) {
    const result = await this.client.createIssue(args);
    return result.data;
  }

  async listProjects(){
    return (await this.client.getProjects()).data;
  }

  async listIssueComments(issueId: string, pageNumber?: number, pageSize?: number){
    const result = await this.client.getIssueComments(issueId, pageNumber ?? 1, pageSize ?? 20);
    return result.data;
  }

  async createComment(args: CreateCommentDTO) {
    const result = await this.client.createComment(args);
    return result.data;
  }

  async resolveIssueId(issueIdOrNumber: string): Promise<number> {
    return await this.client.resolveIssueId(issueIdOrNumber);
  }

  async listProjectMembers(args: ProjectMemberListDTO) {
    const result = await this.client.listProjectMembers(args);
    return result.data;
  }

  async listOrgMembers(args: OrgMemberListDTO) {
    const result = await this.client.listOrgMembers(args);
    return result.data;
  }

  async getIssueOptions(issueIdOrNumber: string) {
    const result = await this.client.getIssueOptions(issueIdOrNumber);
    return result.data;
  }

  async updateIssue(args: {
    issueId: string,
    summary?: string,
    description?: string,
    statusName?: string,
    priorityName?: string,
    assigneeName?: string,
    labels?: string[],
    follows?: string[],
    releaseVersionName?: string,
    dueDate?: string | number,
    startDate?: string | number,
  }) {
    const numericId = await this.resolveIssueId(args.issueId);
    const fields = await this.getIssueOptions(args.issueId);

    const findFieldByCode = (code: string) => fields.find((f: any) => (f.fieldCode || '').toLowerCase() === code.toLowerCase());
    const findOptionValueByName = (code: string, name?: string) => {
      if (!name) return undefined;
      const field = findFieldByCode(code);
      const opts = field?.options || [];
      const match = opts.find((o: any) => (o?.name || '').toLowerCase() === name.toLowerCase());
      return match?.value;
    };
    const findManyOptionValuesByNames = (code: string, names?: string[]) => {
      if (!names || names.length === 0) return undefined;
      const field = findFieldByCode(code);
      const opts = field?.options || [];
      const map = new Map<string, any>();
      for (const o of opts) {
        const n = (o?.name || '').toLowerCase();
        map.set(n, o?.value);
      }
      const vals: any[] = [];
      for (const n of names) {
        const v = map.get((n || '').toLowerCase());
        if (v !== undefined) vals.push(v);
      }
      return vals.length ? vals : undefined;
    };

    const toMillis = (d?: string | number) => {
      if (d === undefined) return undefined;
      if (typeof d === 'number') return d;
      const parsed = Date.parse(d);
      return isNaN(parsed) ? undefined : parsed;
    };

    const data: any = {};
    if (args.summary !== undefined) data.summary = args.summary;
    if (args.description !== undefined) data.description = args.description;
    const statusId = findOptionValueByName('status', args.statusName);
    if (statusId !== undefined) data.status = statusId;
    const priorityId = findOptionValueByName('priority', args.priorityName);
    if (priorityId !== undefined) data.priority = priorityId;
    const assigneeId = findOptionValueByName('assignee', args.assigneeName);
    if (assigneeId !== undefined) data.assignee = assigneeId;
    const labelIds = findManyOptionValuesByNames('label', args.labels);
    if (labelIds !== undefined) data.label = labelIds;
    const followIds = findManyOptionValuesByNames('follows', args.follows);
    if (followIds !== undefined) data.follows = followIds;
    const releaseVersionId = findOptionValueByName('releaseVersion', args.releaseVersionName);
    if (releaseVersionId !== undefined) data.releaseVersion = releaseVersionId;
    const due = toMillis(args.dueDate);
    if (due !== undefined) data.dueDate = due;
    const start = toMillis(args.startDate);
    if (start !== undefined) data.startDate = start;

    const result = await this.client.updateIssue({ id: numericId, data } as any);
    return result.data;
  }
}

function getTodayLocal() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
const today = getTodayLocal();

const searchIssuesTool: Tool = {
  name: "search_all_issues",
  description: "Searches Leiga issues using flexible criteria. Supports filtering by any combination of: title text, project name, status(2=ToDo, 3=In Progress, 4=Done), assignee, label, priority name, work type, start date range, due date range, and create date range. Returns up to 10 issues by default (configurable via pageSize).",
  inputSchema: {
    type: "object",
    properties: {
      query: { type: "string", description: "Optional text to search in title" },
      projectName: { type: "string", description: "Filter by project name" },
      status: { type: "string", description: "Filter by status (2=ToDo, 3=In Progress, 4=Done)" },
      assignee: { type: "string", description: "Filter by assignee's user name" },
      label: { type: "string", description: "Filter by label name" },
      priority: { type: "string", description: "Filter by priority name (e.g., 'Lowest', 'Low', 'Medium', 'High', 'Highest')"},
      sprint: { type: "string", description: "Filter by sprint name" },
      workType: { type: "string", description: "Filter by issue work type name" },
      startAfterDate: { type: "string", description: "Filter issues that start AFTER or ON this date (YYYY-MM-DD format)" },
      startBeforeDate: { type: "string", description: "Filter issues that start BEFORE or ON this date (YYYY-MM-DD format)" },
      dueAfterDate: { type: "string", description: "Filter issues that are due AFTER or ON this date (YYYY-MM-DD format)" },
      dueBeforeDate: { type: "string", description: "Filter issues that are due BEFORE or ON this date (YYYY-MM-DD format)" },
      createdAfterDate: { type: "string", description: "Filter issues that were created AFTER or ON this date (YYYY-MM-DD format)" },
      createdBeforeDate: { type: "string", description: "Filter issues that were created BEFORE or ON this date (YYYY-MM-DD format)" },
      pageSize: { type: "number", description: "Max results to return (default: 10)" }
    }
  }
};

const getIssueDetailTool: Tool = {
  name: "get_issue_detail",
  description: "Get issue detail by using issue ID or issue number.",
  inputSchema: {
    type: "object",
    properties: {
      issueId: { type: "string", description: "Issue ID or issue number" }
    },
    required: ["issueId"]
  }
};

const getIssueOptionsTool: Tool = {
  name: "get_issue_options",
  description: "Get selectable option fields for an issue by ID or issue number.",
  inputSchema: {
    type: "object",
    properties: {
      issueId: { type: "string", description: "Issue ID or issue number (e.g., 12345 or ABC-678)" }
    },
    required: ["issueId"]
  }
};

const updateIssueTool: Tool = {
  name: "update_issue",
  description: "Update an issue by ID or issue number. If names are provided for fields (e.g., statusName, priorityName, assigneeName, labels), they will be resolved to IDs via get_issue_options before updating.",
  inputSchema: {
    type: "object",
    properties: {
      issueId: { type: "string", description: "Issue ID or issue number (e.g., 12345 or ABC-678)" },
      summary: { type: "string", description: "New summary (optional)" },
      description: { type: "string", description: "New description (optional)" },
      statusName: { type: "string", description: "Workflow status name to set (optional)" },
      priorityName: { type: "string", description: "Priority name to set (optional)" },
      assigneeName: { type: "string", description: "Assignee name to set (optional)" },
      labels: { type: "array", items: { type: "string" }, description: "Label names to set (optional)" },
      follows: { type: "array", items: { type: "string" }, description: "Follower names to set (optional)" },
      releaseVersionName: { type: "string", description: "Release version name to set (optional)" },
      dueDate: { type: "string", description: "Due date (YYYY-MM-DD) or timestamp in ms (optional)" },
      startDate: { type: "string", description: "Start date (YYYY-MM-DD) or timestamp in ms (optional)" }
    },
    required: ["issueId"]
  }
};

const getMyIssuesTool: Tool = {
  name: "my_assigned_issues",
  description: "Retrieves my issues, specifically those assigned to the authenticated user. This tool is activated only when first-person singular pronouns (e.g., me, my, mine, or myself) are explicitly used in the query.",
  inputSchema: {
    type: "object",
    properties: {
      query: { type: "string", description: "Optional text to search in title" },
      projectName: { type: "string", description: "Filter by project name" },
      status: { type: "string", description: "Filter by status (2=ToDo, 3=In Progress, 4=Done)" },
      label: { type: "string", description: "Filter by label name" },
      priority: { type: "string", description: "Filter by priority name (e.g., 'Lowest', 'Low', 'Medium', 'High', 'Highest')"},
      sprint: { type: "string", description: "Filter by sprint name" },
      workType: { type: "string", description: "Filter by issue work type name" },
      startAfterDate: { type: "string", description: "Filter issues that start AFTER or ON this date (YYYY-MM-DD format)" },
      startBeforeDate: { type: "string", description: "Filter issues that start BEFORE or ON this date (YYYY-MM-DD format)" },
      dueAfterDate: { type: "string", description: "Filter issues that are due AFTER or ON this date (YYYY-MM-DD format)" },
      dueBeforeDate: { type: "string", description: "Filter issues that are due BEFORE or ON this date (YYYY-MM-DD format)" },
      createdAfterDate: { type: "string", description: "Filter issues that were created AFTER or ON this date (YYYY-MM-DD format)" },
      createdBeforeDate: { type: "string", description: "Filter issues that were created BEFORE or ON this date (YYYY-MM-DD format)" },
      pageSize: { type: "number", description: "Maximum number of issues to return (default: 10)" }
    }
  }
};

const createIssueTool: Tool = {
  name: "create_issue",
  description: "Creates a new Leiga issue. Required fields: summary (issue title) and projectName. Optional fields: description (issue details), priority (0-4, where 0 is no priority and 1 is urgent), statusName (issue status, e.g., 'Not Started', 'In Progress', 'Done'), sprint (sprint name), and workType (e.g., 'Story', 'Chore', 'Bug'). Returns the created issue's identifier and URL.",
  inputSchema: {
    type: "object",
    properties: {
      summary: { type: "string", description: "Issue summary" },
      projectName: { type: "string", description: "Project name" },
      description: { type: "string", description: "Issue description" },
      priority: { type: "string", description: "priority name (e.g., 'Lowest', 'Low', 'Medium', 'High', 'Highest')" },
      statusName: { type: "string", description: "Issue status (e.g., 'Not Started', 'In Progress', 'Done' )" },
      sprint: { type: "string", description: "Sprint name" },
      workType: { type: "string", description: "Work type name (e.g., 'Story', 'Chore', 'Bug')" },
    },
    required: ["summary", "projectName"]
  }
};

const listProjectTool: Tool = {
  name: "list_project",
  description: "Show project list",
  inputSchema: {
    type: "object",
    properties: {},
  }
};

const getCurrentDateTool: Tool = {
  name: "current_date",
  description: "Get current date (local timezone)",
  inputSchema: {
    type: "object",
    properties: {},
  }
};

const listIssueCommentsTool: Tool = {
  name: "list_issue_comments",
  description: "List comments of an issue by ID or issue number with pagination.",
  inputSchema: {
    type: "object",
    properties: {
      issueId: { type: "string", description: "Issue ID or issue number (e.g., 12345 or ABC-678)" },
      pageNumber: { type: "number", description: "Page number (default 1)" },
      pageSize: { type: "number", description: "Page size (default 10)" }
    },
    required: ["issueId"]
  }
};

const createCommentTool: Tool = {
  name: "create_comment",
  description: "Create a comment for an issue. Can be a new comment or a reply to an existing comment.",
  inputSchema: {
    type: "object",
    properties: {
      issueId: { type: "string", description: "Issue ID or issue number (e.g., 12345 or ABC-678)" },
      content: { type: "string", description: "Comment content" },
      commentId: { type: "number", description: "Optional: Comment ID to reply to (for replies)" }
    },
    required: ["issueId", "content"]
  }
};

const listProjectMembersTool: Tool = {
  name: "list_project_members",
  description: "List members of a specific project with optional search and pagination.",
  inputSchema: {
    type: "object",
    properties: {
      projectId: { type: "number", description: "Project ID" },
      keyword: { type: "string", description: "Optional keyword to search for members" },
      pageNumber: { type: "number", description: "Page number (default: 1)" },
      pageSize: { type: "number", description: "Page size (default: 20)" }
    },
    required: ["projectId"]
  }
};

const listOrgMembersTool: Tool = {
  name: "list_org_members",
  description: "List all organization members with optional search and pagination.",
  inputSchema: {
    type: "object",
    properties: {
      key: { type: "string", description: "Optional keyword to search for members" },
      pageNumber: { type: "number", description: "Page number (default: 1)" },
      pageSize: { type: "number", description: "Page size (default: 20)" }
    }
  }
};


const serverPrompt: Prompt = {
  name: "leiga-server-prompt",
  description: "Instructions for using the Leiga MCP server effectively",
  instructions: `This server provides access to Leiga, a project management tool. Use it to manage issues.

Key capabilities:
- Create issues: Create new issues with titles, descriptions, priorities, and project assignments.
- Search functionality: Find issues across the organization using flexible search queries with user filters.
- Comment management: View comments on issues with author information and timestamps.

Tool Usage:
- search_all_issues:
  - combine multiple filters for precise results
  - query searches title
  - returns max 10 results by default

- my_assigned_issues:
  - combine multiple filters for precise results
  - get authenticated user's issues
  - use this tool when first-person singular pronouns (e.g., me, my, mine, or myself) appear
  - returns max 10 results by default

- get_issue_detail:
  - using issue ID (e.g., 12345) or the issue number (e.g., ABC-678) get issue detail

- create_issue:
  - statusName must match exact Leiga workflow state names (e.g., 'Not Started', 'In Progress', 'Done')

- list_issue_comments:
  - get comments for an issue using ID or issue number
  - supports pagination with pageNumber and pageSize
  - returns author, timestamp, content, and reply count for each comment

- create_comment:
  - create a new comment for an issue using ID or issue number
  - can reply to existing comments by providing commentId
  - returns the created comment ID

Best practices:
- When searching:
  - Use specific, targeted queries for better results (e.g., "auth mobile app" rather than just "auth")
  - Apply relevant filters when asked or when you can infer the appropriate filters to narrow results

- When creating issues:
  - Write clear, actionable summary that describe the task well (e.g., "Implement user authentication for mobile app")
  - Include concise but appropriately detailed descriptions in markdown format with context and acceptance criteria
  - Always specify the correct project name

- When viewing comments:
  - Use issue ID or issue number format (e.g., 12345 or ABC-678)
  - Comments are paginated with 20 items per page by default

The server uses the authenticated user's permissions for all operations.`
};


// Zod schemas for tool argument validation
const SearchIssueDTOSchema = z.object({
  query: z.string().optional().describe("Optional text to search in title and description"),
  projectName: z.string().optional().describe("Filter by project name"),
  status: z.string().optional().describe("Filter by status (2=ToDo, 3=In Progress, 4=Done)"),
  assignee: z.string().optional().describe("Filter by assignee's name"),
  label: z.string().optional().describe("Filter by label name"),
  priority: z.string().optional().describe("Filter by priority (e.g., 'Lowest', 'Low', 'Medium', 'High', 'Highest')"),
  sprint: z.string().optional().describe("Filter by sprint name"),
  workType: z.string().optional().describe("Filter by issue work type name (e.g., 'Story', 'Chore', 'Bug')"),
  startAfterDate: z.string().optional().describe("Filter issues that start AFTER or ON this date (YYYY-MM-DD format)"),
  startBeforeDate: z.string().optional().describe("Filter issues that start BEFORE or ON this date (YYYY-MM-DD format)"),
  dueAfterDate: z.string().optional().describe("Filter issues that are due AFTER or ON this date (YYYY-MM-DD format)"),
  dueBeforeDate: z.string().optional().describe("Filter issues that are due BEFORE or ON this date (YYYY-MM-DD format)"),
  createdAfterDate: z.string().optional().describe("Filter issues that were created AFTER or ON this date (YYYY-MM-DD format)"),
  createdBeforeDate: z.string().optional().describe("Filter issues that were created BEFORE or ON this date (YYYY-MM-DD format)"),
  pageSize: z.number().optional().describe("Max results to return (default: 10)")
});

const IssueDetailSchema = z.object({
  issueId: z.string().describe("using issue ID (e.g., 12345) or the issue number (e.g., ABC-678) get issue detail")
});

const GetIssueOptionsSchema = z.object({
  issueId: z.string().describe("Issue ID or issue number (e.g., 12345 or ABC-678)")
});

const UpdateIssueArgsSchema = z.object({
  issueId: z.string().describe("Issue ID or issue number (e.g., 12345 or ABC-678)"),
  summary: z.string().optional(),
  description: z.string().optional(),
  statusName: z.string().optional(),
  priorityName: z.string().optional(),
  assigneeName: z.string().optional(),
  labels: z.array(z.string()).optional(),
  follows: z.array(z.string()).optional(),
  releaseVersionName: z.string().optional(),
  dueDate: z.union([z.string(), z.number()]).optional(),
  startDate: z.union([z.string(), z.number()]).optional(),
});

const MyIssueDTOSchema = z.object({
  query: z.string().optional().describe("Optional text to search in title and description"),
  projectName: z.string().optional().describe("Filter by project name"),
  status: z.string().optional().describe("Filter by status (2=ToDo, 3=In Progress, 4=Done)"),
  label: z.string().optional().describe("Filter by label name"),
  priority: z.string().optional().describe("Filter by priority (e.g., 'Lowest', 'Low', 'Medium', 'High', 'Highest')"),
  sprint: z.string().optional().describe("Filter by sprint name"),
  workType: z.string().optional().describe("Filter by issue work type name (e.g., 'Story', 'Chore', 'Bug')"),
  startAfterDate: z.string().optional().describe("Filter issues that start AFTER or ON this date (YYYY-MM-DD format)"),
  startBeforeDate: z.string().optional().describe("Filter issues that start BEFORE or ON this date (YYYY-MM-DD format)"),
  dueAfterDate: z.string().optional().describe("Filter issues that are due AFTER or ON this date (YYYY-MM-DD format)"),
  dueBeforeDate: z.string().optional().describe("Filter issues that are due BEFORE or ON this date (YYYY-MM-DD format)"),
  createdAfterDate: z.string().optional().describe("Filter issues that were created AFTER or ON this date (YYYY-MM-DD format)"),
  createdBeforeDate: z.string().optional().describe("Filter issues that were created BEFORE or ON this date (YYYY-MM-DD format)"),
  pageSize: z.number().optional().describe("Max results to return (default: 10)")
});


const CreateIssueArgsSchema = z.object({
  summary: z.string().describe("Issue summary"),
  projectName: z.string().describe("Project name"),
  description: z.string().optional().describe("Issue description"),
  priority: z.string().optional().describe("priority name (e.g., 'Lowest', 'Low', 'Medium', 'High', 'Highest')"),
  statusName: z.string().optional().describe("Issue status (e.g., 'Not Started', 'In Progress', 'Done' )"),
  sprint: z.string().optional().describe("Sprint name"),
  workType: z.string().optional().describe("Work type name (e.g., 'Story', 'Chore', 'Bug')"),
});

const CreateCommentArgsSchema = z.object({
  issueId: z.string().describe("Issue ID or issue number (e.g., 12345 or ABC-678)"),
  content: z.string().describe("Comment content"),
  commentId: z.number().optional().describe("Optional: Comment ID to reply to (for replies)"),
});

const ListIssueCommentschema = z.object({
  issueId: z.string().describe("Issue ID or issue number (e.g., 12345 or ABC-678)"),
  pageNumber: z.number().optional().describe("Page number (default: 1)"),
  pageSize: z.number().optional().describe("Max results to return (default: 20)")
});

const ListProjectMembersSchema = z.object({
  projectId: z.number().describe("Project ID"),
  keyword: z.string().optional().describe("Optional keyword to search for members"),
  pageNumber: z.number().optional().describe("Page number (default: 1)"),
  pageSize: z.number().optional().describe("Page size (default: 20)")
});

const ListOrgMembersSchema = z.object({
  key: z.string().optional().describe("Optional keyword to search for members"),
  pageNumber: z.number().optional().describe("Page number (default: 1)"),
  pageSize: z.number().optional().describe("Page size (default: 20)")
});

async function main() {
  try {
    dotenv.config();
    const clientId = process.env.LEIGA_CLIENT_ID;
    const secret = process.env.LEIGA_SECRET;
    if (!clientId || !secret) {
      process.stderr.write("LEIGA_CLIENT_ID and LEIGA_SECRET environment variables are required");
      process.exit(1);
    }
    const leigaClient = new LeigaMCPClient(clientId, secret);

    const server = new Server(
      {
        name: "leiga-mcp-server",
        version: "1.0.0",
      },
      {
        capabilities: {
          prompts: {
            default: serverPrompt
          },
          tools: {},
        },
      }
    );

    server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [searchIssuesTool, getIssueDetailTool, getMyIssuesTool, 
        createIssueTool, listProjectTool, listIssueCommentsTool, createCommentTool, getCurrentDateTool,
        listProjectMembersTool, listOrgMembersTool, getIssueOptionsTool, updateIssueTool]
    }));


    server.setRequestHandler(ListPromptsRequestSchema, async () => {
      return {
        prompts: [serverPrompt]
      };
    });

    server.setRequestHandler(GetPromptRequestSchema, async (request) => {
      if (request.params.name === serverPrompt.name) {
        return {
          prompt: serverPrompt
        };
      }
      throw new Error(`Prompt not found: ${request.params.name}`);
    });

    server.setRequestHandler(CallToolRequestSchema, async (request: CallToolRequest) => {
      try {
        const { name, arguments: args } = request.params;
        if (!args) throw new Error("Missing arguments");
        switch (name) {
          case "search_all_issues": {
            const validatedArgs = SearchIssueDTOSchema.parse(args);
            const issues = await leigaClient.searchIssues(validatedArgs);
            return {
              content: [{
                type: "text",
                text: `Found ${issues.length} issues:\n${
                  issues.map((issue) =>
                    `- ${issue.issueNumber}: [${issue.title}](${issue.url})\n
                    Project: ${issue.projectName}\n
                    Priority: ${issue.priority || 'None'}\n  
                    Status: ${issue.status || 'None'}\n
                    Assignee: ${issue.assignee || 'None'}\n
                    Sprint: ${issue.sprintName || 'None'}
                    `
                  ).join('\n')
                }`
              }]
            }
          }
          case "get_issue_detail" : {
            const validatedArgs = IssueDetailSchema.parse(args);
            const data = await leigaClient.getIssue(validatedArgs.issueId);
            return {
              content : [{
                type: "text",
                text: `
                ${data.issueNumber}: [${data.summary}](${data.url})\n
                Priority: ${data.priority || 'None'}
                Status: ${data.status}
                Assignee: ${data.assignee || 'None'}
                Project ID: ${data.projectId || 'None'}
                Description: ${data.description}
                  `.trim()
              }]
            }
          }
          case "get_issue_options": {
            const validatedArgs = GetIssueOptionsSchema.parse(args);
            const fields = await leigaClient.getIssueOptions(validatedArgs.issueId);
            const text = `Found ${fields.length} option fields:\n${
              fields.map((f: any) => {
                const header = `- ${f.customFieldName || 'Unnamed'} (${f.fieldCode || 'unknown_code'})${f.requiredFlag ? ' (required)' : ''}`;
                if (!Array.isArray(f.options) || f.options.length === 0) {
                  return `${header}\n  - options: None`;
                }
                const optionsText = f.options.map((o: any) => `  - name: ${o?.name ?? 'None'}, value: ${o?.value ?? ''}`).join('\n');
                return `${header}\n${optionsText}`;
              }).join('\n\n')
            }`;
            return {
              content: [{ type: "text", text }]
            };
          }
          case "update_issue": {
            const validatedArgs = UpdateIssueArgsSchema.parse(args);
            const result = await leigaClient.updateIssue(validatedArgs);
            return { content: [{ type: "text", text: `Update issue success: ${result}` }] };
          }
          case "my_assigned_issues": {
            const validatedArgs = MyIssueDTOSchema.parse(args);
            const issues = await leigaClient.myIssues(validatedArgs);
            return {
              content: [{
                type: "text",
                text: `Found ${issues.length} issues:\n${
                  issues.map((issue) =>
                    `- ${issue.issueNumber}: [${issue.title}](${issue.url})\n  
                    Project: ${issue.projectName}\n
                    Priority: ${issue.priority || 'None'}\n  
                    Status: ${issue.status || 'None'}\n
                    Sprint: ${issue.sprintName || 'None'}
                    `
                  ).join('\n')
                }`
              }]
            };
          }
          case "create_issue": {
            const validatedArgs = CreateIssueArgsSchema.parse(args);
            const issue = await leigaClient.createIssue(validatedArgs);
            return {
              content: [{
                type: "text",
                text: `Create issue success: ${issue.issueNumber}: [${issue.title}](${issue.url})\n`
              }]
            };
          }
          case "list_project": {
            const projects = await leigaClient.listProjects();
            return {
              content: [{
                type: "text",
                text: `Found ${projects.length} Projects:\n${
                  projects.filter(project => project.archived != 1).map((project) =>
                    `ID: ${project.id}\n  
                    Name: ${project.pname}\n
                    PKey: ${project.pkey}\n`
                  ).join('\n')
                }`
              }]
            };
          }
          case "list_issue_comments": {
            const validatedArgs = ListIssueCommentschema.parse(args);
            const data = await leigaClient.listIssueComments(validatedArgs.issueId, validatedArgs.pageNumber, validatedArgs.pageSize);
            const total = data.total;
            const list = data.list || [];
            const formatTime = (ts?: number) => ts ? new Date(ts).toISOString() : '';
            const formatComment = (comment: CommentListItem, indent: string = ''): string => {
              const baseComment = `${indent}- [ID:${comment.commentId}] ${comment.commentUser?.userName || 'Unknown'} @ ${formatTime(comment.createTime)}\n${indent}  ${comment.content || ''}`;
              
              if (!comment.subReplies || comment.subReplies.length === 0) {
                return baseComment;
              }
              
              const replies = comment.subReplies.map((reply) => 
                `${indent}  └─ [ID:${reply.replyId}] ${reply.commentUser?.userName || 'Unknown'} @ ${formatTime(reply.createTime)}\n${indent}     ${reply.content || ''}`
              ).join('\n');
              
              return `${baseComment}\n${replies}`;
            };
            
            const text = `Total Comments: ${total}\n${list.map((c) => formatComment(c)).join('\n\n')}`;
            return {
              content: [{ type: "text", text }]
            };
          }
          case "create_comment": {
            const validatedArgs = CreateCommentArgsSchema.parse(args);
            
            // 获取 issue 的 linkId
            const linkId = await leigaClient.resolveIssueId(validatedArgs.issueId);
            
            const commentData: CreateCommentDTO = {
              commentModule: "issue",
              linkId,
              plainContent: validatedArgs.content,
              content: validatedArgs.content,
              ...(validatedArgs.commentId && { commentId: validatedArgs.commentId })
            };
            
            const result = await leigaClient.createComment(commentData);
            return {
              content: [{
                type: "text",
                text: `Comment created successfully with ID: ${result.id}`
              }]
            };
          }
          case "current_date": {
            return {
              content: [{
                type: "text",
                text: `Current Date is: ${today}`
              }]
            };
          }
          case "list_project_members": {
            const validatedArgs = ListProjectMembersSchema.parse(args);
            const data = await leigaClient.listProjectMembers(validatedArgs);
            const total = data.total;
            const list = data.list || [];
            return {
              content: [{
                type: "text",
                text: `Found ${total} project members:\n${
                  list.map((member: any) =>
                    `- User ID: ${member.userId || 'N/A'}\n  User Name: ${member.userName || 'N/A'}\n  Email: ${member.orgEmail || 'N/A'}`
                  ).join('\n\n')
                }`
              }]
            };
          }
          case "list_org_members": {
            const validatedArgs = ListOrgMembersSchema.parse(args);
            const data = await leigaClient.listOrgMembers(validatedArgs);
            const total = data.total;
            const list = data.list || [];
            return {
              content: [{
                type: "text",
                text: `Found ${total} organization members:\n${
                  list.map((member: any) =>
                    `- User ID: ${member.userId || 'N/A'}\n  User Name: ${member.userName || 'N/A'}\n  Email: ${member.orgEmail || 'N/A'}`
                  ).join('\n\n')
                }`
              }]
            };
          }
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {       
        // For all other errors
        return {
          content: [{
            type: "text",
            text: error instanceof Error ? error.message : String(error),
            metadata: {
              error: true
            }
          }]
        };
      }
    });

    const transport = new StdioServerTransport();
    process.stderr.write("Connecting server to transport...");
    await server.connect(transport);
    process.stderr.write("Leiga MCP Server running on stdio");
  } catch (error) {
    process.stderr.write(`Fatal error in main(): ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

main().catch((error: unknown) => {
  process.stderr.write(`Fatal error in main():", ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});