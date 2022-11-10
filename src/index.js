import Resolver from '@forge/resolver';
import {
    getDataFromJira,
    getDataFromJiraPost,
    getStorage,
    setStorage,
    getStorageSecret,
    setStorageSecret,
} from './helpers';

const resolver = new Resolver();

resolver.define('getUsers', (req) => {
    return getDataFromJira(`/rest/api/3/users`);
});
resolver.define('getIssuesByJql', (req) => {
    return getDataFromJiraPost(`/rest/api/3/search`, req.payload);
});
resolver.define('getIssue', (req) => {
    return getDataFromJira(`/rest/api/3/issue/${req.payload.issueId}`);
});
resolver.define('getStorage', (req) => {
    return getStorage(req.payload.key);
});
resolver.define('setStorage', (req) => {
    return setStorage(req.payload.key, req.payload.value);
});
resolver.define('getStorageSecret', (req) => {
    return getStorageSecret(req.payload.key);
});
resolver.define('setStorageSecret', (req) => {
    return setStorageSecret(req.payload.key, req.payload.value);
});

export const handler = resolver.getDefinitions();