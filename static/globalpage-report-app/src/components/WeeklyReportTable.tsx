import React, {useEffect, useState} from 'react';
import Button from '@atlaskit/button';
import FetchIssuesSupport from '../libs/FetchIssuesSupport';
import {ProjectGroup} from '../libs/IssueAggregatorSupport';
import WeeklyExcel from '../libs/WeeklyExcel';
import {AllBaseWeek, ExcelDisplay} from '../definitions/Report';
import './WeeklyReportTable.scss';

export interface ExcelReportTableProps {
    baseDate: string,
    data: ProjectGroup[],
}

const WeeklyReportTable = function (props:ExcelReportTableProps) {
    const [data, setData] = useState<ExcelDisplay[] | null>([]);
    const [baseWeeks, setBaseWeeks] = useState<AllBaseWeek | null>();

    useEffect(() => {
        setBaseWeeks(FetchIssuesSupport.makeBaseAllWeekDate(props.baseDate));

        if (props.data.length > 0) {
            const displayData = WeeklyExcel.makeDisplayData(props.data);
            setData(displayData);
        }
    }, [props.baseDate, props.data]);

    const onClickHandler = function () {
        // window.print();
        const test = new WeeklyExcel();
        test.save(props.baseDate, data);
    };

    return (
        <div className={'excel-result-wrapper'}>
            <div className={'btn-dl-excel'}>
                <Button type='submit' appearance='primary' onClick={() => onClickHandler()}>
                    Excel 다운로드
                </Button>
            </div>
            <div id={'viewReport'} className={'excel-result'}>
                <table className={'gridlines'} cellSpacing={0} cellPadding={0}>
                    <colgroup>
                        <col className='col0' />
                        <col className='col1' />
                        <col className='col2' />
                        <col className='col3' />
                        <col className='col4' />
                        <col className='col5' />
                        <col className='col6' />
                    </colgroup>
                    <thead>
                        <tr className={'row'}>
                            <th className={'report-title'} colSpan={7}>주간 이슈 보고서</th>
                        </tr>
                        <tr className={'row'}>
                            <th className={'week-title'} colSpan={2}>이번 주 이슈 현황({baseWeeks?.thisStartWeek}~{baseWeeks?.thisEndWeek})</th>
                            <th className={'week-title'} colSpan={5}>다음 주 이슈 현황({baseWeeks?.nextStartWeek}~{baseWeeks?.nextEndWeek})</th>
                        </tr>
                    </thead>
                    <tbody>
                    {
                        data && data.map((element, idx) => {
                            return (
                                <tr className={'row'} key={idx}>
                                    <td className={`left-space common-space${element.thisWeekStyle ? element.thisWeekStyle : ''}`} colSpan={2}>{element.thisWeekValue}</td>
                                    <td className={`right-space common-space${element.nextWeekStyle ? element.nextWeekStyle : ''}`} colSpan={5}>{element.nextWeekValue}</td>
                                </tr>
                            )
                        })
                    }
                        <tr className={'row'}>
                            <td className={'blank-space'} colSpan={7}>&nbsp;</td>
                        </tr>
                        <tr className={'row'}>
                            <td className={'foot-space'} colSpan={7}>특이사항</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default WeeklyReportTable;
