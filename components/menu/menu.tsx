// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {ReactNode, useState, MouseEvent} from 'react';
import {useDispatch, useSelector} from 'react-redux';
import MuiMenu, {MenuProps as MuiMenuProps} from '@mui/material/Menu';
import MuiMenuList from '@mui/material/MenuList';
import {styled as muiStyled} from '@mui/material/styles';

import {getTheme} from 'mattermost-redux/selectors/entities/preferences';

import {getIsMobileView} from 'selectors/views/browser';

import {openModal, closeModal} from 'actions/views/modals';

import {A11yClassNames} from 'utils/constants';

import CompassDesignProvider from 'components/compass_design_provider';
import Tooltip from 'components/tooltip';
import OverlayTrigger from 'components/overlay_trigger';
import GenericModal from 'components/generic_modal';

const OVERLAY_TIME_DELAY = 500;

interface Props {

    // Trigger button props
    triggerId?: string;
    triggerElement: ReactNode;
    triggerClassName?: string;
    triggerAriaLabel?: string;

    // Tooltip of Trigger button props
    triggerTooltipPlacement?: 'top' | 'bottom' | 'left' | 'right';
    triggerTooltipId?: string;
    triggerTooltipText?: string;
    triggerTooltipClassName?: string;

    // Menu props
    menuId: string;
    menuAriaLabel?: string;

    children: ReactNode[];
}

export function Menu(props: Props) {
    const theme = useSelector(getTheme);

    const isMobileView = useSelector(getIsMobileView);

    const dispatch = useDispatch();

    const [anchorElement, setAnchorElement] = useState<null | HTMLElement>(null);
    const isMenuOpen = Boolean(anchorElement);

    function handleAnchorButtonClick(event: MouseEvent<HTMLButtonElement>) {
        event.preventDefault();

        if (isMobileView) {
            dispatch(openModal<MenuModalProps>({
                modalId: props.menuId,
                dialogType: MenuModal,
                dialogProps: {
                    triggerId: props.triggerId,
                    menuId: props.menuId,
                    menuAriaLabel: props.menuAriaLabel,
                    children: props.children,
                },
            }));
        } else {
            setAnchorElement(event.currentTarget);
        }
    }

    function handleMenuClose(event: MouseEvent<HTMLDivElement | HTMLUListElement>) {
        event.preventDefault();
        setAnchorElement(null);
    }

    function triggerButton() {
        // Since the open and close state lies in this component, we need to force the visibility of the trigger element
        const forceVisibleOnOpen = isMenuOpen ? {display: 'block'} : undefined;

        const triggerElement = (
            <button
                id={props.triggerId}
                aria-controls={props.menuId}
                aria-haspopup={true}
                aria-expanded={isMenuOpen}
                aria-label={props.triggerAriaLabel}
                tabIndex={0}
                className={props.triggerClassName}
                onClick={handleAnchorButtonClick}
                style={forceVisibleOnOpen}
            >
                {props.triggerElement}
            </button>
        );

        if (props.triggerTooltipText && !isMobileView) {
            return (
                <OverlayTrigger
                    delayShow={OVERLAY_TIME_DELAY}
                    placement={props?.triggerTooltipPlacement ?? 'top'}
                    overlay={
                        <Tooltip
                            id={props.triggerTooltipId}
                            className={props.triggerTooltipClassName}
                        >
                            {props.triggerTooltipText}
                        </Tooltip>
                    }
                    disabled={!props.triggerTooltipText || isMenuOpen}
                >
                    {triggerElement}
                </OverlayTrigger>
            );
        }

        return triggerElement;
    }

    if (isMobileView) {
        // In mobile view, the menu is rendered as a modal
        return triggerButton();
    }

    return (
        <CompassDesignProvider theme={theme}>
            {triggerButton()}
            <MuiMenuStyled
                id={props.menuId}
                anchorEl={anchorElement}
                open={isMenuOpen}
                onClose={handleMenuClose}
                aria-label={props.menuAriaLabel}
                className={A11yClassNames.POPUP}
            >
                {props.children}
            </MuiMenuStyled>
        </CompassDesignProvider>
    );
}

const MuiMenuStyled = muiStyled(MuiMenu)<MuiMenuProps>(() => ({
    '& .MuiPaper-root': {
        backgroundColor: 'var(--center-channel-bg)',
        boxShadow: 'var(--elevation-4), 0 0 0 1px rgba(var(--center-channel-color-rgb), 0.08) inset',
        minWidth: '114px',
        maxWidth: '496px',
        maxHeight: '80vh',
    },
}));

interface MenuModalProps {
    triggerId: Props['triggerId'];
    menuId: Props['menuId'];
    menuAriaLabel: Props['menuAriaLabel'];
    children: Props['children'];
}

function MenuModal(props: MenuModalProps) {
    const dispatch = useDispatch();

    const theme = useSelector(getTheme);

    function handleModalExited() {
        dispatch(closeModal(props.menuId));
    }

    function handleModalClickCapture(event: MouseEvent<HTMLDivElement>) {
        if (event && event.currentTarget.contains(event.target as Node)) {
            for (const currentElement of event.currentTarget.children) {
                if (currentElement.contains(event.target as Node) && !currentElement.ariaHasPopup) {
                    // We check for property ariaHasPopup because we don't want to close the menu
                    // if the user clicks on a submenu item. And let submenu component handle the click.
                    handleModalExited();
                    break;
                }
            }
        }
    }

    return (
        <CompassDesignProvider theme={theme}>
            <GenericModal
                id={props.menuId}
                className='menuModal'
                backdrop={true}
                ariaLabel={props.menuAriaLabel}
                onExited={handleModalExited}
            >
                <MuiMenuList // serves as backdrop for modals
                    component='div'
                    aria-labelledby={props.triggerId}
                    onClick={handleModalClickCapture}
                >
                    {props.children}
                </MuiMenuList>
            </GenericModal>
        </CompassDesignProvider>
    );
}
