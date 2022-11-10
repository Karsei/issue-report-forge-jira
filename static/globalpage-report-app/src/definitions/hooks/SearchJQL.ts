import {Issue} from '../Issue';

export interface SearchJQLRequest {
    jql: string,
    startAt?: number,
    maxResults?: number,
    fields?: string[],
}

export interface SearchJQLResponse {
    expand: string,
    startAt: number,
    maxResults: number,
    total: number,
    issues: Issue[],
}