// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import semver from 'semver';

import {logError} from 'mattermost-redux/actions/errors';
import {getProfilesByIds} from 'mattermost-redux/actions/users';
import {getCurrentChannel, getMyChannelMember, makeGetChannel} from 'mattermost-redux/selectors/entities/channels';
import {getConfig} from 'mattermost-redux/selectors/entities/general';
import {getTeammateNameDisplaySetting, isCollapsedThreadsEnabled} from 'mattermost-redux/selectors/entities/preferences';
import {getCurrentUserId, getCurrentUser, getStatusForUserId, getUser} from 'mattermost-redux/selectors/entities/users';
import {isChannelMuted} from 'mattermost-redux/utils/channel_utils';
import {isSystemMessage, isUserAddedInChannel} from 'mattermost-redux/utils/post_utils';
import {displayUsername} from 'mattermost-redux/utils/user_utils';

import {isThreadOpen} from 'selectors/views/threads';

import {getHistory} from 'utils/browser_history';
import Constants, {NotificationLevels, UserStatuses} from 'utils/constants';
import {showNotification} from 'utils/notifications';
import {isDesktopApp, isMobileApp, isWindowsApp} from 'utils/user_agent';
import * as Utils from 'utils/utils';
import {t} from 'utils/i18n';
import {stripMarkdown} from 'utils/markdown';

const NOTIFY_TEXT_MAX_LENGTH = 50;

// windows notification length is based windows chrome which supports 128 characters and is the lowest length of windows browsers
const WINDOWS_NOTIFY_TEXT_MAX_LENGTH = 120;

export function sendDesktopNotification(post, msgProps) {
    return async (dispatch, getState) => {
        const state = getState();
        const currentUserId = getCurrentUserId(state);

        if (shouldSkipNotification(currentUserId, post, state, msgProps)) {
            return;
        }

        const notifyLevel = determineNotifyLevel(state, post, msgProps, currentUserId);
        if (shouldNotify(notifyLevel, msgProps, currentUserId, state)) {
            const { title, body, soundName, url } = await prepareNotificationData(post, msgProps, state);
            dispatchNotification(dispatch, title, body, soundName, url, state);
        }
    };
}

function shouldSkipNotification(currentUserId, post, state, msgProps) {
    return (
        (currentUserId === post.user_id && post.props.from_webhook !== 'true') ||
        (isSystemMessage(post) && !isUserAddedInChannel(post, currentUserId)) ||
        shouldSkipBasedOnChannelAndUser(state, post, currentUserId)
    );
}

function shouldSkipBasedOnChannelAndUser(state, post, currentUserId) {
    const userStatus = getStatusForUserId(state, currentUserId);
    const member = getMyChannelMember(state, post.channel_id);
    return (
        !member || 
        isChannelMuted(member) || 
        userStatus === UserStatuses.DND || 
        userStatus === UserStatuses.OUT_OF_OFFICE
    );
}

function determineNotifyLevel(state, post, msgProps, currentUserId) {
    let notifyLevel = getMyChannelMember(state, post.channel_id)?.notify_props?.desktop || NotificationLevels.DEFAULT;
    if (notifyLevel === NotificationLevels.DEFAULT) {
        notifyLevel = getCurrentUser(state)?.notify_props?.desktop || NotificationLevels.ALL;
    }
    return notifyLevel;
}

function shouldNotify(notifyLevel, msgProps, currentUserId, state) {
    if (notifyLevel === NotificationLevels.NONE) {
        return false;
    } else if (notifyLevel === NotificationLevels.MENTION && !msgProps.mentions.includes(currentUserId)) {
        return false;
    } else if (notifyLevel === NotificationLevels.ALL && !isThreadOpen(state, msgProps.root_id)) {
        return false;
    }
    return true;
}

async function prepareNotificationData(post, msgProps, state) {
    let userFromPost = await fetchUserFromPost(state, post);
    const channel = makeGetChannel()(state, { id: post.channel_id }) || { name: msgProps.channel_name, type: msgProps.channel_type };
    const title = generateTitle(channel, msgProps);
    const notifyText = generateNotifyText(post, msgProps, state, userFromPost);
    const body = generateBody(notifyText, post, msgProps, state, userFromPost);
    const soundName = getSoundName(state);
    const url = Utils.getChannelURL(state, channel, msgProps.team_id);
    return { title, body, soundName, url };
}

async function fetchUserFromPost(state, post) {
    let userFromPost = getUser(state, post.user_id);
    if (!userFromPost) {
        const missingProfileResponse = await dispatch(getProfilesByIds([post.user_id]));
        if (missingProfileResponse.data && missingProfileResponse.data.length) {
            userFromPost = missingProfileResponse.data[0];
        }
    }
    return userFromPost;
}

function generateNotifyText(post, msgProps, state, userFromPost) {
    let notifyText = post.message;
    const msgPropsPost = JSON.parse(msgProps.post);
    const attachments = msgPropsPost?.props?.attachments || [];

    attachments.forEach((attachment) => {
        if (!notifyText.length) {
            notifyText = attachment.fallback || attachment.pretext || attachment.text;
        }
    });

    let strippedMarkdownNotifyText = stripMarkdown(notifyText);
    const notifyTextMaxLength = isWindowsApp() ? WINDOWS_NOTIFY_TEXT_MAX_LENGTH : NOTIFY_TEXT_MAX_LENGTH;

    if (strippedMarkdownNotifyText.length > notifyTextMaxLength) {
        strippedMarkdownNotifyText = `${strippedMarkdownNotifyText.substring(0, notifyTextMaxLength - 1)}...`;
    }

    return strippedMarkdownNotifyText;
}

function generateBody(notifyText, post, msgProps, state, userFromPost) {
    let body = `@${getUsername(post, state, userFromPost)}`;
    if (!notifyText.length) {
        body += getUploadMessage(msgProps, post);
    } else {
        body += `: ${notifyText}`;
    }
    return body;
}

function getUsername(post, state, userFromPost) {
    const config = getConfig(state);
    if (post.props.override_username && config.EnablePostUsernameOverride === 'true') {
        return post.props.override_username;
    } else if (userFromPost) {
        return displayUsername(userFromPost, getTeammateNameDisplaySetting(state), false);
    } else {
        return Utils.localizeMessage('channel_loader.someone', 'Someone');
    }
}

function getUploadMessage(msgProps, post) {
    if (msgProps.image) {
        return Utils.localizeMessage('channel_loader.uploadedImage', ' uploaded an image');
    } else if (msgProps.otherFile) {
        return Utils.localizeMessage('channel_loader.uploadedFile', ' uploaded a file');
    } else if (post.props.attachments?.some((attachment) => attachment.image_url.length > 0)) {
        return Utils.localizeMessage('channel_loader.postedImage', ' posted an image');
    } else {
        return Utils.localizeMessage('channel_loader.something', ' did something new');
    }
}

function dispatchNotification(dispatch, title, body, soundName, url, state) {
    const notify = !state.views.browser.focused;
    dispatch(notifyMe(title, body, soundName, url, notify));
    if (!isDesktopApp() && !isMobileApp()) {
        Utils.ding(soundName);
    }
}

const notifyMe = (title, body, channel, teamId, silent, soundName, url) => (dispatch) => {
    // handle notifications in desktop app >= 4.3.0
    if (isDesktopApp() && window.desktop && semver.gte(window.desktop.version, '4.3.0')) {
        const msg = {
            title,
            body,
            channel,
            teamId,
            silent,
        };

        if (isDesktopApp() && window.desktop) {
            if (semver.gte(window.desktop.version, '4.6.0')) {
                msg.data = {soundName};
            }

            if (semver.gte(window.desktop.version, '4.7.2')) {
                msg.url = url;
            }
        }

        // get the desktop app to trigger the notification
        window.postMessage(
            {
                type: 'dispatch-notification',
                message: msg,
            },
            window.location.origin,
        );
    } else {
        showNotification({
            title,
            body,
            requireInteraction: false,
            silent,
            onClick: () => {
                window.focus();
                getHistory().push(url);
            },
        }).catch((error) => {
            dispatch(logError(error));
        });
    }
};
