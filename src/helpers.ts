import api, { route, storage } from '@forge/api';

type StorageValue = Array<boolean | number | object | string> | boolean | number | object | string;

export const getDataFromJira = async (url, params) => {
    try {
        if (params) {
            const queryParams = new URLSearchParams(params);
            url = `${url}?${queryParams}`;
        }
        const response = await api.asUser().requestJira(route`${url}`, {
            headers: {
                'Accept': 'application/json'
            }
        });
        return await response.json();
    } catch (error) {
        console.log("getDataFromJira error: ", error);
        throw error;
    }
};

export const getDataFromJiraPost = async (url, body) => {
    try {
        const option = {
            headers: {
                'Accept': 'application/json'
            },
            method: 'POST',
        };
        if (body) {
            option['body'] = JSON.stringify(body);
        }
        const response = await api.asUser().requestJira(route`${url}`, option);
        return await response.json();
    } catch (error) {
        console.log("getDataFromJira error: ", error);
        throw error;
    }
};

export const getStorage = async (key:string):Promise<StorageValue> => {
    return await storage.get(key);
};

export const setStorage = async (key:string, value:StorageValue) => {
    return await storage.set(key, value);
};

export const getStorageSecret = async (key:string):Promise<StorageValue> => {
    return await storage.getSecret(key);
};

export const setStorageSecret = async (key:string, value:StorageValue) => {
    return await storage.setSecret(key, value);
};