import moment from 'moment';
import {invoke} from '@forge/bridge';
import {Comment, Issue, IssueFieldPerson} from '../types/Issue';
import {Option} from '../types/SearchFormTypes';
import FetchIssuesSupport from './FetchIssuesSupport';

export interface IssueAggregator {
    init(baseDate:string, baseUser:Option[]): any;
}

export interface ProjectGroup {
    id: string,
    name: string,
    epicChildren: EpicHash[] | null,
    totalDepth: number,
}

interface ProjectHashGroup {
    [projectId:string]: ProjectHash,
}

interface ProjectHash {
    id: string,
    name: string,
    childs: EpicHash[],
}

interface EpicHashGroup {
    [epicId:string]: EpicHash
}

interface EpicHash {
    id: string,
    name: string,
    projectId: string,
    thisWeekChildren: IssueHash[],
    nextWeekChildren: IssueHash[],
}

interface IssueHashGroup {
    [issueId:string]: IssueHash,
}

interface IssueHash {
    id: string,
    issueType: string,
    issue: Issue,
    childs: IssueHash[],
}

interface UniqueIdsGroup {
    project: string[],
    epic: string[],
    task: string[],
    subTask: string[],
    subTaskParent: string[],
}

// const epicLinkKey = 'customfield_10014';
const epicTypeId = '10000'
    , taskTypeId = '10046';

export class WeeklyIssueAggregator implements IssueAggregator {
    async init(baseDate:string, baseUser:Option[]) {
        // # 주간 보고 이슈 조회
        const {thisWeek, nextWeek} = await this.getWeeklyIssuesFromJira(baseDate, baseUser);

        // # 병합
        const allIssues = this.mergeIssues(thisWeek, nextWeek);

        // # 누락된 이슈 찾기
        // 그룹으로 나누고 누락된 '작업' 이슈들을 찾아 다시 그룹에 넣는다.
        // '작업' 이슈엔 'subtask' 키가 있으나 startdate, duedate 가 영향을 받지 않는다.
        const issueGroup = this.makeGroupIdsByType(allIssues);
        await this.updateNonExistTasks(issueGroup, thisWeek, nextWeek);

        // # 트리 생성
        const weekProject = this.makeTree(thisWeek, nextWeek);

        // # 프로젝트를 기준으로 이번 주와 다음 주로 나누고 최대 행을 구한다.
        return this.makeTotalDisplayDepth(issueGroup, weekProject);
    }

    private async getWeeklyIssuesFromJira(baseDate:string, baseUser:Option[]) {
        const query = FetchIssuesSupport.makeWeeklySearchQuery(baseDate, baseUser);
        const thisWeekList = await FetchIssuesSupport.getIssues({
            ...query.common,
            jql: query.jql.thisWeek,
        })
        const nextWeekList = await FetchIssuesSupport.getIssues({
            ...query.common,
            jql: query.jql.nextWeek,
        });

        return {
            thisWeek: thisWeekList,
            nextWeek: nextWeekList,
        };
    }

    private mergeIssues(thisWeek:Issue[], nextWeek:Issue[]) {
        return [
            ...thisWeek,
            ...nextWeek,
        ];
    }

    private makeGroupIdsByType(allIssues:Issue[]): UniqueIdsGroup {
        const project:string[] = [], epic:string[] = [], task:string[] = [], subTask:string[] = [], subTaskParent:string[] = [];

        for (const idx in allIssues) {
            // 프로젝트
            if (project.indexOf(allIssues[idx].fields.project.id) === -1) {
                project.push(allIssues[idx].fields.project.id);
            }
            // 작업
            if (WeeklyIssueAggregator.isTaskLevel(allIssues[idx]) && task.indexOf(allIssues[idx].id) === -1) {
                task.push(allIssues[idx].id);
                // 프로젝트별로 에픽이 없으니 프로젝트 키가 같이 들어가야 한다.
                const epicId = allIssues[idx].fields.parent ? allIssues[idx].fields.parent?.id || '' : `${allIssues[idx].fields.project.id}|unknown`;
                // 에픽
                if (epic.indexOf(epicId) === -1) {
                    epic.push(epicId);
                }
            }
            // 하위 작업
            else if (WeeklyIssueAggregator.isSubTaskLevel(allIssues[idx]) && subTask.indexOf(allIssues[idx].id) === -1) {
                subTask.push(allIssues[idx].id);
                // '하위 작업'의 부모
                const subTaskParentId = allIssues[idx].fields.parent && allIssues[idx].fields.parent?.id ? `${allIssues[idx].id}|${allIssues[idx].fields.parent?.id || ''}` : null;
                if (subTaskParentId && subTaskParent.indexOf(subTaskParentId) === -1) {
                    subTaskParent.push(subTaskParentId);
                }
            }
        }

        return {
            project,
            epic,
            task,
            subTask,
            subTaskParent,
        };
    }

    private async updateNonExistTasks(issueGroup: UniqueIdsGroup, thisWeek: Issue[], nextWeek: Issue[]) {
        const checkedNonTaskIds: string[] = [];
        const checkedNonTaskIssues: Issue[] = [];

        const nonTaskIds = this.findNonExistTaskWithSubTask(issueGroup.task, issueGroup.subTaskParent);
        if (nonTaskIds.length > 0) {
            for (const nonTaskId of nonTaskIds) {
                const sTask = nonTaskId.split('|')
                    , subTaskId = sTask[0]
                    , taskId = sTask[1];

                // 누락된 작업 ID 를 넣어서 대상에 포함시킨다.
                issueGroup.task.push(taskId);

                console.log('누락 작업 조회: ', taskId);
                let res: Issue | undefined;
                if (checkedNonTaskIds.indexOf(taskId) === -1) {
                    res = await this.getIssueFromJira(taskId);

                    // '에픽' 이면 '작업' 유형으로 가짜 데이터를 만든다.
                    if (WeeklyIssueAggregator.isEpicLevel(res)) {
                        res.fields.issuetype.id = taskTypeId;
                        res.fields.summary = `#${res.fields.summary}`;
                    }

                    checkedNonTaskIssues.push(res);
                    checkedNonTaskIds.push(taskId);
                } else {
                    for (const issue of checkedNonTaskIssues) {
                        if (issue.id === taskId) {
                            res = issue;
                            break;
                        }
                    }
                }
                if (!res) continue;

                const epicId = res.fields.parent ? res.fields.parent?.id || '' : `${res.fields.project.id}|unknown`;
                if (issueGroup.epic.indexOf(epicId) === -1) {
                    issueGroup.epic.push(epicId);
                } else {
                    console.log('이미 존재하는 Epic: ', epicId);
                }

                // 하위 이슈가 이번 주에 있었는지, 저번 주에 있었는지로 구분
                for (const issue of thisWeek) {
                    if (WeeklyIssueAggregator.isSubTaskLevel(issue) && issue.id === subTaskId) {
                        console.log('이번 주 이슈로 들어감: ', taskId);
                        thisWeek.push(res);
                        break;
                    }
                }
                for (const issue of nextWeek) {
                    if (WeeklyIssueAggregator.isSubTaskLevel(issue) && issue.id === subTaskId) {
                        console.log('다음 주 이슈로 들어감: ', taskId);
                        nextWeek.push(res);
                        break;
                    }
                }
            }
        }
    }

    private findNonExistTaskWithSubTask(taskIds:string[], subTaskParentIds:string[]) {
        const list:string[] = [];
        for (const parentTask of subTaskParentIds) {
            if (taskIds.indexOf(parentTask) === -1) list.push(parentTask);
        }
        return list;
    }

    private async getIssueFromJira(issueId:string):Promise<Issue> {
        try {
            return await invoke('getIssue', {issueId:issueId});
        } catch (err: any) {
            throw new Error(`추가 이슈를 조회하는 과정에서 오류가 발생했습니다: ${err.errorMessages && err.errorMessages.length > 0 ? err.errorMessages[0] : err.status}`);
        }
    }

    private makeTree(thisWeek:Issue[], nextWeek:Issue[]) {
        const {thisWeekTask, thisWeekSubTask, nextWeekTask, nextWeekSubTask} = this.makeWeekHashGroupByType(thisWeek, nextWeek);

        // '하위 작업' 이슈들의 부모('작업'/'에픽' 이슈)를 찾아 '하위 작업' 을 해당 부모의 자식으로 넣는다.
        for (const issueId of Object.keys(thisWeekSubTask)) {
            const parentId = thisWeekSubTask[issueId].issue.fields.parent?.id || '';
            thisWeekTask[parentId].childs.push(thisWeekSubTask[issueId]);
        }
        for (const issueId of Object.keys(nextWeekSubTask)) {
            const parentId = nextWeekSubTask[issueId].issue.fields.parent?.id || '';
            nextWeekTask[parentId].childs.push(nextWeekSubTask[issueId]);
        }

        // '작업' 이슈들의 부모('에픽' 이슈)를 찾아 '작업' 을 해당 부모의 자식으로 넣는다.
        const weekEpic:EpicHashGroup = {};
        const weekProject:ProjectHashGroup = {};
        for (const issueId of Object.keys(thisWeekTask)) {
            // 프로젝트는 에픽 탐색겸 미리 만들어둔다.
            const projectId = thisWeekTask[issueId].issue.fields.project.id;
            if (!weekProject.hasOwnProperty(projectId)) {
                weekProject[projectId] = {
                    id: projectId,
                    name: thisWeekTask[issueId].issue.fields.project.name,
                    childs: [],
                }
            }

            const epicId = thisWeekTask[issueId].issue.fields.parent ? thisWeekTask[issueId].issue.fields.parent?.id || '' : `${projectId}|unknown`;
            const epicName = thisWeekTask[issueId].issue.fields.parent ? thisWeekTask[issueId].issue.fields.parent?.fields.summary || '' : '기타';
            if (!weekEpic.hasOwnProperty(epicId)) {
                weekEpic[epicId] = {
                    id: epicId,
                    name: epicName,
                    projectId,
                    thisWeekChildren: [],
                    nextWeekChildren: [],
                }
            }
            weekEpic[epicId].thisWeekChildren.push(thisWeekTask[issueId]);
        }
        for (const issueId of Object.keys(nextWeekTask)) {
            const projectId = nextWeekTask[issueId].issue.fields.project.id;
            if (!weekProject.hasOwnProperty(projectId)) {
                weekProject[projectId] = {
                    id: projectId,
                    name: nextWeekTask[issueId].issue.fields.project.name,
                    childs: [],
                }
            }
            const epicId = nextWeekTask[issueId].issue.fields.parent ? nextWeekTask[issueId].issue.fields.parent?.id || '' : `${projectId}|unknown`;
            const epicName = nextWeekTask[issueId].issue.fields.parent ? nextWeekTask[issueId].issue.fields.parent?.fields.summary || '' : '기타';
            if (!weekEpic.hasOwnProperty(epicId)) {
                weekEpic[epicId] = {
                    id: epicId,
                    name: epicName,
                    projectId,
                    thisWeekChildren: [],
                    nextWeekChildren: [],
                }
            }
            weekEpic[epicId].nextWeekChildren.push(nextWeekTask[issueId]);
        }

        // '에픽' 이슈들의 부모('프로젝트')를 찾아 '에픽' 을 해당 부모의 자식으로 넣는다.
        for (const epicId of Object.keys(weekEpic)) {
            const projectId = weekEpic[epicId].projectId;
            weekProject[projectId].childs.push(weekEpic[epicId]);
        }

        return weekProject;
    }

    private makeWeekHashGroupByType(thisWeek:Issue[], nextWeek:Issue[]) {
        const thisWeekTaskHash:IssueHashGroup = {}
            , thisWeekSubTaskHash:IssueHashGroup = {}
            , nextWeekTaskHash:IssueHashGroup = {}
            , nextWeekSubTaskHash:IssueHashGroup = {};

        // 작업과 하위작업으로 나눈다.
        for (const issue of thisWeek) {
            if (WeeklyIssueAggregator.isTaskLevel(issue)) {
                thisWeekTaskHash[issue.id] = {
                    id: issue.id,
                    issueType: issue.fields.issuetype.id,
                    issue: issue,
                    childs: [],
                };
            }
            else if (WeeklyIssueAggregator.isSubTaskLevel(issue)) {
                thisWeekSubTaskHash[issue.id] = {
                    id: issue.id,
                    issueType: issue.fields.issuetype.id,
                    issue: issue,
                    childs: [],
                };
            }
        }
        for (const issue of nextWeek) {
            if (WeeklyIssueAggregator.isTaskLevel(issue)) {
                nextWeekTaskHash[issue.id] = {
                    id: issue.id,
                    issueType: issue.fields.issuetype.id,
                    issue: issue,
                    childs: [],
                };
            }
            else if (WeeklyIssueAggregator.isSubTaskLevel(issue)) {
                nextWeekSubTaskHash[issue.id] = {
                    id: issue.id,
                    issueType: issue.fields.issuetype.id,
                    issue: issue,
                    childs: [],
                };
            }
        }

        return {
            thisWeekTask: thisWeekTaskHash,
            thisWeekSubTask: thisWeekSubTaskHash,
            nextWeekTask: nextWeekTaskHash,
            nextWeekSubTask: nextWeekSubTaskHash,
        };
    }

    private makeTotalDisplayDepth(idsGroup:UniqueIdsGroup, weekProject:ProjectHashGroup) {
        const result:ProjectGroup[] = [];

        for (const projectId of idsGroup.project) {
            const wrapper:ProjectGroup = {
                id: projectId,
                name: weekProject[projectId].name,
                epicChildren: weekProject.hasOwnProperty(projectId) ? weekProject[projectId].childs : null,
                totalDepth: 0,
            };
            if (!wrapper.epicChildren || wrapper.epicChildren.length <= 0) continue;

            // 프로젝트명
            wrapper.totalDepth++;

            for (const epicId in wrapper.epicChildren) {
                let thisWeekCnt = 0, nextWeekCnt = 0;
                if (wrapper.epicChildren[epicId].thisWeekChildren) {
                    // 에픽명
                    thisWeekCnt++;
                    for (const epicChild of wrapper.epicChildren[epicId].thisWeekChildren) {
                        // 작업명
                        thisWeekCnt++;
                        for (const taskChild of epicChild.childs) {
                            // 하위 작업명
                            thisWeekCnt++;
                        }
                    }
                }
                if (wrapper.epicChildren[epicId].nextWeekChildren) {
                    // 에픽명
                    nextWeekCnt++;
                    for (const epicChild of wrapper.epicChildren[epicId].nextWeekChildren) {
                        // 작업명
                        nextWeekCnt++;
                        for (const taskChild of epicChild.childs) {
                            // 하위 작업명
                            nextWeekCnt++;
                        }
                    }
                }
                wrapper.totalDepth += Math.max(thisWeekCnt, nextWeekCnt);
            }

            result.push(wrapper);
        }

        return result;
    }

    private static isEpicLevel(issue:Issue) {
        return issue.fields.issuetype && issue.fields.issuetype.id === epicTypeId;
    }

    private static isTaskLevel(issue:Issue) {
        return issue.fields.issuetype && issue.fields.issuetype.id !== epicTypeId && !issue.fields.issuetype.subtask;
    }

    private static isSubTaskLevel(issue:Issue) {
        return issue.fields.issuetype && issue.fields.issuetype.id !== epicTypeId && issue.fields.issuetype.subtask;
    }
}

export interface CommentGroupIssues {
    issue: Issue,
    comment: Comment,
}

export interface UserCommentGroup {
    user: IssueFieldPerson,
    children: CommentGroupIssues[],
}

export class DailyIssueAggregator implements IssueAggregator {
    async init(baseDate:string, baseUser:Option[]) {
        // # 일별 보고 이슈 조회
        const { allIssues } = await this.getIssuesFromJira(baseDate, baseUser);

        // # 각 이슈별로 해당 날짜의 댓글이 있으면 해당 댓글을 가져온다.
        const filteredIssues = this.filterComments(baseDate, allIssues);

        // # 사용자별로 나눈다.
        const groupedIssues = this.makeGroupIssueByUser(filteredIssues, baseUser);

        return groupedIssues;
    }

    private async getIssuesFromJira(baseDate:string, baseUser:Option[]) {
        const query = FetchIssuesSupport.makeDailySearchQuery(baseDate, baseUser);
        const allIssues = await FetchIssuesSupport.getIssues({
            ...query.common,
            jql: query.jql.thisDay,
        });

        return {
            allIssues
        };
    }

    private filterComments(baseDate:string, allIssues:Issue[]):CommentGroupIssues[] {
        const filtered:CommentGroupIssues[] = [];

        for (const issueIdx in allIssues) {
            // 댓글이 없으면 조회하지 않음
            if (!allIssues[issueIdx].fields.comment || allIssues[issueIdx].fields.comment == undefined) continue;
            if (allIssues[issueIdx].fields.comment!.comments.length <= 0) continue;

            // 댓글 확인
            for (const commentIdx in allIssues[issueIdx].fields.comment!.comments) {
                // 조회하려는 날짜와 맞아야 함
                const commentDate = moment(allIssues[issueIdx].fields.comment!.comments[commentIdx].created).format('YYYY-MM-DD');
                if (baseDate !== commentDate) continue;

                // '#보고#' 라는 단어가 있어야 함
                const comment = allIssues[issueIdx].fields.comment!.comments[commentIdx].body.content[0].content[0].text;
                if (comment == undefined || comment.indexOf('#보고#') === -1) continue;

                filtered.push({
                    issue: allIssues[issueIdx],
                    comment: allIssues[issueIdx].fields.comment!.comments[commentIdx],
                });
            }
        }

        return filtered;
    }

    private makeGroupIssueByUser(issueGroups:CommentGroupIssues[], users:Option[]):UserCommentGroup[] {
        const userHash:{[idx: string]: {user: IssueFieldPerson, children: CommentGroupIssues[]}} = {};
        for (const userIdx in users) {
            for (const issueIdx in issueGroups) {
                // 담당자가 존재해야 함
                if (!issueGroups[issueIdx].issue.fields.assignee) continue;
                // 담당자와 조회 대상 사람과 일치해야 함
                if (users[userIdx].value !== issueGroups[issueIdx].issue.fields.assignee!.accountId) continue;

                if (!userHash.hasOwnProperty(users[userIdx].value)) {
                    userHash[users[userIdx].value] = {
                        user: issueGroups[issueIdx].issue.fields.assignee!,
                        children: [],
                    }
                }
                userHash[users[userIdx].value].children.push(issueGroups[issueIdx]);
            }
        }

        return Object.keys(userHash).map(idx => userHash[idx]);
    }
}