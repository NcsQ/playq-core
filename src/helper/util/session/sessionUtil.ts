// src/helper/util/sessionUtil.ts
import fs from 'fs';
import path from 'path';
import { Browser, BrowserContext, Page } from '@playwright/test';

type SessionKV = Record<string, string>;
type HybridState = {
  storageState: any;
  sessionByOrigin: Record<string, SessionKV>;
};

function originOf(url: string): string {
  try {
    const u = new URL(url);
    return `${u.protocol}//${u.host}`;
  } catch {
    return '';
  }
}

async function readSessionStorage(page: Page): Promise<SessionKV> {
  try {
    // Wait for page to be ready and check if context is still valid
    await page.waitForLoadState('domcontentloaded', { timeout: 5000 });
    
        return await page.evaluate(() => {
            const out: Record<string, string> = {};
            try {
                const ss: any = (globalThis as any).sessionStorage;
                if (ss) {
                    for (let i = 0; i < ss.length; i++) {
                        const k = ss.key(i);
                        if (k) {
                            const value = ss.getItem(k);
                            if (value) {
                                out[k] = value;
                            }
                        }
                    }
                }
            } catch (error) {
                console.warn('Failed to read sessionStorage:', error);
            }
            return out;
        });
  } catch (error) {
    console.warn(`Failed to read sessionStorage for ${page.url()}:`, error);
    return {};
  }
}

async function writeSessionStorage(page: Page, data: SessionKV): Promise<void> {
  try {
    await page.waitForLoadState('domcontentloaded', { timeout: 5000 });
    
        await page.evaluate((d) => {
            try {
                const ss: any = (globalThis as any).sessionStorage;
                if (ss) {
                    for (const [k, v] of Object.entries(d)) {
                        ss.setItem(k, v as string);
                    }
                }
            } catch (error) {
                console.warn('Failed to write sessionStorage:', error);
            }
        }, data);
  } catch (error) {
    console.warn(`Failed to write sessionStorage for ${page.url()}:`, error);
  }
}
// /**
//  * Save session with auto-discovery of origins - no need to pass URLs manually
//  */
// export async function saveSession(page: Page, sessionName: string, additionalUrls: string[] = []): Promise<void> {
//     const sessionPath = `_Temp/sessions/${sessionName}.json`;
    
//     try {
//         console.log('🔄 Saving session state...');
        
//         // First, save the storage state (cookies + localStorage)
//         const storageState = await page.context().storageState();
        
//         const state: HybridState = {
//             storageState,
//             sessionByOrigin: {},
//         };

//         // ✅ AUTO-DISCOVER ORIGINS from current browser context
//         const discoveredOrigins = new Set<string>();
        
//         // Get current page origin
//         const currentUrl = page.url();
//         if (currentUrl) {
//             const currentOrigin = originOf(currentUrl);
//             if (currentOrigin) {
//                 discoveredOrigins.add(currentOrigin);
//             }
//         }
        
//         // Get origins from existing cookies (these are domains the user has visited)
//         if (storageState.cookies) {
//             storageState.cookies.forEach(cookie => {
//                 if (cookie.domain) {
//                     // Convert cookie domain to origin
//                     const protocol = cookie.secure ? 'https' : 'http';
//                     const domain = cookie.domain.startsWith('.') ? cookie.domain.substring(1) : cookie.domain;
//                     const origin = `${protocol}://${domain}`;
//                     discoveredOrigins.add(origin);
//                 }
//             });
//         }
        
//         // Get origins from localStorage data
//         if (storageState.origins) {
//             storageState.origins.forEach(originData => {
//                 discoveredOrigins.add(originData.origin);
//             });
//         }
        
//         // Add any additional URLs if provided
//         additionalUrls.forEach(url => {
//             const origin = originOf(url);
//             if (origin) discoveredOrigins.add(origin);
//         });

//         // Filter out invalid origins and common unwanted ones
//         const validOrigins = Array.from(discoveredOrigins).filter(origin => {
//             try {
//                 const url = new URL(origin);
//                 // Skip localhost, file://, and other unwanted protocols
//                 return url.protocol === 'https:' || url.protocol === 'http:';
//             } catch {
//                 return false;
//             }
//         });

//         console.log(`🔍 Auto-discovered ${validOrigins.length} origins to save:`, validOrigins);

//         // Save sessionStorage for current page first (most reliable)
//         if (currentUrl) {
//             const currentOrigin = originOf(currentUrl);
//             if (currentOrigin && !page.isClosed()) {
//                 try {
//                     state.sessionByOrigin[currentOrigin] = await readSessionStorage(page);
//                     console.log(`✅ Saved sessionStorage for current origin: ${currentOrigin}`);
//                 } catch (error) {
//                     console.warn(`⚠️  Could not save sessionStorage for current origin ${currentOrigin}:`, error);
//                 }
//             }
//         }

//         // Process other discovered origins
//         const otherOrigins = validOrigins.filter(origin => origin !== originOf(currentUrl));
        
//         for (const origin of otherOrigins) {
//             try {
//                 console.log(`🔄 Navigating to origin for sessionStorage: ${origin}`);
                
//                 // Navigate with error handling
//                 await page.goto(origin, { 
//                     waitUntil: 'domcontentloaded', 
//                     timeout: 10000 
//                 });
                
//                 // Small delay to ensure page is stable
//                 await page.waitForTimeout(500);
                
//                 state.sessionByOrigin[origin] = await readSessionStorage(page);
//                 console.log(`✅ Saved sessionStorage for origin: ${origin}`);
                
//             } catch (error) {
//                 console.warn(`⚠️  Could not save sessionStorage for origin ${origin}:`, error);
//                 state.sessionByOrigin[origin] = {};
//             }
//         }

//         // Ensure directory exists and save file
//         await fs.promises.mkdir(path.dirname(sessionPath), { recursive: true });
//         await fs.promises.writeFile(sessionPath, JSON.stringify(state, null, 2));
        
//         console.log(`✅ Session saved to: ${sessionPath}`);
//         console.log(`📊 Saved data for ${Object.keys(state.sessionByOrigin).length} origins`);
        
//     } catch (error) {
//         console.error('❌ Failed to save session:', error);
//         throw error;
//     }
// }
export async function saveSession(page: Page, sessionName: string, additionalUrls: string[] = []): Promise<void> {
    const sessionPath = `_Temp/sessions/${sessionName}.json`;
    
    try {
        console.log('🔄 Saving session state...');
        
        // First, save the storage state (cookies + localStorage)
        const storageState = await page.context().storageState();
        
        const state: HybridState = {
            storageState,
            sessionByOrigin: {},
        };

        // ✅ CONSERVATIVE AUTO-DISCOVERY
        const discoveredOrigins = new Set<string>();
        
        // Get current page origin (most reliable)
        const currentUrl = page.url();
        if (currentUrl) {
            const currentOrigin = originOf(currentUrl);
            if (currentOrigin) {
                discoveredOrigins.add(currentOrigin);
            }
        }
        
        // Get origins from localStorage data (proven origins)
        if (storageState.origins) {
            storageState.origins.forEach(originData => {
                discoveredOrigins.add(originData.origin);
            });
        }
        
        // Add manually provided URLs (if any)
        additionalUrls.forEach(url => {
            const origin = originOf(url);
            if (origin) discoveredOrigins.add(origin);
        });

        // ✅ ONLY GET MICROSOFT ORIGINS FROM COOKIES (safer approach)
        if (storageState.cookies) {
            const microsoftCookies = storageState.cookies.filter(cookie => 
                cookie.domain && (
                    cookie.domain.includes('microsoft') ||
                    cookie.domain.includes('office365') ||
                    cookie.domain.includes('dynamics')
                )
            );
            
            microsoftCookies.forEach(cookie => {
                if (cookie.domain) {
                    const protocol = cookie.secure ? 'https' : 'http';
                    let domain = cookie.domain.startsWith('.') ? cookie.domain.substring(1) : cookie.domain;
                    
                    // ✅ Map to known Microsoft origins
                    const knownOrigins = [
                        'https://login.microsoftonline.com',
                        'https://graph.microsoft.com',
                        `https://${domain}`
                    ];
                    
                    knownOrigins.forEach(origin => {
                        try {
                            new URL(origin); // Validate URL
                            discoveredOrigins.add(origin);
                        } catch {
                            // Skip invalid URLs
                        }
                    });
                }
            });
        }

        const validOrigins = Array.from(discoveredOrigins).filter(origin => {
            try {
                const url = new URL(origin);
                return (url.protocol === 'https:' || url.protocol === 'http:') && 
                       !url.hostname.includes('localhost');
            } catch {
                return false;
            }
        });

        console.log(`🔍 Auto-discovered ${validOrigins.length} origins to save:`, validOrigins);

        // ✅ LIMIT TO MAXIMUM 5 ORIGINS (performance)
        const limitedOrigins = validOrigins.slice(0, 5);
        if (limitedOrigins.length < validOrigins.length) {
            console.log(`⚠️  Limited to ${limitedOrigins.length} origins for performance`);
        }

        // Save sessionStorage for current page first
        if (currentUrl) {
            const currentOrigin = originOf(currentUrl);
            if (currentOrigin && !page.isClosed()) {
                try {
                    state.sessionByOrigin[currentOrigin] = await readSessionStorage(page);
                    console.log(`✅ Saved sessionStorage for current origin: ${currentOrigin}`);
                } catch (error) {
                    console.warn(`⚠️  Could not save sessionStorage for current origin:`, error);
                }
            }
        }

        // Process other origins with conservative approach
        const otherOrigins = limitedOrigins.filter(origin => origin !== originOf(currentUrl));
        
        for (const origin of otherOrigins) {
            try {
                console.log(`🔄 Navigating to origin: ${origin}`);
                
                // ✅ More robust navigation with shorter timeout
                await page.goto(origin, { 
                    waitUntil: 'domcontentloaded', 
                    timeout: 8000 
                });
                
                // ✅ Check if page is still valid
                if (page.isClosed()) {
                    console.warn(`⚠️  Page closed during navigation to ${origin}`);
                    break;
                }
                
                await page.waitForTimeout(500);
                
                const sessionData = await readSessionStorage(page);
                state.sessionByOrigin[origin] = sessionData;
                console.log(`✅ Saved sessionStorage for origin: ${origin}`);
                
            } catch (error) {
                console.warn(`⚠️  Could not save sessionStorage for origin ${origin}:`, error.message);
                state.sessionByOrigin[origin] = {};
                
                // ✅ If multiple failures, stop trying
                const failureCount = Object.values(state.sessionByOrigin).filter(data => 
                    Object.keys(data).length === 0
                ).length;
                
                if (failureCount >= 3) {
                    console.warn('⚠️  Multiple origin failures, stopping further navigation');
                    break;
                }
            }
        }

        // Save file
        await fs.promises.mkdir(path.dirname(sessionPath), { recursive: true });
        await fs.promises.writeFile(sessionPath, JSON.stringify(state, null, 2));
        
        console.log(`✅ Session saved to: ${sessionPath}`);
        console.log(`📊 Saved data for ${Object.keys(state.sessionByOrigin).length} origins`);
        
    } catch (error) {
        console.error('❌ Failed to save session:', error);
        throw error;
    }
}

export async function saveSessionSimplified(page: Page, sessionName: string, additionalUrls: string[] = []): Promise<void> {
    const sessionPath = `_Temp/sessions/${sessionName}.json`;
    
    try {
        console.log('🔄 Saving session state (simplified)...');
        
        // Get storage state (cookies + localStorage for all origins)
        const storageState = await page.context().storageState();
        
        const state: HybridState = {
            storageState,
            sessionByOrigin: {},
        };

        // Only save sessionStorage for current page
        const currentUrl = page.url();
        if (currentUrl) {
            const currentOrigin = originOf(currentUrl);
            if (currentOrigin && !page.isClosed()) {
                try {
                    state.sessionByOrigin[currentOrigin] = await readSessionStorage(page);
                    console.log(`✅ Saved sessionStorage for current origin: ${currentOrigin}`);
                } catch (error) {
                    console.warn(`⚠️  Could not save sessionStorage for current origin:`, error);
                }
            }
        }

        // Optionally save sessionStorage for manually provided URLs only
        if (additionalUrls.length > 0) {
            for (const url of additionalUrls) {
                try {
                    const origin = originOf(url);
                    if (origin && origin !== originOf(currentUrl)) {
                        console.log(`🔄 Saving sessionStorage for manually specified origin: ${origin}`);
                        
                        await page.goto(origin, { 
                            waitUntil: 'domcontentloaded', 
                            timeout: 8000 
                        });
                        
                        await page.waitForTimeout(500);
                        state.sessionByOrigin[origin] = await readSessionStorage(page);
                        console.log(`✅ Saved sessionStorage for: ${origin}`);
                    }
                } catch (error) {
                    console.warn(`⚠️  Could not save sessionStorage for ${url}:`, error);
                }
            }
        }

        // Save file
        await fs.promises.mkdir(path.dirname(sessionPath), { recursive: true });
        await fs.promises.writeFile(sessionPath, JSON.stringify(state, null, 2));
        
        console.log(`✅ Session saved to: ${sessionPath}`);
        
    } catch (error) {
        console.error('❌ Failed to save session:', error);
        throw error;
    }
}
// /**
//  * Save session with improved error handling and navigation safety
//  */
// export async function saveSession(page: Page, sessionName: string, extraOrigins: string[] = []): Promise<void> {
//   const filePath = `_Temp/sessions/${sessionName}.json`;
//   try {
//     console.log('🔄 Saving session state...');
    
//     // First, save the storage state (cookies + localStorage)
//     const storageState = await page.context().storageState();
    
//     const state: HybridState = {
//       storageState,
//       sessionByOrigin: {},
//     };

//     const currentUrl = page.url();
//     const currentOrigin = currentUrl ? originOf(currentUrl) : '';
    
//     // Read sessionStorage from current page first (if valid)
//     if (currentOrigin && !page.isClosed()) {
//       try {
//         state.sessionByOrigin[currentOrigin] = await readSessionStorage(page);
//         console.log(`✅ Saved sessionStorage for current origin: ${currentOrigin}`);
//       } catch (error) {
//         console.warn(`⚠️  Could not save sessionStorage for current origin ${currentOrigin}:`, error);
//       }
//     }

//     // Process extra origins
//     const normalizedExtra = extraOrigins.map(originOf).filter(Boolean);
//     const origins = Array.from(new Set(normalizedExtra.filter(o => o !== currentOrigin)));

//     for (const origin of origins) {
//       try {
//         console.log(`🔄 Navigating to origin: ${origin}`);
        
//         // Navigate with error handling
//         await page.goto(origin, { 
//           waitUntil: 'domcontentloaded', 
//           timeout: 10000 
//         });
        
//         // Small delay to ensure page is stable
//         await page.waitForTimeout(500);
        
//         state.sessionByOrigin[origin] = await readSessionStorage(page);
//         console.log(`✅ Saved sessionStorage for origin: ${origin}`);
        
//       } catch (error) {
//         console.warn(`⚠️  Could not save sessionStorage for origin ${origin}:`, error);
//         state.sessionByOrigin[origin] = {};
//       }
//     }

//     // Ensure directory exists and save file
//     await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
//     await fs.promises.writeFile(filePath, JSON.stringify(state, null, 2));
    
//     console.log(`✅ Session saved to: ${filePath}`);
    
//   } catch (error) {
//     console.error('❌ Failed to save session:', error);
//     throw error;
//   }
// }

/**
 * Load session with improved error handling
 */
export async function loadSession(
  browser: Browser,
  filePath: string,
  warmOrigins: string[] = []
): Promise<{ context: BrowserContext; page: Page }> {
  try {
    if (!fs.existsSync(filePath)) {
      throw new Error(`Session file not found: ${filePath}`);
    }

    console.log(`🔄 Loading session from: ${filePath}`);
    
    const saved: HybridState = JSON.parse(await fs.promises.readFile(filePath, 'utf8'));
    const context = await browser.newContext({ storageState: saved.storageState });
    const page = await context.newPage();

    const warm = warmOrigins.map(originOf).filter(Boolean);
    const origins = new Set([...Object.keys(saved.sessionByOrigin), ...warm]);

    for (const origin of origins) {
      try {
        console.log(`🔄 Warming origin: ${origin}`);
        
        await page.goto(origin, { 
          waitUntil: 'domcontentloaded', 
          timeout: 10000 
        });
        
        // Small delay for stability
        await page.waitForTimeout(500);
        
        const data = saved.sessionByOrigin[origin];
        if (data && Object.keys(data).length > 0) {
          await writeSessionStorage(page, data);
          console.log(`✅ Restored sessionStorage for origin: ${origin}`);
        }
        
      } catch (error) {
        console.warn(`⚠️  Could not restore sessionStorage for origin ${origin}:`, error);
      }
    }

    console.log('✅ Session loaded successfully');
    return { context, page };
    
  } catch (error) {
    console.error('❌ Failed to load session:', error);
    throw error;
  }
}
/**
 * Load session into existing context without creating new browser/page
 * Auto-discovers origins from saved session data - no need to pass URLs
 */
export async function loadSessionIntoExistingContext(page: Page, sessionName: string, additionalUrls: string[] = []): Promise<void> {
    const sessionPath = `_Temp/sessions/${sessionName}.json`;
    try {
        if (!fs.existsSync(sessionPath)) {
            throw new Error(`Session file not found: ${sessionPath}`);
        }

        console.log(`🔄 Loading session into existing context from: ${sessionPath}`);
        
        const savedData = JSON.parse(fs.readFileSync(sessionPath, 'utf8'));
        
        // Handle both hybrid state and simple storage state formats
        let storageState: any;
        let sessionByOrigin: Record<string, SessionKV> = {};
        
        if (savedData.storageState && savedData.sessionByOrigin) {
            // Hybrid state format
            storageState = savedData.storageState;
            sessionByOrigin = savedData.sessionByOrigin;
        } else if (savedData.cookies || savedData.origins) {
            // Simple storage state format
            storageState = savedData;
        } else {
            throw new Error('Invalid session file format');
        }

        // Add cookies to existing context
        if (storageState?.cookies && Array.isArray(storageState.cookies)) {
            try {
                await page.context().addCookies(storageState.cookies);
                console.log('✅ Cookies restored to existing context');
            } catch (error) {
                console.warn('⚠️  Failed to add cookies:', error);
            }
        }

        // ✅ AUTO-DISCOVER ORIGINS - No need to pass URLs manually
        const discoveredOrigins = new Set<string>();
        
        // Get origins from sessionStorage data
        Object.keys(sessionByOrigin || {}).forEach(origin => {
            discoveredOrigins.add(origin);
        });
        
        // Get origins from localStorage data
        if (storageState?.origins) {
            storageState.origins.forEach((o: any) => {
                discoveredOrigins.add(o.origin);
            });
        }
        
        // Add any additional URLs if provided (optional)
        additionalUrls.forEach(url => {
            const origin = originOf(url);
            if (origin) discoveredOrigins.add(origin);
        });

        console.log(`🔍 Discovered ${discoveredOrigins.size} origins to restore:`, Array.from(discoveredOrigins));

        // Restore storage for each discovered origin
        for (const origin of discoveredOrigins) {
            try {
                console.log(`🔄 Restoring storage for origin: ${origin}`);
                
                // Navigate to the origin
                await page.goto(origin, { 
                    waitUntil: 'domcontentloaded', 
                    timeout: 15000 
                });
                
                // Wait for page stability
                await page.waitForTimeout(1000);

                // Restore localStorage
                const originData = storageState?.origins?.find((o: any) => o.origin === origin);
                if (originData?.localStorage && Array.isArray(originData.localStorage)) {
                    for (const item of originData.localStorage) {
                        try {
                            await page.evaluate(
                                    ({ name, value }) => {
                                        const ls: any = (globalThis as any).localStorage;
                                        if (ls) ls.setItem(name, value);
                                    },
                                    item
                                );
                        } catch (error) {
                            console.warn(`Failed to set localStorage item ${item.name}:`, error);
                        }
                    }
                    console.log(`✅ localStorage restored for ${origin}`);
                }
                
                // Restore sessionStorage
                const sessionData = sessionByOrigin[origin];
                if (sessionData && Object.keys(sessionData).length > 0) {
                    try {
                        await page.evaluate((data) => {
                            const ss: any = (globalThis as any).sessionStorage;
                            if (ss) {
                                for (const [key, value] of Object.entries(data)) {
                                    ss.setItem(key, value as string);
                                }
                            }
                        }, sessionData);
                        console.log(`✅ sessionStorage restored for ${origin}`);
                    } catch (error) {
                        console.warn(`Failed to restore sessionStorage for ${origin}:`, error);
                    }
                }
                
            } catch (error) {
                console.warn(`⚠️  Could not restore storage for origin ${origin}:`, error);
            }
        }

        console.log('✅ Session loaded into existing context successfully');
        
    } catch (error) {
        console.error('❌ Failed to load session into existing context:', error);
        throw error;
    }
}
// /**
//  * Check if session file exists and is valid
//  */
// export function isSessionValid(filePath: string, maxAgeHours: number = 24): boolean {
//   try {
//     if (!fs.existsSync(filePath)) {
//       return false;
//     }

//     const stats = fs.statSync(filePath);
//     const ageInHours = (Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60);
    
//     return ageInHours < maxAgeHours;
//   } catch {
//     return false;
//   }
// }

/**
 * Delete session file
 */
export function deleteSession(filePath: string): void {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`🗑️  Session file deleted: ${filePath}`);
    }
  } catch (error) {
    console.warn(`⚠️  Could not delete session file: ${error}`);
  }
}

// /**
//  * Load session into existing context without creating new browser/page
//  */
// export async function loadSessionIntoExistingContext(page: Page, sessionName: string, urls: string[] = []): Promise<void> {
//     const sessionPath = `_Temp/sessions/${sessionName}.json`;
//     try {
//     if (!fs.existsSync(sessionPath)) {
//       throw new Error(`Session file not found: ${sessionPath}`);
//     }

//     console.log(`🔄 Loading session into existing context from: ${sessionPath}`);
    
//     const savedData = JSON.parse(fs.readFileSync(sessionPath, 'utf8'));
    
//     // Handle both hybrid state and simple storage state formats
//     let storageState: any;
//     let sessionByOrigin: Record<string, SessionKV> = {};
    
//     if (savedData.storageState && savedData.sessionByOrigin) {
//       // Hybrid state format
//       storageState = savedData.storageState;
//       sessionByOrigin = savedData.sessionByOrigin;
//     } else if (savedData.cookies || savedData.origins) {
//       // Simple storage state format
//       storageState = savedData;
//     } else {
//       throw new Error('Invalid session file format');
//     }

//     // Add cookies to existing context
//     if (storageState?.cookies && Array.isArray(storageState.cookies)) {
//       try {
//         await page.context().addCookies(storageState.cookies);
//         console.log('✅ Cookies restored to existing context');
//       } catch (error) {
//         console.warn('⚠️  Failed to add cookies:', error);
//       }
//     }

//     // Determine origins to restore
//     const targetUrls = urls.length > 0 ? urls : ['https://login.microsoftonline.com'];
//     const origins = new Set<string>();
    
//     // Add origins from URLs
//     targetUrls.forEach(url => {
//       const origin = originOf(url);
//       if (origin) origins.add(origin);
//     });
    
//     // Add origins from session data
//     if (storageState?.origins) {
//       storageState.origins.forEach((o: any) => origins.add(o.origin));
//     }
    
//     Object.keys(sessionByOrigin).forEach(origin => origins.add(origin));

//     // Restore storage for each origin
//     for (const origin of origins) {
//       try {
//         console.log(`🔄 Restoring storage for origin: ${origin}`);
        
//         // Navigate to the origin
//         await page.goto(origin, { 
//           waitUntil: 'domcontentloaded', 
//           timeout: 15000 
//         });
        
//         // Wait for page stability
//         await page.waitForTimeout(1000);

//         // Restore localStorage
//         const originData = storageState?.origins?.find((o: any) => o.origin === origin);
//         if (originData?.localStorage && Array.isArray(originData.localStorage)) {
//           for (const item of originData.localStorage) {
//             try {
//               await page.evaluate(
//                 ({ name, value }) => {
//                   localStorage.setItem(name, value);
//                 },
//                 item
//               );
//             } catch (error) {
//               console.warn(`Failed to set localStorage item ${item.name}:`, error);
//             }
//           }
//           console.log(`✅ localStorage restored for ${origin}`);
//         }
        
//         // Restore sessionStorage
//         const sessionData = sessionByOrigin[origin];
//         if (sessionData && Object.keys(sessionData).length > 0) {
//           try {
//             await page.evaluate((data) => {
//               for (const [key, value] of Object.entries(data)) {
//                 sessionStorage.setItem(key, value as string);
//               }
//             }, sessionData);
//             console.log(`✅ sessionStorage restored for ${origin}`);
//           } catch (error) {
//             console.warn(`Failed to restore sessionStorage for ${origin}:`, error);
//           }
//         }
        
//       } catch (error) {
//         console.warn(`⚠️  Could not restore storage for origin ${origin}:`, error);
//       }
//     }

//     // Navigate to the target URL if provided
//     if (urls.length > 0) {
//       const targetUrl = urls[0];
//       console.log(`🔄 Navigating to target URL: ${targetUrl}`);
      
//       try {
//         await page.goto(targetUrl, { 
//           waitUntil: 'domcontentloaded', 
//           timeout: 15000 
//         });
//         await page.waitForTimeout(500);
//       } catch (error) {
//         console.warn(`⚠️  Failed to navigate to ${targetUrl}:`, error);
//       }
//     }

//     console.log('✅ Session loaded into existing context successfully');
    
//   } catch (error) {
//     console.error('❌ Failed to load session into existing context:', error);
//     throw error;
//   }
// }

/**
 * Checks if the session file exists and is not older than maxAgeHours.
 * @param filePath - Path to the session file.
 * @param maxAgeHours - Maximum allowed age in hours.
 * @returns true if session file exists and is valid, false otherwise.
 */
export function isSessionValid(sessionName: string, maxAgeHours: number = 24): boolean {
    const sessionPath = `_Temp/sessions/${sessionName}.json`;
    try {
        if (!fs.existsSync(sessionPath)) {
            return false;
        }
        const stats = fs.statSync(sessionPath);
        const ageMs = Date.now() - stats.mtime.getTime();
        const ageHours = ageMs / (1000 * 60 * 60);
        return ageHours < maxAgeHours;
    } catch {
        return false;
    }
}