/**
 * 创建LeigaOpenAPIClient 类
 */

import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { TokenData, IssueListResponse, SearchIssueDTO, CreateIssueDTO, CommentListData, CreateCommentDTO, CreateCommentResponse, ProjectMemberListDTO, OrgMemberListDTO, ApiCustomFieldVO, UpdateIssueDTO } from './types.js';
import {
  IssueDataWrapper,
  LeigaResponse,
  MemberVO,
  PageDataWrapper,
  ProjectNameVO,
  StringResponse
} from './type/IssueDetail.js'

class LeigaOpenAPIClient {
  private secret: string;
  private clientId: string;
  private baseUrl: string;
  private host: string;
  private tokenFilePath: string;

  constructor(options: { clientId: string, secret: string }) {
    if (!options.secret || !options.clientId) {
      throw new Error("clientId and secret is required to initialize LeigaOpenAPIClient");
    }

    this.clientId = options.clientId;
    this.secret = options.secret;
    this.host = "https://app-pre.leigaqa.com";
    this.baseUrl = this.host + "/openapi/api/";

    // 根据操作系统设置token文件路径
    this.tokenFilePath = this.getTokenFilePath(this.clientId);
  }

  /**
   * 根据操作系统获取token文件路径
   */
  private getTokenFilePath(clientId: string): string {
    const homeDir = homedir();
    const fileName = clientId + '-leiga-token.json';

    // Windows: %USERPROFILE%\.leiga\
    // macOS/Linux: ~/.leiga/
    const configDir = join(homeDir, '.leiga');

    // 确保目录存在
    if (!existsSync(configDir)) {
      mkdirSync(configDir, { recursive: true });
    }

    return join(configDir, fileName);
  }

  /**
   * 保存token到本地文件
   */
  private saveTokenToFile(tokenData: any): void {
    try {
      const data: TokenData = {
        accessToken: tokenData.accessToken,
        expireIn: tokenData.expireIn,
        createdAt: Date.now()
      };

      writeFileSync(this.tokenFilePath, JSON.stringify(data, null, 2), 'utf8');
    } catch (error) {
      process.stderr.write(`save token error:, ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * read token from local file
   */
  private readTokenFromFile(): TokenData | null {
    try {
      if (!existsSync(this.tokenFilePath)) {
        return null;
      }

      const data = readFileSync(this.tokenFilePath, 'utf8');
      const tokenData: TokenData = JSON.parse(data);

      if (tokenData.expireIn != -1) {
        //check token is expired
        const now = Date.now();
        const expirationTime = tokenData.createdAt + (tokenData.expireIn * 1000);
        if (now >= expirationTime) {
          return null;
        }
      }
      return tokenData;
    } catch (error) {
      process.stderr.write(`load token error:, ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
  }

  /**
   * get token
   */
  async getToken(): Promise<TokenData> {
    //get from local
    const cachedToken = this.readTokenFromFile();
    if (cachedToken) {
      return cachedToken;
    }

    //get from api
    const newToken = await this.getAccessPermanentToken();
    this.saveTokenToFile(newToken);
    return {
      accessToken: newToken.accessToken,
      expireIn: newToken.expireIn,
      createdAt: Date.now()
    };
  }


  protected async request<T>(
    path: string,
    options: RequestInit = {},
    queryParams?: Record<string, any>
  ): Promise<T> {
    let url = `${this.baseUrl}${path}`;
    if (queryParams) {
      const params = new URLSearchParams();
      for (const key in queryParams) {
        if (
          queryParams[key] !== undefined &&
          queryParams[key] !== null
        ) {
          params.append(key, String(queryParams[key]));
        }
      }
      url += `?${params.toString()}`;
    }

    //get token 
    let accessToken: string;
    if (path === "/authorize/access-permanent-token") {
      accessToken = this.secret;
    } else {
      const tokenData = await this.getToken();
      accessToken = tokenData.accessToken;
    }

    const headers: Record<string, string> = {
      "accessToken": `${accessToken}`,
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string> || {}),
    };

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `HTTP error ${response.status}: ${response.statusText} - ${errorText}`
      );
    }

    const jsonResponse = await response.json();

    // 统一处理 Leiga API 错误响应
    if (jsonResponse.code && jsonResponse.code !== "0") {
      const errorMessage = jsonResponse.msg || `API error with code: ${jsonResponse.code}`;
      throw new Error(`Leiga API error: ${errorMessage}`);
    }

    return jsonResponse;
  }

  /**
   * get permanent token
   */
  async getAccessPermanentToken() {
    const response = await this.request("/authorize/access-permanent-token", {
      method: "POST",
      body: JSON.stringify({ clientId: this.clientId, secretKey: this.secret }),
    });
    const data = await response;
    return (data as any).data !== undefined ? (data as any).data : data;
  }


  async getIssueDeail(issueId: string): Promise<LeigaResponse<IssueDataWrapper>> {
    //id or issue number
    const type = this.checkStringType(issueId);
    switch (type) {
      case 'id':
        return await this.request<LeigaResponse<IssueDataWrapper>>("/issue/get", { method: "GET" }, { "id": issueId });
      case 'number':
        return await this.request<LeigaResponse<IssueDataWrapper>>("/issue/get-by-issue-number", { method: "GET" }, { "issueNumber": issueId });
      default:
        throw new Error('Invalid issueId format');
    }
  }

  async getProjects(): Promise<LeigaResponse<ProjectNameVO[]>> {
    return await this.request<LeigaResponse<ProjectNameVO[]>>("/project/list", { method: "GET" });
  }

  /**
   * create issue
   * @param issue 
   * @returns 
   */
  async createIssue(issue: CreateIssueDTO): Promise<LeigaResponse<IssueListResponse>> {
    return await this.request<LeigaResponse<IssueListResponse>>("/issue/mcp-create-issue", {
      method: "POST",
      body: JSON.stringify(issue)
    });
  }

  /**
  * search issues
 */
  async searchIssueList(params: SearchIssueDTO): Promise<LeigaResponse<IssueListResponse[]>> {
    const response = await this.request<LeigaResponse<IssueListResponse[]>>("/issue/mcp-search-issues", {
      method: "POST",
      body: JSON.stringify(params)
    });
    return response;
  }

  /**
   * Get comments for an issue (supports issue ID or issue number)
   */
  async getIssueComments(
    issueIdOrNumber: string,
    pageNumber: number = 1,
    pageSize: number = 20
  ): Promise<LeigaResponse<CommentListData>> {
    const linkId = await this.resolveIssueId(issueIdOrNumber);

    return await this.request<LeigaResponse<CommentListData>>("/comment/page", {
      method: "POST",
      body: JSON.stringify({
        commentModule: "issue",
        linkId,
        pageNumber,
        pageSize
      })
    });
  }

  checkStringType(str: string): "id" | "number" | "other" {
    if (/^\d+$/.test(str)) {
      return "id";
    }
    if (/^[A-Z]+-\d+$/.test(str)) {
      return "number";
    }
    return "other";
  }

  getIssueUrl(issueId: number, projectId: number) {
    return `${this.host}/work/list?pid=${projectId}&issueid=${issueId}`;
  }

  /**
   * Create a comment for an issue
   */
  async createComment(comment: CreateCommentDTO): Promise<LeigaResponse<CreateCommentResponse>> {
    return await this.request<LeigaResponse<CreateCommentResponse>>("/comment/add", {
      method: "POST",
      body: JSON.stringify(comment)
    });
  }

  /**
   * Resolve issue ID from string (numeric ID or issue number)
   * @param issueIdOrNumber - Issue ID or issue number (e.g., "12345" or "ABC-678")
   * @returns Promise<number> - Resolved numeric issue ID
   */
  async resolveIssueId(issueIdOrNumber: string): Promise<number> {
    const type = this.checkStringType(issueIdOrNumber);
    if (type === 'id') {
      return Number(issueIdOrNumber);
    } else if (type === 'number') {
      const issue = await this.getIssueDeail(issueIdOrNumber);
      return issue.data.id;
    } else {
      throw new Error('Invalid issue identifier. Use numeric ID or issue number like ABC-123');
    }
  }

  /**
   * list project members
   * @param query 
   * @returns 
   */
  async listProjectMembers(query: ProjectMemberListDTO): Promise<LeigaResponse<PageDataWrapper<MemberVO[]>>> {
    return await this.request<LeigaResponse<PageDataWrapper<MemberVO[]>>>("/user/project-user-page", {
      method: "GET"
    }, query);
  }

  /**
   * list org members
   * @param query 
   * @returns 
   */
  async listOrgMembers(query: OrgMemberListDTO): Promise<LeigaResponse<PageDataWrapper<MemberVO[]>>> {
    return await this.request<LeigaResponse<PageDataWrapper<MemberVO[]>>>("/org/all-member-list", {
      method: "GET"
    }, query);
  }

  /**
   * get issue options
   * @param issueIdOrNumber 
   * @returns 
   */
  async getIssueOptions(issueIdOrNumber: string): Promise<LeigaResponse<ApiCustomFieldVO[]>> {
    const issueId = await this.resolveIssueId(issueIdOrNumber);
    return await this.request<LeigaResponse<ApiCustomFieldVO[]>>("/issue/mcp-issue-select-options", {
      method: "POST",
      body: JSON.stringify({ id: issueId})
    });
  }

  /**
   * update issue
   * @param issue 
   * @returns 
   */
  async updateIssue(issue: UpdateIssueDTO): Promise<LeigaResponse<StringResponse>> {
    return await this.request<LeigaResponse<StringResponse>>("/issue/update", {
      method: "PATCH",
      body: JSON.stringify(issue)
    });
  }
}

export { LeigaOpenAPIClient };
