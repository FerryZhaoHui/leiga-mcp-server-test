/**
 * Leiga API
 */

// Token 数据
export interface TokenData {
  accessToken: string;
  expireIn: number;
  createdAt: number;
}

export interface SearchIssueDTO {
  query?: string;
  projectName?: string;
  status?: string;
  assignee?: string;
  label?: string;
  priority?: string;
  sprint?: string;
  workType?: string;
  startAfterDate?: string;
  startBeforeDate?: string;
  dueAfterDate?: string;
  dueBeforeDate?: string;
  createdAfterDate?: string;
  createdBeforeDate?: string;
  pageSize?: number;
}

export interface CreateIssueDTO {
  projectName: string;
  summary: string;
  description?: string;
  statusName?: string;
  priority?: string;
  sprint?: string;
  workType?: string;
}

export interface IssueListResponse {
  id: string;
  projectName: string;
  issueNumber: string;
  url: string;
  status: string;
  priority?: string;
  assignee?: string;
  title: string;
  description?: string;
  sprintName?: string;
}

// ===== Comment related types =====
export interface CommentAtInfo {
  headPortrait?: string;
  userName: string;
  userId: number;
}

export interface CommentAttributes {
  commentAtInfos: CommentAtInfo[];
}

export interface CommentUserInfo {
  headPortrait: string;
  userName: string;
  userId: number;
}

export interface CommentReplyItem {
  deleteFlag: number;
  createTime: number;
  groupId?: number;
  commentUser: CommentUserInfo;
  replyId: number;
  commentId: number;
  files: unknown[];
  updateTime: number;
  linkedIssueDeleteFlag?: number;
  content: string;
}

export interface CommentListItem {
  deleteFlag: number;
  commentAttributes?: CommentAttributes;
  createTime: number;
  subReplies: CommentReplyItem[];
  commentUser: CommentUserInfo;
  commentId: number;
  files: unknown[];
  updateTime: number;
  content: string;
}

export interface CommentListData {
  extend?: { totalCommentNo?: number };
  total: number;
  list: CommentListItem[];
}

export interface CreateCommentDTO {
  commentModule: string;
  linkId: number;
  plainContent: string;
  commentId?: number;
  content: string;
}

export interface CreateCommentResponse {
  id: number;
}

export interface ProjectMemberListDTO {
  keyword?: string;
  pageNumber?: number;
  pageSize?: number;
  projectId: number;
}

export interface OrgMemberListDTO {
  key?: string;
  pageNumber?: number;
  pageSize?: number;
}

export interface ApiIssueFieldOptionVO {
  value?: any;
  name?: string | null;
}

export interface ApiCustomFieldVO {
  customFieldId?: number | null;
  fieldCode?: string | null;
  customFieldName?: string | null;
  controlCode?: string | null;
  fieldDescription?: string | null;
  options?: ApiIssueFieldOptionVO[] | null;
  requiredFlag?: boolean | null;
  fieldType?: string | null;
  multipleChoice?: boolean | null;
  isDefault?: boolean | null;
}

export interface UpdateIssueDTO {
  id: number;
  data: UpdateIssueData;
}

export interface UpdateIssueData{
  summary?: string;
  description?: string;
  status?: number;
  priority?: number;
  dueDate?: number;
  startDate?: number;
  assignee?: number;
  label?: number[];
  follows?: number[];
  releaseVersion?: number;
}