'use strict';
import { TEMPLATES_PATH, REWARD_EXPERIENCE_CARD_TEMPLATE, TEMPLATES_EXTENSION, LEVELUP_CARD_TEMPLATE, REWARD_DIALOG_TEMPLATE } from './config.js'

export class CombatManager {
    _onEndCombat(combatData) {
        if (!game.user.isGM) return;
        this._createRewardDialog(combatData)
    }

    /**
     * Share experience between all players for an ending combat.
     *
     * @param {Combatant} combatant       Combatant in combat
     *
     * @return {Boolean}                  Returns true if combatant is owned by a player, false otherwise.
     */
    async _shareExperience(players, characterExperience) {
        for (const player of players) {
            // Getting some player's experience data
            const playerExperienceData = player.actor.data.data.details.xp;
            const currentExperience = playerExperienceData.value;
            const experienceRequiredToLevelUp = playerExperienceData.max;

            // Doing some high-level maths
            const newExperienceValue = currentExperience + characterExperience;

            // We apply experience gain to player
            player.actor.update({ "data.details.xp.value": newExperienceValue });

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
     * Is combatant owned by a player ?
     *
     * @param {Combatant} combatant       Combatant in combat
     *
     * @return {Boolean}                  Returns true if combatant is owned by a player, false otherwise.
     */
    _isPlayer(combatant) {
        return combatant.hasPlayerOwner;
    }

    /**
     * Show dialog asking to GM is experience points should be rewarded to player or not.
     *
     * @param {CombatData} combatData     Data of the ending combat
     * 
     */
    async _createRewardDialog(combatData) {
        if (!game.user.isGM) return;

        if (combatData === undefined) {
            ui.notifications.warn(game.i18n.localize("reward-experience.error.no-active-combat"));
            return;
        }

        const monsters = combatData.combatants.filter(x => !this._isPlayer(x));
        if (!monsters || monsters.length === 0) {
            ui.notifications.warn(game.i18n.localize("reward-experience.error.no-monsters-in-combat"));
            return;
        }

        const totalExperience = monsters.map(x => x.actor.data.data.details.xp.value).reduce((a, b) => a + b);
        // If monsters give no experience, we won't go further
        if (totalExperience === 0) return;


        const players = combatData.combatants.filter(x => this._isPlayer(x));
        if (!players || players.length === 0) {
            ui.notifications.warn(game.i18n.localize("reward-experience.error.no-players-in-combat"));
            return;
        }

        const characterExperience = Math.floor(totalExperience / players.length);
        // If monsters give so fex experience that rounded per charecter is 0, we won't go further
        if (characterExperience === 0) return;

        return renderTemplate(`${TEMPLATES_PATH}/${REWARD_DIALOG_TEMPLATE}.${TEMPLATES_EXTENSION}`, {
            players: players,
            characterExperience: characterExperience,
            totalExperience: totalExperience
        }).then(content => {
            return new Dialog({
                title: game.i18n.localize("reward-experience.dialog.title"),
                content: content,
                buttons: {
                    yes: {
                        label: game.i18n.localize("reward-experience.dialog.buttons.confirm"),
                        callback: async () => this._shareExperience(players, characterExperience)
                    },
                    no: {
                        label: game.i18n.localize("reward-experience.dialog.buttons.cancel")
                    }
                },
                default: "yes"
            }).render(true);
        });
    }

    /**
     * Send a notification to user with experience amoutn earned.
     *
     * @param {Object} user               User to give experience points
     * @param {number} experienceAmount   Amount of experience points granted to user
     *
     * @return {Promise}
     */
    async _notifyExperienceReward(combatant, experienceAmount) {
        if (!game.user.isGM) return;

        return renderTemplate(`${TEMPLATES_PATH}/${REWARD_EXPERIENCE_CARD_TEMPLATE}.${TEMPLATES_EXTENSION}`, {
            experience: experienceAmount
        }).then(content => {
            ChatMessage.create({
                type: CONST.CHAT_MESSAGE_TYPES.WHISPER,
                user: game.user.id,
                speaker: undefined,
                whisper: combatant.players.map(x => x.id),
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
    async _notifyLevelUp(combatant) {
        if (!game.user.isGM) return;

        return renderTemplate(`${TEMPLATES_PATH}/${LEVELUP_CARD_TEMPLATE}.${TEMPLATES_EXTENSION}`)
            .then(content => {
                ChatMessage.create({
                    type: CONST.CHAT_MESSAGE_TYPES.WHISPER,
                    user: game.user.id,
                    speaker: undefined,
                    whisper: combatant.players.map(x => x.id),
                    content: content
                });
            });
    }
}