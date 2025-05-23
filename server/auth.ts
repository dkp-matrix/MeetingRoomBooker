import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Strategy as JwtStrategy, ExtractJwt } from "passport-jwt";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import ldap from "ldapjs";
import { Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import { storage } from "./storage";
import { User } from "@shared/schema";

declare global {
  namespace Express {
    interface User extends User {}
  }
}

// Authentication service class
export class AuthService {
  private static instance: AuthService;
  private currentAuthType: string = "jwt";

  private constructor() {}

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  async getCurrentAuthConfig() {
    return await storage.getActiveAuthConfig();
  }

  async setAuthConfig(authType: string, config: any) {
    await storage.setAuthConfig(authType, config);
    this.currentAuthType = authType;
  }

  // JWT Authentication
  generateJWT(user: User): string {
    const secret = process.env.JWT_SECRET || 'fallback-secret-key';
    const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
    
    return jwt.sign(
      { 
        id: user.id, 
        email: user.email, 
        role: user.role 
      },
      secret,
      { expiresIn }
    );
  }

  async verifyJWT(token: string): Promise<User | null> {
    try {
      const secret = process.env.JWT_SECRET || 'fallback-secret-key';
      const decoded = jwt.verify(token, secret) as any;
      return await storage.getUser(decoded.id);
    } catch (error) {
      return null;
    }
  }

  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 12);
  }

  async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  // LDAP Authentication
  async authenticateLDAP(username: string, password: string): Promise<User | null> {
    const authConfig = await this.getCurrentAuthConfig();
    if (!authConfig || authConfig.authType !== 'ldap') {
      throw new Error('LDAP authentication not configured');
    }

    const ldapConfig = authConfig.config as any;
    const client = ldap.createClient({
      url: ldapConfig.url || process.env.LDAP_URL
    });

    return new Promise((resolve, reject) => {
      // Bind with admin credentials
      client.bind(ldapConfig.bindDN || process.env.LDAP_BIND_DN, 
                  ldapConfig.bindPassword || process.env.LDAP_BIND_PASSWORD, (err) => {
        if (err) {
          client.unbind();
          return reject(err);
        }

        // Search for user
        const searchFilter = (ldapConfig.searchFilter || process.env.LDAP_SEARCH_FILTER || '(uid={{username}})')
          .replace('{{username}}', username);
        
        const searchBase = ldapConfig.searchBase || process.env.LDAP_SEARCH_BASE;

        client.search(searchBase, {
          scope: 'sub',
          filter: searchFilter
        }, (err, res) => {
          if (err) {
            client.unbind();
            return reject(err);
          }

          let userEntry: any = null;

          res.on('searchEntry', (entry) => {
            userEntry = entry.object;
          });

          res.on('end', async () => {
            if (!userEntry) {
              client.unbind();
              return resolve(null);
            }

            // Try to bind with user credentials
            client.bind(userEntry.dn, password, async (err) => {
              client.unbind();
              
              if (err) {
                return resolve(null);
              }

              // User authenticated, create or update user record
              try {
                const user = await storage.createOrUpdateUser({
                  id: userEntry.uid || username,
                  username: username,
                  email: userEntry.mail || `${username}@company.com`,
                  firstName: userEntry.givenName || '',
                  lastName: userEntry.sn || '',
                  role: 'user',
                  authType: 'ldap'
                });
                resolve(user);
              } catch (error) {
                reject(error);
              }
            });
          });

          res.on('error', (err) => {
            client.unbind();
            reject(err);
          });
        });
      });
    });
  }

  // Initialize default admin user
  async initializeDefaultAdmin() {
    const adminUsername = process.env.DEFAULT_ADMIN_USERNAME || 'admin';
    const adminPassword = process.env.DEFAULT_ADMIN_PASSWORD || 'Admin@123456';
    const adminEmail = process.env.DEFAULT_ADMIN_EMAIL || 'admin@company.com';

    try {
      const existingAdmin = await storage.getUserByUsername(adminUsername);
      if (!existingAdmin) {
        const hashedPassword = await this.hashPassword(adminPassword);
        await storage.createUser({
          id: 'admin-default',
          username: adminUsername,
          email: adminEmail,
          password: hashedPassword,
          firstName: 'System',
          lastName: 'Administrator',
          role: 'admin',
          authType: 'jwt'
        });
        console.log(`✅ Default admin user created: ${adminUsername}`);
      }
    } catch (error) {
      console.error('Failed to initialize default admin:', error);
    }
  }
}

// Setup authentication middleware
export function setupAuth(app: Express) {
  const authService = AuthService.getInstance();

  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || 'fallback-session-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false, // Set to true in production with HTTPS
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
  };

  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  // JWT Strategy
  passport.use(new JwtStrategy({
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    secretOrKey: process.env.JWT_SECRET || 'fallback-secret-key'
  }, async (payload, done) => {
    try {
      const user = await storage.getUser(payload.id);
      return done(null, user || false);
    } catch (error) {
      return done(error, false);
    }
  }));

  // Local Strategy for JWT authentication
  passport.use(new LocalStrategy({
    usernameField: 'username',
    passwordField: 'password'
  }, async (username, password, done) => {
    try {
      const authConfig = await authService.getCurrentAuthConfig();
      const authType = authConfig?.authType || 'jwt';

      if (authType === 'ldap') {
        const user = await authService.authenticateLDAP(username, password);
        return done(null, user || false);
      } else {
        // JWT/Local authentication
        const user = await storage.getUserByUsername(username);
        if (!user || !user.password) {
          return done(null, false);
        }

        const isValid = await authService.comparePassword(password, user.password);
        return done(null, isValid ? user : false);
      }
    } catch (error) {
      return done(error, false);
    }
  }));

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error, null);
    }
  });

  // Initialize default admin
  authService.initializeDefaultAdmin();
}

// Middleware to check authentication
export function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated() || req.user) {
    return next();
  }
  
  // Check for JWT token in header
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const authService = AuthService.getInstance();
    
    authService.verifyJWT(token).then(user => {
      if (user) {
        req.user = user;
        return next();
      }
      return res.status(401).json({ message: 'Unauthorized' });
    }).catch(() => {
      return res.status(401).json({ message: 'Unauthorized' });
    });
  } else {
    return res.status(401).json({ message: 'Unauthorized' });
  }
}

// Middleware to check admin role
export function isAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.user && req.user.role === 'admin') {
    return next();
  }
  return res.status(403).json({ message: 'Admin access required' });
}