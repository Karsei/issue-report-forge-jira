import React, {useState} from 'react';
import Tabs, { Tab, TabList, TabPanel } from '@atlaskit/tabs';
import ReportSearchForm from './components/ReportSearchForm';
import ReportSettingForm from './components/ReportSettingForm';
import WeeklyReport from './components/WeeklyReport';
import DailyReport from './components/DailyReport';

import {SearchCondition} from './definitions/SearchFormTypes';

function App() {
    const [weeklyCondition, setWeeklyCondition] = useState<SearchCondition | unknown>(null);
    const [dailyCondition, setDailyCondition] = useState<SearchCondition | unknown>(null);

    return (
        <div>
            <Tabs id={'default'} onChange={(index) => console.log('selected tab', index + 1)}>
                <TabList>
                    <Tab>주간 이슈 보고</Tab>
                    <Tab>일일 이슈 보고</Tab>
                    <Tab>설정</Tab>
                </TabList>
                <TabPanel>
                    <div className={'report-wrapper'}>
                        <ReportSearchForm onCondition={setWeeklyCondition} />
                        { weeklyCondition ? <WeeklyReport searchCondition={weeklyCondition} /> : null }
                    </div>
                </TabPanel>
                <TabPanel>
                    <div className={'report-wrapper'}>
                        <ReportSearchForm onCondition={setDailyCondition} />
                        { dailyCondition ? <DailyReport searchCondition={dailyCondition} /> : null }
                    </div>
                </TabPanel>
                <TabPanel>
                    <div className={'report-wrapper'}>
                        <ReportSettingForm />
                    </div>
                </TabPanel>
            </Tabs>
        </div>
    );
}

export default App;
