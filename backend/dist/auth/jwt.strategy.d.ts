import { Strategy } from 'passport-jwt';
import { UserService } from '../database/user.service';
interface JwtPayload {
    sub: string;
    username: string;
    email: string;
}
declare const JwtStrategy_base: new (...args: [opt: import("passport-jwt").StrategyOptionsWithRequest] | [opt: import("passport-jwt").StrategyOptionsWithoutRequest]) => Strategy & {
    validate(...args: any[]): unknown;
};
export declare class JwtStrategy extends JwtStrategy_base {
    private readonly userService;
    constructor(userService: UserService);
    validate(payload: JwtPayload): Promise<{
        userId: string;
        username: string;
        email: string;
    }>;
}
export {};
