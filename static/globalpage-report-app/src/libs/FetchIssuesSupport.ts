import moment from 'moment';
import {invoke} from '@forge/bridge';
import {Option} from '../types/SearchFormTypes';
import {AllBaseWeek} from '../types/Report';
import {SearchJQLRequest, SearchJQLResponse} from '../types/hooks/SearchJQL';
import {Issue} from '../types/Issue';

export default class FetchIssuesSupport {
    static async getIssues(searchOption: SearchJQLRequest):Promise<Issue[]> {
        let list:Issue[] = [];
        try {
            const res:SearchJQLResponse = await invoke('getIssuesByJql', searchOption);
            if (res.maxResults < res.total) {
                if (res.issues.length >= res.maxResults) {
                    const _res = await FetchIssuesSupport.getIssues({
                        ...searchOption,
                        startAt: searchOption.startAt ? searchOption.startAt + res.maxResults : res.maxResults,
                    });
                    list = [
                        ...res.issues,
                        ..._res,
                    ]
                }
                else {
                    list = res.issues;
                }
            }
            else {
                list = res.issues;
            }
        }
        catch (err: any) {
            throw new Error(`이슈를 조회하는 과정에서 기타 오류가 발생했습니다: ${err.errorMessages && err.errorMessages.length > 0 ? err.errorMessages[0] : err.status}`);
        }
        return list;
    }

    static makeWeeklySearchQuery(date:string, users:Option[]) {
        return {
            jql: {
                thisWeek: this.makeWeeklyJql(date, users),
                nextWeek: this.makeWeeklyJql(moment(date).add(7, 'days').format('YYYY-MM-DD'), users),
            },
            common: {
                startAt: 0,
                maxResults: 100,
                fields: [
                    '*navigable',
                    '-comment',
                    '-description',
                ],
            },
        }
    }

    static makeDailySearchQuery(date:string, users:Option[]) {
        return {
            jql: {
                thisDay: this.makeDailyJql(date, users),
            },
            common: {
                startAt: 0,
                maxResults: 100,
                fields: [
                    '*navigable',
                    'comment',
                    '-description',
                ],
            },
        }
    }

    private static makeWeeklyJql(date:string, users:Option[]) {
        const baseDate = this.makeBaseWeekDate(date)
            , baseUser = users.map(user => user.value).join(', ');
        return `assignee in (${baseUser}) AND issuetype not in (에픽) AND `
            + `(`
            + `("Start date[Date]" >= ${baseDate.startWeek} AND "Start date[Date]" <= ${baseDate.endWeek}) `
            + `OR (duedate >= ${baseDate.startWeek} AND duedate <= ${baseDate.endWeek}) `
            + `OR ("Start date[Date]" < ${baseDate.startWeek} AND duedate > ${baseDate.endWeek}) `
            + `) `
            //+ `AND status changed during (${baseDate.startWeek}, ${baseDate.endWeek}) `
            + `ORDER BY "Epic Link", priority, Rank`;
    }

    static makeBaseWeekDate(date:string) {
        return {
            startWeek: moment(date).startOf('week').format("YYYY-MM-DD"),
            endWeek: moment(date).endOf('week').format("YYYY-MM-DD"),
        };
    }

    static makeBaseAllWeekDate(date:string): AllBaseWeek {
        return {
            thisStartWeek: moment(date).startOf('week').format("YYYY-MM-DD"),
            thisEndWeek: moment(date).endOf('week').format("YYYY-MM-DD"),
            nextStartWeek: moment(date).startOf('week').add(7, 'days').format('YYYY-MM-DD'),
            nextEndWeek: moment(date).endOf('week').add(7, 'days').format('YYYY-MM-DD'),
        };
    }

    private static makeDailyJql(date:string, users:Option[]) {
        const baseDate = date
            , baseUser = users.map(user => user.value).join(', ');
        return `assignee in (${baseUser}) AND issuetype not in (에픽) AND `
            + `(`
            + `("Start date[Date]" >= ${baseDate} AND "Start date[Date]" <= ${baseDate}) `
            + `OR (duedate >= ${baseDate} AND duedate <= ${baseDate}) `
            + `OR ("Start date[Date]" < ${baseDate} AND duedate > ${baseDate}) `
            + `) `
            //+ `AND status changed during (${baseDate.startWeek}, ${baseDate.endWeek}) `
            + `ORDER BY "Epic Link", priority, Rank`;
    }
}