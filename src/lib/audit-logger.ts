import { databases, APPWRITE_CONFIG, account } from "./appwrite";
import { ID } from "appwrite";

export interface AuditLogEntry {
    action: string;
    metadata?: string;
    userId?: string;
    timestamp: string;
}

export const auditLogger = {
    log: async (action: string, metadata?: Record<string, any>) => {
        try {
            let userId = "anonymous";
            try {
                const user = await account.get();
                userId = user.$id;
            } catch {
                // User might not be logged in
            }

            await databases.createDocument(
                APPWRITE_CONFIG.DATABASE_ID,
                APPWRITE_CONFIG.AUDIT_COLLECTION_ID,
                ID.unique(),
                {
                    action,
                    metadata: metadata ? JSON.stringify(metadata) : null,
                    user_id: userId,
                    timestamp: new Date().toISOString(),
                }
            );
        } catch (error) {
            console.error("Failed to write audit log:", error);
        }
    },
};
