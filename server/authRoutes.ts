import { Express, Request, Response } from "express";
import { AuthService, isAuthenticated, isAdmin } from "./auth";
import { z } from "zod";
import { storage } from "./storage";

const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

const registerSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  email: z.string().email("Valid email is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
});

const authConfigSchema = z.object({
  authType: z.enum(["jwt", "ldap", "oidc"]),
  config: z.object({}).optional(),
});

export function setupAuthRoutes(app: Express) {
  const authService = AuthService.getInstance();

  // Login endpoint
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const { username, password } = loginSchema.parse(req.body);

      const authConfig = await authService.getCurrentAuthConfig();
      const authType = authConfig?.authType || "jwt";

      let user;
      if (authType === "ldap") {
        user = await authService.authenticateLDAP(username, password);
      } else {
        // JWT authentication
        const foundUser = await storage.getUserByUsername(username);
        if (!foundUser || !foundUser.password) {
          return res.status(401).json({ message: "Invalid credentials" });
        }

        const isValid = await authService.comparePassword(
          password,
          foundUser.password
        );
        if (!isValid) {
          return res.status(401).json({ message: "Invalid credentials" });
        }
        user = foundUser;
      }

      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Generate JWT token
      const token = authService.generateJWT(user);

      // Set session
      req.login(user, (err) => {
        if (err) {
          return res.status(500).json({ message: "Login failed" });
        }

        res.json({
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
          },
          token,
        });
      });
    } catch (error: any) {
      console.error("Login error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          message: "Invalid input",
          errors: error.errors,
        });
      }
      res.status(500).json({ message: "Login failed" });
    }
  });

  // Register endpoint (only for JWT auth)
  app.post("/api/auth/register", async (req: Request, res: Response) => {
    try {
      const authConfig = await authService.getCurrentAuthConfig();
      const authType = authConfig?.authType || "jwt";

      if (authType !== "jwt") {
        return res.status(400).json({
          message: "Registration is only available for JWT authentication",
        });
      }

      const userData = registerSchema.parse(req.body);

      // Check if user already exists
      const existingUser = await storage.getUserByUsername(userData.username);
      if (existingUser) {
        return res.status(409).json({ message: "Username already exists" });
      }

      // Hash password and create user
      const hashedPassword = await authService.hashPassword(userData.password);
      const user = await storage.createUser({
        id: `user-${Date.now()}`,
        username: userData.username,
        email: userData.email,
        password: hashedPassword,
        firstName: userData.firstName || null,
        lastName: userData.lastName || null,
        role: "user",
        authType: "jwt",
      });

      // Generate JWT token
      const token = authService.generateJWT(user);

      res.status(201).json({
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
        },
        token,
      });
    } catch (error: any) {
      console.error("Registration error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          message: "Invalid input",
          errors: error.errors,
        });
      }
      res.status(500).json({ message: "Registration failed" });
    }
  });

  // Logout endpoint
  app.post("/api/auth/logout", (req: Request, res: Response) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ message: "Logout failed" });
      }
      res.json({ message: "Logged out successfully" });
    });
  });

  // Get current user
  app.get("/api/auth/user", isAuthenticated, (req: Request, res: Response) => {
    const user = req.user as any;
    res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
    });
  });

  // Admin: Get auth configuration
  app.get(
    "/api/auth/config",
    isAuthenticated,
    isAdmin,
    async (req: Request, res: Response) => {
      try {
        const config = await authService.getCurrentAuthConfig();
        res.json(config || { authType: "jwt", isActive: true });
      } catch (error) {
        console.error("Get auth config error:", error);
        res.status(500).json({ message: "Failed to get auth configuration" });
      }
    }
  );

  // Admin: Set auth configuration
  app.post(
    "/api/auth/config",
    isAuthenticated,
    isAdmin,
    async (req: Request, res: Response) => {
      try {
        const { authType, config } = authConfigSchema.parse(req.body);
        await authService.setAuthConfig(authType, config);
        res.json({ message: "Authentication configuration updated" });
      } catch (error: any) {
        console.error("Set auth config error:", error);
        if (error instanceof z.ZodError) {
          return res.status(400).json({
            message: "Invalid input",
            errors: error.errors,
          });
        }
        res
          .status(500)
          .json({ message: "Failed to update auth configuration" });
      }
    }
  );

  // Get available auth methods
  app.get("/api/auth/methods", async (req: Request, res: Response) => {
    try {
      const config = await authService.getCurrentAuthConfig();
      res.json({
        current: config?.authType || "jwt",
        available: ["jwt", "ldap", "oidc"],
      });
    } catch (error) {
      console.error("Get auth methods error:", error);
      res.status(500).json({ message: "Failed to get auth methods" });
    }
  });
}
