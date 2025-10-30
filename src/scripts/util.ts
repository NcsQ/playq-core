import * as readline from 'readline';
import { comm, vars } from "@playq";
import * as clipboardy from 'clipboardy';
import * as crypto from 'crypto';
import { TOTPHelper } from '../helper/util/totp/totpHelper';


let encryptedValue: string = '';
let outputValue: string = '';


const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
    console.log('\n🚪 Process interrupted by user (Ctrl+C)');
    rl.close();
    process.exit(0);
});

async function question(prompt: string): Promise<string> {
    return new Promise(resolve => {
        rl.question(prompt, (answer) => {
            // Check for specific exit commands
            if (answer.toLowerCase() === 'exit' || 
                answer.toLowerCase() === 'quit' || 
                answer.toLowerCase() === 'q' ||
                answer === '\u001b') {
                console.log('🚪 Exiting...');
                rl.close();
                process.exit(0);
            }
            resolve(answer);
        });
    });
}

export async function encryptUserInput(): Promise<void> {
    try {
        console.log('🔐 PlayQ Encryption Helper\n');
        console.log('💡 Type "exit", "quit", "q", or press Ctrl+C to exit anytime\n');
        
        console.log('What would you like to encrypt/decrypt?');
        console.log('1. Password (strong encryption)');
        console.log('2. Text (strong encryption)');
        console.log('3. Decrypt');
        console.log('4. Generate 32bit Key');
        console.log('5. Generate TOTP Code');
        console.log('6. Exit');

        const choice = await question('\nEnter your choice (1-6): ');

        switch (choice) {
            case '1':
                await encryptPassword();
                break;
            case '2':
                await encryptText();
                break;
            case '3':
                await decrypt();
                break;
            case '4':
                await generate32ByteKey();
                break;
            case '5':
                await generateTotpCode();
                break;
            case '6':
                console.log('🚪 Goodbye!');
                return;
            default:
                console.log('❌ Invalid choice. Please run again.');
                break;
        }
        
        // Ask user what to copy to clipboard
        console.log('\nWhat would you like to copy to clipboard?');
        console.log('1. Copy encrypted value');
        console.log('2. Nothing (skip copy)');
        console.log('3. Exit');
        
        const copyChoice = await question('Enter choice (1-3): ');

        switch (copyChoice) {
            case '1':
                if (encryptedValue) {
                    await copyToClipboard(encryptedValue, 'Encrypted Password');
                } else if (outputValue) {
                    await copyToClipboard(outputValue, 'Output Value');
                } else {
                    console.log('❌ No encrypted / output value to copy');
                }

                break;
            case '2':
                console.log('📋 Skipped copying to clipboard');
                break;
            case '3':
                console.log('🚪 Exiting...');
                break;
            default:
                console.log('❌ Invalid choice');
                break;
        }

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        rl.close();
    }
}

async function copyToClipboard(text: string, description: string): Promise<void> {
    try {
        await clipboardy.default.write(text);
        console.log(`✅ ${description} copied to clipboard!`);
        console.log(`📋 Copied: ${text.length > 50 ? text.substring(0, 50) + '...' : text}`);
    } catch (error) {
        console.error('❌ Failed to copy to clipboard:', error);
        console.log('📝 Manual copy:');
        console.log(text);
    }
}

async function encryptPassword(): Promise<void> {
    const passwordText = await question('Enter password to encrypt (or "exit" to quit): ');
    
    if (!passwordText) {
        console.log('❌ Password cannot be empty');
        return;
    }
    
    try {
        console.log('🔄 Encrypting password...');
        encryptedValue = await comm.encryptPassword(passwordText);
        
        console.log('\n📋 🔐 Encrypted Password Result:');
        console.log('='.repeat(50));
        console.log(encryptedValue);
        console.log('='.repeat(50));
        
    } catch (error) {
        console.error('❌ Encryption failed:', error);
    }
}

async function encryptText(): Promise<void> {
    const encryptText = await question('Enter text to encrypt (or "exit" to quit): ');
    
    if (!encryptText) {
        console.log('❌ Text cannot be empty');
        return;
    }
    
    try {
        console.log('🔄 Encrypting text...');
        encryptedValue = await comm.encryptText(encryptText);
        
        console.log('\n📋 🔐 Encrypted Text Result:');
        console.log('='.repeat(50));
        console.log(encryptedValue);
        console.log('='.repeat(50));
        
    } catch (error) {
        console.error('❌ Encryption failed:', error);
    }
}

async function decrypt(): Promise<void> {
    const decryptText = await question('Enter text to decrypt (or "exit" to quit): ');

    if (!decryptText) {
        console.log('❌ Text cannot be empty');
        return;
    }

    try {
        console.log('🔄 Decrypting text...');
        encryptedValue = await vars.replaceVariables('#{'+decryptText+'}');

        console.log('\n📋 🔓 Decrypted Text Result:');
        console.log('='.repeat(50));
        console.log(encryptedValue);
        console.log('='.repeat(50));

    } catch (error) {
        console.error('❌ Decryption failed:', error);
    }
}


async function generate32ByteKey(): Promise<void> {
    try {
        const key = crypto.randomBytes(32).toString('hex');
        encryptedValue = key;
        console.log('\n🔑 32-byte Key Generated:');
        console.log('='.repeat(50));
        console.log(key);
        console.log('='.repeat(50));
    } catch (error) {
        console.error('❌ Failed to generate key:', error);
    }
}

async function generateTotpCode(): Promise<void> {
    try {
        let secretKey = process.env.PLAYQ_TOTP_SECRET_KEY;
        if (!secretKey) {
            const inputSecret = await question('Enter TOTP secret key (or "exit" to quit): ');
            if (!inputSecret) {
                throw new Error('❌ TOTP secret key cannot be empty');
            }
            process.env.PLAYQ_TOTP_SECRET_KEY = inputSecret;
            secretKey = inputSecret;
        }
        if (secretKey.startsWith("enc.")) {
            secretKey = vars.replaceVariables(`#{${secretKey}}`);
        }
        // const secret = crypto.randomBytes(20).toString('hex');
        const totpHelper = new TOTPHelper(secretKey);
        const token = totpHelper.generateToken();
        outputValue = token;
        console.log('\n🔑 TOTP Code Generated:');
        console.log('='.repeat(50));
        console.log(token);
        console.log('='.repeat(50));
    } catch (error) {
        console.error('❌ Failed to generate TOTP code:', error);
    }
}

// Main execution
if (require.main === module) {
    encryptUserInput();
}