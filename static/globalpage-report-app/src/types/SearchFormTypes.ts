export interface Option {
    label: string;
    value: string;
}
export interface User {
    accountId: string;
    accountType: string;
    active: boolean;
    avatarUrls: object;
    locale: string;
    self: string;
    displayName: string;
}
export interface SearchCondition {
    baseDate: string,
    baseUser: Option[],
}