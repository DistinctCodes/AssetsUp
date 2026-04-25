export declare enum UserRole {
    ADMIN = "ADMIN",
    MANAGER = "MANAGER",
    STAFF = "STAFF"
}
export declare class User {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    password: string;
    role: UserRole;
    refreshToken: string | null;
    createdAt: Date;
    updatedAt: Date;
}
