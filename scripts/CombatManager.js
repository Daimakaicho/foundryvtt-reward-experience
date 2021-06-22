'use strict';
import { TEMPLATES_PATH, REWARD_EXPERIENCE_CARD_TEMPLATE, TEMPLATES_EXTENSION, LEVELUP_CARD_TEMPLATE } from './config.js'

export class CombatManager {
    _onEndCombat(combatData) {
        if (!game.user.isGM) return;

        if (combatData === undefined) {
            ui.notifications.warn(game.i18n.localize("reward-experience.error.no-active-combat"));
            return;
        }

        const monsters = combatData.data.combatants.filter(x => !x.actor.hasPlayerOwner);
        if (!monsters || monsters.length === 0) {
            ui.notifications.warn(game.i18n.localize("reward-experience.error.no-monsters-in-combat"));
            return;
        }

        const totalExperience = monsters.map(x => x.actor.data.data.details.xp.value).reduce((a, b) => a + b);
        // If monsters give no experience, we won't go further
        if (totalExperience === 0) return;


        const players = combatData.data.combatants.filter(x => x.actor.hasPlayerOwner);
        if (!players || players.length === 0) {
            ui.notifications.warn(game.i18n.localize("reward-experience.error.no-players-in-combat"));
            return;
        }

        const characterExperience = Math.floor(totalExperience / players.length);
        // If monsters give so fex experience that rounded per charecter is 0, we won't go further
        if (characterExperience === 0) return;

        for (const player of players) {
            // Getting some player's experience data
            const playerExperienceData = player.actor.data.data.details.xp;
            const currentExperience = playerExperienceData.value;
            const experienceRequiredToLevelUp = playerExperienceData.max;

            // Doing some high-level maths
            const newExperienceValue = currentExperience + characterExperience;

            // We apply experience gain to player
            player.actor.update({
                data: {
                    details: {
                        xp: {
                            value: newExperienceValue
                        }
                    }
                }
            });

            // We send a whisper to player with experience earned.
            // If player can level up, another whisper is send as warning.
            this._notifyExperienceReward(player, characterExperience).then(() => {
                const doLevelup = newExperienceValue >= experienceRequiredToLevelUp;
                if (doLevelup) {
                    this._notifyLevelUp(player);
                }
            });
        }
    }

    /**
     * Send a notification to user with experience amoutn earned.
     *
     * @param {Object} user               User to give experience points
     * @param {number} experienceAmount   Amount of experience points granted to user
     *
     * @return {Promise}
     */
    async _notifyExperienceReward(user, experienceAmount) {
        return renderTemplate(`${TEMPLATES_PATH}/${REWARD_EXPERIENCE_CARD_TEMPLATE}.${TEMPLATES_EXTENSION}`, {
            experience: experienceAmount
        }).then(content => {
            ChatMessage.create({
                type: CONST.CHAT_MESSAGE_TYPES.WHISPER,
                user: game.user.id,
                speaker: undefined,
                whisper: [user.id],
                content: content
            });
        });
    }

    /**
     * Send a notification to user with experience amoutn earned.
     *
     * @param {Object} user             User to notify of level up
     *
     * @return {Promise}
     */
    async _notifyLevelUp(user) {
        return renderTemplate(`${TEMPLATES_PATH}/${LEVELUP_CARD_TEMPLATE}.${TEMPLATES_EXTENSION}`)
            .then(content => {
                ChatMessage.create({
                    type: CONST.CHAT_MESSAGE_TYPES.WHISPER,
                    user: game.user.id,
                    speaker: undefined,
                    whisper: [user.id],
                    content: content
                });
            });
    }
}