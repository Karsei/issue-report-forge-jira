import React, {useEffect} from 'react';
import {SuccessProgressBar} from '@atlaskit/progress-bar';
import {WeeklyIssueAggregator, ProjectGroup} from '../libs/IssueAggregatorSupport';
import {SearchCondition} from '../types/SearchFormTypes';
import useFetchIssues from '../hooks/UseFetchIssues'
import WeeklyReportTable from './WeeklyReportTable';

export interface ExcelReportProps {
    searchCondition: SearchCondition | unknown
}

export default function WeeklyReport(props:ExcelReportProps) {
    const {error, data, loading} = useFetchIssues<ProjectGroup>(new WeeklyIssueAggregator(),
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
                    <WeeklyReportTable baseDate={(props.searchCondition as SearchCondition).baseDate} data={data} />
                </div>
            }
        </div>
    )
}