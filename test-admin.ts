import { loadEnvConfig } from '@next/env';
import path from 'path';
loadEnvConfig(path.resolve('.'));

import { adminAuth } from './lib/firebase-admin';

async function test() {
    try {
        console.log("Service Account Env Var length:", (process.env.FIREBASE_SERVICE_ACCOUNT || "").length);
        const token = await adminAuth.createCustomToken("test-uid");
        console.log("Token generated!", token.substring(0, 20) + "...");
    } catch (e) {
        console.error("FAILED:");
        console.error(e);
    }
}
test();
