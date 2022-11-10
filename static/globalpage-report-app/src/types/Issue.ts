export interface Issue {
    expand: string,
    fields: IssueField,
    id: string,
    key: string,
    self: string,
}

export interface IssueField {
    [fieldKey:string]: any,
    project: IssueFieldProject,
    issuekey: string,
    issuelink: object[],
    summary: string,
    issuetype: IssueFieldIssueType,
    status: IssueFieldStatus,
    priority: string,
    resolution: string,
    assignee?: IssueFieldPerson,
    reporter?: IssueFieldPerson,
    creator?: IssueFieldPerson,
    created?: string,
    lastViewed?: string,
    updated?: string,
    resolutiondata?: string,
    versions?: string,
    fixVersions?: object[],
    components?: string,
    duedate?: string,
    votes?: number,
    watches?: number,
    thumbnail?: string,
    timeoriginalestimate?: string,
    timeestimate?: string,
    timespent?: string,
    workratio?: string,
    subtasks?: string,
    issuelinks?: string,
    environment?: string,
    description?: string,
    security?: string,
    progress?: string,
    aggregateprogress?: string,
    aggregatetimespent?: string,
    aggregatetimeestimate?: string,
    aggregatetimeoriginalestimate?: string,
    labels?: object[],
    statuscategorychangedate?: string,
    statusCategory?: string,
    parent?: IssueFieldParent,
    parentissue?: string,
    // childs?: {[identifier:string]: JiraIssue},
    comment?: IssueFieldComment,
}

export interface IssueFieldProject {
    self: string;
    id: string;
    key: string;
    name: string;
    projectTypeKey: string;
    simplified: boolean;
    avatarUrls: AvatarUrlsBean;
    projectCategory: UpdatedProjectCategory;
}

export interface AvatarUrlsBean {
    '16x16': string;
    '24x24': string;
    '32x32': string;
    '48x48': string;
}

export interface IssueFieldPerson {
    self: object,
    accountId: string,
    avatarUrls: AvatarUrlsBean,
    displayName: string,
    active: boolean,
    timeZone: string,
    accountType: string,
}

export interface IssueFieldStatus {
    self: object,
    description: string,
    iconUrl: object,
    name: string,
    id: string,
    statusCategory: object,
}

export interface UpdatedProjectCategory {
    self: string;
    id: string;
    description: string;
    name: string;
}

export interface IssueFieldParent {
    id: string,
    key: string,
    self: string,
    fields: IssueFieldParentField,
}

export interface IssueFieldParentField {
    issuetype: IssueFieldIssueType,
    priority: object,
    status: object,
    summary: string,
}

export interface IssueFieldIssueType {
    self: string;
    id: string;
    description: string;
    iconUrl: string;
    name: string;
    subtask: boolean;
    avatarId: number;
    entityId: string;
    hierarchyLevel: number;
    scope?: Scope;
}

export interface Scope {
    type: string,
    project: IssueFieldProject,
}

export interface IssueFieldComment {
    comments: Comment[],
    self: string,
    maxResults: number,
    total: number,
    startAt: number,
}

export interface Comment {
    self: string,
    id: string,
    author: CommentAuthor,
    body: CommentBody,
    updateAuthor: CommentAuthor,
    created: string,
    updated: string,
    jsdPublic: boolean,
}

export interface CommentBody {
    version: number,
    type: string,
    content: CommentContentWrapper[],
}

export interface CommentContentWrapper {
    type: string,
    content: CommentContent[],
}

export interface CommentContent {
    type: string,
    text: string,
    marks: object[],
}

export interface CommentAuthor {
    self: string,
    accountId: string,
    avatarUrls: AvatarUrlsBean,
    displayName: string,
    active: boolean,
    timeZone: string,
    accountType: string,
}