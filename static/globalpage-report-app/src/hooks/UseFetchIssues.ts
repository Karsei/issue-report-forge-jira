import React, {useEffect, useState} from 'react';
import {IssueAggregator} from '../libs/IssueAggregatorSupport';
import {Option} from '../definitions/SearchFormTypes';

export default function FetchIssues<T>(issueAggregator: IssueAggregator, baseDate: string | undefined, baseUser: Option[] | undefined) {
    const [error, setError] = useState('');
    const [data, setData] = useState<T[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (baseDate === undefined || baseUser === undefined) {
            return;
        }

        setLoading(true);
        setError('');

        // 조회 시작
        const fetch = async() => {
            try {
                const res = await issueAggregator.init(baseDate, baseUser);

                setData(res);
            }
            catch (e) {
                console.error(e);
                setData([]);
                setError('이슈를 조회하는 과정에서 기타 오류가 발생했습니다.');
            }
            finally {
                setLoading(false);
            }
        }
        fetch();
    }, [baseDate, baseUser, setError, setData, setLoading]);

    return {
        error,
        data,
        loading,
    };
}