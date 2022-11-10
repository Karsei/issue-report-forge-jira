import React, {Dispatch, Fragment, SetStateAction, useCallback, useEffect, useState} from 'react';
import { invoke } from '@forge/bridge';
import Select, { OptionsType, ValueType as Value } from '@atlaskit/select';
import { LoadingButton } from '@atlaskit/button';
import { DatePicker } from '@atlaskit/datetime-picker';
import Form, {
    ErrorMessage,
    Field,
    FormFooter,
    FormSection,
    HelperMessage,
    ValidMessage,
} from '@atlaskit/form';
import { Meta } from '@atlaskit/form/dist/types/field';
import { Option, User, SearchCondition } from '../definitions/SearchFormTypes';

export interface ReportSearchFormProps {
    onCondition: Dispatch<SetStateAction<SearchCondition | unknown>>
}

const ReportSearchForm = function (props:ReportSearchFormProps) {
    const [users, setUsers] = useState<Array<Option>>([]);
    const [defaultUsers, setDefaultUsers] = useState<Array<Option>>([]);

    useEffect(() => {
        const init = async () => {
            let defUsers:string[] = [];
            await invoke('getStorage', {key: 'default-base-users'})
                .then((data: any) => {
                    if (Array.isArray(data)) {
                        defUsers = data;
                    }
                })
                .catch((err) => {
                    console.error(err);
                    alert('팀원 기본값 조회에 실패하였습니다.');
                });
            await invoke('getUsers', {})
                .then((data: any) => {
                    if (!data || data.hasOwnProperty('errorMessages')) {
                        console.error(data);
                    } else {
                        const foundUsers:Option[] = [];
                        for (const defUser of defUsers) {
                            for (const userIdx in data) {
                                if (data[userIdx].accountId === defUser) {
                                    foundUsers.push({
                                        label: data[userIdx].displayName,
                                        value: data[userIdx].accountId,
                                    })
                                    break;
                                }
                            }
                        }
                        setDefaultUsers(foundUsers);
                        setUsers(
                            data.map((user: User) => ({
                                label: user.displayName,
                                value: user.accountId,
                            })),
                        );
                    }
                })
                .catch((err) => {
                    console.error(err);
                    alert('팀원 조회에 실패하였습니다.');
                });
        }
        init();

    }, []);

    const onSubmitHandler = useCallback((formState: SearchCondition | unknown) => {
        props.onCondition(formState);
    }, []);

    const validateDate = useCallback((value: string | undefined, formState: unknown, fieldState: Meta) => {
        if (!value) {
            return 'REQUIRED';
        }
    }, []);

    const validateUser = useCallback((value: OptionsType | undefined, formState: unknown, fieldState: Meta) => {
        if (!value || value.length === 0) {
            return 'REQUIRED';
        }
    }, []);

    return (
        <div style={{ padding: '20px' }}>
            <Form onSubmit={(formState: unknown) => onSubmitHandler(formState)}>
                {({ formProps, submitting }) => (
                    <form {...formProps}>
                        <FormSection>
                            <Field name={'baseDate'} label={'기준 날짜'} isRequired validate={validateDate}>
                                {({ fieldProps, error, valid, meta }) => (
                                    <Fragment>
                                        <DatePicker {...fieldProps} />
                                        {!error && valid && <ValidMessage>올바르게 입력되었습니다.</ValidMessage>}
                                        {!error && !valid && (
                                            <HelperMessage>보고에 포함될 기준 날짜를 선택하세요.</HelperMessage>
                                        )}
                                        {error === 'REQUIRED' && <ErrorMessage>이 항목을 입력해주세요.</ErrorMessage>}
                                    </Fragment>
                                )}
                            </Field>
                            <Field<Value<Option, true>>
                                name={'baseUser'}
                                label={'기준 팀원'}
                                isRequired
                                validate={validateUser}
                                defaultValue={defaultUsers}
                            >
                                {({ fieldProps: { id, ...rest }, error, valid }) => (
                                    <Fragment>
                                        <Select
                                            validationState={error ? 'error' : 'default'}
                                            inputId={id}
                                            {...rest}
                                            options={users}
                                            isMulti
                                            isLoading={users.length === 0}
                                        />
                                        {!error && valid && <ValidMessage>올바르게 선택되었습니다.</ValidMessage>}
                                        {!error && !valid && (
                                            <HelperMessage>보고에 포함될 팀원을 선택해주세요.</HelperMessage>
                                        )}
                                        {error === 'REQUIRED' && <ErrorMessage>이 항목을 입력해주세요.</ErrorMessage>}
                                    </Fragment>
                                )}
                            </Field>
                        </FormSection>
                        <FormFooter>
                            <LoadingButton type="submit" appearance="primary" isLoading={submitting}>
                                조회
                            </LoadingButton>
                        </FormFooter>
                    </form>
                )}
            </Form>
        </div>
    );
};

export default ReportSearchForm;
