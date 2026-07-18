import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';
const jwksRsa = require('jwks-rsa');

interface AuthMethodReference {
  method: string;
  timestamp: number;
}

interface DecodedToken {
  sub: string; // user id
  email?: string;
  app_metadata?: {
    role?: string;
    provider?: string;
    providers?: string[];
  };
  user_metadata?: {
    role?: string;
    name?: string;
    full_name?: string;
    phone?: string;
  };
  exp: number;
  iat: number;
  iss: string;
  aal?: 'aal1' | 'aal2';
  amr?: AuthMethodReference[];
}

@Injectable()
export class JwtVerifierService implements OnModuleInit {
  private jwksClient: any; // jwks-rsa client
  private supabaseUrl: string;
  private jwtSecret: string | null = null;

  constructor(private configService: ConfigService) {
    this.supabaseUrl = this.configService.get<string>('SUPABASE_URL') || '';
  }

  async onModuleInit() {
    // Supabase Auth exposes JWKS at /auth/v1/.well-known/jwks.json (not /.well-known/jwks.json)
    this.jwksClient = jwksRsa({
      jwksUri: `${this.supabaseUrl}/auth/v1/.well-known/jwks.json`,
      cache: true,
      cacheMaxAge: 86400000, // 24 часа
      rateLimit: true,
      jwksRequestsPerMinute: 10,
    });

    // Попытка получить JWT secret из конфига (если есть)
    // Supabase использует свой собственный секрет, но можно попробовать использовать его
    this.jwtSecret =
      this.configService.get<string>('SUPABASE_JWT_SECRET') || null;
  }

  /**
   * Получить ключ для верификации JWT
   */
  private getKey = (
    header: jwt.JwtHeader,
    callback: jwt.SigningKeyCallback,
  ) => {
    if (!header.kid) {
      callback(new Error('No kid in header'));
      return;
    }

    this.jwksClient.getSigningKey(header.kid, (err, key) => {
      if (err) {
        callback(err);
        return;
      }
      const signingKey = key?.getPublicKey();
      callback(null, signingKey);
    });
  };

  private static readonly jwksAlgorithms = ['ES256', 'RS256'] as const;

  private assertNotExpired(decoded: DecodedToken): void {
    if (decoded.exp && decoded.exp < Date.now() / 1000) {
      throw new Error('Token expired');
    }
  }

  private verifyWithJwks(
    token: string,
    algorithms: readonly ('ES256' | 'RS256')[],
  ): Promise<DecodedToken> {
    return new Promise((resolve, reject) => {
      jwt.verify(
        token,
        this.getKey,
        {
          algorithms: [...algorithms],
          issuer: `${this.supabaseUrl}/auth/v1`,
          audience: 'authenticated',
        },
        (err, decoded) => {
          if (err) {
            reject(err);
            return;
          }
          resolve(decoded as DecodedToken);
        },
      );
    });
  }

  private verifyWithSecret(token: string): Promise<DecodedToken> {
    if (!this.jwtSecret) {
      return Promise.reject(
        new Error('SUPABASE_JWT_SECRET is not configured for HS256 tokens'),
      );
    }

    return new Promise((resolve, reject) => {
      jwt.verify(
        token,
        this.jwtSecret!,
        {
          algorithms: ['HS256'],
          issuer: `${this.supabaseUrl}/auth/v1`,
          audience: 'authenticated',
        },
        (err, decoded) => {
          if (err) {
            reject(err);
            return;
          }
          resolve(decoded as DecodedToken);
        },
      );
    });
  }

  /**
   * Верифицировать JWT токен локально (без сетевых запросов)
   * Использует JWKS (ES256 / RS256) или legacy HS256 + SUPABASE_JWT_SECRET
   */
  async verifyToken(token: string): Promise<DecodedToken> {
    try {
      const header = jwt.decode(token, { complete: true })?.header;
      const alg = header?.alg;

      let decoded: DecodedToken;

      if (alg === 'HS256') {
        decoded = await this.verifyWithSecret(token);
      } else if (alg === 'ES256' || alg === 'RS256') {
        decoded = await this.verifyWithJwks(token, [alg]);
      } else {
        // Unknown alg: try JWKS (current Supabase default: ES256)
        decoded = await this.verifyWithJwks(
          token,
          JwtVerifierService.jwksAlgorithms,
        );
      }

      this.assertNotExpired(decoded);
      return decoded;
    } catch (error: any) {
      throw new Error(`JWT verification failed: ${error.message}`);
    }
  }

  /**
   * Декодировать JWT без верификации (для отладки)
   */
  decodeToken(token: string): DecodedToken | null {
    try {
      return jwt.decode(token) as DecodedToken;
    } catch (error) {
      return null;
    }
  }

  /**
   * Получить роль из токена
   */
  getRoleFromToken(token: DecodedToken): string | null {
    return token.app_metadata?.role || token.user_metadata?.role || null;
  }

  /**
   * Получить email из токена
   */
  getEmailFromToken(token: DecodedToken): string | null {
    return token.email || null;
  }

  /**
   * Получить user ID из токена
   */
  getUserIdFromToken(token: DecodedToken): string {
    return token.sub;
  }

  getAuthenticationContextFromToken(token: DecodedToken): {
    provider: string | null;
    providers: string[];
    methods: AuthMethodReference[];
    assuranceLevel: string | null;
  } {
    return {
      provider: token.app_metadata?.provider ?? null,
      providers: Array.isArray(token.app_metadata?.providers)
        ? token.app_metadata.providers
        : [],
      methods: Array.isArray(token.amr) ? token.amr : [],
      assuranceLevel: token.aal ?? null,
    };
  }
}
