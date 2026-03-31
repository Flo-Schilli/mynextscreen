"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateScreenGroupDto = void 0;
const class_validator_1 = require("class-validator");
const screen_group_mode_enum_1 = require("../screen-group-mode.enum");
class CreateScreenGroupDto {
    name;
    mode;
    gridColumns;
    gridRows;
}
exports.CreateScreenGroupDto = CreateScreenGroupDto;
__decorate([
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateScreenGroupDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(screen_group_mode_enum_1.ScreenGroupMode),
    __metadata("design:type", String)
], CreateScreenGroupDto.prototype, "mode", void 0);
__decorate([
    (0, class_validator_1.ValidateIf)((o) => o.mode === screen_group_mode_enum_1.ScreenGroupMode.Split),
    (0, class_validator_1.IsNotEmpty)({ message: 'gridColumns is required when mode is split' }),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], CreateScreenGroupDto.prototype, "gridColumns", void 0);
__decorate([
    (0, class_validator_1.ValidateIf)((o) => o.mode === screen_group_mode_enum_1.ScreenGroupMode.Split),
    (0, class_validator_1.IsNotEmpty)({ message: 'gridRows is required when mode is split' }),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], CreateScreenGroupDto.prototype, "gridRows", void 0);
//# sourceMappingURL=create-screen-group.dto.js.map