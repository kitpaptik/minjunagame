/** Column widths of the chat-app shell the story runs in (1280 x 720). */
export const SHELL = {
    railWidth: 72,
    sidebarWidth: 240,
    panelWidth: 260,
    headerHeight: 48,
    inputHeight: 76,
};

SHELL.chatLeft = SHELL.railWidth + SHELL.sidebarWidth;   // 312
SHELL.chatRight = 1280 - SHELL.panelWidth;               // 1020

/** "쉬는 시간 · 교실 뒤" -> "쉬는-시간-교실-뒤", the way a chat app writes channel names. */
export function channelName(place) {
    return place.trim().replace(/\s*·\s*/g, '-').replace(/\s+/g, '-') || '일반';
}
