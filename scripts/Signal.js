'use strict';
import { libWrapper } from './shim/shim.js'
import { CombatManager } from "./CombatManager.js"

export class Signal {
    static lightUp() {
        /**
         * Registers hooks
         */
        Hooks.once('init', () => {
            // We need to handle endCombat() method to automatically reward players
            libWrapper.register(MODULE_ID, `Combat.prototype.endCombat`, function (wrapped, ...args) {
                wrapped(...args).then(result => {
                    console.log(`${MODULE_ID} | endCombat event fired`);
                    Hooks.callAll("endCombat", result);
                });
            });
        });

        Hooks.once('ready', () => {
            /*
            if (isNewerVersion(game.data.version, LATEST_TESTED_VERSION)) {
                ChatMessage.create({
                    type: CONST.CHAT_MESSAGE_TYPES.WHISPER,
                    users: ChatMessage.getWhisperRecipients("GM"),
                    content: `<p>'${MODULE_NAME}' is not tested with newer version than ${LATEST_TESTED_VERSION}. Please be careful !</p>`              
                });
            }
            */

            // We handle endCombat() call
            Hooks.on("endCombat", (combatData) => {
                CombatManager._onCombatEnd(combatData);
            });
            console.log(`${MODULE_ID} | module initialised.`);
        });
    }
}