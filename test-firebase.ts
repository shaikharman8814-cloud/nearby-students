import { adminAuth } from './lib/firebase-admin';

async function test() {
    try {
        const link = await adminAuth.generatePasswordResetLink('shaikharman8814@gmail.com');
        console.log("LINK GENERATED:", link);
    } catch (e) {
        console.error(e);
    }
}
test();
