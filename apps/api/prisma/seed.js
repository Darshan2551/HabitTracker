"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var bcryptjs_1 = require("bcryptjs");
var client_1 = require("@prisma/client");
var prisma = new client_1.PrismaClient();
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var adminEmail, adminPassword, admin, _a, _b;
        var _c, _d;
        var _e, _f;
        return __generator(this, function (_g) {
            switch (_g.label) {
                case 0:
                    adminEmail = (_e = process.env.ADMIN_EMAIL) !== null && _e !== void 0 ? _e : 'admin@habittracker.local';
                    adminPassword = (_f = process.env.ADMIN_PASSWORD) !== null && _f !== void 0 ? _f : 'ChangeMe123!';
                    _b = (_a = prisma.user).upsert;
                    _c = {
                        where: { email: adminEmail },
                        update: { role: client_1.UserRole.ADMIN, emailVerified: true }
                    };
                    _d = {
                        email: adminEmail
                    };
                    return [4 /*yield*/, bcryptjs_1.default.hash(adminPassword, 12)];
                case 1: return [4 /*yield*/, _b.apply(_a, [(_c.create = (_d.passwordHash = _g.sent(),
                            _d.name = 'Platform Admin',
                            _d.role = client_1.UserRole.ADMIN,
                            _d.emailVerified = true,
                            _d.settings = {
                                create: {
                                    timezone: 'UTC',
                                    locale: 'en-US',
                                },
                            },
                            _d),
                            _c)])];
                case 2:
                    admin = _g.sent();
                    return [4 /*yield*/, prisma.habitTemplate.upsert({
                            where: { slug: 'exercise' },
                            update: {},
                            create: {
                                slug: 'exercise',
                                title: 'Exercise',
                                description: '30-minute workout',
                                schedule: { type: 'weekly', days: [1, 3, 5], time: '07:00' },
                                goal: { type: 'count', value: 3, period: 'week' },
                                tags: ['fitness', 'health'],
                            },
                        })];
                case 3:
                    _g.sent();
                    return [4 /*yield*/, prisma.habitTemplate.upsert({
                            where: { slug: 'meditation' },
                            update: {},
                            create: {
                                slug: 'meditation',
                                title: 'Meditation',
                                description: '10-minute mindfulness session',
                                schedule: { type: 'daily', time: '06:30' },
                                goal: { type: 'count', value: 7, period: 'week' },
                                tags: ['mindfulness'],
                            },
                        })];
                case 4:
                    _g.sent();
                    return [4 /*yield*/, prisma.habitTemplate.upsert({
                            where: { slug: 'reading' },
                            update: {},
                            create: {
                                slug: 'reading',
                                title: 'Reading',
                                description: 'Read 20 pages',
                                schedule: { type: 'daily', time: '21:00' },
                                goal: { type: 'count', value: 5, period: 'week' },
                                tags: ['learning'],
                            },
                        })];
                case 5:
                    _g.sent();
                    console.log("Seeded admin: ".concat(admin.email));
                    return [2 /*return*/];
            }
        });
    });
}
main()
    .catch(function (error) {
    console.error(error);
    process.exit(1);
})
    .finally(function () { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, prisma.$disconnect()];
            case 1:
                _a.sent();
                return [2 /*return*/];
        }
    });
}); });
//# sourceMappingURL=seed.js.map