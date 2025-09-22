import { readFileSync, existsSync, unlinkSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

interface TokenData {
  accessToken: string;
  expireIn: number;
  createdAt: number;
}

class TokenManager {
  private tokenFilePath: string;

  constructor() {
    this.tokenFilePath = join(homedir(), '.leiga', 'leiga-token.json');
  }

  getTokenFilePath(): string {
    return this.tokenFilePath;
  }

  hasTokenFile(): boolean {
    return existsSync(this.tokenFilePath);
  }

  readToken(): TokenData | null {
    try {
      if (!this.hasTokenFile()) {
        return null;
      }
      
      const data = readFileSync(this.tokenFilePath, 'utf8');
      const tokenData: TokenData = JSON.parse(data);
      return tokenData;
    } catch (error) {
      return null;
    }
  }

  deleteToken(): boolean {
    try {
      if (!this.hasTokenFile()) {
        return false;
      }
      
      unlinkSync(this.tokenFilePath);
      return true;
    } catch (error) {
      return false;
    }
  }

  isTokenValid(): boolean {
    const token = this.readToken();
    if (!token) {
      return false;
    }

    const now = Date.now();
    const expirationTime = token.createdAt + (token.expireIn * 1000);
    return now < expirationTime;
  }
}

export { TokenManager }; 