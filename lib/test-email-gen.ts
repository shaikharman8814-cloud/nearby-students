
import { OTP_TEMPLATE, RESET_PASSWORD_TEMPLATE, compileEmailTemplate } from './email-templates';

const variables = {
    APP_NAME: 'Sone',
    TAGLINE: 'Connect with your vibe',
    LOGO_URL: 'https://sone.app/logo.png',
    CODE: '123456',
    RESET_URL: 'https://sone.app/reset?token=abc',
    EXPIRY_MINUTES: '10',
    SUPPORT_EMAIL: 'support@sone.app',
    YEAR: new Date().getFullYear().toString(),
};

console.log('--- OTP TEMPLATE PREVIEW ---');
console.log(compileEmailTemplate(OTP_TEMPLATE, variables).substring(0, 500) + '...');
// Just print start to verify

console.log('\n--- RESET TEMPLATE PREVIEW ---');
console.log(compileEmailTemplate(RESET_PASSWORD_TEMPLATE, variables).substring(0, 500) + '...');

console.log('\n--- CHECKING REPLACEMENTS ---');
const otpCompiled = compileEmailTemplate(OTP_TEMPLATE, variables);
if (otpCompiled.includes('Sone Login') && otpCompiled.includes('123456')) {
    console.log('OTP Template: SUCCESS');
} else {
    console.error('OTP Template: FAILED');
}

const resetCompiled = compileEmailTemplate(RESET_PASSWORD_TEMPLATE, variables);
if (resetCompiled.includes('Reset your Sone password') && resetCompiled.includes('https://sone.app/reset?token=abc')) {
    console.log('Reset Template: SUCCESS');
} else {
    console.error('Reset Template: FAILED');
}
