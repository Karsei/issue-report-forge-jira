import React, {useEffect} from 'react';
import {SuccessProgressBar} from '@atlaskit/progress-bar';
import {DailyIssueAggregator, UserCommentGroup} from '../libs/IssueAggregatorSupport';
import useFetchIssues from '../hooks/UseFetchIssues';
import {SearchCondition} from '../types/SearchFormTypes';
import DailyReportTable from './DailyReportTable';

export interface DailyReportProps {
    searchCondition: SearchCondition | unknown
}

export default function DailyReport(props: DailyReportProps) {
    const {error, data, loading} = useFetchIssues<UserCommentGroup>(new DailyIssueAggregator(),
        (props.searchCondition as SearchCondition).baseDate,
        (props.searchCondition as SearchCondition).baseUser);

    useEffect(() => {
        console.log('called', data);
    }, [data]);

    if (!loading && data.length === 0) return <></>;

    return (
        <div>
            { loading ?
                <div>
                    <SuccessProgressBar ariaLabel="loading" isIndeterminate />
                    <p>불러오는 중입니다...</p>
                </div>
                :
                <div>
                    <DailyReportTable baseDate={(props.searchCondition as SearchCondition).baseDate} data={data} />
                </div>
            }
        </div>
    )
}