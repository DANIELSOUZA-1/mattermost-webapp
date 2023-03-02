// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {KeyboardEvent, memo} from 'react';
import {EmojiCategory} from '@mattermost/types/emojis';

import {calculateCategoryRowIndex} from '../utils';
import EmojiPickerCategory from '../components/emoji_picker_category';

import {
    Categories,
    CategoryOrEmojiRow,
    NavigationDirection,
} from '../types';

interface Props {
    isFiltering: boolean;
    active: EmojiCategory;
    categories: Categories;
    onClick: (categoryRowIndex: CategoryOrEmojiRow['index'], categoryName: EmojiCategory, firstEmojiId: string) => void;
    onKeyDown: (moveTo: NavigationDirection) => void;
    focusOnSearchInput: () => void;
}

function EmojiPickerCategories({
    categories,
    isFiltering,
    active,
    onClick,
    onKeyDown,
    focusOnSearchInput,
}: Props) {
    const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
        switch (event.key) {
        case 'ArrowRight':
            event.stopPropagation();
            event.preventDefault();
            onKeyDown(NavigationDirection.NextEmoji);
            focusOnSearchInput();
            break;
        case 'ArrowLeft':
            event.stopPropagation();
            event.preventDefault();
            onKeyDown(NavigationDirection.PreviousEmoji);
            focusOnSearchInput();
            break;
        case 'ArrowUp':
            event.stopPropagation();
            event.preventDefault();
            onKeyDown(NavigationDirection.PreviousEmojiRow);
            focusOnSearchInput();
            break;
        case 'ArrowDown':
            event.stopPropagation();
            event.preventDefault();
            onKeyDown(NavigationDirection.NextEmojiRow);
            focusOnSearchInput();
            break;
        }
    };

    const categoryNames = Object.keys(categories) as EmojiCategory[];

    const activeCategory = isFiltering ? categoryNames[0] : active;

    return (
        <div
            id='emojiPickerCategories'
            className='emoji-picker__categories'
            onKeyDown={handleKeyDown}
        >
            {categoryNames.map((categoryName) => {
                const category = categories[categoryName];

                return (
                    <EmojiPickerCategory
                        key={`${category.id}-${category.name}`}
                        category={category}
                        categoryRowIndex={calculateCategoryRowIndex(categories, categoryName as EmojiCategory)}
                        onClick={onClick}
                        selected={activeCategory === category.name}
                        enable={!isFiltering}
                    />
                );
            },

            )}
        </div>
    );
}

export default memo(EmojiPickerCategories);
