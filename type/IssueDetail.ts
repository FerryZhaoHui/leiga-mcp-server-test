  export interface LeigaResponse<T> {
    code: string;
    data: T;
  }
  export interface StringResponse {
    success?: boolean;
  }
  
  export  interface IssueDataWrapper {
    data: IssueData;
    createTime: number;
    updateTime: number;
    id: number;
    projectId: number;
    url: string;
  }


  export interface PageDataWrapper<T> {
    total: number;
    list: T[];
  }
  
  export interface IssueData {
    issueNumber: string;
    description: string;
    priorityVO: PriorityVO;
    ownerVO: OwnerVO;
    updateBy: number;
    labelVO: LabelVO[];
    id: number;
    owner: number;
    summary: string;
    updateByVO: UpdateByVO;
    assigneeVO: AssigneeVO;
    createBy: number;
    statusVO: StatusVO;
    createByVO: CreateByVO;
    issueTypeIdVO: IssueTypeIdVO;
    followsVO: FollowsVO[];
    projectId: number;
  }
  
  export interface PriorityVO {
    sequence: number;
    color: string;
    name: string;
    description: string;
    id: number;
    iconUrl: string;
  }
  
  export interface OwnerVO {
    name: string;
    id: number;
    avatar: string;
    userType: number;
    orgUserId: number;
    accountEnabled: number;
  }
  
  export interface LabelVO {
    color: string;
    name: string;
    id: number;
    labelName: string;
  }
  
  export  interface UpdateByVO {
    name: string;
    id: number;
  }
  
  export interface AssigneeVO {
    name: string;
    id: number;
  }
  
  export interface StatusVO {
    stateName: string;
    name: string;
    stateCategory: number;
    id: number;
  }
  
  export interface CreateByVO {
    name: string;
    id: number;
  }
  
  export interface IssueTypeIdVO {
    selectId: number;
    code: string;
    name: string;
    description: string;
    id: number;
    iconUrl: string;
    source: string;
    selected: boolean;
    originName: string;
  }
  
  export interface FollowsVO {
    name: string;
    id: number;
    avatar: string;
  }

export interface ProjectNameVO {
  id: number;
  pname: string;
  pkey: string;
  archived: number;
}


export interface MemberVO {
  orgEmail?: string;
  userId?: number;
  userName?: string;
}
