// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useState} from 'react';
import styled, {css} from 'styled-components';
import classNames from 'classnames';
import {useIntl} from 'react-intl';
import {CSSTransition} from 'react-transition-group';
import {offset, useFloating} from '@floating-ui/react-dom';
import {
    CheckIcon,
    ChevronDownIcon,
    FormatHeader1Icon,
    FormatHeader2Icon,
    FormatHeader3Icon,
    FormatHeader4Icon,
    FormatHeader5Icon,
    FormatHeader6Icon,
    FormatLetterCaseIcon,
} from '@mattermost/compass-icons/components';
import type {Editor} from '@tiptap/react';

import {t} from 'utils/i18n';

import {KEYBOARD_SHORTCUTS} from 'components/keyboard_shortcuts/keyboard_shortcuts_sequence';

import type {WithRequired} from '@mattermost/types/utilities';

import ToolbarControl, {
    FloatingContainer,
    DropdownContainer,
} from '../toolbar_controls';
import type {ToolDefinition} from '../toolbar_controls';
import {useGetLatest} from '../toolbar_hooks';

type HeadingToolDefinition = WithRequired<ToolDefinition<MarkdownHeadingMode, MarkdownHeadingType>, 'labelDescriptor'>;

export type MarkdownHeadingMode =
    | 'p'
    | 'h1'
    | 'h2'
    | 'h3'
    | 'h4'
    | 'h5'
    | 'h6';

export type MarkdownHeadingType =
    | 'setParagraph'
    | 'toggleHeading';

const makeHeadingToolDefinitions = (editor: Editor): HeadingToolDefinition[] => [
    {
        mode: 'p',
        type: 'setParagraph',
        icon: FormatLetterCaseIcon,
        labelDescriptor: {id: t('wysiwyg.tool-label.paragraph.label'), defaultMessage: 'Normal text'},
        ariaLabelDescriptor: {id: t('accessibility.button.paragraph'), defaultMessage: 'normal text'},
        shortcutDescriptor: KEYBOARD_SHORTCUTS.msgMarkdownP,
        action: () => editor.chain().focus().setParagraph().run(),
        isActive: () => editor.isActive('paragraph'),
    },
    {
        mode: 'h1',
        type: 'toggleHeading',
        icon: FormatHeader1Icon,
        labelDescriptor: {id: t('wysiwyg.tool-label.heading1.label'), defaultMessage: 'Heading 1'},
        ariaLabelDescriptor: {id: t('accessibility.button.heading1'), defaultMessage: 'heading 1'},
        shortcutDescriptor: KEYBOARD_SHORTCUTS.msgMarkdownH1,
        action: () => editor.chain().focus().toggleHeading({level: 1}).run(),
        isActive: () => editor.isActive('heading', {level: 1}),
    },
    {
        mode: 'h2',
        type: 'toggleHeading',
        icon: FormatHeader2Icon,
        labelDescriptor: {id: t('wysiwyg.tool-label.heading2.label'), defaultMessage: 'Heading 2'},
        ariaLabelDescriptor: {id: t('accessibility.button.heading2'), defaultMessage: 'heading 2'},
        shortcutDescriptor: KEYBOARD_SHORTCUTS.msgMarkdownH2,
        action: () => editor.chain().focus().toggleHeading({level: 2}).run(),
        isActive: () => editor.isActive('heading', {level: 2}),
    },
    {
        mode: 'h3',
        type: 'toggleHeading',
        icon: FormatHeader3Icon,
        labelDescriptor: {id: t('wysiwyg.tool-label.heading3.label'), defaultMessage: 'Heading 3'},
        ariaLabelDescriptor: {id: t('accessibility.button.heading3'), defaultMessage: 'heading 3'},
        shortcutDescriptor: KEYBOARD_SHORTCUTS.msgMarkdownH3,
        action: () => editor.chain().focus().toggleHeading({level: 3}).run(),
        isActive: () => editor.isActive('heading', {level: 3}),
    },
    {
        mode: 'h4',
        type: 'toggleHeading',
        icon: FormatHeader4Icon,
        labelDescriptor: {id: t('wysiwyg.tool-label.heading4.label'), defaultMessage: 'Heading 4'},
        ariaLabelDescriptor: {id: t('accessibility.button.heading4'), defaultMessage: 'heading 4'},
        shortcutDescriptor: KEYBOARD_SHORTCUTS.msgMarkdownH4,
        action: () => editor.chain().focus().toggleHeading({level: 4}).run(),
        isActive: () => editor.isActive('heading', {level: 4}),
    },
    {
        mode: 'h5',
        type: 'toggleHeading',
        icon: FormatHeader5Icon,
        labelDescriptor: {id: t('wysiwyg.tool-label.heading5.label'), defaultMessage: 'Heading 5'},
        ariaLabelDescriptor: {id: t('accessibility.button.heading5'), defaultMessage: 'heading 5'},
        shortcutDescriptor: KEYBOARD_SHORTCUTS.msgMarkdownH5,
        action: () => editor.chain().focus().toggleHeading({level: 5}).run(),
        isActive: () => editor.isActive('heading', {level: 5}),
    },
    {
        mode: 'h6',
        type: 'toggleHeading',
        icon: FormatHeader6Icon,
        labelDescriptor: {id: t('wysiwyg.tool-label.heading6.label'), defaultMessage: 'Heading 6'},
        ariaLabelDescriptor: {id: t('accessibility.button.heading6'), defaultMessage: 'heading 6'},
        shortcutDescriptor: KEYBOARD_SHORTCUTS.msgMarkdownH6,
        action: () => editor.chain().focus().toggleHeading({level: 6}).run(),
        isActive: () => editor.isActive('heading', {level: 6}),
    },
];

const HeadingDropdownButton = styled(DropdownContainer)(({useIcon}: {useIcon: boolean}) => css`
    min-width: ${useIcon ? 'auto' : '120px'};
    justify-content: space-between;
    font-weight: 600;
`);

const HeadingControls = ({editor, useIcon}: {editor: Editor; useIcon: boolean}) => {
    const {formatMessage} = useIntl();
    const [showHeadingControls, setShowHeadingControls] = useState(false);

    const headingToolDefinitions = makeHeadingToolDefinitions(editor);

    const {x, y, reference, floating, strategy, update, refs: {reference: buttonRef, floating: floatingRef}} = useFloating<HTMLButtonElement>({
        placement: 'top-start',
        middleware: [offset({mainAxis: 4})],
    });

    // this little helper hook always returns the latest refs and does not mess with the floatingUI placement calculation
    const getLatest = useGetLatest({
        showHeadingControls,
        buttonRef,
        floatingRef,
    });

    useEffect(() => {
        const handleClickOutside: EventListener = (event) => {
            event.stopPropagation();
            const {floatingRef, buttonRef} = getLatest();
            const target = event.composedPath?.()?.[0] || event.target;
            if (target instanceof Node) {
                if (
                    floatingRef !== null &&
                    buttonRef !== null &&
                    !floatingRef.current?.contains(target) &&
                    !buttonRef.current?.contains(target)
                ) {
                    setShowHeadingControls(false);
                }
            }
        };

        document.addEventListener('mousedown', handleClickOutside);

        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [getLatest]);

    useEffect(() => {
        update?.();
    }, [update, useIcon]);

    const toggleHeadingControls = useCallback((event?) => {
        event?.preventDefault();
        setShowHeadingControls(!showHeadingControls);
    }, [showHeadingControls]);

    const hiddenControlsContainerStyles: React.CSSProperties = {
        position: strategy,
        top: y ?? 0,
        left: x ?? 0,
    };

    const {level = 0} = editor.getAttributes('heading');
    const {icon: Icon, labelDescriptor} = headingToolDefinitions[level];

    const codeBlockModeIsActive = editor.isActive('codeBlock');

    return (
        <>
            <HeadingDropdownButton
                id={'HiddenControlsButton' + location}
                ref={reference}
                className={classNames({active: showHeadingControls})}
                onClick={toggleHeadingControls}
                aria-label={formatMessage({id: 'accessibility.button.formatting', defaultMessage: 'formatting'})}
                disabled={codeBlockModeIsActive}
                useIcon={useIcon}
            >
                {useIcon ? <Icon size={18}/> : (
                    <>
                        {formatMessage(labelDescriptor)}
                        <ChevronDownIcon
                            color={'currentColor'}
                            size={18}
                        />
                    </>
                )}
            </HeadingDropdownButton>
            <CSSTransition
                timeout={250}
                classNames='scale'
                in={showHeadingControls}
            >
                <FloatingContainer
                    ref={floating}
                    style={hiddenControlsContainerStyles}
                    compact={useIcon}
                >
                    {useIcon ? (
                        <HeadingControlsCompact>
                            {headingToolDefinitions.map((control) => (
                                <ToolbarControl
                                    key={`${control.type}_${control.mode}`}
                                    mode={control.mode}
                                    className={classNames({active: control.isActive?.()})}
                                    onClick={() => {
                                        control.action();
                                        setShowHeadingControls(false);
                                    }}
                                    Icon={control.icon}
                                    aria-label={control.ariaLabelDescriptor ? formatMessage(control.ariaLabelDescriptor) : ''}
                                />
                            ))}
                        </HeadingControlsCompact>
                    ) : (
                        headingToolDefinitions.map((control) => {
                            return (
                                <HeadingSelectOption
                                    key={`${control.type}_${control.mode}`}
                                    mode={control.mode}
                                    active={control.isActive?.()}
                                    onClick={() => {
                                        control.action();
                                        setShowHeadingControls(false);
                                    }}
                                    label={formatMessage(control.labelDescriptor)}
                                    aria-label={control.ariaLabelDescriptor ? formatMessage(control.ariaLabelDescriptor) : ''}
                                />
                            );
                        })
                    )}
                </FloatingContainer>
            </CSSTransition></>
    );
};

type HeadingSelectOptionProps = {
    mode: MarkdownHeadingMode;
    active?: boolean;
    label: string;
    onClick: () => void;
}

const HeadingSelectOption = ({active, label, ...rest}: HeadingSelectOptionProps) => {
    return (
        <StyledHeadingSelectOption {...rest}>
            {label}
            {active && (
                <CheckIcon
                    size={24}
                    color={'rgba(var(--button-bg-rgb), 1)'}
                />
            )}
        </StyledHeadingSelectOption>
    );
};

const StyledHeadingSelectOption = styled.button(({mode}: {mode: HeadingSelectOptionProps['mode']}) => {
    const genericStyles = css`
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        padding: 8px 20px;
        min-width: 230px;
        background: transparent;
        border: none;
        appearance: none;

        &:hover {
            background: rgba(var(--center-channel-color-rgb), 0.08);
        }
    `;

    switch (mode) {
    case 'h1':
        return css`
            ${genericStyles};
            font-family: 'Metropolis', sans-serif;
            font-style: normal;
            font-weight: 600;
            font-size: 28px;
            line-height: 36px;
        `;
    case 'h2':
        return css`
            ${genericStyles};
            font-family: 'Metropolis', sans-serif;
            font-style: normal;
            font-weight: 600;
            font-size: 25px;
            line-height: 30px;
        `;
    case 'h3':
        return css`
            ${genericStyles};
            font-family: 'Metropolis', sans-serif;
            font-style: normal;
            font-weight: 600;
            font-size: 22px;
            line-height: 28px;
        `;
    case 'h4':
        return css`
            ${genericStyles};
            font-family: 'Metropolis', sans-serif;
            font-style: normal;
            font-weight: 600;
            font-size: 20px;
            line-height: 28px;
        `;
    case 'h5':
        return css`
            ${genericStyles};
            font-family: 'Metropolis', sans-serif;
            font-style: normal;
            font-weight: 600;
            font-size: 18px;
            line-height: 24px;
        `;
    case 'h6':
        return css`
            ${genericStyles};
            font-family: 'Metropolis', sans-serif;
            font-style: normal;
            font-weight: 600;
            font-size: 16px;
            line-height: 24px;
        `;
    case 'p':
    default:
        return css`
            ${genericStyles};
            font-family: 'Open Sans', sans-serif;
            font-style: normal;
            font-weight: 600;
            font-size: 14px;
            line-height: 20px;
        `;
    }
});

const HeadingControlsCompact = styled.div`
    display: flex;
    gap: 4px;
    flex-direction: row;
`;

export default HeadingControls;
