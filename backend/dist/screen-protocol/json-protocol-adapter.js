"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.JsonProtocolAdapter = void 0;
const common_1 = require("@nestjs/common");
let JsonProtocolAdapter = class JsonProtocolAdapter {
    renderState(state) {
        return {
            screen: state.screen,
            currentPlaylist: state.currentPlaylist
                ? {
                    id: state.currentPlaylist.id,
                    name: state.currentPlaylist.name,
                    items: state.currentPlaylist.items.map((item) => this.renderPlaylistItem(item, state.screen.organisationId)),
                }
                : null,
            schedule: state.scheduleEntries.map((entry) => ({
                id: entry.id,
                playlistId: entry.playlistId,
                startTime: entry.startTime,
                endTime: entry.endTime,
                recurrenceRule: entry.recurrenceRule ?? null,
            })),
            fallbackPlaylist: state.fallbackPlaylist
                ? {
                    id: state.fallbackPlaylist.id,
                    name: state.fallbackPlaylist.name,
                    items: state.fallbackPlaylist.items.map((item) => this.renderPlaylistItem(item, state.screen.organisationId)),
                }
                : null,
            liveStream: state.activeLiveStream
                ? {
                    id: state.activeLiveStream.id,
                    streamUrl: state.activeLiveStream.streamUrl,
                    startedAt: state.activeLiveStream.startedAt,
                }
                : null,
        };
    }
    renderEvent(event) {
        return {
            type: event.type,
            timestamp: new Date().toISOString(),
            data: event.payload,
        };
    }
    renderPlaylistItem(item, organisationId) {
        return {
            url: `/api/media/${organisationId}/${item.contentId}`,
            duration: item.duration,
            type: item.type,
        };
    }
};
exports.JsonProtocolAdapter = JsonProtocolAdapter;
exports.JsonProtocolAdapter = JsonProtocolAdapter = __decorate([
    (0, common_1.Injectable)()
], JsonProtocolAdapter);
//# sourceMappingURL=json-protocol-adapter.js.map