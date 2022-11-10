import React, {Fragment, useCallback, useEffect, useState} from 'react';
import { invoke } from '@forge/bridge';
import Select, { OptionsType, ValueType as Value } from '@atlaskit/select';
import { LoadingButton } from '@atlaskit/button';
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

export default function ReportSettingForm() {
    const [users, setUsers] = useState<Array<Option>>([]);

    useEffect(() => {
        invoke('getUsers', {})
            .then((data: any) => {
                if (!data || data.hasOwnProperty('errorMessages')) {
                    console.error(data);
                } else {
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
    }, []);

    const onSubmitHandler = useCallback((formState: SearchCondition | unknown) => {
        const payload = {
            key: 'default-base-users',
            value: (formState as SearchCondition).baseUser.map(e => e.value)
        }
        invoke('setStorage', payload)
            .then((data: any) => {
                alert('성공적으로 저장되었습니다.');
            })
            .catch((err) => {
                console.error(err);
            });
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
                            <Field<Value<Option, true>>
                                name={'baseUser'}
                                label={'기준 팀원'}
                                isRequired
                                validate={validateUser}
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
                                            <HelperMessage>기본적으로 선택될 팀원을 골라주세요.</HelperMessage>
                                        )}
                                        {error === 'REQUIRED' && <ErrorMessage>이 항목을 입력해주세요.</ErrorMessage>}
                                    </Fragment>
                                )}
                            </Field>
                        </FormSection>
                        <FormFooter>
                            <LoadingButton type="submit" appearance="primary" isLoading={submitting}>
                                저장
                            </LoadingButton>
                        </FormFooter>
                    </form>
                )}
            </Form>
        </div>
    )
}