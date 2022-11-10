import React, {useCallback} from 'react';
import {router} from '@forge/bridge';
import TableTree from '@atlaskit/table-tree';
import {CommentGroupIssues, UserCommentGroup} from '../libs/IssueAggregatorSupport';
import {CommentBody} from '../types/Issue';

import './DailyReportTable.scss';

export interface DailyReportTableProps {
    baseDate: string,
    data: UserCommentGroup[],
}

export default function DailyReportTable(props: DailyReportTableProps) {
    const Project = useCallback((props: CommentGroupIssues) => {
        return <span className={'daily-data'}>{props.issue.fields.project.name}</span>;
    }, []);
    const Parent = useCallback((props: CommentGroupIssues) => {
        return (
            <span className={'daily-data'}>
                {props.issue.fields.parent?.fields.summary}
            </span>);
    }, []);
    const Summary = useCallback((props: CommentGroupIssues) => {
        return (
            <span className={'daily-data'}>
                <img src={props.issue.fields.issuetype.iconUrl} alt={props.issue.fields.issuetype.name} />
                {props.issue.fields.summary}
            </span>);
    }, []);
    const Comment = useCallback((props: CommentGroupIssues) => {
        return <span className={'daily-data'}>{makeComment(props.comment.body)}</span>;
    }, []);
    const IssueKey = useCallback((props: CommentGroupIssues) => {
        return (
            <span className={'daily-data'}>
                <a className={'issue-link'} onClick={() => router.open(`/browse/${props.issue.key}`)}>{props.issue.key}</a>
            </span>);
    }, []);

    const makeComment = useCallback((comment: CommentBody) => {
        const children:any[] = [];

        let str = '', confirmed = false;
        let linkBuf = false, breakBuf = false;
        for (const paragraphIdx in comment.content) {
            const insideChildren:any[] = [];

            // 단락
            if ('paragraph' === comment.content[paragraphIdx].type) {
                for (const textTypeIdx in comment.content[paragraphIdx].content) {
                    switch (comment.content[paragraphIdx].content[textTypeIdx].type) {
                        // 텍스트 (일반 텍스트 or 링크)
                        case 'text': {
                            // 처음 '#보고#' 가 나올 경우
                            let _text = comment.content[paragraphIdx].content[textTypeIdx].text;
                            if (_text.indexOf('#보고#') > -1) {
                                confirmed = true;
                                _text = _text.replaceAll(/^#보고#[ ]?(\n|\r|\r\n)?/gi, '').trim();

                                // 첫 단락에 '#보고#' 와 함께 내용이 있으면 바로 내용 추가
                                if (0 !== _text.length) {
                                    str += _text;
                                }
                            }
                            // '#보고#' 가 나온 직후 text 가 계속 이어지면 내용 추가
                            else if (confirmed && _text.trim().length > 0) {
                                str += _text;
                                // 현재 요소가 링크일 경우 이후에 줄바꿈을 하지 않는다.
                                if (comment.content[paragraphIdx].content[textTypeIdx].marks) {
                                    linkBuf = true;
                                }
                            }
                            break;
                        }
                        // 줄바꿈
                        case 'hardBreak': {
                            // 기존에 쌓인 문장이 있을 경우에만 줄바꿈을 처리한다.
                            if (str.length > 0) {
                                // 출력하고
                                const child = React.createElement('span', null, str);
                                insideChildren.push(child);
                                str = '';
                                // 줄바꿈
                                insideChildren.push(React.createElement('br'));
                                // 이후 문자열 생성 후 줄바꿈없이 바로 끝나게 될 경우 br 이 추가적으로 생기는 것을 방지한다.
                                breakBuf = true;
                            }
                            break;
                        }
                    }
                }
            }
            // 코드블럭
            else if ('codeBlock' === comment.content[paragraphIdx].type) {
                let _text = comment.content[paragraphIdx].content[0].text;
                _text = _text.replaceAll(/^#보고#[ ]?(\n|\r|\r\n)?/gi, '').trim();
                const _textArr = _text.split(/(\n|\r|\r\n)/gi);

                for (const textIdx in _textArr) {
                    if (_textArr[textIdx].trim().length <= 0) continue;
                    if (children.length > 0) {
                        children.push(React.createElement('br'));
                    }
                    const child = React.createElement('span', null, _textArr[textIdx]);
                    children.push(child);
                }
            }

            // 출력해야 할 문장이 남아있을 경우
            if (str.length > 0) {
                // 단락 종료 또는 단락 종료가 아닌 기존 단락 안에서 마지막에 문자가 계속 이어질 경우에만 줄바꿈을 한다.
                if (insideChildren.length > 0 && !linkBuf && !breakBuf) {
                    insideChildren.push(React.createElement('br'));
                }
                if (linkBuf) {
                    linkBuf = false;
                }
                // 기존에 쌓인 문자를 출력
                const child = React.createElement('span', null, str);
                insideChildren.push(child);
                str = '';
            }
            // 단락 종료
            if (insideChildren.length > 0) {
                children.push(React.createElement('p', null, insideChildren));
            }
        }

        return React.createElement('div', { className: 'daily-content' }, children);
    }, []);

    const makeItems = useCallback((data:CommentGroupIssues[]) => {
        return data.map(e => {
            return {
                id: e.issue.id,
                content: e,
                hasChildren: false,
                children: [],
            }
        });
    }, []);

    return (
        <div>
            { props.data.length > 0 && props.data.map(e => {
                return (
                    <div key={e.user.accountId} className={'daily-user-group'}>
                        <h1>{e.user.displayName}</h1>
                        <TableTree
                            headers={['프로젝트', '에픽/상위', '업무', '일일 업무 내용', '키']}
                            columns={[Project, Parent, Summary, Comment, IssueKey]}
                            columnWidths={['15%', '15%', '25%', '35%', '10%']}
                            items={makeItems(e.children)}
                        />
                    </div>
                )
            }) }
            { props.data.length <= 0 && <span>데이터가 없습니다.</span>}
        </div>
    )
}