'use client';

import { getSession } from 'next-auth/react';

interface SessionConfig {
  refreshInterval: number; // in milliseconds
  warningThreshold: number; // in milliseconds before expiration to show warning
  autoLogoutThreshold: number; // in milliseconds before expiration to auto logout
}

const DEFAULT_CONFIG: SessionConfig = {
  refreshInterval: 15 * 60 * 1000, // 15 minutes
  warningThreshold: 60 * 60 * 1000, // 60 minutes before expiry
  autoLogoutThreshold: 1 * 60 * 1000, // 1 minute before expiry
};

class SessionManager {
  private config: SessionConfig;
  private refreshTimer: NodeJS.Timeout | null = null;
  private warningTimer: NodeJS.Timeout | null = null;
  private logoutTimer: NodeJS.Timeout | null = null;
  private onSessionExpired?: () => void;
  private onSessionWarning?: (timeLeft: number) => void;

  constructor(config: Partial<SessionConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Initialize session management
   */
  async initialize(
    onSessionExpired?: () => void,
    onSessionWarning?: (timeLeft: number) => void
  ) {
    this.onSessionExpired = onSessionExpired;
    this.onSessionWarning = onSessionWarning;

    // Start monitoring session
    await this.startSessionMonitoring();
  }

  /**
   * Start monitoring the session for expiration
   */
  private async startSessionMonitoring() {
    try {
      const session = await getSession();
      
      if (!session) {
        this.cleanup();
        return;
      }

      // Calculate time until expiration
      const now = Date.now();
      const expiresAt = new Date(session.expires).getTime();
      const timeUntilExpiration = expiresAt - now;

      // If session is already expired or about to expire
      if (timeUntilExpiration <= 0) {
        this.handleSessionExpired();
        return;
      }

      // Set up warning timer (debounced; do not reshow rapidly)
      if (!this.warningTimer) {
        const warningTime = timeUntilExpiration - this.config.warningThreshold;
        if (warningTime > 0) {
          this.warningTimer = setTimeout(() => {
            this.handleSessionWarning(Math.max(0, timeUntilExpiration - (Date.now() - now)));
            this.warningTimer = null;
          }, warningTime);
        }
      }

      // Set up auto-logout timer
      const logoutTime = timeUntilExpiration - this.config.autoLogoutThreshold;
      if (logoutTime > 0) {
        this.logoutTimer = setTimeout(() => {
          this.handleSessionExpired();
        }, logoutTime);
      }

      // Set up refresh timer
      this.refreshTimer = setTimeout(() => {
        this.refreshSession();
      }, Math.min(this.config.refreshInterval, Math.max(5 * 60 * 1000, timeUntilExpiration / 3)));

    } catch (error) {
      console.error('Error starting session monitoring:', error);
    }
  }

  /**
   * Refresh the session
   */
  private async refreshSession() {
    try {
      const session = await getSession();
      
      if (session) {
        // Session is still valid, restart monitoring
        await this.startSessionMonitoring();
      } else {
        // Session is invalid, handle expiration
        this.handleSessionExpired();
      }
    } catch (error) {
      console.error('Error refreshing session:', error);
      this.handleSessionExpired();
    }
  }

  /**
   * Handle session expiration
   */
  private handleSessionExpired() {
    this.cleanup();
    
    // Clear any stored session indicators
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth-session-exists');
    }
    
    // Call the expiration callback
    if (this.onSessionExpired) {
      this.onSessionExpired();
    }
  }

  /**
   * Handle session warning
   */
  private handleSessionWarning(timeLeft: number) {
    if (this.onSessionWarning) {
      this.onSessionWarning(timeLeft);
    }
  }

  /**
   * Manually refresh session
   */
  async manualRefresh(): Promise<boolean> {
    try {
      const session = await getSession();
      
      if (session) {
        // Restart monitoring with new session data
        await this.startSessionMonitoring();
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Manual session refresh failed:', error);
      return false;
    }
  }

  /**
   * Check if session is valid
   */
  async isSessionValid(): Promise<boolean> {
    try {
      const session = await getSession();
      
      if (!session) return false;
      
      const now = Date.now();
      const expiresAt = new Date(session.expires).getTime();
      
      return expiresAt > now;
    } catch (error) {
      console.error('Error checking session validity:', error);
      return false;
    }
  }

  /**
   * Get time until session expiration
   */
  async getTimeUntilExpiration(): Promise<number | null> {
    try {
      const session = await getSession();
      
      if (!session) return null;
      
      const now = Date.now();
      const expiresAt = new Date(session.expires).getTime();
      
      return Math.max(0, expiresAt - now);
    } catch (error) {
      console.error('Error getting expiration time:', error);
      return null;
    }
  }

  /**
   * Clean up timers
   */
  cleanup() {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
    
    if (this.warningTimer) {
      clearTimeout(this.warningTimer);
      this.warningTimer = null;
    }
    
    if (this.logoutTimer) {
      clearTimeout(this.logoutTimer);
      this.logoutTimer = null;
    }
  }

  /**
   * Stop session management
   */
  stop() {
    this.cleanup();
    this.onSessionExpired = undefined;
    this.onSessionWarning = undefined;
  }
}

// Export singleton instance
export const sessionManager = new SessionManager();

// Export utility functions
export const initializeSessionManager = (
  onSessionExpired?: () => void,
  onSessionWarning?: (timeLeft: number) => void
) => {
  return sessionManager.initialize(onSessionExpired, onSessionWarning);
};

export const refreshSession = () => sessionManager.manualRefresh();
export const isSessionValid = () => sessionManager.isSessionValid();
export const getTimeUntilExpiration = () => sessionManager.getTimeUntilExpiration();