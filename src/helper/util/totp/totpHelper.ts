import { authenticator } from 'otplib';
import * as QRCode from 'qrcode';

export class TOTPHelper {
    private secret: string;
    private serviceName: string;
    private accountName: string;

    constructor(secret?: string, serviceName: string = 'PlayQ', accountName: string = 'automation') {
        this.secret = secret || this.generateSecret();
        this.serviceName = serviceName;
        this.accountName = accountName;
        
        // Configure otplib options
        authenticator.options = {
            window: 2, // Allow 2 time steps tolerance
            step: 30   // 30-second time step
        };
    }

    /**
     * Generate a new TOTP secret
     */
    generateSecret(): string {
        return authenticator.generateSecret();
    }

    /**
     * Generate current TOTP token
     */
    generateToken(): string {
        return authenticator.generate(this.secret);
    }

    /**
     * Verify TOTP token
     */
    verifyToken(token: string): boolean {
        return authenticator.verify({
            token,
            secret: this.secret
        });
    }

    /**
     * Get OTP Auth URL for QR code generation
     */
    getOtpAuthUrl(): string {
        return authenticator.keyuri(
            this.accountName,
            this.serviceName,
            this.secret
        );
    }

    /**
     * Generate QR code for authenticator app setup
     */
    async generateQRCode(): Promise<string> {
        const otpAuthUrl = this.getOtpAuthUrl();
        return await QRCode.toDataURL(otpAuthUrl);
    }

    /**
     * Get the secret (for environment variable storage)
     */
    getSecret(): string {
        return this.secret;
    }

    /**
     * Check if current time is near token expiry
     */
    getTimeRemaining(): number {
        const epoch = Math.round(Date.now() / 1000.0);
        const timeStep = 30;
        return timeStep - (epoch % timeStep);
    }

    /**
     * Generate token with retry logic for time window
     */
    async generateTokenWithRetry(maxRetries: number = 3): Promise<string> {
        let attempts = 0;
        
        while (attempts < maxRetries) {
            const timeRemaining = this.getTimeRemaining();
            
            // If token expires soon, wait for new window
            if (timeRemaining < 5) {
                console.log(`Token expires in ${timeRemaining}s, waiting for new window...`);
                await new Promise(resolve => setTimeout(resolve, (timeRemaining + 1) * 1000));
            }
            
            const token = this.generateToken();
            console.log(`Generated TOTP token: ${token.substring(0, 3)}*** (${this.getTimeRemaining()}s remaining)`);
            return token;
        }
        
        throw new Error('Failed to generate TOTP token after retries');
    }
}