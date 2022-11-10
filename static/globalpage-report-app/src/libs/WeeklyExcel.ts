import * as Excel from 'exceljs';
import {saveAs} from 'file-saver';
import FetchIssuesSupport from './FetchIssuesSupport';
import {ProjectGroup} from './IssueAggregatorSupport';
import {ExcelDisplay} from '../definitions/Report';

export default class WeeklyExcel {
    save(baseDate:string, data:ExcelDisplay[] | null) {
        // # 날짜 가져옴
        const {thisStartWeek, thisEndWeek, nextStartWeek, nextEndWeek} = FetchIssuesSupport.makeBaseAllWeekDate(baseDate);

        // # Excel 객체 생성
        const wb = new Excel.Workbook();

        // # 메타 정보 입력
        wb.creator = 'gabia';
        wb.lastModifiedBy = 'gabia';
        wb.created = new Date();
        wb.modified = new Date();

        // # 시트 추가
        const sheet = wb.addWorksheet('주간보고');

        // # 컬럼 간격 수정
        sheet.getColumn(1).width = 70;
        sheet.getColumn(2).width = 70;

        // # 데이터 설정
        // 제목
        sheet.mergeCells('A1', 'B1');
        sheet.getCell('A1').value = '주간 이슈 보고서'
        sheet.getCell('A1').font = { name: '맑은 고딕', bold: true };
        sheet.getCell('A1').border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' },
        };
        sheet.getCell('A1').alignment = { horizontal: 'center' };

        // 머리
        const headerRowThisWeek = sheet.getCell('A2');
        headerRowThisWeek.value = `이번 주 이슈 현황(${thisStartWeek}~${thisEndWeek})`;
        headerRowThisWeek.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'fffcd5b4' },
        };
        headerRowThisWeek.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' },
        };
        headerRowThisWeek.font = {
            bold: true,
        };
        headerRowThisWeek.alignment = {
            horizontal: 'center',
        };
        const headerRowNextWeek = sheet.getCell('B2');
        headerRowNextWeek.value = `다음 주 이슈 현황(${nextStartWeek}~${nextEndWeek})`;
        headerRowNextWeek.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'ffccefff' },
        };
        headerRowNextWeek.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' },
        };
        headerRowNextWeek.font = {
            bold: true,
        };
        headerRowNextWeek.alignment = {
            horizontal: 'center',
        };

        data?.forEach(d => {
            const row = sheet.addRow([d.thisWeekValue, d.nextWeekValue]);
            const thisWeek = row.getCell(1)
                , nextWeek = row.getCell(2);
            thisWeek.border = {
                left: { style: 'thin' },
                right: { style: 'thin' },
            };
            nextWeek.border = {
                left: { style: 'thin' },
                right: { style: 'thin' },
            };
            if (['project', 'epic'].indexOf(d.thisWeekCategory) > -1) {
                if ('project' === d.thisWeekCategory) {
                    thisWeek.border.top = {
                        style: 'thin'
                    };
                }
                thisWeek.font = {
                    bold: true,
                };
                thisWeek.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'project' === d.thisWeekCategory ? 'ffd9d9d9' : 'ffebebeb' },
                };
            }
            if (['project', 'epic'].indexOf(d.nextWeekCategory) > -1) {
                if ('project' === d.nextWeekCategory) {
                    nextWeek.border.top = {
                        style: 'thin'
                    };
                }
                nextWeek.font = {
                    bold: true,
                };
                nextWeek.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'project' === d.nextWeekCategory ? 'ffd9d9d9' : 'ffebebeb' },
                };
            }
        });

        const rows:any = sheet.getColumn(1);
        const rowsCount = rows['_worksheet']['_rows'].length;

        // 푸터
        const lastRowNum = rowsCount + 1;
        sheet.mergeCells(`A${lastRowNum}`, `B${lastRowNum}`);
        sheet.getCell(`A${lastRowNum}`).border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' },
        };
        sheet.mergeCells(`A${lastRowNum+1}`, `B${lastRowNum+1}`);
        sheet.getCell(`A${lastRowNum+1}`).value = '특이사항';
        sheet.getCell(`A${lastRowNum+1}`).font = { name: '맑은 고딕', bold: true };
        sheet.getCell(`A${lastRowNum+1}`).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'ffd9d9d9' },
        };
        sheet.getCell(`A${lastRowNum+1}`).border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' },
        };

        wb.xlsx.writeBuffer().then((data:any) => {
            const blob = new Blob([data], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
            const url = window.URL.createObjectURL(blob);
            const anchor = document.createElement('a');
            anchor.href = url;
            // 파일명
            anchor.download = `주간업무보고.xlsx`;
            anchor.click();
            window.URL.revokeObjectURL(url);
        });
    }

    static makeDisplayData(data:ProjectGroup[]) {
        // 전체 줄을 계산한다.
        const allRows = data.reduce((a, b) => a + b.totalDepth, 0);
        // allData[allRows] 배열 생성
        const allData:ExcelDisplay[] = Array.from(Array(allRows), () => ({
            thisWeekValue: ' ',
            thisWeekStyle: '',
            thisWeekCategory: '',
            nextWeekValue: ' ',
            nextWeekStyle: '',
            nextWeekCategory: '',
        }));

        let leftIdx = 0, rightIdx = 0;
        for (const project of data) {
            if (!project.epicChildren || project.epicChildren.length <= 0) continue;

            // 프로젝트 이름
            if (project.epicChildren.some(epic => epic.thisWeekChildren.length > 0)) {
                allData[leftIdx].thisWeekValue = `[${project.name}]`;
                allData[leftIdx].thisWeekStyle = ' project-title-space';
                allData[leftIdx].thisWeekCategory = 'project';
            }
            if (project.epicChildren.some(epic => epic.nextWeekChildren.length > 0)) {
                allData[rightIdx].nextWeekValue = `[${project.name}]`;
                allData[rightIdx].nextWeekStyle = ' project-title-space';
                allData[rightIdx].nextWeekCategory = 'project';
            }
            leftIdx++;
            rightIdx++;

            // 에픽 이름
            for (const epic of project.epicChildren) {
                // 이번 주
                if (epic.thisWeekChildren && epic.thisWeekChildren.length > 0) {
                    allData[leftIdx].thisWeekValue = epic.name;
                    allData[leftIdx].thisWeekStyle = ' epic-title-space';
                    allData[leftIdx].thisWeekCategory = 'epic';
                    leftIdx++;

                    // 작업 이름
                    for (const task of epic.thisWeekChildren) {
                        allData[leftIdx].thisWeekValue = `[${task.issue.fields.issuetype.name}] [${task.issue.fields.assignee?.displayName}] ${task.issue.fields.summary} [${task.issue.fields.duedate ? task.issue.fields.duedate : ''}]: ${task.issue.fields.status.name}`;
                        allData[leftIdx].thisWeekStyle = ' task-title-space';
                        allData[leftIdx].thisWeekCategory = 'task';
                        leftIdx++;
                        // 하위 작업 이름
                        for (const subTask of task.childs) {
                            allData[leftIdx].thisWeekValue = `ㄴ [${subTask.issue.fields.assignee?.displayName}] ${subTask.issue.fields.summary} [${subTask.issue.fields.duedate ? subTask.issue.fields.duedate : ''}]: ${subTask.issue.fields.status.name}`;
                            allData[leftIdx].thisWeekStyle = ' subtask-title-space';
                            allData[leftIdx].thisWeekCategory = 'subtask';
                            leftIdx++;
                        }
                    }
                }
                // 다음 주
                if (epic.nextWeekChildren && epic.nextWeekChildren.length > 0) {
                    allData[rightIdx].nextWeekValue = epic.name;
                    allData[rightIdx].nextWeekStyle = ' epic-title-space';
                    allData[rightIdx].nextWeekCategory = 'epic';
                    rightIdx++;

                    // 작업 이름
                    for (const task of epic.nextWeekChildren) {
                        allData[rightIdx].nextWeekValue = `[${task.issue.fields.issuetype.name}] [${task.issue.fields.assignee?.displayName}] ${task.issue.fields.summary} [${task.issue.fields.duedate ? task.issue.fields.duedate : ''}]: ${task.issue.fields.status.name}`;
                        allData[rightIdx].nextWeekStyle = ' task-title-space';
                        allData[rightIdx].nextWeekCategory = 'task';
                        rightIdx++;
                        // 하위 작업 이름
                        for (const subTask of task.childs) {
                            allData[rightIdx].nextWeekValue = `ㄴ [${subTask.issue.fields.assignee?.displayName}] ${subTask.issue.fields.summary} [${subTask.issue.fields.duedate ? subTask.issue.fields.duedate : ''}]: ${subTask.issue.fields.status.name}`;
                            allData[rightIdx].nextWeekStyle = ' subtask-title-space';
                            allData[rightIdx].nextWeekCategory = 'subtask';
                            rightIdx++;
                        }
                    }
                }
                const maxIdx = Math.max(leftIdx, rightIdx);
                leftIdx = maxIdx;
                rightIdx = maxIdx;
            }
        }

        return allData;
    }
}